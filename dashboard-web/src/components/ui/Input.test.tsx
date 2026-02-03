import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';
import { Mail } from 'lucide-react';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders with error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('applies error styling when error prop is set', () => {
    render(<Input error="Error" placeholder="test" />);
    expect(screen.getByPlaceholderText('test')).toHaveClass('border-error');
  });

  it('renders as search variant with search icon', () => {
    render(<Input variant="search" placeholder="Search..." />);
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toHaveClass('pl-10');
  });

  it('shows clear button in search variant when has value', () => {
    render(
      <Input variant="search" value="test" onChange={() => {}} />
    );
    expect(screen.getByTestId('clear-button')).toBeInTheDocument();
  });

  it('does not show clear button when search is empty', () => {
    render(<Input variant="search" value="" onChange={() => {}} />);
    expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument();
  });

  it('calls onClear when clear button clicked', () => {
    const handleClear = vi.fn();
    render(
      <Input
        variant="search"
        value="test"
        onChange={() => {}}
        onClear={handleClear}
      />
    );

    fireEvent.click(screen.getByTestId('clear-button'));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders with left icon', () => {
    render(<Input leftIcon={<Mail data-testid="left-icon" />} />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('renders with right icon', () => {
    render(<Input rightIcon={<Mail data-testid="right-icon" />} />);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });

  it('handles controlled value changes', () => {
    const handleChange = vi.fn();
    render(<Input value="initial" onChange={handleChange} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles uncontrolled value changes', () => {
    render(<Input placeholder="Uncontrolled" />);
    const input = screen.getByPlaceholderText('Uncontrolled');

    fireEvent.change(input, { target: { value: 'typed' } });
    expect(input).toHaveValue('typed');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" placeholder="Custom" />);
    expect(screen.getByPlaceholderText('Custom')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('supports type attribute', () => {
    render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');
  });
});
