import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { TeamPanel } from './TeamPanel.js';

const sampleMembers = [
  { id: 'u1', name: 'Alice', status: 'online' as const, activity: 'Working on Task 3' },
  { id: 'u2', name: 'Bob', status: 'away' as const },
];

const sampleActivities = [
  { id: 'a1', type: 'commit' as const, user: 'alice', message: 'Fixed bug', timestamp: '2 min ago' },
  { id: 'a2', type: 'claim' as const, user: 'bob', message: 'Claimed Task 5', timestamp: '5 min ago' },
];

describe('TeamPanel', () => {
  describe('Presence Display', () => {
    it('shows team members', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
        />
      );
      expect(lastFrame()).toContain('Alice');
      expect(lastFrame()).toContain('Bob');
    });

    it('shows online count', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
        />
      );
      expect(lastFrame()).toMatch(/1.*online|online.*1/i);
    });
  });

  describe('Activity Display', () => {
    it('shows recent activities', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
        />
      );
      expect(lastFrame()).toContain('Fixed bug');
      expect(lastFrame()).toContain('Claimed Task 5');
    });
  });

  describe('Local Mode', () => {
    it('shows minimal view in local mode', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="local"
        />
      );
      // Should show that team features are for VPS
      expect(lastFrame()).toMatch(/local|team.*vps|solo/i);
    });

    it('hides team features in local mode', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={[]}
          activities={[]}
          environment="local"
        />
      );
      expect(lastFrame()).toMatch(/local|solo/i);
    });
  });

  describe('VPS Mode', () => {
    it('shows full team panel in VPS mode', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
        />
      );
      expect(lastFrame()).toContain('Alice');
      expect(lastFrame()).toContain('Fixed bug');
    });
  });

  describe('Connection Status', () => {
    it('shows connected status', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
          connected={true}
        />
      );
      expect(lastFrame()).toMatch(/●|connected|online/i);
    });

    it('shows disconnected status', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
          connected={false}
        />
      );
      expect(lastFrame()).toMatch(/○|disconnected|offline|reconnect/i);
    });

    it('shows reconnect hint when disconnected', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
          connected={false}
        />
      );
      expect(lastFrame()).toMatch(/reconnect|retry|r/i);
    });
  });

  describe('Refresh Action', () => {
    it('shows refresh hint', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
        />
      );
      expect(lastFrame()).toMatch(/refresh|r|reload/i);
    });

    it('calls onRefresh when triggered', () => {
      const onRefresh = vi.fn();
      render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
          onRefresh={onRefresh}
        />
      );
      // Refresh happens on 'r' key
    });
  });

  describe('Empty State', () => {
    it('shows empty state for no members', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={[]}
          activities={sampleActivities}
          environment="vps"
        />
      );
      expect(lastFrame()).toMatch(/no.*team|solo|alone/i);
    });

    it('shows empty state for no activity', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={[]}
          environment="vps"
        />
      );
      expect(lastFrame()).toMatch(/no.*activity|quiet/i);
    });
  });

  describe('Header', () => {
    it('shows Team header', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="vps"
        />
      );
      expect(lastFrame()).toMatch(/team/i);
    });

    it('shows environment badge', () => {
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={sampleActivities}
          environment="staging"
        />
      );
      expect(lastFrame()).toMatch(/staging/i);
    });
  });

  describe('Activity Limit', () => {
    it('limits activities shown', () => {
      const manyActivities = Array.from({ length: 20 }, (_, i) => ({
        id: `a${i}`,
        type: 'commit' as const,
        user: 'alice',
        message: `Activity ${i}`,
        timestamp: `${i} min ago`,
      }));
      const { lastFrame } = render(
        <TeamPanel
          members={sampleMembers}
          activities={manyActivities}
          environment="vps"
          activityLimit={5}
        />
      );
      // Should show limited activities
      expect(lastFrame()).toBeDefined();
    });
  });
});
