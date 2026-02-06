/**
 * Tag Release Command Module
 *
 * CLI command /tlc:tag for creating, reviewing, accepting, and managing
 * tagged releases. Orchestrates the tag-based QA release pipeline.
 *
 * @module tag-release-command
 */

import { parseTag, isValidTag, compareVersions } from './tag-classifier.js';

/**
 * Roles authorized to accept or reject releases.
 * @type {string[]}
 */
const AUTHORIZED_ROLES = ['qa', 'admin'];

/**
 * Available subcommands with descriptions for help text.
 * @type {Array<{name: string, description: string}>}
 */
const SUBCOMMANDS = [
  { name: 'create', description: 'Create a new release from a git tag' },
  { name: 'status', description: 'Show release status for a tag or all active releases' },
  { name: 'accept', description: 'Accept a release after QA review (qa/admin only)' },
  { name: 'reject', description: 'Reject a release with a reason (qa/admin only)' },
  { name: 'promote', description: 'Promote an accepted RC to a clean version tag' },
  { name: 'retry', description: 'Re-run failed quality gates for a release' },
  { name: 'list', description: 'List all releases with status indicators' },
  { name: 'history', description: 'Show chronological release audit trail' },
  { name: 'help', description: 'Show available subcommands' },
];

/**
 * Check whether a user role is authorized for accept/reject operations.
 *
 * @param {string} role - The user's role
 * @returns {boolean} True if the role is authorized
 */
function isAuthorizedRole(role) {
  return AUTHORIZED_ROLES.includes(role);
}

/**
 * Handle the `create` subcommand.
 * Validates the tag format, starts a release via the manager, and records an audit event.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.tag - Git tag string
 * @param {string} args.commit - Commit SHA
 * @param {Object} context - Execution context with manager, audit, user
 * @returns {Promise<{success: boolean, message: string, data: Object|null}>}
 */
async function handleCreate(args, context) {
  const { tag, commit } = args;
  const { manager, audit, user } = context;

  if (!isValidTag(tag)) {
    return {
      success: false,
      message: `Invalid tag format: ${tag}. Expected format: v{major}.{minor}.{patch}[-{prerelease}]`,
      data: null,
    };
  }

  const release = await manager.startRelease(tag, commit);

  audit.recordEvent(tag, {
    action: 'created',
    user: user.name,
    details: { commit, tier: release.tier },
  });

  return {
    success: true,
    message: `Release ${tag} created successfully`,
    data: release,
  };
}

/**
 * Handle the `status` subcommand.
 * If a tag is provided, shows that release's status.
 * If no tag, lists all active releases.
 *
 * @param {Object} args - Command arguments
 * @param {string} [args.tag] - Optional git tag to check
 * @param {Object} context - Execution context with manager
 * @returns {Promise<{success: boolean, message: string, data: Object|Object[]|null}>}
 */
async function handleStatus(args, context) {
  const { tag } = args;
  const { manager } = context;

  if (!tag) {
    const releases = await manager.listReleases();
    const summary = releases.map(r => `${r.tag}: ${r.state}`).join('\n');
    return {
      success: true,
      message: releases.length > 0 ? `Active releases:\n${summary}` : 'No active releases',
      data: releases,
    };
  }

  const release = await manager.getRelease(tag);
  if (!release) {
    return {
      success: false,
      message: `Release not found: ${tag}`,
      data: null,
    };
  }

  return {
    success: true,
    message: `Release ${tag}: ${release.state}`,
    data: release,
  };
}

/**
 * Handle the `accept` subcommand.
 * Validates user role before allowing acceptance.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.tag - Git tag to accept
 * @param {Object} context - Execution context with manager, audit, user
 * @returns {Promise<{success: boolean, message: string, data: Object|null}>}
 */
