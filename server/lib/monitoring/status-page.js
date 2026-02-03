/**
 * Status Page Generator
 * Generates HTML status pages and RSS feeds
 */

/**
 * Component status constants
 */
export const COMPONENT_STATUS = {
  OPERATIONAL: 'operational',
  DEGRADED: 'degraded',
  OUTAGE: 'outage',
  MAINTENANCE: 'maintenance',
};

/**
 * Gets component status based on health metrics
 * @param {Object} component - Component health data
 * @param {boolean} component.healthy - Is component healthy
 * @param {number} component.responseTime - Response time in ms
 * @param {number} component.threshold - Response time threshold
 * @returns {string} Component status
 */
export function getComponentStatus(component) {
  if (!component.healthy) {
    return COMPONENT_STATUS.OUTAGE;
  }

  if (component.threshold && component.responseTime > component.threshold) {
    return COMPONENT_STATUS.DEGRADED;
  }

  return COMPONENT_STATUS.OPERATIONAL;
}

/**
 * Calculates overall status from components
 * @param {Array} components - Component statuses
 * @returns {string} Overall status
 */
function getOverallStatus(components) {
  if (components.some(c => c.status === COMPONENT_STATUS.OUTAGE)) {
    return COMPONENT_STATUS.OUTAGE;
  }
  if (components.some(c => c.status === COMPONENT_STATUS.MAINTENANCE)) {
    return COMPONENT_STATUS.MAINTENANCE;
  }
  if (components.some(c => c.status === COMPONENT_STATUS.DEGRADED)) {
    return COMPONENT_STATUS.DEGRADED;
  }
  return COMPONENT_STATUS.OPERATIONAL;
}

/**
 * Generates an HTML status page
 * @param {Object} options - Page options
 * @param {string} options.title - Page title
 * @param {Array} options.components - Component statuses
 * @param {Array} options.incidents - Recent incidents
 * @returns {string} HTML status page
 */
export function generateStatusPage(options) {
  const { title = 'Status Page', components = [], incidents = [] } = options;
  const overall = getOverallStatus(components);

  const componentHtml = components
    .map(c => `<div class="component ${c.status}"><span class="name">${c.name}</span><span class="status">${c.status}</span></div>`)
    .join('\n');

  const incidentHtml = incidents.length > 0
    ? formatIncidentHistory(incidents)
    : '<p>No recent incidents</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .overall { padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .overall.operational { background: #d4edda; }
    .overall.degraded { background: #fff3cd; }
    .overall.outage { background: #f8d7da; }
    .overall.maintenance { background: #cce5ff; }
    .component { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
    .incident { margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="overall ${overall}">
    <strong>Overall Status:</strong> ${overall}
  </div>
  <h2>Components</h2>
  <div class="components">
    ${componentHtml}
  </div>
  <h2>Incident History</h2>
  <div class="incidents">
    ${incidentHtml}
  </div>
</body>
</html>`;
}

/**
 * Formats incident history as HTML
 * @param {Array} incidents - Incidents to format
 * @returns {string} HTML incident list
 */
export function formatIncidentHistory(incidents) {
  return incidents
    .map(incident => `<div class="incident">
  <h3>${incident.title}</h3>
  <p><strong>Date:</strong> ${incident.date}</p>
  <p><strong>Status:</strong> ${incident.status}</p>
</div>`)
    .join('\n');
}

/**
 * Generates an RSS feed for status updates
 * @param {Object} options - Feed options
 * @param {string} options.title - Feed title
 * @param {Array} options.incidents - Incidents to include
 * @returns {string} RSS XML
 */
export function generateRssFeed(options) {
  const { title = 'Status Updates', incidents = [] } = options;

  const items = incidents
    .map(incident => `    <item>
      <title>${incident.title}</title>
      <pubDate>${incident.date}</pubDate>
    </item>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${title}</title>
    <description>Status updates and incidents</description>
${items}
  </channel>
</rss>`;
}

/**
 * Creates a status page generator instance
 * @returns {Object} Generator with methods
 */
export function createStatusPageGenerator() {
  const components = [];
  const incidents = [];
  const maintenanceSchedule = [];

  return {
    /**
     * Adds a component to track
     * @param {Object} component - Component configuration
     */
    addComponent(component) {
      components.push(component);
    },

    /**
     * Adds an incident
     * @param {Object} incident - Incident to add
     */
    addIncident(incident) {
      incidents.push(incident);
    },

    /**
     * Schedules maintenance for a component
     * @param {Object} maintenance - Maintenance schedule
     */
    scheduleMaintenance(maintenance) {
      maintenanceSchedule.push(maintenance);

      // Find component and update its status
      const componentIndex = components.findIndex(c => c.name === maintenance.component);
      if (componentIndex >= 0) {
        components[componentIndex].status = COMPONENT_STATUS.MAINTENANCE;
      } else {
        components.push({
          name: maintenance.component,
          status: COMPONENT_STATUS.MAINTENANCE,
        });
      }
    },

    /**
     * Generates the status page HTML
     * @returns {string} HTML status page
     */
    generate() {
      return generateStatusPage({
        components,
        incidents,
      });
    },

    /**
     * Gets RSS feed
     * @returns {string} RSS XML
     */
    getRss() {
      return generateRssFeed({ incidents });
    },
  };
}
