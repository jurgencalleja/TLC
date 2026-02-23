import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationBrowser } from './ConversationBrowser';

const MOCK_CONVERSATIONS = [
  {
    id: 'conv-1',
    title: 'Database architecture discussion',
    date: '2026-02-20',
    project: 'my-app',
    decisionsCount: 3,
    permanent: false,
    excerpt: 'Discussed using PostgreSQL with JSONB support...',
  },
  {
    id: 'conv-2',
    title: 'Authentication strategy',
    date: '2026-02-22',
    project: 'my-app',
    decisionsCount: 1,
    permanent: true,
    excerpt: 'Decided on JWT with httpOnly cookies...',
  },
  {
    id: 'conv-3',
    title: 'CI/CD pipeline setup',
    date: '2026-02-18',
    project: 'other-app',
    decisionsCount: 0,
    permanent: false,
    excerpt: 'Configured GitHub Actions for deployment...',
  },
];

describe('ConversationBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of conversation cards', () => {
    render(<ConversationBrowser conversations={MOCK_CONVERSATIONS} />);
    expect(screen.getByText('Database architecture discussion')).toBeInTheDocument();
    expect(screen.getByText('Authentication strategy')).toBeInTheDocument();
    expect(screen.getByText('CI/CD pipeline setup')).toBeInTheDocument();
  });

  it('shows title, date, and project on each card', () => {
    render(<ConversationBrowser conversations={MOCK_CONVERSATIONS} />);
    expect(screen.getByText('Database architecture discussion')).toBeInTheDocument();
    expect(screen.getAllByText('my-app').length).toBeGreaterThanOrEqual(1);
  });

  it('sorts cards by date newest first', () => {
    render(<ConversationBrowser conversations={MOCK_CONVERSATIONS} />);
    const titles = screen.getAllByTestId('conversation-title');
    expect(titles[0]).toHaveTextContent('Authentication strategy');
    expect(titles[1]).toHaveTextContent('Database architecture discussion');
    expect(titles[2]).toHaveTextContent('CI/CD pipeline setup');
  });

  it('shows permanent badge on permanent conversations', () => {
    render(<ConversationBrowser conversations={MOCK_CONVERSATIONS} />);
    const badges = screen.getAllByText('Permanent');
    expect(badges.length).toBe(1);
  });

  it('shows decisions count on cards', () => {
    render(<ConversationBrowser conversations={MOCK_CONVERSATIONS} />);
    expect(screen.getByText(/3 decisions/i)).toBeInTheDocument();
  });

  it('fires onSelect when card is clicked', async () => {
    const onSelect = vi.fn();
    render(<ConversationBrowser conversations={MOCK_CONVERSATIONS} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Database architecture discussion'));
    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });

  it('filters by text search', async () => {
    render(<ConversationBrowser conversations={MOCK_CONVERSATIONS} />);
    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    await userEvent.type(searchInput, 'auth');
    await waitFor(() => {
      expect(screen.getByText('Authentication strategy')).toBeInTheDocument();
      expect(screen.queryByText('CI/CD pipeline setup')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no conversations', () => {
    render(<ConversationBrowser conversations={[]} />);
    expect(screen.getByText(/no conversations/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ConversationBrowser conversations={[]} loading />);
    expect(screen.getByTestId('conversations-loading')).toBeInTheDocument();
  });
});
