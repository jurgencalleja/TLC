import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Sidebar, SidebarItem } from './Sidebar.js';

describe('Sidebar', () => {
  it('renders children', () => {
    const { lastFrame } = render(
      <Sidebar>
        <SidebarItem label="Home" />
      </Sidebar>
    );
    expect(lastFrame()).toContain('Home');
  });

  it('renders title when provided', () => {
    const { lastFrame } = render(
      <Sidebar title="Navigation">
        <SidebarItem label="Home" />
      </Sidebar>
    );
    expect(lastFrame()).toContain('Navigation');
  });
});

describe('SidebarItem', () => {
  it('renders label', () => {
    const { lastFrame } = render(<SidebarItem label="Dashboard" />);
    expect(lastFrame()).toContain('Dashboard');
  });

  it('renders with icon', () => {
    const { lastFrame } = render(<SidebarItem label="Home" icon="🏠" />);
    const output = lastFrame();
    expect(output).toContain('🏠');
    expect(output).toContain('Home');
  });

  it('shows active state', () => {
    const { lastFrame } = render(<SidebarItem label="Active" active />);
    expect(lastFrame()).toContain('Active');
  });

  it('shows badge when provided', () => {
    const { lastFrame } = render(<SidebarItem label="Issues" badge="5" />);
    const output = lastFrame();
    expect(output).toContain('Issues');
    expect(output).toContain('5');
  });

  it('shows keyboard shortcut', () => {
    const { lastFrame } = render(<SidebarItem label="Chat" shortcut="1" />);
    expect(lastFrame()).toContain('1');
  });
});
