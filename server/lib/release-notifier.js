/**
 * Release Notifier - Notify team members when releases need QA review or are accepted/rejected.
 * Uses Slack Block Kit format for rich message formatting.
 * Phase 63, Task 10
 *
 * @module release-notifier
 */

/**
 * Extract gate summary counts from a release's gateResults.
 *
 * @param {Object|null} gateResults - Gate results from the release object
 * @returns {{ passed: number, failed: number }} Counts of passed and failed gates
 */
function getGateSummary(gateResults) {
  if (!gateResults || !gateResults.results) {
    return { passed: 0, failed: 0 };
  }
  let passed = 0;
  let failed = 0;
  for (const r of gateResults.results) {
    if (r.status === 'pass') {
      passed++;
    } else {
      failed++;
    }
  }
  return { passed, failed };
}

/**
 * Build a changelog snippet string from the first N items.
 *
 * @param {string[]} changelog - Full changelog array
 * @param {number} [max=3] - Maximum items to include
 * @returns {string} Formatted changelog snippet or empty string
 */
function formatChangelog(changelog, max = 3) {
  if (!Array.isArray(changelog) || changelog.length === 0) {
    return '';
  }
  return changelog.slice(0, max).map(item => `- ${item}`).join('\n');
}

/**
 * Get the notification channel for a given event from config.
 *
 * @param {Object|undefined} notifications - The notifications section of release config
 * @param {string} event - Event name: 'onDeploy', 'onAccept', or 'onReject'
 * @returns {string|undefined} Channel name or undefined
 */
function getChannel(notifications, event) {
  if (!notifications || !notifications[event]) {
    return undefined;
  }
  const eventConfig = notifications[event];
  if (typeof eventConfig === 'object' && eventConfig.channel) {
    return eventConfig.channel;
  }
  return undefined;
}

/**
 * Build a Slack Block Kit message for a deploy notification.
 *
 * @param {Object} release - Release object from tag-release
 * @param {string|undefined} channel - Slack channel override
 * @returns {Object} Slack Block Kit message payload
 */
function buildDeployMessage(release, channel) {
  const { tag, previewUrl, gateResults, changelog, qaUsers } = release;
  const gateSummary = getGateSummary(gateResults);
  const changelogSnippet = formatChangelog(changelog);

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:rocket: *Release Deployed: ${tag}*\nReview needed`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Preview URL:* ${previewUrl || 'N/A'}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Gates:* ${gateSummary.passed} passed, ${gateSummary.failed} failed`,
      },
    },
  ];

  if (changelogSnippet) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Changelog:*\n${changelogSnippet}`,
      },
    });
  }

  if (Array.isArray(qaUsers) && qaUsers.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Reviewers:* ${qaUsers.join(' ')}`,
      },
    });
  }

  const message = { blocks };
  if (channel) {
    message.channel = channel;
  }
  return message;
}

/**
 * Build a Slack Block Kit message for an accept notification.
 *
 * @param {Object} release - Release object from tag-release
 * @param {string|undefined} channel - Slack channel override
 * @returns {Object} Slack Block Kit message payload
 */
function buildAcceptMessage(release, channel) {
  const { tag, reviewer } = release;

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:white_check_mark: *Release Accepted: ${tag}*`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Reviewer:* ${reviewer || 'Unknown'}`,
      },
    },
  ];

  const message = { blocks };
  if (channel) {
    message.channel = channel;
  }
  return message;
}

/**
 * Build a Slack Block Kit message for a reject notification.
 *
 * @param {Object} release - Release object from tag-release
 * @param {string} reason - Reason for rejection
 * @param {string|undefined} channel - Slack channel override
 * @returns {Object} Slack Block Kit message payload
 */
function buildRejectMessage(release, reason, channel) {
  const { tag, reviewer } = release;

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:x: *Release Rejected: ${tag}*`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Reviewer:* ${reviewer || 'Unknown'}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Reason:* ${reason}`,
      },
    },
  ];

  const message = { blocks };
  if (channel) {
    message.channel = channel;
  }
  return message;
}

/**
 * Create a release notifier that sends Slack notifications for release lifecycle events.
 *
 * @param {Object} config - Release configuration (from loadReleaseConfig())
 * @param {Object} options - Dependency injection options
 * @param {Function|null} options.slackSender - Async function to send Slack messages: (payload) => Promise
 * @param {Object} [options.logger] - Logger with log/warn/error methods (defaults to console)
 * @returns {{ notifyDeploy: Function, notifyAccept: Function, notifyReject: Function }}
 */
export function createReleaseNotifier(config, options = {}) {
  const { slackSender = null, logger = console } = options;
  const notifications = (config && config.notifications) || undefined;

  return {
    /**
     * Notify that a release has been deployed and needs QA review.
     *
     * @param {Object} release - The release object
     * @returns {Promise<{ sent: boolean, channel: string|undefined }>}
     */
    async notifyDeploy(release) {
      const channel = getChannel(notifications, 'onDeploy');
      const message = buildDeployMessage(release, channel);

      if (!slackSender) {
        logger.log(`[release-notifier] Deploy: ${release.tag} - Review needed (Slack not configured)`);
        return { sent: false, channel };
      }

      await slackSender(message);
      return { sent: true, channel };
    },

    /**
     * Notify that a release has been accepted by QA.
     *
     * @param {Object} release - The release object (should have reviewer set)
     * @returns {Promise<{ sent: boolean, channel: string|undefined }>}
     */
    async notifyAccept(release) {
      const channel = getChannel(notifications, 'onAccept');
      const message = buildAcceptMessage(release, channel);

      if (!slackSender) {
        logger.log(`[release-notifier] Accept: ${release.tag} by ${release.reviewer} (Slack not configured)`);
        return { sent: false, channel };
      }

      await slackSender(message);
      return { sent: true, channel };
    },

    /**
     * Notify that a release has been rejected by QA.
     *
     * @param {Object} release - The release object (should have reviewer set)
     * @param {string} reason - Rejection reason
     * @returns {Promise<{ sent: boolean, channel: string|undefined }>}
     */
    async notifyReject(release, reason) {
      const channel = getChannel(notifications, 'onReject');
      const message = buildRejectMessage(release, reason, channel);

      if (!slackSender) {
        logger.log(`[release-notifier] Reject: ${release.tag} by ${release.reviewer} - ${reason} (Slack not configured)`);
        return { sent: false, channel };
      }

      await slackSender(message);
      return { sent: true, channel };
    },
  };
}

export default { createReleaseNotifier };
