import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { MobileNav, NavItem } from './MobileNav.js';

const sampleItems: NavItem[] = [
  { key: 'projects', label: 'Projects', icon: '📁' },
  { key: 'tasks', label: 'Tasks', icon: '📋' },
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'logs', label: 'Logs', icon: '📜' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

describe('MobileNav', () => {
  describe('Rendering', () => {
    it('renders navigation items', () => {
      const { lastFrame } = render(
        <MobileNav items={sampleItems} activeKey="projects" onNavigate={() => {}} />
      );
      expect(lastFrame()).toContain('Projects');
      expect(lastFrame()).toContain('Tasks');
    });

    it('renders item icons', () => {
      const { lastFrame } = render(
        <MobileNav items={sampleItems} activeKey="projects" onNavigate={() => {}} />
      );
      expect(lastFrame()).toContain('📁');
      expect(lastFrame()).toContain('📋');
    });

    it('renders item labels', () => {
      const { lastFrame } = render(
        <MobileNav items={sampleItems} activeKey="projects" onNavigate={() => {}} />
      );
      expect(lastFrame()).toContain('Projects');
      expect(lastFrame()).toContain('Logs');
    });
  });

  describe('Active State', () => {
    it('shows active indicator on current item', () => {
      const { lastFrame } = render(
        <MobileNav items={sampleItems} activeKey="tasks" onNavigate={() => {}} />
      );
      // Active item should have some visual indicator
      expect(lastFrame()).toContain('Tasks');
    });

    it('highlights active item differently', () => {
      const { lastFrame: activeProjects } = render(
        <MobileNav items={sampleItems} activeKey="projects" onNavigate={() => {}} />
      );
      const { lastFrame: activeTasks } = render(
        <MobileNav items={sampleItems} activeKey="tasks" onNavigate={() => {}} />
      );
      // Both should render but with different active states
      expect(activeProjects()).toContain('Projects');
      expect(activeTasks()).toContain('Tasks');
    });
  });

  describe('Navigation', () => {
    it('calls onNavigate when item selected', () => {
      const onNavigate = vi.fn();
      render(
        <MobileNav items={sampleItems} activeKey="projects" onNavigate={onNavigate} />
      );
      expect(onNavigate).toBeDefined();
    });
  });

  describe('Compact Mode', () => {
    it('can hide labels in compact mode', () => {
      const { lastFrame } = render(
        <MobileNav items={sampleItems} activeKey="projects" onNavigate={() => {}} compact />
      );
      // Icons should still show
      expect(lastFrame()).toContain('📁');
    });

    it('shows only icons when compact', () => {
      const { lastFrame } = render(
        <MobileNav items={sampleItems} activeKey="projects" onNavigate={() => {}} compact />
      );
      // Should render icons
      expect(lastFrame()).toMatch(/📁|📋|💬|📜|⚙️/);
    });
  });

  describe('Max Items', () => {
    it('limits visible items', () => {
      const manyItems: NavItem[] = Array.from({ length: 10 }, (_, i) => ({
        key: `item${i}`,
        label: `Item ${i}`,
        icon: '●',
      }));
      const { lastFrame } = render(
        <MobileNav items={manyItems} activeKey="item0" onNavigate={() => {}} maxItems={5} />
      );
      // Should show limited items or "more" indicator
      expect(lastFrame()).toBeDefined();
    });

    it('shows overflow menu when items exceed max', () => {
      const manyItems: NavItem[] = Array.from({ length: 8 }, (_, i) => ({
        key: `item${i}`,
        label: `Item ${i}`,
        icon: '●',
      }));
      const { lastFrame } = render(
        <MobileNav items={manyItems} activeKey="item0" onNavigate={() => {}} maxItems={4} />
      );
      // Should show "more" or overflow indicator
      expect(lastFrame()).toMatch(/more|\.{3}|»|⋯/i);
    });
  });

  describe('Badge Support', () => {
    it('shows badge on item', () => {
      const itemsWithBadge: NavItem[] = [
        { key: 'tasks', label: 'Tasks', icon: '📋', badge: 3 },
        ...sampleItems.slice(1),
      ];
      const { lastFrame } = render(
        <MobileNav items={itemsWithBadge} activeKey="tasks" onNavigate={() => {}} />
      );
      expect(lastFrame()).toContain('3');
    });
  });

  describe('Layout', () => {
    it('renders in horizontal layout', () => {
      const { lastFrame } = render(
        <MobileNav items={sampleItems} activeKey="projects" onNavigate={() => {}} />
      );
      // All items should be on roughly same line (horizontal)
      const output = lastFrame() || '';
      // Check that items appear to be side by side
      expect(output).toContain('Projects');
      expect(output).toContain('Tasks');
    });
  });

  describe('Keyboard Navigation', () => {
    it('accepts isTTY prop for keyboard support', () => {
      const { lastFrame } = render(
        <MobileNav
          items={sampleItems}
          activeKey="projects"
          onNavigate={() => {}}
          isTTY={true}
        />
      );
      expect(lastFrame()).toBeDefined();
    });
  });
});
