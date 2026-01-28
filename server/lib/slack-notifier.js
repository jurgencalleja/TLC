/**
 * Slack Notifier
 * Send notifications to Slack via webhooks
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const EVENT_TYPES = {
  BUG: 'bug',
  TEST_PASS: 'test-pass',
  TEST_FAIL: 'test-fail',
  DEPLOY: 'deploy',
  DEPLOY_FAIL: 'deploy-fail',
  CLAIM: 'claim',
  RELEASE: 'release',
  PUSH: 'push',
  MERGE: 'merge',
  COMMENT: 'comment',
};

const EVENT_EMOJIS = {
  [EVENT_TYPES.BUG]: ':bug:',
  [EVENT_TYPES.TEST_PASS]: ':white_check_mark:',
  [EVENT_TYPES.TEST_FAIL]: ':x:',
  [EVENT_TYPES.DEPLOY]: ':rocket:',
  [EVENT_TYPES.DEPLOY_FAIL]: ':boom:',
  [EVENT_TYPES.CLAIM]: ':clipboard:',
  [EVENT_TYPES.RELEASE]: ':arrows_counterclockwise:',
  [EVENT_TYPES.PUSH]: ':arrow_up:',
  [EVENT_TYPES.MERGE]: ':twisted_rightwards_arrows:',
  [EVENT_TYPES.COMMENT]: ':speech_balloon:',
};

const EVENT_COLORS = {
  [EVENT_TYPES.BUG]: '#dc3545',
  [EVENT_TYPES.TEST_PASS]: '#28a745',
  [EVENT_TYPES.TEST_FAIL]: '#dc3545',
  [EVENT_TYPES.DEPLOY]: '#0d6efd',
  [EVENT_TYPES.DEPLOY_FAIL]: '#dc3545',
  [EVENT_TYPES.CLAIM]: '#6f42c1',
  [EVENT_TYPES.RELEASE]: '#fd7e14',
  [EVENT_TYPES.PUSH]: '#17a2b8',
  [EVENT_TYPES.MERGE]: '#20c997',
  [EVENT_TYPES.COMMENT]: '#6c757d',
};

/**
 * Send HTTP request
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response
 */
function sendRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Format bug notification
 * @param {Object} bug - Bug data
 * @returns {Object} Slack message
 */
function formatBugNotification(bug) {
  const { id, title, description, severity, reporter, url } = bug;

  return {
    text: `${EVENT_EMOJIS[EVENT_TYPES.BUG]} Bug submitted: ${title}`,
    attachments: [
      {
        color: EVENT_COLORS[EVENT_TYPES.BUG],
        fields: [
          {
            title: 'Bug ID',
            value: id || 'N/A',
            short: true,
          },
          {
            title: 'Severity',
            value: severity || 'medium',
            short: true,
          },
          {
            title: 'Reporter',
            value: reporter || 'Unknown',
            short: true,
          },
        ],
        text: description ? description.slice(0, 200) : undefined,
        actions: url
          ? [
              {
                type: 'button',
                text: 'View Bug',
                url,
              },
            ]
          : undefined,
      },
    ],
  };
}

/**
 * Format test result notification
 * @param {Object} result - Test result data
 * @returns {Object} Slack message
 */
function formatTestNotification(result) {
  const { branch, passed, failed, total, duration, url } = result;
  const allPassed = failed === 0;
  const eventType = allPassed ? EVENT_TYPES.TEST_PASS : EVENT_TYPES.TEST_FAIL;
  const emoji = EVENT_EMOJIS[eventType];

  const status = allPassed
    ? `${passed}/${total} tests pass`
    : `${failed} tests failed`;

  return {
    text: `${emoji} ${branch} - ${status}`,
    attachments: [
      {
        color: EVENT_COLORS[eventType],
        fields: [
          {
            title: 'Branch',
            value: branch,
            short: true,
          },
          {
            title: 'Results',
            value: `${passed} passed, ${failed} failed`,
            short: true,
          },
          {
            title: 'Duration',
            value: duration || 'N/A',
            short: true,
          },
          {
            title: 'Total',
            value: String(total),
            short: true,
          },
        ],
        actions: url
          ? [
              {
                type: 'button',
                text: 'View Results',
                url,
              },
            ]
          : undefined,
      },
    ],
  };
}

/**
 * Format deploy notification
 * @param {Object} deploy - Deploy data
 * @returns {Object} Slack message
 */
