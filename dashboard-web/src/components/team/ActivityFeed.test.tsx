import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ActivityFeed } from './ActivityFeed';

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 5);

const mockActivities = [
  { id: 'act1', type: 'commit' as const, user: 'Alice', message: 'feat: add login form', timestamp: today.toISOString() },
  { id: 'act2', type: 'task_claim' as const, user: 'Bob', message: 'Claimed "Add validation"', timestamp: today.toISOString() },
  { id: 'act3', type: 'task_complete' as const, user: 'Carol', message: 'Completed "Create schema"', timestamp: yesterday.toISOString() },
  { id: 'act4', type: 'comment' as const, user: 'Dave', message: 'Added comment on PR #42', timestamp: yesterday.toISOString() },
  { id: 'act5', type: 'review' as const, user: 'Eve', message: 'Approved PR #41', timestamp: lastWeek.toISOString() },
];

describe('ActivityFeed', () => {
  it('renders activities', () => {
    render(<ActivityFeed activities={mockActivities} />);
    expect(screen.getByText('feat: add login form')).toBeInTheDocument();
    expect(screen.getByText('Claimed "Add validation"')).toBeInTheDocument();
  });

  it('groups by date (Today, Yesterday, Earlier)', () => {
    render(<ActivityFeed activities={mockActivities} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Earlier')).toBeInTheDocument();
  });

  it('shows activity type icons', () => {
    render(<ActivityFeed activities={mockActivities} />);
    expect(screen.getByTestId('icon-commit')).toBeInTheDocument();
    expect(screen.getByTestId('icon-task_claim')).toBeInTheDocument();
    expect(screen.getByTestId('icon-task_complete')).toBeInTheDocument();
    expect(screen.getByTestId('icon-comment')).toBeInTheDocument();
    expect(screen.getByTestId('icon-review')).toBeInTheDocument();
  });

  it('shows user names', () => {
    render(<ActivityFeed activities={mockActivities} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows relative timestamps', () => {
    render(<ActivityFeed activities={mockActivities} />);
    // Should show times for today's activities
    const timestamps = screen.getAllByTestId('activity-time');
    expect(timestamps.length).toBe(5);
  });

  it('filters by activity type', () => {
    render(<ActivityFeed activities={mockActivities} showFilters />);

    fireEvent.click(screen.getByTestId('filter-commit'));

    const visibleActivities = screen.getAllByTestId('activity-item');
    expect(visibleActivities.length).toBe(1);
    expect(screen.getByText('feat: add login form')).toBeInTheDocument();
  });

  it('filters by user', () => {
    render(<ActivityFeed activities={mockActivities} showFilters />);

    // Open user filter dropdown and select Alice
    const userFilterButton = screen.getByTestId('filter-user').querySelector('button')!;
    fireEvent.click(userFilterButton);
    const menuItems = screen.getAllByRole('menuitem');
    fireEvent.click(menuItems[0]); // Alice is first

    const visibleActivities = screen.getAllByTestId('activity-item');
    expect(visibleActivities.length).toBe(1);
  });

  it('shows empty state when no activities', () => {
    render(<ActivityFeed activities={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('loads more activities on scroll', () => {
    const manyActivities = Array.from({ length: 50 }, (_, i) => ({
      id: `act${i}`,
      type: 'commit' as const,
      user: 'User',
      message: `Commit ${i}`,
      timestamp: today.toISOString(),
    }));

    render(<ActivityFeed activities={manyActivities} pageSize={10} />);

    // Initially shows pageSize items
    expect(screen.getAllByTestId('activity-item').length).toBe(10);

    // Load more button
    fireEvent.click(screen.getByText('Load more'));
    expect(screen.getAllByTestId('activity-item').length).toBe(20);
  });

  it('hides in local mode', () => {
    render(<ActivityFeed activities={mockActivities} mode="local" />);
    expect(screen.queryByTestId('activity-feed')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ActivityFeed activities={mockActivities} className="custom-feed" />);
    expect(screen.getByTestId('activity-feed')).toHaveClass('custom-feed');
  });
});