async function handleAccept(args, context) {
  const { tag } = args;
  const { manager, audit, user } = context;

  if (!isAuthorizedRole(user.role)) {
    return {
      success: false,
      message: `Unauthorized: role '${user.role}' cannot accept releases. Requires qa or admin role.`,
      data: null,
    };
  }

  const release = await manager.acceptRelease(tag, user.name);

  audit.recordEvent(tag, {
    action: 'accepted',
    user: user.name,
    details: {},
  });

  return {
    success: true,
    message: `Release ${tag} accepted by ${user.name}`,
    data: release,
  };
}

/**
 * Handle the `reject` subcommand.
 * Validates user role and requires a reason.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.tag - Git tag to reject
 * @param {string} args.reason - Reason for rejection
 * @param {Object} context - Execution context with manager, audit, user
 * @returns {Promise<{success: boolean, message: string, data: Object|null}>}
 */
async function handleReject(args, context) {
  const { tag, reason } = args;
  const { manager, audit, user } = context;

  if (!isAuthorizedRole(user.role)) {
    return {
      success: false,
      message: `Unauthorized: role '${user.role}' cannot reject releases. Requires qa or admin role.`,
      data: null,
    };
  }

  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    return {
      success: false,
      message: 'Rejection requires a reason. Provide a reason text.',
      data: null,
    };
  }

  const release = await manager.rejectRelease(tag, user.name, reason);

  audit.recordEvent(tag, {
    action: 'rejected',
    user: user.name,
    details: { reason },
  });

  return {
    success: true,
    message: `Release ${tag} rejected by ${user.name}: ${reason}`,
    data: release,
  };
}

/**
 * Handle the `promote` subcommand.
 * Creates a clean version tag from an accepted RC release.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.tag - RC tag to promote (e.g., v1.0.0-rc.1)
 * @param {Object} context - Execution context with manager, audit, user
 * @returns {Promise<{success: boolean, message: string, data: Object|null}>}
 */
async function handlePromote(args, context) {
  const { tag } = args;
  const { manager, audit, user } = context;

  const release = await manager.getRelease(tag);
  if (!release) {
    return {
      success: false,
      message: `Release not found: ${tag}`,
      data: null,
    };
  }

  if (release.tier !== 'rc') {
    return {
      success: false,
      message: `Only RC (release candidate) tags can be promoted. Tag ${tag} is tier '${release.tier}'.`,
      data: null,
    };
  }

  if (release.state !== 'accepted') {
    return {
      success: false,
      message: `Release must be accepted before promotion. Current state: ${release.state}. Release not accepted.`,
      data: null,
    };
  }

  const parsed = parseTag(tag);
  const promotedTag = `v${parsed.major}.${parsed.minor}.${parsed.patch}`;

  audit.recordEvent(tag, {
    action: 'promoted',
    user: user.name,
    details: { promotedTag },
  });

  return {
    success: true,
    message: `Release ${tag} promoted to ${promotedTag}`,
    data: { ...release, promotedTag },
  };
}

/**
 * Handle the `retry` subcommand.
 * Re-runs failed quality gates for a release.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.tag - Git tag to retry gates for
 * @param {Object} context - Execution context with manager, audit, user
 * @returns {Promise<{success: boolean, message: string, data: Object|null}>}
 */
async function handleRetry(args, context) {
  const { tag } = args;
  const { manager, audit, user } = context;

  const release = await manager.getRelease(tag);
  if (!release) {
    return {
      success: false,
      message: `Release not found: ${tag}`,
      data: null,
    };
  }

  if (release.state !== 'gates-failed') {
    return {
      success: false,
      message: `No failed gates to retry. Current state: ${release.state}. Gates not failed.`,
      data: null,
    };
  }

  const gateResults = await manager.retryGates(tag);

  audit.recordEvent(tag, {
    action: gateResults.passed ? 'gates-passed' : 'gates-failed',
    user: user.name,
    details: { retry: true, results: gateResults.results },
  });

  return {
    success: true,
    message: gateResults.passed
      ? `Gates passed on retry for ${tag}`
      : `Some gates still failing for ${tag}`,
    data: gateResults,
  };
}

