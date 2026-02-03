import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TeamPresence } from './TeamPresence';

const mockTeamMembers = [
  { id: 'user1', name: 'Alice Johnson', email: 'alice@example.com', status: 'online' as const, avatar: 'https://example.com/alice.jpg' },
  { id: 'user2', name: 'Bob Smith', email: 'bob@example.com', status: 'offline' as const },
  { id: 'user3', name: 'Carol White', email: 'carol@example.com', status: 'away' as const, lastSeen: '10 minutes ago' },
  { id: 'user4', name: 'Dave Brown', email: 'dave@example.com', status: 'busy' as const, statusMessage: 'In a meeting' },
];

describe('TeamPresence', () => {
  it('renders team members', () => {
    render(<TeamPresence members={mockTeamMembers} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
    expect(screen.getByText('Dave Brown')).toBeInTheDocument();
  });

  it('shows online count', () => {
    render(<TeamPresence members={mockTeamMembers} />);
    expect(screen.getByTestId('online-count')).toHaveTextContent('1 online');
  });

  it('shows correct status indicators', () => {
    render(<TeamPresence members={mockTeamMembers} />);
    const onlineIndicator = screen.getByTestId('status-user1');
    const offlineIndicator = screen.getByTestId('status-user2');
    const awayIndicator = screen.getByTestId('status-user3');
    const busyIndicator = screen.getByTestId('status-user4');

    expect(onlineIndicator).toHaveClass('bg-success');
    expect(offlineIndicator).toHaveClass('bg-muted');
    expect(awayIndicator).toHaveClass('bg-warning');
    expect(busyIndicator).toHaveClass('bg-error');
  });

  it('sorts members by status (online first)', () => {
    render(<TeamPresence members={mockTeamMembers} />);
    const members = screen.getAllByTestId('team-member');
    expect(members[0]).toHaveTextContent('Alice Johnson');
  });

  it('shows avatar when provided', () => {
    render(<TeamPresence members={mockTeamMembers} />);
    const avatar = screen.getByAltText('Alice Johnson');
    expect(avatar).toHaveAttribute('src', 'https://example.com/alice.jpg');
  });

  it('shows initials when no avatar', () => {
    render(<TeamPresence members={mockTeamMembers} />);
    expect(screen.getByText('BS')).toBeInTheDocument(); // Bob Smith initials
  });

  it('shows last seen for offline/away users', () => {
    render(<TeamPresence members={mockTeamMembers} />);
    expect(screen.getByText('10 minutes ago')).toBeInTheDocument();
  });

  it('shows status message when set', () => {
    render(<TeamPresence members={mockTeamMembers} />);
    expect(screen.getByText('In a meeting')).toBeInTheDocument();
  });

  it('shows empty state when no members', () => {
    render(<TeamPresence members={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('hides in local mode', () => {
    render(<TeamPresence members={mockTeamMembers} mode="local" />);
    expect(screen.queryByTestId('team-presence')).not.toBeInTheDocument();
  });

  it('shows in vps mode', () => {
    render(<TeamPresence members={mockTeamMembers} mode="vps" />);
    expect(screen.getByTestId('team-presence')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TeamPresence members={mockTeamMembers} className="custom-presence" />);
    expect(screen.getByTestId('team-presence')).toHaveClass('custom-presence');
  });

  it('shows compact view when collapsed', () => {
    render(<TeamPresence members={mockTeamMembers} compact />);
    const container = screen.getByTestId('team-presence');
    expect(container).toHaveClass('compact');
  });
});
