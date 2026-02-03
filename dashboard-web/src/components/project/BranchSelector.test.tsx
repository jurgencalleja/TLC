import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BranchSelector } from './BranchSelector';

const mockBranches = [
  { name: 'main', isDefault: true, ahead: 0, behind: 0 },
  { name: 'develop', isDefault: false, ahead: 3, behind: 1 },
  { name: 'feature/auth', isDefault: false, ahead: 5, behind: 0 },
  { name: 'feature/dashboard', isDefault: false, ahead: 0, behind: 2 },
];

describe('BranchSelector', () => {
  it('renders current branch', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={() => {}}
      />
    );
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows all branches in dropdown', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));

    expect(screen.getByText('develop')).toBeInTheDocument();
    expect(screen.getByText('feature/auth')).toBeInTheDocument();
    expect(screen.getByText('feature/dashboard')).toBeInTheDocument();
  });

  it('calls onBranchChange when branch selected', () => {
    const handleChange = vi.fn();
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={handleChange}
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));
    fireEvent.click(screen.getByText('develop'));

    expect(handleChange).toHaveBeenCalledWith('develop');
  });

  it('shows ahead count', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));

    // develop is 3 ahead
    const developItem = screen.getByText('develop').closest('[role="menuitem"]');
    expect(developItem).toHaveTextContent('↑3');
  });

  it('shows behind count', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));

    // develop is 1 behind
    const developItem = screen.getByText('develop').closest('[role="menuitem"]');
    expect(developItem).toHaveTextContent('↓1');
  });

  it('marks default branch', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="develop"
        onBranchChange={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));

    // Get all menu items and find the one for main
    const menuItems = screen.getAllByRole('menuitem');
    const mainItem = menuItems.find(item => item.textContent?.includes('main'));
    expect(mainItem).toHaveTextContent('default');
  });

  it('highlights current branch', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="develop"
        onBranchChange={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));

    // Get all menu items and find the one for develop
    const menuItems = screen.getAllByRole('menuitem');
    const developItem = menuItems.find(item => item.textContent?.includes('develop'));
    expect(developItem).toHaveClass('bg-primary/10');
  });

  it('shows branch icon', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={() => {}}
      />
    );

    expect(screen.getByTestId('branch-icon')).toBeInTheDocument();
  });

  it('filters branches by search', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={() => {}}
        showSearch
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));
    fireEvent.change(screen.getByPlaceholderText(/search branches/i), {
      target: { value: 'feature' },
    });

    // The button still shows "main" but the menu should only show feature branches
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBe(2);
    expect(menuItems[0]).toHaveTextContent('feature/auth');
    expect(menuItems[1]).toHaveTextContent('feature/dashboard');
  });

  it('closes dropdown after selection', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));
    fireEvent.click(screen.getByText('develop'));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <BranchSelector
        branches={mockBranches}
        currentBranch="main"
        onBranchChange={() => {}}
        className="custom-selector"
      />
    );

    expect(screen.getByTestId('branch-selector')).toHaveClass('custom-selector');
  });
});
