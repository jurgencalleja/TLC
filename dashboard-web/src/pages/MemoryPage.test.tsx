import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MemoryPage } from './MemoryPage';

vi.mock('../hooks/useMemory', () => ({
  useMemory: vi.fn(),
}));

vi.mock('../stores', () => ({
  useUIStore: vi.fn((selector) => {
    const store = { setActiveView: vi.fn() };
    return selector(store);
  }),
}));

vi.mock('../stores/workspace.store', () => ({
  useWorkspaceStore: vi.fn((selector) => {
    const store = { selectedProjectId: 'proj1', selectProject: vi.fn() };
    return selector(store);
  }),
}));

import { useMemory } from '../hooks/useMemory';

const MOCK_DECISIONS = [
  { id: 'd1', text: 'Use React for frontend', context: 'Architecture', timestamp: '2026-01-15' },
  { id: 'd2', text: 'Use Zustand for state management', context: 'State', timestamp: '2026-01-20' },
];

const MOCK_GOTCHAS = [
  { id: 'g1', text: 'Watch out for circular dependencies in hooks', context: 'Hooks', timestamp: '2026-01-18' },
];

const MOCK_STATS = { totalEntries: 42, vectorCount: 100, decisions: 2, gotchas: 1, conversations: 10 };

function renderPage({ decisions = MOCK_DECISIONS, gotchas = MOCK_GOTCHAS, stats = MOCK_STATS, loading = false, error = null as string | null } = {}) {
  vi.mocked(useMemory).mockReturnValue({
    decisions,
    gotchas,
    stats,
    loading,
    error,
    refresh: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/projects/proj1/memory']}>
      <Routes>
        <Route path="/projects/:projectId/memory" element={<MemoryPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MemoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('Memory')).toBeInTheDocument();
  });

  it('renders decisions list', () => {
    renderPage();
    expect(screen.getByText('Use React for frontend')).toBeInTheDocument();
    expect(screen.getByText('Use Zustand for state management')).toBeInTheDocument();
  });

  it('renders gotchas list', () => {
    renderPage();
    expect(screen.getByText('Watch out for circular dependencies in hooks')).toBeInTheDocument();
  });

  it('renders stats summary', () => {
    renderPage();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    renderPage({ loading: true });
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('shows error message', () => {
    renderPage({ error: 'Failed to fetch' });
    expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
  });

  it('shows empty state when no decisions or gotchas', () => {
    renderPage({ decisions: [], gotchas: [], stats: { totalEntries: 0 } });
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows decisions section header', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Decisions' })).toBeInTheDocument();
  });

  it('shows gotchas section header', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Gotchas' })).toBeInTheDocument();
  });
});
