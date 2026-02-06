/**
 * Webhook Tag Handler - Wires incoming webhook tag-push events from
 * GitHub and GitLab to the release pipeline. Extracts tag, commit SHA,
 * and pusher from platform-specific payloads, validates tags via
 * tag-classifier, deduplicates rapid retries, and fires the onRelease
 * callback for valid release tags.
 *
 * @module webhook-tag-handler
 */

const { isValidTag } = require('./tag-classifier.js');

/**
 * Default deduplication window in milliseconds (60 seconds).
 * @type {number}
 */
const DEFAULT_DEDUPE_WINDOW_MS = 60000;

/**
 * Extract tag name, commit SHA, and pusher from a GitHub tag push payload.
 *
 * @param {Object} payload - GitHub webhook payload
 * @param {string} payload.ref - Full ref string (e.g., 'refs/tags/v1.0.0')
 * @param {string} payload.after - Commit SHA
 * @param {Object} payload.pusher - Pusher info
 * @param {string} payload.pusher.name - Pusher name
 * @returns {{ tag: string, commit: string, pusher: string }}
 */
function extractGitHub(payload) {
  const ref = payload.ref || '';
  const tag = ref.replace(/^refs\/tags\//, '');
  const commit = payload.after || '';
  const pusher = (payload.pusher && payload.pusher.name) || 'unknown';
  return { tag, commit, pusher };
}

/**
 * Extract tag name, commit SHA, and pusher from a GitLab tag push payload.
 *
 * @param {Object} payload - GitLab webhook payload
 * @param {string} payload.ref - Tag name (e.g., 'v1.0.0')
 * @param {string} payload.checkout_sha - Commit SHA
 * @param {string} payload.user_name - User name
 * @returns {{ tag: string, commit: string, pusher: string }}
 */
function extractGitLab(payload) {
  const tag = payload.ref || '';
  const commit = payload.checkout_sha || '';
  const pusher = payload.user_name || 'unknown';
  return { tag, commit, pusher };
}

/**
 * Create a webhook tag handler that processes tag push events and
 * triggers the release pipeline for valid release tags.
 *
 * @param {Object} options - Handler configuration
 * @param {Function} options.onRelease - Callback invoked with { tag, commit, pusher, source } for valid tags
 * @param {Function} [options.logger] - Logging function called with event messages
 * @param {number} [options.dedupeWindowMs=60000] - Millisecond window for deduplicating the same tag
 * @returns {{ handleGitHubPush: Function, handleGitLabPush: Function, handleTagEvent: Function }}
 */
function createWebhookTagHandler(options) {
  const {
    onRelease,
    logger = () => {},
    dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
  } = options;

  /** @type {Map<string, number>} Track last-seen timestamp per tag for deduplication */
  const recentTags = new Map();

  /**
   * Core processing logic shared by all entry points.
   *
   * @param {string} source - Source platform ('github' | 'gitlab')
   * @param {{ tag: string, commit: string, pusher: string }} extracted - Extracted payload fields
   * @returns {Promise<{ triggered: boolean, tag?: string, reason?: string }>}
   */
  async function processTag(source, extracted) {
    const { tag, commit, pusher } = extracted;

    logger(`Received ${source} tag event: ${tag}`);

    // Validate the tag against release patterns
    if (!isValidTag(tag)) {
      const reason = `Tag '${tag}' is not a valid release tag`;
      logger(`Skipping: ${reason}`);
      return { triggered: false, tag, reason };
    }

    // Deduplication check
    const now = Date.now();
    const lastSeen = recentTags.get(tag);
    if (lastSeen !== undefined && (now - lastSeen) < dedupeWindowMs) {
      const reason = `Duplicate: tag '${tag}' already processed within dedupe window`;
      logger(`Skipping: ${reason}`);
      return { triggered: false, tag, reason };
    }

    // Record this tag event
    recentTags.set(tag, now);

    // Fire the release callback
    await onRelease({ tag, commit, pusher, source });

    logger(`Triggered release pipeline for ${tag} from ${source}`);
    return { triggered: true, tag };
  }

  return {
    /**
     * Handle a GitHub tag push webhook payload.
     *
     * @param {Object} payload - GitHub webhook payload
     * @returns {Promise<{ triggered: boolean, tag?: string, reason?: string }>}
     */
    async handleGitHubPush(payload) {
      const extracted = extractGitHub(payload);
      return processTag('github', extracted);
    },

    /**
     * Handle a GitLab tag push webhook payload.
     *
     * @param {Object} payload - GitLab webhook payload
     * @returns {Promise<{ triggered: boolean, tag?: string, reason?: string }>}
     */
    async handleGitLabPush(payload) {
      const extracted = extractGitLab(payload);
      return processTag('gitlab', extracted);
    },

    /**
     * Generic tag event dispatcher. Routes to the appropriate handler
     * based on the source string.
     *
     * @param {'github' | 'gitlab'} source - Source platform identifier
     * @param {Object} payload - Platform-specific webhook payload
     * @returns {Promise<{ triggered: boolean, tag?: string, reason?: string }>}
     */
    async handleTagEvent(source, payload) {
      if (source === 'github') {
        return this.handleGitHubPush(payload);
      }
      if (source === 'gitlab') {
        return this.handleGitLabPush(payload);
      }
      return { triggered: false, reason: `Unknown source: ${source}` };
    },
  };
}

module.exports = { createWebhookTagHandler };
