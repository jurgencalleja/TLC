import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ProjectCard } from './ProjectCard.js';

describe('ProjectCard', () => {
  it('renders project name', () => {
    const { lastFrame } = render(<ProjectCard name="My Project" />);
    expect(lastFrame()).toContain('My Project');
  });

  it('renders description', () => {
    const { lastFrame } = render(
      <ProjectCard name="Project" description="A test project" />
    );
    expect(lastFrame()).toContain('A test project');
  });

  it('renders phase progress', () => {
    const { lastFrame } = render(
      <ProjectCard
        name="Project"
        phase={{ current: 3, total: 5, name: 'Authentication' }}
      />
    );
    expect(lastFrame()).toContain('3/5');
    expect(lastFrame()).toContain('Authentication');
  });

  it('renders test counts', () => {
    const { lastFrame } = render(
      <ProjectCard
        name="Project"
        tests={{ passing: 45, failing: 2, total: 47 }}
      />
    );
    expect(lastFrame()).toContain('45/47');
    expect(lastFrame()).toContain('tests');
  });

  it('renders coverage percentage', () => {
    const { lastFrame } = render(
      <ProjectCard name="Project" coverage={85} />
    );
    expect(lastFrame()).toContain('85%');
    expect(lastFrame()).toContain('cov');
  });

  it('renders last activity', () => {
    const { lastFrame } = render(
      <ProjectCard name="Project" lastActivity="2 hours ago" />
    );
    expect(lastFrame()).toContain('2 hours ago');
  });

  it('shows selection indicator when selected', () => {
    const { lastFrame } = render(
      <ProjectCard name="Project" isSelected={true} />
    );
    expect(lastFrame()).toContain('▶');
  });

  it('does not show selection indicator when not selected', () => {
    const { lastFrame } = render(
      <ProjectCard name="Project" isSelected={false} />
    );
    expect(lastFrame()).not.toContain('▶');
  });

  it('handles zero coverage', () => {
    const { lastFrame } = render(
      <ProjectCard name="Project" coverage={0} />
    );
    expect(lastFrame()).toContain('0%');
  });

  it('handles all tests passing', () => {
    const { lastFrame } = render(
      <ProjectCard
        name="Project"
        tests={{ passing: 100, failing: 0, total: 100 }}
      />
    );
    expect(lastFrame()).toContain('100/100');
  });

  it('renders with minimal props', () => {
    const { lastFrame } = render(<ProjectCard name="Minimal" />);
    expect(lastFrame()).toContain('Minimal');
  });
});