function formatDeployNotification(deploy) {
  const { branch, subdomain, status, error, url, triggeredBy } = deploy;
  const success = status === 'success' || status === 'running';
  const eventType = success ? EVENT_TYPES.DEPLOY : EVENT_TYPES.DEPLOY_FAIL;
  const emoji = EVENT_EMOJIS[eventType];

  const message = success
    ? `${branch} deployed to ${subdomain}`
    : `${branch} deploy failed`;

  return {
    text: `${emoji} ${message}`,
    attachments: [
      {
        color: EVENT_COLORS[eventType],
        fields: [
          {
            title: 'Branch',
            value: branch,
            short: true,
          },
          {
            title: 'Status',
            value: status,
            short: true,
          },
          subdomain && {
            title: 'URL',
            value: `https://${subdomain}`,
            short: true,
          },
          triggeredBy && {
            title: 'Triggered By',
            value: triggeredBy,
            short: true,
          },
        ].filter(Boolean),
        text: error ? `Error: ${error}` : undefined,
        actions: url
          ? [
              {
                type: 'button',
                text: success ? 'View App' : 'View Logs',
                url,
              },
            ]
          : undefined,
      },
    ],
  };
}

/**
 * Format task claim notification
 * @param {Object} claim - Claim data
 * @returns {Object} Slack message
 */
function formatClaimNotification(claim) {
  const { user, taskId, taskTitle, phase, action = 'claimed' } = claim;
  const eventType = action === 'claimed' ? EVENT_TYPES.CLAIM : EVENT_TYPES.RELEASE;
  const emoji = EVENT_EMOJIS[eventType];

  const verb = action === 'claimed' ? 'claimed' : 'released';

  return {
    text: `${emoji} @${user} ${verb} Task ${taskId}: ${taskTitle}`,
    attachments: [
      {
        color: EVENT_COLORS[eventType],
        fields: [
          {
            title: 'Task',
            value: `${taskId}: ${taskTitle}`,
            short: false,
          },
          {
            title: 'Phase',
            value: phase || 'N/A',
            short: true,
          },
          {
            title: 'User',
            value: `@${user}`,
            short: true,
          },
        ],
      },
    ],
  };
}

/**
 * Format push notification
 * @param {Object} push - Push data
 * @returns {Object} Slack message
 */
function formatPushNotification(push) {
  const { branch, commits, author, repository } = push;
  const commitCount = commits?.length || 0;
  const emoji = EVENT_EMOJIS[EVENT_TYPES.PUSH];

  const commitList = commits
    ? commits
        .slice(0, 3)
        .map((c) => `• ${c.message?.split('\n')[0]?.slice(0, 50)}`)
        .join('\n')
    : '';

  return {
    text: `${emoji} ${branch} - ${commitCount} new commit${commitCount !== 1 ? 's' : ''}`,
    attachments: [
      {
        color: EVENT_COLORS[EVENT_TYPES.PUSH],
        fields: [
          {
            title: 'Branch',
            value: branch,
            short: true,
          },
          {
            title: 'Author',
            value: author || 'Unknown',
            short: true,
          },
          {
            title: 'Repository',
            value: repository || 'N/A',
            short: true,
          },
        ],
        text: commitList || undefined,
      },
    ],
  };
}

/**
 * Format generic notification
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @returns {Object} Slack message
 */
function formatNotification(eventType, data) {
  switch (eventType) {
    case EVENT_TYPES.BUG:
      return formatBugNotification(data);
    case EVENT_TYPES.TEST_PASS:
    case EVENT_TYPES.TEST_FAIL:
      return formatTestNotification(data);
    case EVENT_TYPES.DEPLOY:
    case EVENT_TYPES.DEPLOY_FAIL:
      return formatDeployNotification(data);
    case EVENT_TYPES.CLAIM:
    case EVENT_TYPES.RELEASE:
      return formatClaimNotification(data);
    case EVENT_TYPES.PUSH:
      return formatPushNotification(data);
    default:
      return {
        text: `${data.message || 'TLC Notification'}`,
        attachments: data.attachments,
      };
  }
}

/**
 * Validate Slack webhook URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
function isValidWebhookUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'hooks.slack.com' &&
      parsed.pathname.startsWith('/services/')
    );
  } catch {
    return false;
  }
}

/**
 * Send notification to Slack
 * @param {string} webhookUrl - Slack webhook URL
 * @param {Object} message - Message payload
 * @returns {Promise<Object>} Send result
 */
