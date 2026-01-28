/**
 * Webhook Listener
 * Receives and validates webhooks from GitHub and GitLab
 */

const crypto = require('crypto');

const WEBHOOK_SOURCES = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  BITBUCKET: 'bitbucket',
};

const EVENT_TYPES = {
  PUSH: 'push',
  PULL_REQUEST: 'pull_request',
  MERGE_REQUEST: 'merge_request',
  TAG: 'tag',
  RELEASE: 'release',
  COMMENT: 'comment',
  UNKNOWN: 'unknown',
};

/**
 * Verify GitHub webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Hub-Signature-256 header
 * @param {string} secret - Webhook secret
 * @returns {boolean} Whether signature is valid
 */
function verifyGitHubSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    );
  } catch {
    return false;
  }
}

/**
 * Verify GitLab webhook token
 * @param {string} token - X-Gitlab-Token header
 * @param {string} secret - Webhook secret
 * @returns {boolean} Whether token is valid
 */
function verifyGitLabToken(token, secret) {
  if (!token || !secret) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(secret)
    );
  } catch {
    return false;
  }
}

/**
 * Detect webhook source from headers
 * @param {Object} headers - Request headers
 * @returns {string} Webhook source
 */
function detectWebhookSource(headers = {}) {
  const normalizedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = value;
  }

  if (normalizedHeaders['x-github-event']) {
    return WEBHOOK_SOURCES.GITHUB;
  }

  if (normalizedHeaders['x-gitlab-event']) {
    return WEBHOOK_SOURCES.GITLAB;
  }

  if (normalizedHeaders['x-event-key']) {
    return WEBHOOK_SOURCES.BITBUCKET;
  }

  return null;
}

/**
 * Parse GitHub event type
 * @param {string} event - X-GitHub-Event header
 * @returns {string} Normalized event type
 */
function parseGitHubEventType(event) {
  switch (event) {
    case 'push':
      return EVENT_TYPES.PUSH;
    case 'pull_request':
      return EVENT_TYPES.PULL_REQUEST;
    case 'create':
    case 'delete':
      return EVENT_TYPES.TAG;
    case 'release':
      return EVENT_TYPES.RELEASE;
    case 'issue_comment':
    case 'pull_request_review_comment':
      return EVENT_TYPES.COMMENT;
    default:
      return EVENT_TYPES.UNKNOWN;
  }
}

/**
 * Parse GitLab event type
 * @param {string} event - X-Gitlab-Event header
 * @returns {string} Normalized event type
 */
function parseGitLabEventType(event) {
  switch (event) {
    case 'Push Hook':
      return EVENT_TYPES.PUSH;
    case 'Merge Request Hook':
      return EVENT_TYPES.MERGE_REQUEST;
    case 'Tag Push Hook':
      return EVENT_TYPES.TAG;
    case 'Release Hook':
      return EVENT_TYPES.RELEASE;
    case 'Note Hook':
      return EVENT_TYPES.COMMENT;
    default:
      return EVENT_TYPES.UNKNOWN;
  }
}

/**
 * Parse GitHub push payload
 * @param {Object} payload - Webhook payload
 * @returns {Object} Normalized push data
 */
function parseGitHubPush(payload) {
  const ref = payload.ref || '';
  const isTag = ref.startsWith('refs/tags/');
  const isBranch = ref.startsWith('refs/heads/');

  return {
    source: WEBHOOK_SOURCES.GITHUB,
    event: isTag ? EVENT_TYPES.TAG : EVENT_TYPES.PUSH,
    ref,
    branch: isBranch ? ref.replace('refs/heads/', '') : null,
    tag: isTag ? ref.replace('refs/tags/', '') : null,
    before: payload.before,
    after: payload.after,
    commits: (payload.commits || []).map((c) => ({
      id: c.id,
      message: c.message,
      author: c.author?.name || c.author?.username,
      timestamp: c.timestamp,
      url: c.url,
    })),
    repository: {
      name: payload.repository?.name,
      fullName: payload.repository?.full_name,
      url: payload.repository?.html_url,
      defaultBranch: payload.repository?.default_branch,
      private: payload.repository?.private,
    },
    sender: {
      login: payload.sender?.login,
      avatar: payload.sender?.avatar_url,
    },
    created: payload.created,
    deleted: payload.deleted,
    forced: payload.forced,
  };
}

/**
 * Parse GitHub pull request payload
 * @param {Object} payload - Webhook payload
 * @returns {Object} Normalized PR data
 */
