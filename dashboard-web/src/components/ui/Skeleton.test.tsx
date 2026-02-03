import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar } from './Skeleton';

describe('Skeleton', () => {
  it('renders with default styles', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse', 'bg-muted');
  });

  it('renders with custom width', () => {
    render(<Skeleton width="100px" />);
    expect(screen.getByTestId('skeleton')).toHaveStyle({ width: '100px' });
  });

  it('renders with custom height', () => {
    render(<Skeleton height="50px" />);
    expect(screen.getByTestId('skeleton')).toHaveStyle({ height: '50px' });
  });

  it('renders rounded variant', () => {
    render(<Skeleton variant="rounded" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-md');
  });

  it('renders circular variant', () => {
    render(<Skeleton variant="circular" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full');
  });

  it('renders rectangular variant', () => {
    render(<Skeleton variant="rectangular" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-none');
  });

  it('applies custom className', () => {
    render(<Skeleton className="custom-skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('custom-skeleton');
  });
});

describe('SkeletonText', () => {
  it('renders single line by default', () => {
    render(<SkeletonText />);
    const lines = screen.getAllByTestId('skeleton');
    expect(lines).toHaveLength(1);
  });

  it('renders multiple lines', () => {
    render(<SkeletonText lines={3} />);
    const lines = screen.getAllByTestId('skeleton');
    expect(lines).toHaveLength(3);
  });

  it('last line is shorter by default', () => {
    render(<SkeletonText lines={3} />);
    const container = screen.getByTestId('skeleton-text');
    const lines = container.querySelectorAll('[data-testid="skeleton"]');
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toHaveClass('w-3/4');
  });

  it('applies consistent spacing between lines', () => {
    render(<SkeletonText lines={2} />);
    expect(screen.getByTestId('skeleton-text')).toHaveClass('space-y-2');
  });
});

describe('SkeletonCard', () => {
  it('renders card structure', () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });

  it('includes header skeleton', () => {
    render(<SkeletonCard showHeader />);
    expect(screen.getByTestId('skeleton-header')).toBeInTheDocument();
  });

  it('includes image placeholder', () => {
    render(<SkeletonCard showImage />);
    expect(screen.getByTestId('skeleton-image')).toBeInTheDocument();
  });

  it('includes text lines', () => {
    render(<SkeletonCard textLines={3} />);
    const lines = screen.getAllByTestId('skeleton');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('applies card styling', () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId('skeleton-card')).toHaveClass('p-4', 'border', 'rounded-lg');
  });
});

describe('SkeletonAvatar', () => {
  it('renders circular by default', () => {
    render(<SkeletonAvatar />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full');
  });

  it('renders small size', () => {
    render(<SkeletonAvatar size="sm" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('w-8', 'h-8');
  });

  it('renders medium size', () => {
    render(<SkeletonAvatar size="md" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('w-10', 'h-10');
  });

  it('renders large size', () => {
    render(<SkeletonAvatar size="lg" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('w-12', 'h-12');
  });

  it('renders extra large size', () => {
    render(<SkeletonAvatar size="xl" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('w-16', 'h-16');
  });
});
