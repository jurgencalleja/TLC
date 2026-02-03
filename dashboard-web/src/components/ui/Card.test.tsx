import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Card, CardHeader, CardFooter } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default padding', () => {
    render(<Card>Content</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-4');
  });

  it('applies custom padding', () => {
    const { rerender } = render(<Card padding="sm">Content</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-3');

    rerender(<Card padding="lg">Content</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-6');

    rerender(<Card padding="none">Content</Card>);
    expect(screen.getByTestId('card')).not.toHaveClass('p-4');
  });

  it('renders status indicator with correct color', () => {
    const { rerender } = render(<Card status="success">Content</Card>);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-success');

    rerender(<Card status="error">Content</Card>);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-error');

    rerender(<Card status="warning">Content</Card>);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-warning');

    rerender(<Card status="info">Content</Card>);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-info');
  });

  it('does not render status indicator when no status', () => {
    render(<Card>Content</Card>);
    expect(screen.queryByTestId('status-indicator')).not.toBeInTheDocument();
  });

  it('renders clickable card with button role', () => {
    render(<Card clickable>Click me</Card>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Click me</Card>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter pressed', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Press Enter</Card>);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space pressed', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Press Space</Card>);

    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies card-hover class when clickable', () => {
    render(<Card clickable>Hoverable</Card>);
    expect(screen.getByRole('button')).toHaveClass('card-hover');
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Custom</Card>);
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<Card ref={ref}>Ref Card</Card>);
    expect(ref).toHaveBeenCalled();
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header Content</CardHeader>);
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('has border styling', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toHaveClass('border-b');
  });

  it('applies custom className', () => {
    render(<CardHeader className="custom">Header</CardHeader>);
    expect(screen.getByText('Header')).toHaveClass('custom');
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter>Footer Content</CardFooter>);
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('has border styling', () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText('Footer')).toHaveClass('border-t');
  });

  it('applies custom className', () => {
    render(<CardFooter className="custom">Footer</CardFooter>);
    expect(screen.getByText('Footer')).toHaveClass('custom');
  });
});