async function sendSlackNotification(webhookUrl, message) {
  if (!isValidWebhookUrl(webhookUrl)) {
    return {
      success: false,
      error: 'Invalid webhook URL',
    };
  }

  try {
    const response = await sendRequest(webhookUrl, {
      method: 'POST',
      body: message,
    });

    return {
      success: response.statusCode === 200,
      statusCode: response.statusCode,
      response: response.body,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create Slack notifier instance
 * @param {Object} options - Notifier options
 * @returns {Object} Notifier instance
 */
function createSlackNotifier(options = {}) {
  const {
    webhookUrl,
    channel,
    username = 'TLC Bot',
    iconEmoji = ':robot_face:',
    enabledEvents = Object.values(EVENT_TYPES),
  } = options;

  const queue = [];
  let processing = false;

  async function processQueue() {
    if (processing || queue.length === 0) return;

    processing = true;

    while (queue.length > 0) {
      const { eventType, data, resolve, reject } = queue.shift();

      try {
        if (!webhookUrl) {
          resolve({ success: false, error: 'No webhook URL configured' });
          continue;
        }

        if (!enabledEvents.includes(eventType) && eventType !== 'custom') {
          resolve({ success: true, skipped: true, reason: 'Event type disabled' });
          continue;
        }

        const message = eventType === 'custom' ? data : formatNotification(eventType, data);

        // Add channel and username if configured
        if (channel) message.channel = channel;
        if (username) message.username = username;
        if (iconEmoji) message.icon_emoji = iconEmoji;

        const result = await sendSlackNotification(webhookUrl, message);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    processing = false;
  }

  return {
    /**
     * Send notification
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     * @returns {Promise<Object>} Send result
     */
    notify(eventType, data) {
      return new Promise((resolve, reject) => {
        queue.push({ eventType, data, resolve, reject });
        processQueue();
      });
    },

    /**
     * Send raw Slack message
     * @param {Object} message - Slack message payload
     * @returns {Promise<Object>} Send result
     */
    send(message) {
      return new Promise((resolve, reject) => {
        queue.push({ eventType: 'custom', data: message, resolve, reject });
        processQueue();
      });
    },

    /**
     * Send bug notification
     */
    bug(data) {
      return this.notify(EVENT_TYPES.BUG, data);
    },

    /**
     * Send test result notification
     */
    testResult(data) {
      const eventType = data.failed === 0 ? EVENT_TYPES.TEST_PASS : EVENT_TYPES.TEST_FAIL;
      return this.notify(eventType, data);
    },

    /**
     * Send deploy notification
     */
    deploy(data) {
      const eventType =
        data.status === 'success' || data.status === 'running'
          ? EVENT_TYPES.DEPLOY
          : EVENT_TYPES.DEPLOY_FAIL;
      return this.notify(eventType, data);
    },

    /**
     * Send claim notification
     */
    claim(data) {
      return this.notify(EVENT_TYPES.CLAIM, { ...data, action: 'claimed' });
    },

    /**
     * Send release notification
     */
    release(data) {
      return this.notify(EVENT_TYPES.RELEASE, { ...data, action: 'released' });
    },

    /**
     * Send push notification
     */
    push(data) {
      return this.notify(EVENT_TYPES.PUSH, data);
    },

    /**
     * Check if notifier is configured
     */
    isConfigured() {
      return isValidWebhookUrl(webhookUrl);
    },

    /**
     * Get queue length
     */
    queueLength() {
      return queue.length;
    },

    EVENT_TYPES,
  };
}

/**
 * Load Slack config from .tlc.json
 * @param {Object} config - TLC config object
 * @returns {Object} Slack config
 */
function loadSlackConfig(config = {}) {
  const slack = config.slack || {};

  return {
    webhookUrl: slack.webhookUrl || process.env.SLACK_WEBHOOK_URL,
    channel: slack.channel,
    username: slack.username || 'TLC Bot',
    iconEmoji: slack.iconEmoji || ':robot_face:',
    enabledEvents: slack.events || Object.values(EVENT_TYPES),
  };
}

module.exports = {
  EVENT_TYPES,
  EVENT_EMOJIS,
  EVENT_COLORS,
  sendRequest,
  formatBugNotification,
  formatTestNotification,
  formatDeployNotification,
  formatClaimNotification,
  formatPushNotification,
  formatNotification,
  isValidWebhookUrl,
  sendSlackNotification,
  createSlackNotifier,
  loadSlackConfig,
};
