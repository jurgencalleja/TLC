import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReleaseTimeline } from './ReleaseTimeline';
import type { TimelineEvent } from './ReleaseTimeline';

const mockEvents: TimelineEvent[] = [
  {
    id: 'evt-1',
    type: 'created',
    timestamp: '2026-02-01T10:00:00Z',
    user: 'Alice',
    description: 'Release candidate created',
  },
  {
    id: 'evt-2',
    type: 'gates',
    timestamp: '2026-02-01T10:05:00Z',
    user: 'CI Bot',
    description: 'All gates passed',
    gateResults: [
      { name: 'lint', status: 'pass' },
      { name: 'unit-tests', status: 'pass' },
    ],
  },
  {
    id: 'evt-3',
    type: 'deployed',
    timestamp: '2026-02-01T10:10:00Z',
    user: 'Deploy Bot',
    description: 'Deployed to preview environment',
  },
  {
    id: 'evt-4',
    type: 'accepted',
    timestamp: '2026-02-01T11:00:00Z',
    user: 'Bob',
    description: 'Release accepted by QA',
  },
];

const rejectedEvent: TimelineEvent = {
  id: 'evt-5',
  type: 'rejected',
  timestamp: '2026-02-01T12:00:00Z',
  user: 'Carol',
  description: 'Release rejected',
  rejectionReason: 'Critical bug found in payment flow',
};

describe('ReleaseTimeline', () => {
  it('renders events in chronological order', () => {
    render(<ReleaseTimeline events={mockEvents} />);
    const items = screen.getAllByTestId('timeline-event');
    expect(items).toHaveLength(4);
  });

  it('shows event type icon (created, gates, deployed, accepted, rejected)', () => {
    const allEvents = [...mockEvents, rejectedEvent];
    render(<ReleaseTimeline events={allEvents} />);
    expect(screen.getByTestId('icon-created')).toBeInTheDocument();
    expect(screen.getByTestId('icon-gates')).toBeInTheDocument();
    expect(screen.getByTestId('icon-deployed')).toBeInTheDocument();
    expect(screen.getByTestId('icon-accepted')).toBeInTheDocument();
    expect(screen.getByTestId('icon-rejected')).toBeInTheDocument();
  });

  it('shows timestamp for each event', () => {
    render(<ReleaseTimeline events={[mockEvents[0]]} />);
    // Timestamp should be rendered (format may vary)
    expect(screen.getByTestId('timeline-event')).toHaveTextContent(/2026/);
  });

  it('shows user who performed action', () => {
    render(<ReleaseTimeline events={mockEvents} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('CI Bot')).toBeInTheDocument();
    expect(screen.getByText('Deploy Bot')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows gate results in timeline', () => {
    render(<ReleaseTimeline events={[mockEvents[1]]} />);
    expect(screen.getByText('lint')).toBeInTheDocument();
    expect(screen.getByText('unit-tests')).toBeInTheDocument();
  });

  it('empty state shows "No events"', () => {
    render(<ReleaseTimeline events={[]} />);
    expect(screen.getByText('No events')).toBeInTheDocument();
  });

  it('latest event is visually highlighted', () => {
    render(<ReleaseTimeline events={mockEvents} />);
    const items = screen.getAllByTestId('timeline-event');
    const lastItem = items[items.length - 1];
    expect(lastItem).toHaveAttribute('data-latest', 'true');
  });

  it('rejection event shows reason text', () => {
    render(<ReleaseTimeline events={[rejectedEvent]} />);
    expect(screen.getByText('Critical bug found in payment flow')).toBeInTheDocument();
  });

  it('handles single event', () => {
    render(<ReleaseTimeline events={[mockEvents[0]]} />);
    expect(screen.getAllByTestId('timeline-event')).toHaveLength(1);
    expect(screen.getByText('Release candidate created')).toBeInTheDocument();
  });

  it('handles many events (scrollable)', () => {
    const manyEvents: TimelineEvent[] = Array.from({ length: 20 }, (_, i) => ({
      id: `evt-${i}`,
      type: 'created' as const,
      timestamp: `2026-02-01T${String(i).padStart(2, '0')}:00:00Z`,
      user: `User ${i}`,
      description: `Event ${i}`,
    }));
    render(<ReleaseTimeline events={manyEvents} />);
    const container = screen.getByTestId('release-timeline');
    expect(container).toHaveClass('overflow-y-auto');
    expect(screen.getAllByTestId('timeline-event')).toHaveLength(20);
  });
});
