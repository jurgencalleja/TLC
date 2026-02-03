/**
 * Status Page Generator Tests
 */
import { describe, it, expect } from 'vitest';
import {
  generateStatusPage,
  getComponentStatus,
  formatIncidentHistory,
  generateRssFeed,
  COMPONENT_STATUS,
  createStatusPageGenerator,
} from './status-page.js';

describe('status-page', () => {
  describe('COMPONENT_STATUS', () => {
    it('defines status constants', () => {
      expect(COMPONENT_STATUS.OPERATIONAL).toBe('operational');
      expect(COMPONENT_STATUS.DEGRADED).toBe('degraded');
      expect(COMPONENT_STATUS.OUTAGE).toBe('outage');
      expect(COMPONENT_STATUS.MAINTENANCE).toBe('maintenance');
    });
  });

  describe('generateStatusPage', () => {
    it('generates HTML status page', () => {
      const html = generateStatusPage({
        title: 'Service Status',
        components: [{ name: 'API', status: 'operational' }],
      });
      expect(html).toContain('<html');
      expect(html).toContain('Service Status');
      expect(html).toContain('API');
    });

    it('shows overall status', () => {
      const html = generateStatusPage({
        components: [
          { name: 'API', status: 'operational' },
          { name: 'DB', status: 'degraded' },
        ],
      });
      expect(html).toContain('degraded');
    });
  });

  describe('getComponentStatus', () => {
    it('returns operational for healthy component', () => {
      const status = getComponentStatus({ healthy: true, responseTime: 100 });
      expect(status).toBe('operational');
    });

    it('returns degraded for slow component', () => {
      const status = getComponentStatus({ healthy: true, responseTime: 5000, threshold: 1000 });
      expect(status).toBe('degraded');
    });

    it('returns outage for unhealthy component', () => {
      const status = getComponentStatus({ healthy: false });
      expect(status).toBe('outage');
    });
  });

  describe('formatIncidentHistory', () => {
    it('formats incident list', () => {
      const html = formatIncidentHistory([
        { title: 'API Outage', date: '2024-01-01', status: 'resolved' },
      ]);
      expect(html).toContain('API Outage');
      expect(html).toContain('resolved');
    });
  });

  describe('generateRssFeed', () => {
    it('generates RSS feed', () => {
      const rss = generateRssFeed({
        title: 'Status Updates',
        incidents: [{ title: 'Outage', date: '2024-01-01' }],
      });
      expect(rss).toContain('<?xml');
      expect(rss).toContain('<rss');
      expect(rss).toContain('Outage');
    });
  });

  describe('createStatusPageGenerator', () => {
    it('creates generator with methods', () => {
      const generator = createStatusPageGenerator();
      expect(generator.generate).toBeDefined();
      expect(generator.addComponent).toBeDefined();
      expect(generator.addIncident).toBeDefined();
      expect(generator.getRss).toBeDefined();
    });

    it('supports scheduled maintenance', () => {
      const generator = createStatusPageGenerator();
      generator.scheduleMaintenance({
        component: 'API',
        start: new Date(),
        end: new Date(Date.now() + 3600000),
      });
      const page = generator.generate();
      expect(page).toContain('maintenance');
    });
  });
});
