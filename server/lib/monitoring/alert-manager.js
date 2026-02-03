/**
 * Alert Manager
 * Alert routing and notifications
 */

export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Generate a unique alert ID
 * @returns {string} Unique ID
 */
function generateId() {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a fingerprint for deduplication
 * @param {Object} alert - Alert object
 * @returns {string} Fingerprint
 */
function generateFingerprint(alert) {
  return `${alert.title}_${alert.severity}_${alert.source || 'unknown'}`;
}

/**
 * Create an alert
 * @param {Object} options - Alert options
 * @param {string} options.title - Alert title
 * @param {string} options.severity - Alert severity
 * @param {string} options.description - Alert description
 * @param {string} options.source - Alert source
 * @returns {Object} Alert object
 */
export function createAlert(options = {}) {
  const { title, severity = ALERT_SEVERITY.INFO, description, source } = options;

  const alert = {
    id: generateId(),
    title,
    severity,
    description,
    source,
    timestamp: new Date().toISOString(),
    acknowledged: false,
  };

  alert.fingerprint = generateFingerprint(alert);

  return alert;
}

/**
 * Route an alert to appropriate channels
 * @param {Object} alert - Alert object
 * @param {Object} rules - Routing rules by severity
 * @returns {Array} List of channels to send to
 */
export function routeAlert(alert, rules = {}) {
  const { severity } = alert;
  return rules[severity] || [];
}

/**
 * Send alert to PagerDuty
 * @param {Object} alert - Alert object
 * @param {Object} options - Configuration options
 * @param {Function} options.post - Post function
 * @param {string} options.routingKey - PagerDuty routing key
 * @returns {Object} Response
 */
export async function sendToPagerDuty(alert, options = {}) {
  const { post, routingKey } = options;

  if (!post) {
    throw new Error('post function required');
  }

  const payload = {
    routing_key: routingKey,
    event_action: 'trigger',
    dedup_key: alert.fingerprint || alert.id,
    payload: {
      summary: alert.title,
      severity: alert.severity === ALERT_SEVERITY.CRITICAL ? 'critical' : 'warning',
      source: alert.source || 'monitoring',
      timestamp: alert.timestamp,
    },
  };

  return post('https://events.pagerduty.com/v2/enqueue', payload);
}

/**
 * Send alert to Slack
 * @param {Object} alert - Alert object
 * @param {Object} options - Configuration options
 * @param {Function} options.post - Post function
 * @param {string} options.webhookUrl - Slack webhook URL
 * @returns {Object} Response
 */
export async function sendToSlack(alert, options = {}) {
  const { post, webhookUrl } = options;

  if (!post) {
    throw new Error('post function required');
  }

  const severityEmoji = {
    [ALERT_SEVERITY.CRITICAL]: ':rotating_light:',
    [ALERT_SEVERITY.WARNING]: ':warning:',
    [ALERT_SEVERITY.INFO]: ':information_source:',
  };

  const payload = {
    text: `${severityEmoji[alert.severity] || ''} ${alert.title}`,
    attachments: [
      {
        color: alert.severity === ALERT_SEVERITY.CRITICAL ? 'danger' : 'warning',
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Time', value: alert.timestamp, short: true },
        ],
      },
    ],
  };

  if (alert.description) {
    payload.attachments[0].text = alert.description;
  }

  return post(webhookUrl, payload);
}

/**
 * Deduplicate alerts by fingerprint
 * @param {Array} alerts - Array of alerts
 * @returns {Array} Deduplicated alerts
 */
export function deduplicateAlerts(alerts) {
  const seen = new Map();

  for (const alert of alerts) {
    const key = alert.fingerprint;
    if (!seen.has(key)) {
      seen.set(key, alert);
    }
  }

  return Array.from(seen.values());
}

/**
 * Acknowledge an alert
 * @param {Object} alert - Alert object
 * @param {Object} options - Acknowledgment options
 * @param {string} options.user - User acknowledging
 * @param {string} options.note - Acknowledgment note
 * @returns {Object} Acknowledged alert
 */
export function acknowledgeAlert(alert, options = {}) {
  const { user, note } = options;

  return {
    ...alert,
    acknowledged: true,
    acknowledgedBy: user,
    acknowledgedAt: new Date().toISOString(),
    acknowledgeNote: note,
  };
}

/**
 * Create an alert manager
 * @param {Object} options - Configuration options
 * @param {Object} options.escalation - Escalation rules
 * @param {Object} options.routing - Routing rules
 * @returns {Object} Alert manager
 */
export function createAlertManager(options = {}) {
  const { escalation, routing = {} } = options;

  const alerts = new Map();
  const config = {
    escalation,
    routing,
  };

  return {
    async send(alertOptions) {
      const alert = createAlert(alertOptions);
      alerts.set(alert.id, alert);

      const routes = routeAlert(alert, config.routing);
      return { alert, routes };
    },

    acknowledge(alertId, ackOptions) {
      const alert = alerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      const acked = acknowledgeAlert(alert, ackOptions);
      alerts.set(alertId, acked);
      return acked;
    },

    list(filter = {}) {
      let result = Array.from(alerts.values());

      if (filter.severity) {
        result = result.filter((a) => a.severity === filter.severity);
      }

      if (filter.acknowledged !== undefined) {
        result = result.filter((a) => a.acknowledged === filter.acknowledged);
      }

      return result;
    },

    get(alertId) {
      return alerts.get(alertId);
    },

    configure(newConfig) {
      Object.assign(config, newConfig);
    },

    getConfig() {
      return { ...config };
    },
  };
}
