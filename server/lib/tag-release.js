/**
 * Tag Release Orchestrator - Coordinates the full tag -> QA -> production flow.
 * Manages release lifecycle: classify tag, run quality gates, deploy preview,
 * QA review (accept/reject), and promotion.
 *
 * @module tag-release
 */

import { parseTag } from './tag-classifier.js';
import { runGates } from './release-gate.js';
import { getGatesForTier, getPreviewUrl } from './release-config.js';
import fsp from 'node:fs/promises';
import { join } from 'node:path';

/** Directory where release JSON files are persisted */
const RELEASES_DIR = join('.tlc', 'releases');

/**
 * Valid release states.
 * @type {string[]}
 */
const STATES = ['pending', 'gates-running', 'gates-passed', 'gates-failed', 'deployed', 'accepted', 'rejected'];

/**
 * Allowed state transitions. Each key maps to the set of states it may transition to.
 * @type {Object.<string, string[]>}
 */
const TRANSITIONS = {
  'pending': ['gates-running'],
  'gates-running': ['gates-passed', 'gates-failed'],
  'gates-passed': ['deployed'],
  'gates-failed': ['gates-running'],  // retry
  'deployed': ['accepted', 'rejected'],
  'accepted': [],
  'rejected': [],
};

/**
 * Persist a release object to disk as JSON.
 *
 * @param {Object} release - The release object to persist
 * @returns {Promise<void>}
 */
async function persistRelease(release) {
  await fsp.mkdir(RELEASES_DIR, { recursive: true });
  const filePath = join(RELEASES_DIR, `${release.tag}.json`);
  await fsp.writeFile(filePath, JSON.stringify(release, null, 2));
}

/**
 * Load a release object from disk by tag name.
 *
 * @param {string} tag - The release tag
 * @returns {Promise<Object|null>} The release object or null if not found
 */
async function loadRelease(tag) {
  try {
    const filePath = join(RELEASES_DIR, `${tag}.json`);
    const data = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Load all persisted releases from disk.
 *
 * @returns {Promise<Object[]>} Array of release objects
 */
async function loadAllReleases() {
  try {
    const files = await fsp.readdir(RELEASES_DIR);
    const releases = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = join(RELEASES_DIR, file);
        const data = await fsp.readFile(filePath, 'utf-8');
        releases.push(JSON.parse(data));
      }
    }
    return releases;
  } catch {
    return [];
  }
}

/**
 * Validate a state transition and throw if invalid.
 *
 * @param {string} currentState - The current release state
 * @param {string} targetState - The desired next state
 * @throws {Error} If the transition is not allowed
 */
function validateTransition(currentState, targetState) {
  const allowed = TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(targetState)) {
    throw new Error(
      `Invalid state transition: ${currentState} -> ${targetState}`
    );
  }
}

/**
 * Create a release manager that orchestrates the tag -> QA -> production pipeline.
 *
 * @param {Object} config - Release configuration (from loadReleaseConfig())
 * @param {Object} options - Dependency injection for callbacks
 * @param {Function} options.deploy - Deploy function: (releaseInfo, previewUrl) => Promise
 * @param {Function} options.notify - Notification function: (eventData) => Promise
 * @param {boolean} [options.persist=true] - Whether to persist releases to disk
 * @param {Object} [options.checkers] - Gate checker functions keyed by gate name
 * @param {string} [options.domain='localhost'] - Domain for preview URL generation
 * @returns {{ startRelease, runGates, deployPreview, acceptRelease, rejectRelease, retryGates, getRelease, listReleases }}
 */