/**
 * Handle the `list` subcommand.
 * Lists all releases sorted by version descending.
 *
 * @param {Object} args - Command arguments (unused)
 * @param {Object} context - Execution context with manager
 * @returns {Promise<{success: boolean, message: string, data: Object[]}>}
 */
async function handleList(args, context) {
  const { manager } = context;

  const releases = await manager.listReleases();

  if (releases.length === 0) {
    return {
      success: true,
      message: 'No releases found.',
      data: [],
    };
  }

  // Sort by version descending
  releases.sort((a, b) => compareVersions(b.tag, a.tag));

  const lines = releases.map(r => `  ${r.tag}  [${r.state}]`);
  const message = `Releases:\n${lines.join('\n')}`;

  return {
    success: true,
    message,
    data: releases,
  };
}

/**
 * Handle the `history` subcommand.
 * Shows chronological audit trail, optionally filtered by tag.
 *
 * @param {Object} args - Command arguments
 * @param {string} [args.tag] - Optional tag to filter history for
 * @param {Object} context - Execution context with audit
 * @returns {Promise<{success: boolean, message: string, data: Object[]}>}
 */
async function handleHistory(args, context) {
  const { tag } = args;
  const { audit } = context;

  let events;
  if (tag) {
    events = audit.getAuditTrail(tag);
  } else {
    // Get all events from summary
    const summary = audit.getSummary();
    events = [];
    for (const entry of summary) {
      const tagEvents = audit.getAuditTrail(entry.tag);
      events.push(...tagEvents);
    }
    // Sort all events chronologically
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  const lines = events.map(
    e => `  [${e.timestamp}] ${e.tag} ${e.action} by ${e.user}`
  );
  const message = events.length > 0
    ? `Release history:\n${lines.join('\n')}`
    : 'No release history found.';

  return {
    success: true,
    message,
    data: events,
  };
}

/**
 * Handle the `help` subcommand.
 * Lists all available subcommands with descriptions.
 *
 * @returns {{success: boolean, message: string, data: Object[]}}
 */
function handleHelp() {
  const lines = SUBCOMMANDS.map(cmd => `  ${cmd.name.padEnd(10)} ${cmd.description}`);
  return {
    success: true,
    message: `/tlc:tag subcommands:\n${lines.join('\n')}`,
    data: SUBCOMMANDS,
  };
}

/**
 * Execute a tag release command.
 *
 * @param {string} subcommand - The subcommand to execute (create, status, accept, reject, promote, retry, list, history, help)
 * @param {Object} args - Subcommand-specific arguments
 * @param {string} [args.tag] - Git tag (used by most subcommands)
 * @param {string} [args.commit] - Commit SHA (used by create)
 * @param {string} [args.reason] - Rejection reason (used by reject)
 * @param {Object} context - Execution context (dependency injection)
 * @param {Object} context.config - Project configuration
 * @param {string} context.projectDir - Project directory path
 * @param {Object} context.user - Current user { name, role }
 * @param {Object} context.manager - Release manager instance (from createReleaseManager)
 * @param {Object} context.audit - Release audit instance (from createReleaseAudit)
 * @returns {Promise<{success: boolean, message: string, data: Object|Object[]|null}>}
 */
export async function executeTagCommand(subcommand, args = {}, context = {}) {
  try {
    switch (subcommand) {
      case 'create':
        return await handleCreate(args, context);

      case 'status':
        return await handleStatus(args, context);

      case 'accept':
        return await handleAccept(args, context);

      case 'reject':
        return await handleReject(args, context);

      case 'promote':
        return await handlePromote(args, context);

      case 'retry':
        return await handleRetry(args, context);

      case 'list':
        return await handleList(args, context);

      case 'history':
        return await handleHistory(args, context);

      case 'help':
        return handleHelp();

      default:
        return {
          success: false,
          message: `Unknown subcommand: '${subcommand}'. Run 'help' for available subcommands.`,
          data: null,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      data: null,
    };
  }
}

export default { executeTagCommand };