function parseGitHubPullRequest(payload) {
  const pr = payload.pull_request || {};

  return {
    source: WEBHOOK_SOURCES.GITHUB,
    event: EVENT_TYPES.PULL_REQUEST,
    action: payload.action,
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    draft: pr.draft,
    merged: pr.merged,
    head: {
      ref: pr.head?.ref,
      sha: pr.head?.sha,
      repo: pr.head?.repo?.full_name,
    },
    base: {
      ref: pr.base?.ref,
      sha: pr.base?.sha,
      repo: pr.base?.repo?.full_name,
    },
    author: {
      login: pr.user?.login,
      avatar: pr.user?.avatar_url,
    },
    url: pr.html_url,
    repository: {
      name: payload.repository?.name,
      fullName: payload.repository?.full_name,
      url: payload.repository?.html_url,
    },
  };
}

/**
 * Parse GitLab push payload
 * @param {Object} payload - Webhook payload
 * @returns {Object} Normalized push data
 */
function parseGitLabPush(payload) {
  const ref = payload.ref || '';
  const isTag = ref.startsWith('refs/tags/');
  const isBranch = ref.startsWith('refs/heads/');

  return {
    source: WEBHOOK_SOURCES.GITLAB,
    event: isTag ? EVENT_TYPES.TAG : EVENT_TYPES.PUSH,
    ref,
    branch: isBranch ? ref.replace('refs/heads/', '') : null,
    tag: isTag ? ref.replace('refs/tags/', '') : null,
    before: payload.before,
    after: payload.after,
    commits: (payload.commits || []).map((c) => ({
      id: c.id,
      message: c.message,
      author: c.author?.name,
      timestamp: c.timestamp,
      url: c.url,
    })),
    repository: {
      name: payload.project?.name,
      fullName: payload.project?.path_with_namespace,
      url: payload.project?.web_url,
      defaultBranch: payload.project?.default_branch,
      private: payload.project?.visibility === 'private',
    },
    sender: {
      login: payload.user_username,
      avatar: payload.user_avatar,
    },
    totalCommits: payload.total_commits_count,
  };
}

/**
 * Parse GitLab merge request payload
 * @param {Object} payload - Webhook payload
 * @returns {Object} Normalized MR data
 */
function parseGitLabMergeRequest(payload) {
  const mr = payload.object_attributes || {};

  return {
    source: WEBHOOK_SOURCES.GITLAB,
    event: EVENT_TYPES.MERGE_REQUEST,
    action: mr.action,
    number: mr.iid,
    title: mr.title,
    body: mr.description,
    state: mr.state,
    draft: mr.work_in_progress || mr.draft,
    merged: mr.state === 'merged',
    head: {
      ref: mr.source_branch,
      sha: mr.last_commit?.id,
      repo: payload.project?.path_with_namespace,
    },
    base: {
      ref: mr.target_branch,
      sha: null,
      repo: payload.project?.path_with_namespace,
    },
    author: {
      login: payload.user?.username,
      avatar: payload.user?.avatar_url,
    },
    url: mr.url,
    repository: {
      name: payload.project?.name,
      fullName: payload.project?.path_with_namespace,
      url: payload.project?.web_url,
    },
  };
}

/**
 * Parse webhook payload based on source and event
 * @param {string} source - Webhook source
 * @param {string} eventType - Event type from header
 * @param {Object} payload - Raw payload
 * @returns {Object} Normalized event data
 */
function parseWebhookPayload(source, eventType, payload) {
  if (source === WEBHOOK_SOURCES.GITHUB) {
    const event = parseGitHubEventType(eventType);

    if (event === EVENT_TYPES.PUSH || event === EVENT_TYPES.TAG) {
      return parseGitHubPush(payload);
    }

    if (event === EVENT_TYPES.PULL_REQUEST) {
      return parseGitHubPullRequest(payload);
    }

    return {
      source,
      event,
      raw: payload,
    };
  }

  if (source === WEBHOOK_SOURCES.GITLAB) {
    const event = parseGitLabEventType(eventType);

    if (event === EVENT_TYPES.PUSH || event === EVENT_TYPES.TAG) {
      return parseGitLabPush(payload);
    }

    if (event === EVENT_TYPES.MERGE_REQUEST) {
      return parseGitLabMergeRequest(payload);
    }

    return {
      source,
      event,
      raw: payload,
    };
  }

  return {
    source: source || 'unknown',
    event: EVENT_TYPES.UNKNOWN,
    raw: payload,
  };
}

/**
 * Validate and parse incoming webhook
 * @param {Object} options - Validation options
 * @returns {Object} Parsed webhook or error
 */