export function createReleaseManager(config, options = {}) {
  const {
    deploy: deployCb,
    notify: notifyCb,
    persist = true,
    checkers = {},
    domain = 'localhost',
  } = options;

  /** In-memory store of active releases keyed by tag */
  const releases = new Map();

  /**
   * Save a release to both in-memory store and optionally to disk.
   *
   * @param {Object} release - Release object to save
   * @returns {Promise<void>}
   */
  async function saveRelease(release) {
    release.updatedAt = new Date().toISOString();
    releases.set(release.tag, release);
    if (persist) {
      await persistRelease(release);
    }
  }

  /**
   * Resolve a release from in-memory cache or disk.
   *
   * @param {string} tag - The release tag
   * @returns {Promise<Object|null>}
   */
  async function resolveRelease(tag) {
    if (releases.has(tag)) {
      return releases.get(tag);
    }
    // Try loading from disk
    const loaded = await loadRelease(tag);
    if (loaded) {
      releases.set(tag, loaded);
    }
    return loaded;
  }

  return {
    /**
     * Start a new release from a tag event.
     * Parses the tag, validates it, and creates the initial release object.
     *
     * @param {string} tag - Git tag string (e.g. "v1.0.0-rc.1")
     * @param {string} commitSha - The commit SHA the tag points to
     * @returns {Promise<Object>} The created release object
     * @throws {Error} If the tag is invalid
     */
    async startRelease(tag, commitSha) {
      const parsed = parseTag(tag);
      if (!parsed.valid) {
        throw new Error(`Invalid tag: ${tag}`);
      }

      const release = {
        tag,
        commitSha,
        tier: parsed.tier,
        state: 'pending',
        gateResults: null,
        previewUrl: null,
        reviewer: null,
        reason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveRelease(release);
      return { ...release };
    },

    /**
     * Run quality gates for a release.
     * Transitions state from pending -> gates-running -> gates-passed/gates-failed.
     *
     * @param {string} tag - The release tag
     * @returns {Promise<Object>} Gate run results { passed, results }
     * @throws {Error} If the release is not found or state transition is invalid
     */
    async runGates(tag) {
      const release = await resolveRelease(tag);
      if (!release) {
        throw new Error(`Release not found: ${tag}`);
      }

      validateTransition(release.state, 'gates-running');
      release.state = 'gates-running';
      await saveRelease(release);

      const parsed = parseTag(tag);
      const gates = getGatesForTier(config, parsed.tier);
      const gateResults = await runGates(parsed, gates, config, { checkers });

      release.gateResults = gateResults;

      if (gateResults.passed) {
        release.state = 'gates-passed';
      } else {
        release.state = 'gates-failed';
      }

      await saveRelease(release);
      return gateResults;
    },

    /**
     * Deploy a preview environment for the release.
     * Calls the injected deploy callback with release info and preview URL.
     *
     * @param {string} tag - The release tag
     * @returns {Promise<string>} The preview URL
     * @throws {Error} If gates haven't passed or release not found
     */
    async deployPreview(tag) {
      const release = await resolveRelease(tag);
      if (!release) {
        throw new Error(`Release not found: ${tag}`);
      }

      validateTransition(release.state, 'deployed');

      const previewUrl = getPreviewUrl(config, tag, domain);
      release.previewUrl = previewUrl;

      if (deployCb) {
        await deployCb(
          { tag: release.tag, commitSha: release.commitSha, tier: release.tier },
          previewUrl
        );
      }

      release.state = 'deployed';
      await saveRelease(release);
      return previewUrl;
    },

    /**
     * Accept a release after QA review, triggering promotion.
     *
     * @param {string} tag - The release tag
     * @param {string} reviewer - Name/ID of the QA reviewer
     * @returns {Promise<Object>} The accepted release object
     * @throws {Error} If state transition is invalid or release not found
     */
    async acceptRelease(tag, reviewer) {
      const release = await resolveRelease(tag);
      if (!release) {
        throw new Error(`Release not found: ${tag}`);
      }

      validateTransition(release.state, 'accepted');

      release.state = 'accepted';
      release.reviewer = reviewer;

      if (notifyCb) {
        await notifyCb({ tag: release.tag, reviewer, action: 'accepted' });
      }

      await saveRelease(release);
      return { ...release };
    },

    /**
     * Reject a release after QA review, triggering notification.
     *
     * @param {string} tag - The release tag
     * @param {string} reviewer - Name/ID of the QA reviewer
     * @param {string} reason - Reason for rejection
     * @returns {Promise<Object>} The rejected release object
     * @throws {Error} If state transition is invalid or release not found
     */
    async rejectRelease(tag, reviewer, reason) {
      const release = await resolveRelease(tag);
      if (!release) {
        throw new Error(`Release not found: ${tag}`);
      }

      validateTransition(release.state, 'rejected');

      release.state = 'rejected';
      release.reviewer = reviewer;
      release.reason = reason;

      if (notifyCb) {
        await notifyCb({ tag: release.tag, reviewer, reason, action: 'rejected' });
      }

      await saveRelease(release);
      return { ...release };
    },

    /**
     * Retry failed gates. Only re-runs gates that failed; keeps passed results.
     *
     * @param {string} tag - The release tag
     * @returns {Promise<Object>} Updated gate run results
     * @throws {Error} If release not found or no gate results to retry
     */
    async retryGates(tag) {
      const release = await resolveRelease(tag);
      if (!release) {
        throw new Error(`Release not found: ${tag}`);
      }

      validateTransition(release.state, 'gates-running');
      release.state = 'gates-running';
      await saveRelease(release);

      const previousResults = release.gateResults;
      if (!previousResults || !previousResults.results) {
        throw new Error(`No previous gate results to retry for: ${tag}`);
      }

      const parsed = parseTag(tag);
      const newResults = [];

      for (const prevGate of previousResults.results) {
        if (prevGate.status === 'pass') {
          // Keep passing gate results
          newResults.push(prevGate);
        } else {
          // Re-run failed/skipped gates
          const gates = [prevGate.gate];
          const result = await runGates(parsed, gates, config, { checkers });
          newResults.push(result.results[0]);
        }
      }

      const allPassed = newResults.every(r => r.status === 'pass');
      const gateResults = { passed: allPassed, results: newResults };
      release.gateResults = gateResults;

      if (allPassed) {
        release.state = 'gates-passed';
      } else {
        release.state = 'gates-failed';
      }

      await saveRelease(release);
      return gateResults;
    },

    /**
     * Get a release by tag. Checks in-memory cache first, then disk.
     *
     * @param {string} tag - The release tag
     * @returns {Promise<Object|null>} The release object or null
     */
    async getRelease(tag) {
      const release = await resolveRelease(tag);
      return release ? { ...release } : null;
    },

    /**
     * List all releases, sorted by creation time ascending.
     * Merges in-memory releases with any persisted on disk.
     *
     * @returns {Promise<Object[]>} Array of release objects sorted by createdAt
     */
    async listReleases() {
      // Load any persisted releases not already in memory
      const persisted = await loadAllReleases();
      for (const r of persisted) {
        if (!releases.has(r.tag)) {
          releases.set(r.tag, r);
        }
      }

      const all = Array.from(releases.values()).map(r => ({ ...r }));
      all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return all;
    },
  };
}

export default { createReleaseManager };
