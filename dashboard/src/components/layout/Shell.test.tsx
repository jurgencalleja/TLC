import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Text } from 'ink';
import { Shell } from './Shell.js';

describe('Shell', () => {
  it('renders children', () => {
    const { lastFrame } = render(
      <Shell>
        <Text>Content here</Text>
      </Shell>
    );
    expect(lastFrame()).toContain('Content here');
  });

  it('renders header', () => {
    const { lastFrame } = render(
      <Shell header="TLC Dashboard">
        <Text>Content</Text>
      </Shell>
    );
    expect(lastFrame()).toContain('TLC Dashboard');
  });

  it('renders footer', () => {
    const { lastFrame } = render(
      <Shell footer="Press q to quit">
        <Text>Content</Text>
      </Shell>
    );
    expect(lastFrame()).toContain('Press q to quit');
  });

  it('renders sidebar when provided', () => {
    const { lastFrame } = render(
      <Shell sidebar={<Text>Sidebar</Text>}>
        <Text>Main content</Text>
      </Shell>
    );
    const output = lastFrame();
    expect(output).toContain('Sidebar');
    expect(output).toContain('Main content');
  });

  it('respects sidebarWidth', () => {
    const { lastFrame } = render(
      <Shell sidebar={<Text>Nav</Text>} sidebarWidth={20}>
        <Text>Main</Text>
      </Shell>
    );
    expect(lastFrame()).toContain('Nav');
    expect(lastFrame()).toContain('Main');
  });

  it('can hide sidebar', () => {
    const { lastFrame } = render(
      <Shell sidebar={<Text>Hidden</Text>} showSidebar={false}>
        <Text>Only main</Text>
      </Shell>
    );
    expect(lastFrame()).toContain('Only main');
  });
});