function validateWebhook(options = {}) {
  const {
    headers = {},
    body,
    rawBody,
    secrets = {},
  } = options;

  const source = detectWebhookSource(headers);

  if (!source) {
    return {
      valid: false,
      error: 'Unknown webhook source',
    };
  }

  // Normalize headers
  const normalizedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = value;
  }

  // Verify signature/token
  if (source === WEBHOOK_SOURCES.GITHUB) {
    const signature = normalizedHeaders['x-hub-signature-256'];
    const secret = secrets.github;

    if (secret && rawBody) {
      if (!verifyGitHubSignature(rawBody, signature, secret)) {
        return {
          valid: false,
          error: 'Invalid GitHub signature',
          source,
        };
      }
    }

    const eventType = normalizedHeaders['x-github-event'];
    const payload = typeof body === 'string' ? JSON.parse(body) : body;

    return {
      valid: true,
      source,
      eventType,
      deliveryId: normalizedHeaders['x-github-delivery'],
      data: parseWebhookPayload(source, eventType, payload),
    };
  }

  if (source === WEBHOOK_SOURCES.GITLAB) {
    const token = normalizedHeaders['x-gitlab-token'];
    const secret = secrets.gitlab;

    if (secret) {
      if (!verifyGitLabToken(token, secret)) {
        return {
          valid: false,
          error: 'Invalid GitLab token',
          source,
        };
      }
    }

    const eventType = normalizedHeaders['x-gitlab-event'];
    const payload = typeof body === 'string' ? JSON.parse(body) : body;

    return {
      valid: true,
      source,
      eventType,
      data: parseWebhookPayload(source, eventType, payload),
    };
  }

  return {
    valid: false,
    error: 'Unsupported webhook source',
    source,
  };
}

/**
 * Create webhook handler middleware
 * @param {Object} options - Handler options
 * @returns {Function} Express/Koa compatible middleware
 */
function createWebhookHandler(options = {}) {
  const {
    secrets = {},
    onPush,
    onPullRequest,
    onMergeRequest,
    onTag,
    onError,
  } = options;

  return async (req, res, next) => {
    try {
      const result = validateWebhook({
        headers: req.headers,
        body: req.body,
        rawBody: req.rawBody,
        secrets,
      });

      if (!result.valid) {
        if (onError) {
          onError(new Error(result.error), req);
        }
        res.status(401).json({ error: result.error });
        return;
      }

      const { data } = result;

      // Route to appropriate handler
      if (data.event === EVENT_TYPES.PUSH && onPush) {
        await onPush(data, req);
      } else if (data.event === EVENT_TYPES.PULL_REQUEST && onPullRequest) {
        await onPullRequest(data, req);
      } else if (data.event === EVENT_TYPES.MERGE_REQUEST && onMergeRequest) {
        await onMergeRequest(data, req);
      } else if (data.event === EVENT_TYPES.TAG && onTag) {
        await onTag(data, req);
      }

      res.status(200).json({ received: true, event: data.event });
    } catch (error) {
      if (onError) {
        onError(error, req);
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Extract branch name from various formats
 * @param {string} ref - Git ref
 * @returns {string|null} Branch name
 */
function extractBranchName(ref) {
  if (!ref) return null;

  if (ref.startsWith('refs/heads/')) {
    return ref.replace('refs/heads/', '');
  }

  if (ref.startsWith('refs/tags/')) {
    return null; // Tags are not branches
  }

  return ref;
}

/**
 * Check if push is to default branch
 * @param {Object} pushData - Parsed push data
 * @returns {boolean}
 */
function isDefaultBranchPush(pushData) {
  if (!pushData.branch || !pushData.repository?.defaultBranch) {
    return false;
  }

  return pushData.branch === pushData.repository.defaultBranch;
}

/**
 * Create webhook listener instance
 * @param {Object} options - Listener options
 * @returns {Object} Listener instance
 */
function createWebhookListener(options = {}) {
  const eventHandlers = new Map();

  return {
    on(event, handler) {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event).push(handler);
      return this;
    },

    off(event, handler) {
      if (eventHandlers.has(event)) {
        const handlers = eventHandlers.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
      return this;
    },

    async emit(event, data) {
      const handlers = eventHandlers.get(event) || [];
      for (const handler of handlers) {
        await handler(data);
      }
    },

    createHandler() {
      return createWebhookHandler({
        ...options,
        onPush: (data) => this.emit(EVENT_TYPES.PUSH, data),
        onPullRequest: (data) => this.emit(EVENT_TYPES.PULL_REQUEST, data),
        onMergeRequest: (data) => this.emit(EVENT_TYPES.MERGE_REQUEST, data),
        onTag: (data) => this.emit(EVENT_TYPES.TAG, data),
        onError: (err) => this.emit('error', err),
      });
    },

    validateWebhook,
    WEBHOOK_SOURCES,
    EVENT_TYPES,
  };
}

module.exports = {
  WEBHOOK_SOURCES,
  EVENT_TYPES,
  verifyGitHubSignature,
  verifyGitLabToken,
  detectWebhookSource,
  parseGitHubEventType,
  parseGitLabEventType,
  parseGitHubPush,
  parseGitHubPullRequest,
  parseGitLabPush,
  parseGitLabMergeRequest,
  parseWebhookPayload,
  validateWebhook,
  createWebhookHandler,
  extractBranchName,
  isDefaultBranchPush,
  createWebhookListener,
};
