import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TestReviewPanel } from './TestReviewPanel';

const mockTestCase = {
  id: 'test1',
  name: 'user can login with valid credentials',
  file: 'tests/auth/login.spec.ts',
  status: 'pending' as const,
  coverage: ['Login form', 'Authentication API'],
  acceptanceCriteria: [
    'User enters valid email and password',
    'System validates credentials',
    'User is redirected to dashboard',
  ],
};

describe('TestReviewPanel', () => {
  it('renders review panel', () => {
    render(<TestReviewPanel test={mockTestCase} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getByTestId('test-review-panel')).toBeInTheDocument();
  });

  it('displays test name', () => {
    render(<TestReviewPanel test={mockTestCase} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getByText('user can login with valid credentials')).toBeInTheDocument();
  });

  it('shows file path', () => {
    render(<TestReviewPanel test={mockTestCase} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getByText('tests/auth/login.spec.ts')).toBeInTheDocument();
  });

  it('shows acceptance criteria', () => {
    render(<TestReviewPanel test={mockTestCase} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getByText('User enters valid email and password')).toBeInTheDocument();
    expect(screen.getByText('System validates credentials')).toBeInTheDocument();
  });

  it('shows coverage items', () => {
    render(<TestReviewPanel test={mockTestCase} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getByText('Login form')).toBeInTheDocument();
    expect(screen.getByText('Authentication API')).toBeInTheDocument();
  });

  it('has approve button', () => {
    render(<TestReviewPanel test={mockTestCase} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('has reject button', () => {
    render(<TestReviewPanel test={mockTestCase} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getByText('Needs Changes')).toBeInTheDocument();
  });

  it('calls onApprove when approved', () => {
    const handleApprove = vi.fn();
    render(<TestReviewPanel test={mockTestCase} onApprove={handleApprove} onReject={() => {}} />);

    fireEvent.click(screen.getByText('Approve'));
    expect(handleApprove).toHaveBeenCalledWith(mockTestCase.id);
  });

  it('calls onReject with comment when rejected', () => {
    const handleReject = vi.fn();
    render(<TestReviewPanel test={mockTestCase} onApprove={() => {}} onReject={handleReject} />);

    fireEvent.click(screen.getByText('Needs Changes'));
    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), {
      target: { value: 'Missing edge case' },
    });
    fireEvent.click(screen.getByText('Submit'));

    expect(handleReject).toHaveBeenCalledWith(mockTestCase.id, 'Missing edge case');
  });

  it('has comment input', () => {
    render(<TestReviewPanel test={mockTestCase} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
  });

  it('shows approved status', () => {
    render(
      <TestReviewPanel
        test={{ ...mockTestCase, status: 'approved' }}
        onApprove={() => {}}
        onReject={() => {}}
      />
    );
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Approved');
  });

  it('applies custom className', () => {
    render(
      <TestReviewPanel
        test={mockTestCase}
        onApprove={() => {}}
        onReject={() => {}}
        className="custom-panel"
      />
    );
    expect(screen.getByTestId('test-review-panel')).toHaveClass('custom-panel');
  });
});
