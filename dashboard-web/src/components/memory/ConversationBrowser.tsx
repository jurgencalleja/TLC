import { useState, useMemo } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

export interface Conversation {
  id: string;
  title: string;
  date: string;
  project: string;
  decisionsCount: number;
  permanent: boolean;
  excerpt: string;
}

interface ConversationBrowserProps {
  conversations: Conversation[];
  onSelect?: (id: string) => void;
  loading?: boolean;
}

export function ConversationBrowser({ conversations, onSelect, loading }: ConversationBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const sorted = useMemo(() => {
    const filtered = searchQuery
      ? conversations.filter((c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : conversations;

    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [conversations, searchQuery]);

  if (loading) {
    return (
      <div data-testid="conversations-loading" className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="w-12 h-12 mx-auto text-text-muted mb-3" />
        <p className="text-text-secondary">No conversations captured yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {sorted.map((conv) => (
          <Card
            key={conv.id}
            className={`p-4 cursor-pointer hover:border-accent/50 transition-colors ${conv.permanent ? 'border-warning/40' : ''}`}
            onClick={() => onSelect?.(conv.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p data-testid="conversation-title" className="text-sm font-medium text-text-primary">
                  {conv.title}
                </p>
                <p className="text-xs text-text-muted mt-1 line-clamp-2">{conv.excerpt}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="neutral" size="sm">{conv.project}</Badge>
                  <span className="text-xs text-text-muted">{conv.date}</span>
                  {conv.decisionsCount > 0 && (
                    <span className="text-xs text-accent">{conv.decisionsCount} decisions</span>
                  )}
                  {conv.permanent && (
                    <Badge variant="warning" size="sm">Permanent</Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
