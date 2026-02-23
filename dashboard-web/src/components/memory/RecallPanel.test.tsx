import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecallPanel } from './RecallPanel';

const mockSearch = vi.fn();

describe('RecallPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue([]);
  });

  it('renders search input with placeholder', () => {
    render(<RecallPanel onSearch={mockSearch} />);
    expect(screen.getByPlaceholderText(/what do you want to recall/i)).toBeInTheDocument();
  });

  it('submits search on Enter key', async () => {
    mockSearch.mockResolvedValue([{ id: '1', text: 'Use React', score: 0.92, type: 'decision', date: '2026-01-15' }]);
    render(<RecallPanel onSearch={mockSearch} />);
    const input = screen.getByPlaceholderText(/what do you want to recall/i);
    await userEvent.type(input, 'React{Enter}');
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('React', expect.any(Object));
    });
  });

  it('displays results as cards with title and score', async () => {
    mockSearch.mockResolvedValue([
      { id: '1', text: 'Use React for frontend', score: 0.92, type: 'decision', date: '2026-01-15' },
      { id: '2', text: 'Watch out for circular deps', score: 0.81, type: 'gotcha', date: '2026-01-18' },
    ]);
    render(<RecallPanel onSearch={mockSearch} />);
    const input = screen.getByPlaceholderText(/what do you want to recall/i);
    await userEvent.type(input, 'test{Enter}');
    await waitFor(() => {
      expect(screen.getByText('Use React for frontend')).toBeInTheDocument();
      expect(screen.getByText('Watch out for circular deps')).toBeInTheDocument();
    });
  });

  it('shows similarity score as percentage', async () => {
    mockSearch.mockResolvedValue([
      { id: '1', text: 'Use React', score: 0.92, type: 'decision', date: '2026-01-15' },
    ]);
    render(<RecallPanel onSearch={mockSearch} />);
    await userEvent.type(screen.getByPlaceholderText(/what do you want to recall/i), 'React{Enter}');
    await waitFor(() => {
      expect(screen.getByText('92%')).toBeInTheDocument();
    });
  });

  it('renders type badges with correct labels', async () => {
    mockSearch.mockResolvedValue([
      { id: '1', text: 'Decision item', score: 0.9, type: 'decision', date: '2026-01-15' },
      { id: '2', text: 'Gotcha item', score: 0.8, type: 'gotcha', date: '2026-01-18' },
    ]);
    render(<RecallPanel onSearch={mockSearch} />);
    await userEvent.type(screen.getByPlaceholderText(/what do you want to recall/i), 'test{Enter}');
    await waitFor(() => {
      expect(screen.getByText('Decision')).toBeInTheDocument();
      expect(screen.getByText('Gotcha')).toBeInTheDocument();
    });
  });

  it('shows scope selector', () => {
    render(<RecallPanel onSearch={mockSearch} />);
    expect(screen.getByTestId('scope-selector')).toBeInTheDocument();
  });

  it('shows empty state when no query entered', () => {
    render(<RecallPanel onSearch={mockSearch} />);
    expect(screen.getByText(/ask a question to search/i)).toBeInTheDocument();
  });

  it('shows loading skeleton during search', async () => {
    mockSearch.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<RecallPanel onSearch={mockSearch} />);
    await userEvent.type(screen.getByPlaceholderText(/what do you want to recall/i), 'test{Enter}');
    await waitFor(() => {
      expect(screen.getByTestId('recall-loading')).toBeInTheDocument();
    });
  });

  it('shows no results message when search returns empty', async () => {
    mockSearch.mockResolvedValue([]);
    render(<RecallPanel onSearch={mockSearch} />);
    await userEvent.type(screen.getByPlaceholderText(/what do you want to recall/i), 'nonexistent{Enter}');
    await waitFor(() => {
      expect(screen.getByText(/no matching memories/i)).toBeInTheDocument();
    });
  });

  it('clears search on Escape key', async () => {
    render(<RecallPanel onSearch={mockSearch} />);
    const input = screen.getByPlaceholderText(/what do you want to recall/i);
    await userEvent.type(input, 'React');
    expect(input).toHaveValue('React');
    await userEvent.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });

  it('passes scope to search function', async () => {
    mockSearch.mockResolvedValue([]);
    render(<RecallPanel onSearch={mockSearch} />);

    // Change scope to workspace
    fireEvent.change(screen.getByTestId('scope-selector'), { target: { value: 'workspace' } });

    await userEvent.type(screen.getByPlaceholderText(/what do you want to recall/i), 'test{Enter}');
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({ scope: 'workspace' }));
    });
  });
});
