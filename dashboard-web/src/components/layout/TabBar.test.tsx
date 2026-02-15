import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TabBar, type Tab } from './TabBar';

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'roadmap', label: 'Roadmap', path: 'roadmap' },
  { id: 'tasks', label: 'Tasks', path: 'tasks' },
  { id: 'tests', label: 'Tests', path: 'tests' },
  { id: 'logs', label: 'Logs', path: 'logs' },
];

function renderWithRouter(currentPath: string) {
  return render(
    <MemoryRouter initialEntries={[currentPath]}>
      <TabBar tabs={TABS} basePath="/projects/abc123" />
    </MemoryRouter>
  );
}

describe('TabBar', () => {
  it('renders all 5 tabs', () => {
    renderWithRouter('/projects/abc123');
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tab-roadmap')).toBeInTheDocument();
    expect(screen.getByTestId('tab-tasks')).toBeInTheDocument();
    expect(screen.getByTestId('tab-tests')).toBeInTheDocument();
    expect(screen.getByTestId('tab-logs')).toBeInTheDocument();
  });

  it('highlights active tab for overview (base path)', () => {
    renderWithRouter('/projects/abc123');
    const tab = screen.getByTestId('tab-overview');
    expect(tab.getAttribute('aria-selected')).toBe('true');
  });

  it('highlights active tab for sub-path', () => {
    renderWithRouter('/projects/abc123/roadmap');
    const tab = screen.getByTestId('tab-roadmap');
    expect(tab.getAttribute('aria-selected')).toBe('true');
  });

  it('non-active tabs have aria-selected false', () => {
    renderWithRouter('/projects/abc123/tasks');
    const overview = screen.getByTestId('tab-overview');
    expect(overview.getAttribute('aria-selected')).toBe('false');
    const tasks = screen.getByTestId('tab-tasks');
    expect(tasks.getAttribute('aria-selected')).toBe('true');
  });

  it('has role tablist on nav', () => {
    renderWithRouter('/projects/abc123');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('each tab has role tab', () => {
    renderWithRouter('/projects/abc123');
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
  });
});
