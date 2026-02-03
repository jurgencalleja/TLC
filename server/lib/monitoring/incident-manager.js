/**
 * Incident Manager
 * Manages incidents with timeline tracking and MTTR metrics
 */

import { randomUUID } from 'crypto';

/**
 * Incident status constants
 */
export const INCIDENT_STATUS = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
};

/**
 * Creates a new incident from an alert or manual trigger
 * @param {Object} options - Incident options
 * @param {Object} options.alert - Source alert
 * @param {string} options.title - Incident title
 * @returns {Object} Created incident
 */
export function createIncident(options = {}) {
  const { alert, title } = options;
  const now = new Date();

  return {
    id: randomUUID(),
    title: alert?.title || title || 'Untitled Incident',
    status: INCIDENT_STATUS.OPEN,
    alerts: alert ? [alert] : [],
    createdAt: now,
    updatedAt: now,
    statusHistory: [
      {
        status: INCIDENT_STATUS.OPEN,
        timestamp: now,
      },
    ],
  };
}

/**
 * Generates a timeline from incident events
 * @param {Object} options - Timeline options
 * @param {Array} options.events - Events to include
 * @returns {Array} Sorted timeline entries
 */
export function generateTimeline(options) {
  const { events } = options;
  return events
    .map(event => ({
      ...event,
      timestamp: new Date(event.timestamp),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Links related alerts to an incident
 * @param {Object} incident - Incident to link to
 * @param {Array} alerts - Alerts to link
 * @returns {Object} Updated incident
 */
export function linkAlerts(incident, alerts) {
  return {
    ...incident,
    alerts: [...(incident.alerts || []), ...alerts],
    updatedAt: new Date(),
  };
}

/**
 * Updates incident status
 * @param {Object} incident - Incident to update
 * @param {string} status - New status
 * @returns {Object} Updated incident
 */
export function updateStatus(incident, status) {
  const now = new Date();
  return {
    ...incident,
    status,
    updatedAt: now,
    resolvedAt: status === INCIDENT_STATUS.RESOLVED ? now : incident.resolvedAt,
    statusHistory: [
      ...(incident.statusHistory || []),
      {
        status,
        timestamp: now,
      },
    ],
  };
}

/**
 * Generates a post-mortem template for an incident
 * @param {Object} options - Post-mortem options
 * @param {Object} options.incident - Incident to generate post-mortem for
 * @returns {string} Markdown post-mortem template
 */
export function generatePostMortem(options) {
  const { incident } = options;

  return `# Post-Mortem: ${incident.title}

## Incident ID
${incident.id}

## Summary
[Brief description of what happened]

## Timeline
[Key events and timestamps]

## Root Cause
[What caused the incident]

## Impact
[Who/what was affected]

## Resolution
[How the incident was resolved]

## Action Items
- [ ] [Action item 1]
- [ ] [Action item 2]

## Lessons Learned
[Key takeaways]
`;
}

/**
 * Calculates mean time to resolve (MTTR) for incidents
 * @param {Array} incidents - Resolved incidents with createdAt and resolvedAt
 * @returns {number} MTTR in milliseconds
 */
export function calculateMttr(incidents) {
  if (!incidents || incidents.length === 0) {
    return 0;
  }

  const resolvedIncidents = incidents.filter(i => i.resolvedAt);
  if (resolvedIncidents.length === 0) {
    return 0;
  }

  const totalTime = resolvedIncidents.reduce((sum, incident) => {
    const created = new Date(incident.createdAt).getTime();
    const resolved = new Date(incident.resolvedAt).getTime();
    return sum + (resolved - created);
  }, 0);

  return totalTime / resolvedIncidents.length;
}

/**
 * Creates an incident manager instance
 * @returns {Object} Incident manager with methods
 */
export function createIncidentManager() {
  const incidents = new Map();

  return {
    /**
     * Creates a new incident
     * @param {Object} options - Incident options
     * @returns {Object} Created incident
     */
    create(options) {
      const incident = createIncident(options);
      incidents.set(incident.id, incident);
      return incident;
    },

    /**
     * Updates an existing incident
     * @param {string} id - Incident ID
     * @param {Object} updates - Updates to apply
     * @returns {Object} Updated incident
     */
    update(id, updates) {
      const incident = incidents.get(id);
      if (!incident) {
        throw new Error(`Incident ${id} not found`);
      }
      const updated = {
        ...incident,
        ...updates,
        updatedAt: new Date(),
      };
      incidents.set(id, updated);
      return updated;
    },

    /**
     * Resolves an incident
     * @param {string} id - Incident ID
     * @returns {Object} Resolved incident
     */
    resolve(id) {
      const incident = incidents.get(id);
      if (!incident) {
        throw new Error(`Incident ${id} not found`);
      }
      const resolved = updateStatus(incident, INCIDENT_STATUS.RESOLVED);
      incidents.set(id, resolved);
      return resolved;
    },

    /**
     * Gets incident metrics
     * @returns {Object} Metrics including MTTR
     */
    getMetrics() {
      const all = Array.from(incidents.values());
      const resolved = all.filter(i => i.status === INCIDENT_STATUS.RESOLVED);

      return {
        total: all.length,
        open: all.filter(i => i.status === INCIDENT_STATUS.OPEN).length,
        investigating: all.filter(i => i.status === INCIDENT_STATUS.INVESTIGATING).length,
        resolved: resolved.length,
        mttr: calculateMttr(resolved),
      };
    },
  };
}
