/**
 * Release Audit - Immutable release history with full audit trail
 * for compliance tracking. Records all release lifecycle events and
 * provides querying and reporting capabilities.
 *
 * @module release-audit
 */

/**
 * @typedef {Object} ReleaseEvent
 * @property {string} id - Unique event identifier for deduplication
 * @property {string} tag - The git tag this event relates to
 * @property {string} action - Event action: created, gates-passed, gates-failed, deployed, accepted, rejected, promoted
 * @property {string} user - User or system that triggered the event
 * @property {string} timestamp - ISO 8601 timestamp of the event
 * @property {Object} details - Action-specific detail object
 */

/**
 * @typedef {Object} AuditSummaryEntry
 * @property {string} tag - The git tag
 * @property {string} status - Current status (latest action)
 * @property {string} lastEvent - Name of the most recent action
 * @property {string} lastUpdated - ISO 8601 timestamp of the most recent event
 */

/**
 * @typedef {Object} AuditQueryOptions
 * @property {string} [status] - Filter by latest status (action)
 * @property {string} [dateFrom] - ISO 8601 lower bound for event timestamps
 * @property {string} [dateTo] - ISO 8601 upper bound for event timestamps
 * @property {string} [reviewer] - Filter by user who performed accept/reject actions
 */

let idCounter = 0;

/**
 * Generate a unique event ID.
 *
 * @returns {string} A unique identifier string
 */
function generateId() {
  idCounter += 1;
  const ts = Date.now().toString(36);
  const count = idCounter.toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `evt-${ts}-${count}-${rand}`;
}

/**
 * Deep-clone a plain object to ensure immutability of stored data.
 *
 * @param {Object} obj - Object to clone
 * @returns {Object} A deep copy of the input
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Create a release audit instance for recording and querying
 * immutable release history events.
 *
 * @param {Object} options - Configuration options
 * @param {string|null} options.storageDir - Directory for file persistence, or null for in-memory only
 * @returns {{ recordEvent: Function, getEvents: Function, getLatestStatus: Function, query: Function, generateReport: Function, getSummary: Function, getAuditTrail: Function }}
 */
