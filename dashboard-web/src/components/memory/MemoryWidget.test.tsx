import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MemoryWidget } from './MemoryWidget';

vi.mock('../../hooks/useMemory', () => ({
  useMemory: vi.fn(),
}));

vi.mock('../../stores/workspace.store', () => ({
  useWorkspaceStore: vi.fn((selector) => {
    const store = { selectedProjectId: 'proj1', selectProject: vi.fn() };
    return selector(store);
  }),
}));

import { useMemory } from '../../hooks/useMemory';

const MOCK_STATS = { totalEntries: 42, decisions: 10, gotchas: 5, conversations: 27 };
const MOCK_DECISIONS = [
  { id: 'd1', text: 'Use React for frontend', context: 'Architecture', timestamp: '2026-02-20' },
  { id: 'd2', text: 'Use Zustand for state', context: 'State', timestamp: '2026-02-19' },
  { id: 'd3', text: 'Use Vitest for testing', context: 'Testing', timestamp: '2026-02-18' },
  { id: 'd4', text: 'Use TailwindCSS', context: 'Styling', timestamp: '2026-02-17' },
];

function renderWidget(overrides = {}) {
  const defaults = {
    decisions: MOCK_DECISIONS,
    gotchas: [],
    stats: MOCK_STATS,
    loading: false,
    error: null as string | null,
    refresh: vi.fn(),
  };
  vi.mocked(useMemory).mockReturnValue({ ...defaults, ...overrides });
  return render(
    <MemoryRouter>
      <MemoryWidget />
    </MemoryRouter>
  );
}

describe('MemoryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows indexed memory count', () => {
    renderWidget();
    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByText(/memories/i)).toBeInTheDocument();
  });

  it('shows last 3 decisions as one-liners', () => {
    renderWidget();
    expect(screen.getByText('Use React for frontend')).toBeInTheDocument();
    expect(screen.getByText('Use Zustand for state')).toBeInTheDocument();
    expect(screen.getByText('Use Vitest for testing')).toBeInTheDocument();
    expect(screen.queryByText('Use TailwindCSS')).not.toBeInTheDocument();
  });

  it('shows View All link to memory page', () => {
    renderWidget();
    const link = screen.getByRole('link', { name: /view all/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('memory'));
  });

  it('shows health indicator green when entries exist', () => {
    renderWidget();
    expect(screen.getByTestId('memory-health')).toHaveAttribute('data-status', 'healthy');
  });

  it('shows health indicator red when no entries', () => {
    renderWidget({ stats: { totalEntries: 0, decisions: 0, gotchas: 0, conversations: 0 } });
    expect(screen.getByTestId('memory-health')).toHaveAttribute('data-status', 'empty');
  });

  it('shows loading state', () => {
    renderWidget({ loading: true });
    expect(screen.getByTestId('widget-loading')).toBeInTheDocument();
  });

  it('renders without crashing when stats are null', () => {
    renderWidget({ stats: null, decisions: [] });
    expect(screen.getByText(/memory/i)).toBeInTheDocument();
  });
});
