import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TeamPanel } from './TeamPanel';

const mockTeamMembers = [
  { id: 'user1', name: 'Alice', email: 'alice@test.com', status: 'online' as const },
  { id: 'user2', name: 'Bob', email: 'bob@test.com', status: 'offline' as const },
];

const mockActivities = [
  { id: 'act1', type: 'commit' as const, user: 'Alice', message: 'Added feature', timestamp: new Date().toISOString() },
  { id: 'act2', type: 'task_complete' as const, user: 'Bob', message: 'Finished task', timestamp: new Date().toISOString() },
];

describe('TeamPanel', () => {
  it('renders team presence and activity feed', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} />);
    // Team tab is active by default
    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Switch to activity tab to see activities
    fireEvent.click(screen.getByRole('tab', { name: /activity/i }));
    expect(screen.getByText('Added feature')).toBeInTheDocument();
  });

  it('shows tabs for presence and activity', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} />);
    expect(screen.getByRole('tab', { name: /team/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /activity/i })).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} />);

    // Start on team tab
    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Switch to activity tab
    fireEvent.click(screen.getByRole('tab', { name: /activity/i }));
    expect(screen.getByText('Added feature')).toBeInTheDocument();
  });

  it('shows environment badge', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} environment="vps" />);
    expect(screen.getByText('VPS')).toBeInTheDocument();
  });

  it('hides in local mode', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} mode="local" />);
    expect(screen.queryByTestId('team-panel')).not.toBeInTheDocument();
  });

  it('shows in vps mode', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} mode="vps" />);
    expect(screen.getByTestId('team-panel')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<TeamPanel members={[]} activities={[]} loading />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} connected />);
    expect(screen.getByTestId('connection-status')).toHaveClass('bg-success');
  });

  it('shows disconnected status', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} connected={false} />);
    expect(screen.getByTestId('connection-status')).toHaveClass('bg-error');
  });

  it('supports collapsible mode', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} collapsible />);

    const collapseButton = screen.getByLabelText('Collapse team panel');
    fireEvent.click(collapseButton);

    expect(screen.getByTestId('team-panel')).toHaveClass('collapsed');
  });

  it('shows member count in header', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} />);
    expect(screen.getByTestId('member-count')).toHaveTextContent('2');
  });

  it('applies custom className', () => {
    render(<TeamPanel members={mockTeamMembers} activities={mockActivities} className="custom-panel" />);
    expect(screen.getByTestId('team-panel')).toHaveClass('custom-panel');
  });
});
