import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dropdown, DropdownItem } from './Dropdown';

describe('Dropdown', () => {
  const items: DropdownItem[] = [
    { id: '1', label: 'Option 1' },
    { id: '2', label: 'Option 2' },
    { id: '3', label: 'Option 3' },
  ];

  it('renders trigger button', () => {
    render(<Dropdown items={items} onSelect={() => {}} trigger="Select" />);
    expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument();
  });

  it('opens menu on click', () => {
    render(<Dropdown items={items} onSelect={() => {}} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes menu on outside click', () => {
    render(
      <div>
        <Dropdown items={items} onSelect={() => {}} trigger="Select" />
        <button>Outside</button>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders all items', () => {
    render(<Dropdown items={items} onSelect={() => {}} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('calls onSelect when item clicked', () => {
    const handleSelect = vi.fn();
    render(<Dropdown items={items} onSelect={handleSelect} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    fireEvent.click(screen.getByText('Option 2'));

    expect(handleSelect).toHaveBeenCalledWith(items[1]);
  });

  it('closes menu after selection', () => {
    render(<Dropdown items={items} onSelect={() => {}} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    fireEvent.click(screen.getByText('Option 2'));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('navigates with arrow keys', () => {
    render(<Dropdown items={items} onSelect={() => {}} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));

    // Press down arrow
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(screen.getByText('Option 1').closest('[role="menuitem"]')).toHaveClass(
      'bg-muted'
    );

    // Press down again
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(screen.getByText('Option 2').closest('[role="menuitem"]')).toHaveClass(
      'bg-muted'
    );

    // Press up
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    expect(screen.getByText('Option 1').closest('[role="menuitem"]')).toHaveClass(
      'bg-muted'
    );
  });

  it('selects with Enter key', () => {
    const handleSelect = vi.fn();
    render(<Dropdown items={items} onSelect={handleSelect} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' });

    expect(handleSelect).toHaveBeenCalledWith(items[0]);
  });

  it('closes with Escape key', () => {
    render(<Dropdown items={items} onSelect={() => {}} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders disabled items', () => {
    const itemsWithDisabled: DropdownItem[] = [
      { id: '1', label: 'Option 1' },
      { id: '2', label: 'Option 2', disabled: true },
    ];

    render(<Dropdown items={itemsWithDisabled} onSelect={() => {}} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));

    const disabledItem = screen.getByText('Option 2').closest('[role="menuitem"]');
    expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not select disabled items', () => {
    const handleSelect = vi.fn();
    const itemsWithDisabled: DropdownItem[] = [
      { id: '1', label: 'Option 1' },
      { id: '2', label: 'Option 2', disabled: true },
    ];

    render(
      <Dropdown items={itemsWithDisabled} onSelect={handleSelect} trigger="Select" />
    );

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    fireEvent.click(screen.getByText('Option 2'));

    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('renders item icons', () => {
    const itemsWithIcons: DropdownItem[] = [
      { id: '1', label: 'Option 1', icon: <span data-testid="icon-1">Icon</span> },
    ];

    render(<Dropdown items={itemsWithIcons} onSelect={() => {}} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(screen.getByTestId('icon-1')).toBeInTheDocument();
  });

  it('supports type-ahead search', () => {
    render(<Dropdown items={items} onSelect={() => {}} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));

    // Type 'o' then 'p' then 't' then 'i' then 'o' then 'n' then ' ' then '3'
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'o' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'p' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 't' });

    // Should highlight matching item
    expect(screen.getByText('Option 1').closest('[role="menuitem"]')).toHaveClass(
      'bg-muted'
    );
  });

  it('aligns menu to left by default', () => {
    render(<Dropdown items={items} onSelect={() => {}} trigger="Select" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(screen.getByRole('menu')).toHaveClass('left-0');
  });

  it('aligns menu to right when specified', () => {
    render(<Dropdown items={items} onSelect={() => {}} trigger="Select" align="right" />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(screen.getByRole('menu')).toHaveClass('right-0');
  });
});
