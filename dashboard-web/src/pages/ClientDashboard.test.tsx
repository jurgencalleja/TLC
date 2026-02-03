/**
 * Client Dashboard Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientDashboard } from './ClientDashboard';

describe('ClientDashboard', () => {
  const mockProject = {
    name: 'Test Project',
    progress: 75,
    currentPhase: 'Phase 3: Testing',
    totalPhases: 5,
    completedPhases: 3
  };

  it('renders client view', () => {
    render(<ClientDashboard project={mockProject} />);
    expect(screen.getByText(/Test Project/i)).toBeInTheDocument();
  });

  it('shows project progress', () => {
    render(<ClientDashboard project={mockProject} />);
    expect(screen.getByText(/75%/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows current phase', () => {
    render(<ClientDashboard project={mockProject} />);
    expect(screen.getByText(/Phase 3/i)).toBeInTheDocument();
  });

  it('displays progress bars', () => {
    render(<ClientDashboard project={mockProject} />);
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('hides developer features', () => {
    render(<ClientDashboard project={mockProject} />);
    expect(screen.queryByText(/code/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/terminal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/git/i)).not.toBeInTheDocument();
  });

  it('shows bug form', () => {
    render(<ClientDashboard project={mockProject} />);
    expect(screen.getByText(/report.*issue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('submits bug report', async () => {
    const onBugSubmit = vi.fn().mockResolvedValue({ success: true });
    render(<ClientDashboard project={mockProject} onBugSubmit={onBugSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Bug' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Desc' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onBugSubmit).toHaveBeenCalled();
    });
  });

  it('shows status updates', () => {
    const updates = [
      { date: '2024-01-15', message: 'Phase 2 completed' },
      { date: '2024-01-10', message: 'Phase 1 completed' }
    ];
    render(<ClientDashboard project={mockProject} updates={updates} />);
    expect(screen.getByText(/Phase 2 completed/i)).toBeInTheDocument();
  });

  it('shows phase breakdown', () => {
    render(<ClientDashboard project={mockProject} />);
    expect(screen.getByText(/3.*of.*5/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ClientDashboard loading={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<ClientDashboard error="Failed to load" />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('has clean UI for non-technical users', () => {
    render(<ClientDashboard project={mockProject} />);
    // Should not have technical jargon
    expect(screen.queryByText(/API/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/endpoint/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/deploy/i)).not.toBeInTheDocument();
  });
});
