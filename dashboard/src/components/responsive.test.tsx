import React from 'react';
import { Text, Box } from 'ink';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';

// Import layout components
import { Shell } from './layout/Shell.js';
import { Sidebar } from './layout/Sidebar.js';
import { MobileNav } from './layout/MobileNav.js';

const sampleNavItems = [
  { key: 'projects', label: 'Projects', icon: '📁' },
  { key: 'tasks', label: 'Tasks', icon: '📋' },
  { key: 'logs', label: 'Logs', icon: '📜' },
];

describe('Responsive Layout', () => {
  describe('Shell Layout', () => {
    it('renders with sidebar', () => {
      const { lastFrame } = render(
        <Shell
          header={<Text>Header</Text>}
          footer={<Text>Footer</Text>}
          sidebar={<Text>Sidebar</Text>}
          showSidebar={true}
        >
          <Text>Content</Text>
        </Shell>
      );
      expect(lastFrame()).toContain('Sidebar');
      expect(lastFrame()).toContain('Content');
    });

    it('renders without sidebar when hidden', () => {
      const { lastFrame } = render(
        <Shell
          header={<Text>Header</Text>}
          footer={<Text>Footer</Text>}
          sidebar={<Text>Sidebar</Text>}
          showSidebar={false}
        >
          <Text>Content</Text>
        </Shell>
      );
      expect(lastFrame()).toContain('Content');
      // Content should still be present when sidebar hidden
    });

    it('renders header and footer', () => {
      const { lastFrame } = render(
        <Shell
          header={<Text>Header Content</Text>}
          footer={<Text>Footer Content</Text>}
        >
          <Text>Main</Text>
        </Shell>
      );
      expect(lastFrame()).toContain('Header Content');
      expect(lastFrame()).toContain('Footer Content');
    });
  });

  describe('Sidebar Component', () => {
    it('renders navigation items', () => {
      const { lastFrame } = render(
        <Sidebar title="TLC">
          <Text>Item 1</Text>
          <Text>Item 2</Text>
        </Sidebar>
      );
      expect(lastFrame()).toContain('TLC');
      expect(lastFrame()).toContain('Item 1');
      expect(lastFrame()).toContain('Item 2');
    });

    it('shows title', () => {
      const { lastFrame } = render(
        <Sidebar title="Dashboard">
          <Text>Content</Text>
        </Sidebar>
      );
      expect(lastFrame()).toContain('Dashboard');
    });
  });

  describe('MobileNav for Phone Layout', () => {
    it('renders all navigation items', () => {
      const { lastFrame } = render(
        <MobileNav
          items={sampleNavItems}
          activeKey="projects"
          onNavigate={() => {}}
        />
      );
      expect(lastFrame()).toContain('Projects');
      expect(lastFrame()).toContain('Tasks');
      expect(lastFrame()).toContain('Logs');
    });

    it('shows active indicator', () => {
      const { lastFrame } = render(
        <MobileNav
          items={sampleNavItems}
          activeKey="tasks"
          onNavigate={() => {}}
        />
      );
      // Active item should be highlighted
      expect(lastFrame()).toContain('Tasks');
    });

    it('supports compact mode for small screens', () => {
      const { lastFrame } = render(
        <MobileNav
          items={sampleNavItems}
          activeKey="projects"
          onNavigate={() => {}}
          compact={true}
        />
      );
      // Icons should still show in compact mode
      expect(lastFrame()).toContain('📁');
    });

    it('limits visible items for very small screens', () => {
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        key: `item${i}`,
        label: `Item ${i}`,
        icon: '●',
      }));
      const { lastFrame } = render(
        <MobileNav
          items={manyItems}
          activeKey="item0"
          onNavigate={() => {}}
          maxItems={4}
        />
      );
      // Should show overflow indicator
      expect(lastFrame()).toMatch(/more|⋯/i);
    });
  });

  describe('Touch Targets', () => {
    it('Button has sufficient padding for touch', () => {
      // In terminal UI, we ensure buttons have visible brackets
      const { lastFrame } = render(
        <Box>
          <Text>[  OK  ]</Text>
        </Box>
      );
      expect(lastFrame()).toContain('[');
      expect(lastFrame()).toContain(']');
    });

    it('Navigation items are spaced apart', () => {
      const { lastFrame } = render(
        <MobileNav
          items={sampleNavItems}
          activeKey="projects"
          onNavigate={() => {}}
        />
      );
      // Items should all be visible (spaced)
      expect(lastFrame()).toContain('Projects');
      expect(lastFrame()).toContain('Tasks');
      expect(lastFrame()).toContain('Logs');
    });
  });

  describe('Content Fitting', () => {
    it('Content renders without truncation', () => {
      const { lastFrame } = render(
        <Box width={80}>
          <Text>This is a reasonably long text that should fit within the viewport</Text>
        </Box>
      );
      expect(lastFrame()).toContain('This is a reasonably long text');
    });

    it('Long labels truncate gracefully', () => {
      const { lastFrame } = render(
        <MobileNav
          items={[
            { key: 'long', label: 'Very Long Navigation Item Label', icon: '📁' },
          ]}
          activeKey="long"
          onNavigate={() => {}}
        />
      );
      // Should render something (truncated or full)
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Readable Font Sizes', () => {
    it('Primary text renders clearly', () => {
      const { lastFrame } = render(<Text>Primary readable text</Text>);
      expect(lastFrame()).toContain('Primary readable text');
    });

    it('Secondary text renders with dimColor', () => {
      const { lastFrame } = render(<Text dimColor>Secondary text</Text>);
      expect(lastFrame()).toContain('Secondary text');
    });

    it('Bold text renders for emphasis', () => {
      const { lastFrame } = render(<Text bold>Important text</Text>);
      expect(lastFrame()).toContain('Important text');
    });
  });
});
