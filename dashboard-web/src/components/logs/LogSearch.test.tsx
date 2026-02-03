import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LogSearch } from './LogSearch';

describe('LogSearch', () => {
  it('renders search input', () => {
    render(<LogSearch onSearch={() => {}} />);
    expect(screen.getByPlaceholderText(/search logs/i)).toBeInTheDocument();
  });

  it('calls onSearch when typing', () => {
    const handleSearch = vi.fn();
    render(<LogSearch onSearch={handleSearch} />);

    fireEvent.change(screen.getByPlaceholderText(/search logs/i), {
      target: { value: 'error' },
    });

    expect(handleSearch).toHaveBeenCalledWith('error');
  });

  it('shows match count', () => {
    render(<LogSearch onSearch={() => {}} matchCount={5} totalCount={100} searchQuery="test" />);
    expect(screen.getByTestId('match-count')).toHaveTextContent('5 of 100');
  });

  it('shows no matches message', () => {
    render(<LogSearch onSearch={() => {}} matchCount={0} totalCount={100} searchQuery="xyz" />);
    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });

  it('renders navigation buttons when matches exist', () => {
    render(<LogSearch onSearch={() => {}} matchCount={5} onNavigate={() => {}} />);

    expect(screen.getByLabelText('Previous match')).toBeInTheDocument();
    expect(screen.getByLabelText('Next match')).toBeInTheDocument();
  });

  it('calls onNavigate with "prev" when prev button clicked', () => {
    const handleNavigate = vi.fn();
    render(<LogSearch onSearch={() => {}} matchCount={5} onNavigate={handleNavigate} />);

    fireEvent.click(screen.getByLabelText('Previous match'));
    expect(handleNavigate).toHaveBeenCalledWith('prev');
  });

  it('calls onNavigate with "next" when next button clicked', () => {
    const handleNavigate = vi.fn();
    render(<LogSearch onSearch={() => {}} matchCount={5} onNavigate={handleNavigate} />);

    fireEvent.click(screen.getByLabelText('Next match'));
    expect(handleNavigate).toHaveBeenCalledWith('next');
  });

  it('disables nav buttons when no matches', () => {
    render(<LogSearch onSearch={() => {}} matchCount={0} onNavigate={() => {}} />);

    expect(screen.getByLabelText('Previous match')).toBeDisabled();
    expect(screen.getByLabelText('Next match')).toBeDisabled();
  });

  it('shows current match position', () => {
    render(
      <LogSearch
        onSearch={() => {}}
        matchCount={10}
        currentMatch={3}
        searchQuery="test"
        onNavigate={() => {}}
      />
    );

    expect(screen.getByTestId('current-match')).toHaveTextContent('3 of 10');
  });

  it('supports keyboard navigation', () => {
    const handleNavigate = vi.fn();
    render(<LogSearch onSearch={() => {}} matchCount={5} onNavigate={handleNavigate} />);

    const input = screen.getByPlaceholderText(/search logs/i);

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleNavigate).toHaveBeenCalledWith('next');

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(handleNavigate).toHaveBeenCalledWith('prev');
  });

  it('clears search on Escape', () => {
    const handleSearch = vi.fn();
    render(<LogSearch onSearch={handleSearch} />);

    const input = screen.getByPlaceholderText(/search logs/i);
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(handleSearch).toHaveBeenLastCalledWith('');
  });

  it('shows clear button when search has value', () => {
    render(<LogSearch onSearch={() => {}} searchQuery="test" />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clears search on clear button click', () => {
    const handleSearch = vi.fn();
    render(<LogSearch onSearch={handleSearch} searchQuery="test" />);

    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(handleSearch).toHaveBeenCalledWith('');
  });

  it('applies custom className', () => {
    render(<LogSearch onSearch={() => {}} className="custom-search" />);
    expect(screen.getByTestId('log-search')).toHaveClass('custom-search');
  });
});