export function createReleaseAudit(options = {}) {
  /**
   * In-memory storage: Map of tag -> event[]
   * Events are stored in insertion order (chronological).
   * @type {Map<string, ReleaseEvent[]>}
   */
  const store = new Map();

  /**
   * Record a new event for a tag. Events are append-only.
   *
   * @param {string} tag - The git tag to record an event for
   * @param {Object} eventData - Event data
   * @param {string} eventData.action - Event action (created, gates-passed, gates-failed, deployed, accepted, rejected, promoted)
   * @param {string} eventData.user - User or system that triggered the event
   * @param {Object} eventData.details - Action-specific details
   * @returns {ReleaseEvent} The recorded event with generated id and timestamp
   */
  function recordEvent(tag, eventData) {
    const event = {
      id: generateId(),
      tag,
      action: eventData.action,
      user: eventData.user,
      timestamp: new Date().toISOString(),
      details: deepClone(eventData.details || {}),
    };

    if (!store.has(tag)) {
      store.set(tag, []);
    }
    store.get(tag).push(deepClone(event));

    return deepClone(event);
  }

  /**
   * Get all events for a tag in chronological order.
   * Returns a deep copy to preserve immutability.
   *
   * @param {string} tag - The git tag to get events for
   * @returns {ReleaseEvent[]} Array of events, or empty array if tag not found
   */
  function getEvents(tag) {
    const events = store.get(tag);
    if (!events) {
      return [];
    }
    return deepClone(events);
  }

  /**
   * Get the latest status for a tag, derived from the most recent event's action.
   *
   * @param {string} tag - The git tag to check
   * @returns {string|undefined} The action of the most recent event, or undefined if no events
   */
  function getLatestStatus(tag) {
    const events = store.get(tag);
    if (!events || events.length === 0) {
      return undefined;
    }
    return events[events.length - 1].action;
  }

  /**
   * Query tags by filters: status, date range, and/or reviewer.
   * Returns an array of tag names matching all provided criteria.
   *
   * @param {AuditQueryOptions} filters - Query filters
   * @returns {string[]} Array of matching tag names
   */
  function query(filters = {}) {
    const tags = [];

    for (const [tag, events] of store.entries()) {
      let matches = true;

      // Filter by status (latest action)
      if (filters.status) {
        const latestAction = events[events.length - 1].action;
        if (latestAction !== filters.status) {
          matches = false;
        }
      }

      // Filter by date range - check if any event falls within range
      if (filters.dateFrom || filters.dateTo) {
        const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : -Infinity;
        const to = filters.dateTo ? new Date(filters.dateTo).getTime() : Infinity;
        const hasEventInRange = events.some((e) => {
          const t = new Date(e.timestamp).getTime();
          return t >= from && t <= to;
        });
        if (!hasEventInRange) {
          matches = false;
        }
      }

      // Filter by reviewer (user who performed accept or reject)
      if (filters.reviewer) {
        const hasReviewer = events.some(
          (e) =>
            (e.action === 'accepted' || e.action === 'rejected') &&
            e.user === filters.reviewer
        );
        if (!hasReviewer) {
          matches = false;
        }
      }

      if (matches) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * Generate a markdown release report for a specific tag.
   * Includes a timeline of all events, gate results summary table,
   * and all timestamps.
   *
   * @param {string} tag - The git tag to generate a report for
   * @returns {string} Markdown-formatted report string
   */
  function generateReport(tag) {
    const events = store.get(tag);
    if (!events || events.length === 0) {
      return `# Release Report: ${tag}\n\nNo events recorded.\n`;
    }

    const lines = [];
    lines.push(`# Release Report: ${tag}`);
    lines.push('');
    lines.push(`**Status:** ${events[events.length - 1].action}`);
    lines.push('');

    // Gate results summary table
    const gateEvents = events.filter(
      (e) => e.action === 'gates-passed' || e.action === 'gates-failed'
    );
    if (gateEvents.length > 0) {
      lines.push('## Gate Results');
      lines.push('');
      lines.push('| Gate | Status | Duration |');
      lines.push('|------|--------|----------|');
      for (const ge of gateEvents) {
        if (ge.details && ge.details.gateResults) {
          for (const gr of ge.details.gateResults) {
            const duration = gr.duration != null ? `${gr.duration}ms` : '-';
            lines.push(`| ${gr.gate} | ${gr.status} | ${duration} |`);
          }
        }
      }
      lines.push('');
    }

    // Event timeline
    lines.push('## Event Timeline');
    lines.push('');
    for (const event of events) {
      lines.push(`### ${event.action}`);
      lines.push('');
      lines.push(`- **Timestamp:** ${event.timestamp}`);
      lines.push(`- **User:** ${event.user}`);
      if (event.details && Object.keys(event.details).length > 0) {
        // Skip gateResults in the timeline since they're in the summary table
        const detailKeys = Object.keys(event.details).filter(
          (k) => k !== 'gateResults'
        );
        for (const key of detailKeys) {
          const val = event.details[key];
          const display = typeof val === 'object' ? JSON.stringify(val) : val;
          lines.push(`- **${key}:** ${display}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get a summary of all tracked tags with their current status.
   *
   * @returns {AuditSummaryEntry[]} Array of summary entries
   */
  function getSummary() {
    const summaries = [];

    for (const [tag, events] of store.entries()) {
      if (events.length === 0) {
        continue;
      }
      const lastEvent = events[events.length - 1];
      summaries.push({
        tag,
        status: lastEvent.action,
        lastEvent: lastEvent.action,
        lastUpdated: lastEvent.timestamp,
      });
    }

    return summaries;
  }

  /**
   * Get the full audit trail for a tag, sorted by time.
   * Alias for getEvents that emphasizes the audit/compliance use case.
   *
   * @param {string} tag - The git tag to get the audit trail for
   * @returns {ReleaseEvent[]} Array of events sorted chronologically
   */
  function getAuditTrail(tag) {
    return getEvents(tag);
  }

  return {
    recordEvent,
    getEvents,
    getLatestStatus,
    query,
    generateReport,
    getSummary,
    getAuditTrail,
  };
}

export default { createReleaseAudit };
