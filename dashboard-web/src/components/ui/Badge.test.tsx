import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Badge } from './Badge';
import { CheckCircle } from 'lucide-react';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Running</Badge>);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders with default status (pending)', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText('Status')).toHaveClass('badge-neutral');
  });

  it('renders running status with success color', () => {
    render(<Badge status="running">Running</Badge>);
    expect(screen.getByText('Running')).toHaveClass('badge-success');
  });

  it('renders stopped status with neutral color', () => {
    render(<Badge status="stopped">Stopped</Badge>);
    expect(screen.getByText('Stopped')).toHaveClass('badge-neutral');
  });

  it('renders building status with warning color', () => {
    render(<Badge status="building">Building</Badge>);
    expect(screen.getByText('Building')).toHaveClass('badge-warning');
  });

  it('renders error status with error color', () => {
    render(<Badge status="error">Error</Badge>);
    expect(screen.getByText('Error')).toHaveClass('badge-error');
  });

  it('renders success status with success color', () => {
    render(<Badge status="success">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('badge-success');
  });

  it('renders small size', () => {
    render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toHaveClass('text-xs');
  });

  it('renders medium size', () => {
    render(<Badge size="md">Medium</Badge>);
    expect(screen.getByText('Medium')).toHaveClass('text-sm');
  });

  it('renders dot indicator when dot prop is true', () => {
    render(<Badge dot>With Dot</Badge>);
    expect(screen.getByTestId('dot-indicator')).toBeInTheDocument();
  });

  it('does not render dot indicator when dot prop is false', () => {
    render(<Badge>No Dot</Badge>);
    expect(screen.queryByTestId('dot-indicator')).not.toBeInTheDocument();
  });

  it('renders correct dot color for status', () => {
    const { rerender } = render(
      <Badge status="running" dot>
        Running
      </Badge>
    );
    expect(screen.getByTestId('dot-indicator')).toHaveClass('bg-success');

    rerender(
      <Badge status="error" dot>
        Error
      </Badge>
    );
    expect(screen.getByTestId('dot-indicator')).toHaveClass('bg-error');

    rerender(
      <Badge status="building" dot>
        Building
      </Badge>
    );
    expect(screen.getByTestId('dot-indicator')).toHaveClass('bg-warning');
  });

  it('renders with icon', () => {
    render(
      <Badge icon={<CheckCircle data-testid="badge-icon" />}>With Icon</Badge>
    );
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
  });

  it('renders with both dot and icon', () => {
    render(
      <Badge dot icon={<CheckCircle data-testid="badge-icon" />}>
        Both
      </Badge>
    );
    expect(screen.getByTestId('dot-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    expect(screen.getByText('Custom')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<Badge ref={ref}>Ref Badge</Badge>);
    expect(ref).toHaveBeenCalled();
  });
});
