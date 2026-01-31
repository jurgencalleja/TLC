import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ProjectList, Project } from './ProjectList.js';

const sampleProjects: Project[] = [
  {
    id: '1',
    name: 'Alpha Project',
    description: 'First project',
    tests: { passing: 10, failing: 0, total: 10 },
    coverage: 85,
    lastActivity: '1 hour ago',
  },
  {
    id: '2',
    name: 'Beta Project',
    description: 'Second project',
    tests: { passing: 8, failing: 2, total: 10 },
    coverage: 65,
    lastActivity: '2 hours ago',
  },
  {
    id: '3',
    name: 'Gamma Project',
    description: 'Third project',
    tests: { passing: 5, failing: 5, total: 10 },
    coverage: 50,
    lastActivity: '3 hours ago',
  },
];

describe('ProjectList', () => {
  it('renders list of projects', () => {
    const { lastFrame } = render(<ProjectList projects={sampleProjects} />);
    expect(lastFrame()).toContain('Alpha Project');
    expect(lastFrame()).toContain('Beta Project');
    expect(lastFrame()).toContain('Gamma Project');
  });

  it('shows project count', () => {
    const { lastFrame } = render(<ProjectList projects={sampleProjects} />);
    expect(lastFrame()).toContain('3 projects');
  });

  it('shows single project count correctly', () => {
    const { lastFrame } = render(<ProjectList projects={[sampleProjects[0]]} />);
    expect(lastFrame()).toContain('1 project');
  });

  it('filters projects by name', () => {
    const { lastFrame } = render(
      <ProjectList projects={sampleProjects} filter="Alpha" />
    );
    expect(lastFrame()).toContain('Alpha Project');
    expect(lastFrame()).not.toContain('Beta Project');
    expect(lastFrame()).toContain('matching "Alpha"');
  });

  it('filters projects by description', () => {
    const { lastFrame } = render(
      <ProjectList projects={sampleProjects} filter="Second" />
    );
    expect(lastFrame()).toContain('Beta Project');
    expect(lastFrame()).not.toContain('Alpha Project');
  });

  it('shows empty state when no projects', () => {
    const { lastFrame } = render(<ProjectList projects={[]} />);
    expect(lastFrame()).toContain('No projects found');
    expect(lastFrame()).toContain('/tlc:new-project');
  });

  it('shows empty state when filter matches nothing', () => {
    const { lastFrame } = render(
      <ProjectList projects={sampleProjects} filter="nonexistent" />
    );
    expect(lastFrame()).toContain('No projects matching');
    expect(lastFrame()).toContain('Try a different search term');
  });

  it('sorts by name by default', () => {
    const { lastFrame } = render(<ProjectList projects={sampleProjects} />);
    const output = lastFrame() || '';
    const alphaIndex = output.indexOf('Alpha');
    const betaIndex = output.indexOf('Beta');
    const gammaIndex = output.indexOf('Gamma');
    expect(alphaIndex).toBeLessThan(betaIndex);
    expect(betaIndex).toBeLessThan(gammaIndex);
  });

  it('sorts by status (failing first)', () => {
    const { lastFrame } = render(
      <ProjectList projects={sampleProjects} sortBy="status" />
    );
    const output = lastFrame() || '';
    // Gamma has most failures (5), should be first
    const gammaIndex = output.indexOf('Gamma');
    const alphaIndex = output.indexOf('Alpha');
    expect(gammaIndex).toBeLessThan(alphaIndex);
  });

  it('shows navigation hint', () => {
    const { lastFrame } = render(<ProjectList projects={sampleProjects} />);
    expect(lastFrame()).toContain('↑/k ↓/j navigate');
    expect(lastFrame()).toContain('Enter select');
  });

  it('first project is selected by default', () => {
    const { lastFrame } = render(<ProjectList projects={sampleProjects} />);
    expect(lastFrame()).toContain('▶');
  });
});
