import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Header } from './Header.js';

describe('Header', () => {
  it('renders title', () => {
    const { lastFrame } = render(<Header title="TLC Dashboard" />);
    expect(lastFrame()).toContain('TLC Dashboard');
  });

  it('renders subtitle', () => {
    const { lastFrame } = render(
      <Header title="TLC" subtitle="v1.0.0" />
    );
    const output = lastFrame();
    expect(output).toContain('TLC');
    expect(output).toContain('v1.0.0');
  });

  it('renders breadcrumbs', () => {
    const { lastFrame } = render(
      <Header
        title="TLC"
        breadcrumbs={['Home', 'Projects', 'MyApp']}
      />
    );
    const output = lastFrame();
    expect(output).toContain('Home');
    expect(output).toContain('Projects');
    expect(output).toContain('MyApp');
  });

  it('renders actions', () => {
    const { lastFrame } = render(
      <Header
        title="TLC"
        actions={<>[q]Quit</>}
      />
    );
    expect(lastFrame()).toContain('Quit');
  });

  it('renders status indicator', () => {
    const { lastFrame } = render(
      <Header title="TLC" status="online" />
    );
    expect(lastFrame()).toContain('●');
  });

  it('renders separator between breadcrumbs', () => {
    const { lastFrame } = render(
      <Header
        title="TLC"
        breadcrumbs={['A', 'B']}
      />
    );
    expect(lastFrame()).toContain('›');
  });
});
