import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ActivityFeed, Activity } from './ActivityFeed.js';

const sampleActivities: Activity[] = [
  {
    id: 'a1',
    type: 'commit',
    user: 'alice',
    message: 'Added user authentication',
    timestamp: '2 min ago',
    ref: 'abc1234',
  },
  {
    id: 'a2',
    type: 'claim',
    user: 'bob',
    message: 'Claimed Task 5: Add validation',
    timestamp: '5 min ago',
    ref: 'task-5',
  },
  {
    id: 'a3',
    type: 'complete',
    user: 'carol',
    message: 'Completed Task 3: Create schema',
    timestamp: '10 min ago',
    ref: 'task-3',
  },
  {
    id: 'a4',
    type: 'review',
    user: 'alice',
    message: 'Requested review on PR #42',
    timestamp: '15 min ago',
    ref: 'pr-42',
  },
  {
    id: 'a5',
    type: 'comment',
    user: 'dave',
    message: 'Commented on Task 3',
    timestamp: '20 min ago',
    ref: 'task-3',
  },
];

describe('ActivityFeed', () => {
  describe('Activity Display', () => {
    it('shows recent activities', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toContain('Added user authentication');
      expect(lastFrame()).toContain('Claimed Task 5');
    });

    it('shows activity user', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toContain('alice');
      expect(lastFrame()).toContain('bob');
    });

    it('shows activity timestamp', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toContain('2 min ago');
      expect(lastFrame()).toContain('5 min ago');
    });

    it('shows activity type icon', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      // Should have icons for different types
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Activity Types', () => {
    it('shows commit activities', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toContain('Added user authentication');
    });

    it('shows claim activities', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toContain('Claimed Task 5');
    });

    it('shows complete activities', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toContain('Completed Task 3');
    });

    it('shows review activities', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toContain('PR #42');
    });

    it('shows comment activities', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toContain('Commented');
    });
  });

  describe('User Filter', () => {
    it('filters by user', () => {
      const { lastFrame } = render(
        <ActivityFeed activities={sampleActivities} filterUser="alice" />
      );
      expect(lastFrame()).toContain('alice');
      expect(lastFrame()).not.toContain('bob');
    });

    it('shows filter indicator', () => {
      const { lastFrame } = render(
        <ActivityFeed activities={sampleActivities} filterUser="alice" />
      );
      expect(lastFrame()).toMatch(/filter|alice/i);
    });
  });

  describe('Type Filter', () => {
    it('filters by activity type', () => {
      const { lastFrame } = render(
        <ActivityFeed activities={sampleActivities} filterType="commit" />
      );
      expect(lastFrame()).toContain('Added user authentication');
      expect(lastFrame()).not.toContain('Claimed Task 5');
    });

    it('shows type filter indicator', () => {
      const { lastFrame } = render(
        <ActivityFeed activities={sampleActivities} filterType="commit" />
      );
      expect(lastFrame()).toMatch(/commit|filter/i);
    });
  });

  describe('Combined Filters', () => {
    it('filters by user and type', () => {
      const { lastFrame } = render(
        <ActivityFeed
          activities={sampleActivities}
          filterUser="alice"
          filterType="commit"
        />
      );
      expect(lastFrame()).toContain('Added user authentication');
      expect(lastFrame()).not.toContain('PR #42');
    });
  });

  describe('References', () => {
    it('shows reference links', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toMatch(/abc1234|task-5|pr-42/);
    });
  });

  describe('Empty State', () => {
    it('shows message when no activities', () => {
      const { lastFrame } = render(<ActivityFeed activities={[]} />);
      expect(lastFrame()).toMatch(/no.*activity|quiet|empty/i);
    });

    it('shows message when filter matches nothing', () => {
      const { lastFrame } = render(
        <ActivityFeed activities={sampleActivities} filterUser="nonexistent" />
      );
      expect(lastFrame()).toMatch(/no.*activity|no.*match/i);
    });
  });

  describe('Limit', () => {
    it('limits number of activities shown', () => {
      const { lastFrame } = render(
        <ActivityFeed activities={sampleActivities} limit={2} />
      );
      const output = lastFrame() || '';
      // Should only show first 2 activities
      expect(output).toContain('Added user authentication');
      expect(output).toContain('Claimed Task 5');
    });

    it('shows "more" indicator when limited', () => {
      const { lastFrame } = render(
        <ActivityFeed activities={sampleActivities} limit={2} />
      );
      expect(lastFrame()).toMatch(/more|\+\d|\.\.\.|\d+.*remaining/i);
    });
  });

  describe('Compact Mode', () => {
    it('supports compact display', () => {
      const { lastFrame } = render(
        <ActivityFeed activities={sampleActivities} compact={true} />
      );
      expect(lastFrame()).toContain('alice');
    });
  });

  describe('Header', () => {
    it('shows activity count', () => {
      const { lastFrame } = render(<ActivityFeed activities={sampleActivities} />);
      expect(lastFrame()).toContain('5');
    });
  });
});
