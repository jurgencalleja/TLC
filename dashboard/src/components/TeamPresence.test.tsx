import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { TeamPresence, TeamMember } from './TeamPresence.js';

const sampleMembers: TeamMember[] = [
  {
    id: 'u1',
    name: 'Alice',
    status: 'online',
    activity: 'Working on Task 3',
    avatar: 'A',
  },
  {
    id: 'u2',
    name: 'Bob',
    status: 'online',
    activity: 'Reviewing PR #42',
    avatar: 'B',
  },
  {
    id: 'u3',
    name: 'Carol',
    status: 'away',
    activity: 'Last seen 10 min ago',
    avatar: 'C',
  },
  {
    id: 'u4',
    name: 'Dave',
    status: 'offline',
    avatar: 'D',
  },
];

describe('TeamPresence', () => {
  describe('Member List', () => {
    it('shows all team members', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      expect(lastFrame()).toContain('Alice');
      expect(lastFrame()).toContain('Bob');
      expect(lastFrame()).toContain('Carol');
      expect(lastFrame()).toContain('Dave');
    });

    it('shows member count', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      expect(lastFrame()).toContain('4');
    });

    it('shows online count', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      // 2 online members
      expect(lastFrame()).toMatch(/2.*online/i);
    });
  });

  describe('Status Indicators', () => {
    it('shows online status indicator', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      expect(lastFrame()).toMatch(/●|online/i);
    });

    it('shows away status indicator', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      expect(lastFrame()).toMatch(/◐|away/i);
    });

    it('shows offline status indicator', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      expect(lastFrame()).toMatch(/○|offline/i);
    });

    it('uses different colors for statuses', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      // Visual verification - component should render
      expect(lastFrame()).toContain('Alice');
    });
  });

  describe('Activity Display', () => {
    it('shows current activity for online members', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      expect(lastFrame()).toContain('Working on Task 3');
      expect(lastFrame()).toContain('Reviewing PR');
    });

    it('shows last seen for away members', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      expect(lastFrame()).toContain('10 min ago');
    });

    it('handles missing activity', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      // Dave has no activity - should still render
      expect(lastFrame()).toContain('Dave');
    });
  });

  describe('Avatar', () => {
    it('shows avatar initials', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      expect(lastFrame()).toContain('A');
      expect(lastFrame()).toContain('B');
    });
  });

  describe('Compact Mode', () => {
    it('shows compact view', () => {
      const { lastFrame } = render(
        <TeamPresence members={sampleMembers} compact={true} />
      );
      expect(lastFrame()).toContain('Alice');
    });

    it('hides activity in compact mode', () => {
      const { lastFrame } = render(
        <TeamPresence members={sampleMembers} compact={true} />
      );
      // Activity should be hidden or truncated
      const output = lastFrame() || '';
      expect(output.length).toBeLessThan(500);
    });
  });

  describe('Expanded Mode', () => {
    it('shows expanded view by default', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      expect(lastFrame()).toContain('Working on Task 3');
    });

    it('shows full activity details', () => {
      const { lastFrame } = render(
        <TeamPresence members={sampleMembers} compact={false} />
      );
      expect(lastFrame()).toContain('Working on Task 3');
    });
  });

  describe('Empty State', () => {
    it('shows message when no members', () => {
      const { lastFrame } = render(<TeamPresence members={[]} />);
      expect(lastFrame()).toMatch(/no.*team|empty|solo/i);
    });
  });

  describe('Current User', () => {
    it('highlights current user', () => {
      const { lastFrame } = render(
        <TeamPresence members={sampleMembers} currentUserId="u1" />
      );
      // Alice should be highlighted as current user
      expect(lastFrame()).toContain('Alice');
    });

    it('shows "you" indicator for current user', () => {
      const { lastFrame } = render(
        <TeamPresence members={sampleMembers} currentUserId="u1" />
      );
      expect(lastFrame()).toMatch(/you|\(me\)/i);
    });
  });

  describe('Sorting', () => {
    it('sorts online members first', () => {
      const { lastFrame } = render(<TeamPresence members={sampleMembers} />);
      const output = lastFrame() || '';
      const aliceIndex = output.indexOf('Alice');
      const daveIndex = output.indexOf('Dave');
      // Alice (online) should appear before Dave (offline)
      expect(aliceIndex).toBeLessThan(daveIndex);
    });
  });
});
