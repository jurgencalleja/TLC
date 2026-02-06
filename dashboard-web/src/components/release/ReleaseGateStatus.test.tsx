import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReleaseGateStatus } from './ReleaseGateStatus';
import type { Gate } from './ReleaseGateStatus';

const mockGates: Gate[] = [
  { name: 'lint', status: 'pass', duration: 12 },
  { name: 'unit-tests', status: 'fail', duration: 45, details: 'AssertionError in auth.test.ts' },
  { name: 'e2e-tests', status: 'pending' },
  { name: 'security-scan', status: 'skipped' },
];

describe('ReleaseGateStatus', () => {
  it('shows each gate with status indicator', () => {
    render(<ReleaseGateStatus gates={mockGates} />);
    expect(screen.getByTestId('gate-status')).toBeInTheDocument();
    expect(screen.getAllByTestId('gate-item')).toHaveLength(4);
  });

  it('pass gate shows green check', () => {
    render(<ReleaseGateStatus gates={[{ name: 'lint', status: 'pass', duration: 12 }]} />);
    expect(screen.getByTestId('gate-icon-pass')).toBeInTheDocument();
  });

  it('fail gate shows red X', () => {
    render(<ReleaseGateStatus gates={[{ name: 'tests', status: 'fail', duration: 30 }]} />);
    expect(screen.getByTestId('gate-icon-fail')).toBeInTheDocument();
  });

  it('pending gate shows spinner/clock', () => {
    render(<ReleaseGateStatus gates={[{ name: 'deploy', status: 'pending' }]} />);
    expect(screen.getByTestId('gate-icon-pending')).toBeInTheDocument();
  });

  it('skipped gate shows dash', () => {
    render(<ReleaseGateStatus gates={[{ name: 'optional', status: 'skipped' }]} />);
    expect(screen.getByTestId('gate-icon-skipped')).toBeInTheDocument();
  });

  it('shows gate name label', () => {
    render(<ReleaseGateStatus gates={mockGates} />);
    expect(screen.getByText('lint')).toBeInTheDocument();
    expect(screen.getByText('unit-tests')).toBeInTheDocument();
    expect(screen.getByText('e2e-tests')).toBeInTheDocument();
    expect(screen.getByText('security-scan')).toBeInTheDocument();
  });

  it('shows gate details on expansion/hover', () => {
    render(<ReleaseGateStatus gates={mockGates} />);
    expect(screen.getByText('AssertionError in auth.test.ts')).toBeInTheDocument();
  });

  it('shows timing for completed gates', () => {
    render(<ReleaseGateStatus gates={mockGates} />);
    expect(screen.getByText('12s')).toBeInTheDocument();
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('handles no gates (empty)', () => {
    render(<ReleaseGateStatus gates={[]} />);
    expect(screen.getByText('No gates configured')).toBeInTheDocument();
  });

  it('shows overall status (all pass, some fail, in progress)', () => {
    // Mixed results => some fail
    const { rerender } = render(<ReleaseGateStatus gates={mockGates} />);
    expect(screen.getByTestId('overall-status')).toHaveTextContent(/fail/i);

    // All pass
    const allPass: Gate[] = [
      { name: 'lint', status: 'pass', duration: 10 },
      { name: 'tests', status: 'pass', duration: 20 },
    ];
    rerender(<ReleaseGateStatus gates={allPass} />);
    expect(screen.getByTestId('overall-status')).toHaveTextContent(/pass/i);

    // In progress (has pending)
    const inProgress: Gate[] = [
      { name: 'lint', status: 'pass', duration: 10 },
      { name: 'tests', status: 'pending' },
    ];
    rerender(<ReleaseGateStatus gates={inProgress} />);
    expect(screen.getByTestId('overall-status')).toHaveTextContent(/in progress/i);
  });
});
