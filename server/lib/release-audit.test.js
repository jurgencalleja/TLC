import { describe, it, expect, beforeEach } from 'vitest';
import { createReleaseAudit } from './release-audit.js';

describe('release-audit', () => {
  let audit;

  beforeEach(() => {
    audit = createReleaseAudit({ storageDir: null });
  });

  describe('recordEvent', () => {
    it('records creation event with timestamp, user, tag, and action=created', () => {
      const event = audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: { commit: 'abc123' },
      });

      expect(event.tag).toBe('v1.0.0-rc.1');
      expect(event.action).toBe('created');
      expect(event.user).toBe('alice');
      expect(event.timestamp).toBeTypeOf('string');
      expect(event.details.commit).toBe('abc123');
    });

    it('records gate-passed event with gate results', () => {
      const gateResults = [
        { gate: 'tests', status: 'pass', duration: 120 },
        { gate: 'security', status: 'pass', duration: 45 },
      ];
      const event = audit.recordEvent('v1.0.0-rc.1', {
        action: 'gates-passed',
        user: 'ci-bot',
        details: { gateResults },
      });

      expect(event.action).toBe('gates-passed');
      expect(event.details.gateResults).toEqual(gateResults);
    });

    it('records gate-failed event with failure details', () => {
      const event = audit.recordEvent('v1.0.0-rc.1', {
        action: 'gates-failed',
        user: 'ci-bot',
        details: {
          failedGate: 'security',
          reason: 'Secret detected in config.js',
        },
      });

      expect(event.action).toBe('gates-failed');
      expect(event.details.failedGate).toBe('security');
      expect(event.details.reason).toBe('Secret detected in config.js');
    });

    it('records deployed event with preview URL', () => {
      const event = audit.recordEvent('v1.0.0-rc.1', {
        action: 'deployed',
        user: 'ci-bot',
        details: { previewUrl: 'https://qa-v1.0.0-rc.1.example.com' },
      });

      expect(event.action).toBe('deployed');
      expect(event.details.previewUrl).toBe('https://qa-v1.0.0-rc.1.example.com');
    });

    it('records QA accepted event with reviewer identity', () => {
      const event = audit.recordEvent('v1.0.0-rc.1', {
        action: 'accepted',
        user: 'qa-bob',
        details: { comment: 'Looks good' },
      });

      expect(event.action).toBe('accepted');
      expect(event.user).toBe('qa-bob');
    });

    it('records QA rejected event with reviewer and reason', () => {
      const event = audit.recordEvent('v1.0.0-rc.1', {
        action: 'rejected',
        user: 'qa-carol',
        details: { reason: 'Login page has UI regression' },
      });

      expect(event.action).toBe('rejected');
      expect(event.user).toBe('qa-carol');
      expect(event.details.reason).toBe('Login page has UI regression');
    });

    it('records promotion event with production tag', () => {
      const event = audit.recordEvent('v1.0.0-rc.1', {
        action: 'promoted',
        user: 'admin-dave',
        details: { productionTag: 'v1.0.0' },
      });

      expect(event.action).toBe('promoted');
      expect(event.details.productionTag).toBe('v1.0.0');
    });

    it('events include unique ID for deduplication', () => {
      const event1 = audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: {},
      });
      const event2 = audit.recordEvent('v1.0.0-rc.1', {
        action: 'deployed',
        user: 'ci-bot',
        details: {},
      });

      expect(event1.id).toBeTypeOf('string');
      expect(event2.id).toBeTypeOf('string');
      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('getEvents', () => {
    it('returns per-tag events in chronological order', () => {
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'gates-passed',
        user: 'ci-bot',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'deployed',
        user: 'ci-bot',
        details: {},
      });

      const events = audit.getEvents('v1.0.0-rc.1');

      expect(events).toHaveLength(3);
      expect(events[0].action).toBe('created');
      expect(events[1].action).toBe('gates-passed');
      expect(events[2].action).toBe('deployed');
      // Chronological: each timestamp >= previous
      for (let i = 1; i < events.length; i++) {
        expect(events[i].timestamp >= events[i - 1].timestamp).toBe(true);
      }
    });

    it('returns empty array for non-existent tag', () => {
      const events = audit.getEvents('v99.99.99');

      expect(events).toEqual([]);
    });

    it('multiple tags tracked independently', () => {
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: {},
      });
      audit.recordEvent('v2.0.0-rc.1', {
        action: 'created',
        user: 'bob',
        details: {},
      });

      const eventsV1 = audit.getEvents('v1.0.0-rc.1');
      const eventsV2 = audit.getEvents('v2.0.0-rc.1');

      expect(eventsV1).toHaveLength(1);
      expect(eventsV1[0].user).toBe('alice');
      expect(eventsV2).toHaveLength(1);
      expect(eventsV2[0].user).toBe('bob');
    });
  });

  describe('append-only history', () => {
    it('past events cannot be modified through returned array', () => {
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: { commit: 'abc123' },
      });

      const events = audit.getEvents('v1.0.0-rc.1');
      // Attempt to mutate the returned array
      events.push({ action: 'hacked', user: 'evil' });
      events[0].action = 'tampered';

      // Original data is unchanged
      const freshEvents = audit.getEvents('v1.0.0-rc.1');
      expect(freshEvents).toHaveLength(1);
      expect(freshEvents[0].action).toBe('created');
    });
  });

  describe('getLatestStatus', () => {
    it('returns latest status for a tag based on most recent event action', () => {
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'gates-passed',
        user: 'ci-bot',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'deployed',
        user: 'ci-bot',
        details: {},
      });

      expect(audit.getLatestStatus('v1.0.0-rc.1')).toBe('deployed');
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Create a rich dataset for querying
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'accepted',
        user: 'qa-bob',
        details: {},
      });
      audit.recordEvent('v2.0.0-rc.1', {
        action: 'created',
        user: 'carol',
        details: {},
      });
      audit.recordEvent('v2.0.0-rc.1', {
        action: 'rejected',
        user: 'qa-dave',
        details: { reason: 'Broken layout' },
      });
      audit.recordEvent('v3.0.0-rc.1', {
        action: 'created',
        user: 'eve',
        details: {},
      });
    });

    it('filters releases by status (accepted)', () => {
      const results = audit.query({ status: 'accepted' });

      expect(results).toContain('v1.0.0-rc.1');
      expect(results).not.toContain('v2.0.0-rc.1');
      expect(results).not.toContain('v3.0.0-rc.1');
    });

    it('filters releases by status (rejected)', () => {
      const results = audit.query({ status: 'rejected' });

      expect(results).toContain('v2.0.0-rc.1');
      expect(results).not.toContain('v1.0.0-rc.1');
    });

    it('filters releases by status (created for pending)', () => {
      const results = audit.query({ status: 'created' });

      expect(results).toContain('v3.0.0-rc.1');
    });

    it('filters releases by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      const results = audit.query({
        dateFrom: yesterday.toISOString(),
        dateTo: tomorrow.toISOString(),
      });

      // All events were created just now, so all tags should match
      expect(results).toContain('v1.0.0-rc.1');
      expect(results).toContain('v2.0.0-rc.1');
      expect(results).toContain('v3.0.0-rc.1');
    });

    it('filters releases by date range excludes out-of-range', () => {
      const longAgo = new Date('2020-01-01T00:00:00Z');
      const alsoLongAgo = new Date('2020-01-02T00:00:00Z');

      const results = audit.query({
        dateFrom: longAgo.toISOString(),
        dateTo: alsoLongAgo.toISOString(),
      });

      expect(results).toHaveLength(0);
    });

    it('filters releases by QA reviewer name', () => {
      const results = audit.query({ reviewer: 'qa-bob' });

      expect(results).toContain('v1.0.0-rc.1');
      expect(results).not.toContain('v2.0.0-rc.1');
    });
  });

  describe('generateReport', () => {
    it('generates markdown report for a tag release', () => {
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: { commit: 'abc123' },
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'gates-passed',
        user: 'ci-bot',
        details: {
          gateResults: [
            { gate: 'tests', status: 'pass', duration: 120 },
            { gate: 'security', status: 'pass', duration: 45 },
          ],
        },
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'accepted',
        user: 'qa-bob',
        details: { comment: 'Looks good' },
      });

      const report = audit.generateReport('v1.0.0-rc.1');

      expect(report).toBeTypeOf('string');
      expect(report).toContain('v1.0.0-rc.1');
      expect(report).toContain('created');
      expect(report).toContain('gates-passed');
      expect(report).toContain('accepted');
    });

    it('markdown report includes all events with timestamps', () => {
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'deployed',
        user: 'ci-bot',
        details: { previewUrl: 'https://qa.example.com' },
      });

      const report = audit.generateReport('v1.0.0-rc.1');

      // Report includes timestamps for each event
      const events = audit.getEvents('v1.0.0-rc.1');
      for (const event of events) {
        expect(report).toContain(event.timestamp);
      }
    });

    it('report includes gate results summary table', () => {
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'gates-passed',
        user: 'ci-bot',
        details: {
          gateResults: [
            { gate: 'tests', status: 'pass', duration: 120 },
            { gate: 'security', status: 'pass', duration: 45 },
          ],
        },
      });

      const report = audit.generateReport('v1.0.0-rc.1');

      // Should contain a table with gate names and statuses
      expect(report).toContain('tests');
      expect(report).toContain('security');
      expect(report).toContain('pass');
      expect(report).toContain('Gate');
      expect(report).toContain('Status');
    });
  });

  describe('getSummary', () => {
    it('returns summary index tracking all tags with their current status', () => {
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'accepted',
        user: 'qa-bob',
        details: {},
      });
      audit.recordEvent('v2.0.0-rc.1', {
        action: 'created',
        user: 'carol',
        details: {},
      });

      const summary = audit.getSummary();

      expect(summary).toHaveLength(2);

      const v1Summary = summary.find(s => s.tag === 'v1.0.0-rc.1');
      expect(v1Summary).toBeDefined();
      expect(v1Summary.status).toBe('accepted');
      expect(v1Summary.lastEvent).toBe('accepted');
      expect(v1Summary.lastUpdated).toBeTypeOf('string');

      const v2Summary = summary.find(s => s.tag === 'v2.0.0-rc.1');
      expect(v2Summary).toBeDefined();
      expect(v2Summary.status).toBe('created');
    });
  });

  describe('getAuditTrail', () => {
    it('returns all events for a tag sorted by time', () => {
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'created',
        user: 'alice',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'gates-passed',
        user: 'ci-bot',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'deployed',
        user: 'ci-bot',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'accepted',
        user: 'qa-bob',
        details: {},
      });
      audit.recordEvent('v1.0.0-rc.1', {
        action: 'promoted',
        user: 'admin',
        details: { productionTag: 'v1.0.0' },
      });

      const trail = audit.getAuditTrail('v1.0.0-rc.1');

      expect(trail).toHaveLength(5);
      expect(trail.map(e => e.action)).toEqual([
        'created',
        'gates-passed',
        'deployed',
        'accepted',
        'promoted',
      ]);
      // Sorted by time
      for (let i = 1; i < trail.length; i++) {
        expect(trail[i].timestamp >= trail[i - 1].timestamp).toBe(true);
      }
    });
  });
});
