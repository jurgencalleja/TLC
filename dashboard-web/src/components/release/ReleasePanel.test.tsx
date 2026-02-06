import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ReleasePanel } from './ReleasePanel';
import type { ReleaseCandidate } from './ReleasePanel';

const mockCandidates: ReleaseCandidate[] = [
  {
    id: 'rc-1',
    tag: 'v1.2.0-rc.1',
    version: '1.2.0-rc.1',
    status: 'pending',
    previewUrl: 'https://preview.example.com/rc1',
    changelog: 'Added new login flow and dashboard redesign',
    testSummary: { passed: 42, failed: 2, coverage: 87.5 },
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'rc-2',
    tag: 'v1.1.0-rc.3',
    version: '1.1.0-rc.3',
    status: 'deployed',
    previewUrl: 'https://preview.example.com/rc3',
    changelog: 'Bug fixes for payment module',
    testSummary: { passed: 50, failed: 0, coverage: 92.1 },
    createdAt: '2026-01-28T14:30:00Z',
  },
];

describe('ReleasePanel', () => {
  it('renders release candidates list', () => {
    render(
      <ReleasePanel
        candidates={mockCandidates}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );
    expect(screen.getByTestId('release-panel')).toBeInTheDocument();
    expect(screen.getByText('v1.2.0-rc.1')).toBeInTheDocument();
    expect(screen.getByText('v1.1.0-rc.3')).toBeInTheDocument();
  });

  it('shows tag name and version for each release', () => {
    render(
      <ReleasePanel
        candidates={mockCandidates}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );
    expect(screen.getByText('v1.2.0-rc.1')).toBeInTheDocument();
    expect(screen.getByText('1.2.0-rc.1')).toBeInTheDocument();
    expect(screen.getByText('v1.1.0-rc.3')).toBeInTheDocument();
    expect(screen.getByText('1.1.0-rc.3')).toBeInTheDocument();
  });

  it('shows Accept/Reject buttons for QA role', () => {
    render(
      <ReleasePanel
        candidates={mockCandidates}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    expect(acceptButtons.length).toBeGreaterThan(0);
    expect(rejectButtons.length).toBeGreaterThan(0);
  });

  it('hides action buttons for non-QA role (developer)', () => {
    render(
      <ReleasePanel
        candidates={mockCandidates}
        userRole="developer"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });

  it('shows preview URL as clickable link', () => {
    render(
      <ReleasePanel
        candidates={mockCandidates}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );
    const link = screen.getByRole('link', { name: /preview\.example\.com\/rc1/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://preview.example.com/rc1');
  });

  it('shows changelog summary', () => {
    render(
      <ReleasePanel
        candidates={mockCandidates}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );
    expect(screen.getByText('Added new login flow and dashboard redesign')).toBeInTheDocument();
    expect(screen.getByText('Bug fixes for payment module')).toBeInTheDocument();
  });

  it('shows test summary (passed/failed/coverage)', () => {
    render(
      <ReleasePanel
        candidates={mockCandidates}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );
    expect(screen.getByText(/42 passed/i)).toBeInTheDocument();
    expect(screen.getByText(/2 failed/i)).toBeInTheDocument();
    expect(screen.getByText(/87\.5%/)).toBeInTheDocument();
  });

  it('empty state shows "No releases pending"', () => {
    render(
      <ReleasePanel
        candidates={[]}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );
    expect(screen.getByText('No releases pending')).toBeInTheDocument();
  });

  it('loading state shows skeleton', () => {
    render(
      <ReleasePanel
        candidates={[]}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
        loading
      />
    );
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('shows release status badge (pending, deployed, accepted, rejected)', () => {
    const allStatuses: ReleaseCandidate[] = [
      { ...mockCandidates[0], id: 'a', status: 'pending' },
      { ...mockCandidates[0], id: 'b', status: 'deployed' },
      { ...mockCandidates[0], id: 'c', status: 'accepted' },
      { ...mockCandidates[0], id: 'd', status: 'rejected' },
    ];
    render(
      <ReleasePanel
        candidates={allStatuses}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('deployed')).toBeInTheDocument();
    expect(screen.getByText('accepted')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });

  it('handles error state gracefully', () => {
    render(
      <ReleasePanel
        candidates={[]}
        userRole="qa"
        onAccept={() => {}}
        onReject={() => {}}
        error="Failed to load releases"
      />
    );
    expect(screen.getByText('Failed to load releases')).toBeInTheDocument();
  });

  it('Accept button calls onAccept callback with tag', async () => {
    const handleAccept = vi.fn();
    render(
      <ReleasePanel
        candidates={[mockCandidates[0]]}
        userRole="qa"
        onAccept={handleAccept}
        onReject={() => {}}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /accept/i }));
    expect(handleAccept).toHaveBeenCalledWith('v1.2.0-rc.1');
  });
});
