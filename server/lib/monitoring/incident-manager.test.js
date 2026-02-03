/**
 * Incident Manager Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createIncident,
  generateTimeline,
  linkAlerts,
  updateStatus,
  generatePostMortem,
  calculateMttr,
  INCIDENT_STATUS,
  createIncidentManager,
} from './incident-manager.js';

describe('incident-manager', () => {
  describe('INCIDENT_STATUS', () => {
    it('defines status constants', () => {
      expect(INCIDENT_STATUS.OPEN).toBe('open');
      expect(INCIDENT_STATUS.INVESTIGATING).toBe('investigating');
      expect(INCIDENT_STATUS.RESOLVED).toBe('resolved');
    });
  });

  describe('createIncident', () => {
    it('creates incident from alert', () => {
      const incident = createIncident({ alert: { id: 'a1', title: 'DB Down' } });
      expect(incident.id).toBeDefined();
      expect(incident.title).toBe('DB Down');
      expect(incident.status).toBe('open');
    });
  });

  describe('generateTimeline', () => {
    it('generates timeline from events', () => {
      const timeline = generateTimeline({
        events: [
          { type: 'alert', timestamp: new Date('2024-01-01T10:00:00Z') },
          { type: 'acknowledge', timestamp: new Date('2024-01-01T10:05:00Z') },
        ],
      });
      expect(timeline.length).toBe(2);
    });
  });

  describe('linkAlerts', () => {
    it('links related alerts to incident', () => {
      const incident = createIncident({ title: 'Outage' });
      const linked = linkAlerts(incident, [{ id: 'a1' }, { id: 'a2' }]);
      expect(linked.alerts).toHaveLength(2);
    });
  });

  describe('updateStatus', () => {
    it('updates incident status', () => {
      const incident = createIncident({ title: 'Test' });
      const updated = updateStatus(incident, 'investigating');
      expect(updated.status).toBe('investigating');
    });

    it('records status history', () => {
      const incident = createIncident({ title: 'Test' });
      const updated = updateStatus(incident, 'resolved');
      expect(updated.statusHistory.length).toBeGreaterThan(0);
    });
  });

  describe('generatePostMortem', () => {
    it('generates post-mortem template', () => {
      const postMortem = generatePostMortem({
        incident: { id: 'i1', title: 'Outage' },
      });
      expect(postMortem).toContain('# Post-Mortem');
      expect(postMortem).toContain('Outage');
    });
  });

  describe('calculateMttr', () => {
    it('calculates mean time to resolve', () => {
      const incidents = [
        { createdAt: new Date('2024-01-01T10:00:00Z'), resolvedAt: new Date('2024-01-01T11:00:00Z') },
        { createdAt: new Date('2024-01-02T10:00:00Z'), resolvedAt: new Date('2024-01-02T10:30:00Z') },
      ];
      const mttr = calculateMttr(incidents);
      expect(mttr).toBe(45 * 60 * 1000); // 45 minutes
    });
  });

  describe('createIncidentManager', () => {
    it('creates manager with methods', () => {
      const manager = createIncidentManager();
      expect(manager.create).toBeDefined();
      expect(manager.update).toBeDefined();
      expect(manager.resolve).toBeDefined();
      expect(manager.getMetrics).toBeDefined();
    });
  });
});
