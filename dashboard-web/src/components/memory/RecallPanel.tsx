import { useState, useCallback, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

export interface RecallResult {
  id: string;
  text: string;
  score: number;
  type: 'decision' | 'gotcha' | 'conversation' | 'permanent';
  date: string;
  source?: string;
  permanent?: boolean;
}

interface RecallPanelProps {
  onSearch: (query: string, opts: { scope: string }) => Promise<RecallResult[]>;
}

const TYPE_LABELS: Record<string, string> = {
  decision: 'Decision',
  gotcha: 'Gotcha',
  conversation: 'Conversation',
  permanent: 'Permanent',
};

const TYPE_VARIANTS: Record<string, 'info' | 'warning' | 'neutral'> = {
  decision: 'info',
  gotcha: 'warning',
  conversation: 'neutral',
  permanent: 'neutral',
};

export function RecallPanel({ onSearch }: RecallPanelProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('project');
  const [results, setResults] = useState<RecallResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await onSearch(query.trim(), { scope });
      setResults(res as RecallResult[]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, scope, onSearch]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setQuery('');
      setResults(null);
      setSearched(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="What do you want to recall?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-4 py-2 text-sm bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
        <select
          data-testid="scope-selector"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="px-3 py-2 text-sm bg-bg-secondary border border-border rounded-md text-text-primary"
        >
          <option value="project">Project</option>
          <option value="workspace">Workspace</option>
          <option value="global">Global</option>
        </select>
      </div>

      {/* States */}
      {loading && (
        <div data-testid="recall-loading" className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {!loading && !searched && (
        <p className="text-sm text-text-muted text-center py-8">
          Ask a question to search your memory
        </p>
      )}

      {!loading && searched && results && results.length === 0 && (
        <p className="text-sm text-text-muted text-center py-8">
          No matching memories found
        </p>
      )}

      {/* Results */}
      {!loading && results && results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium">{r.text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={TYPE_VARIANTS[r.type] || 'neutral'} size="sm">
                      {TYPE_LABELS[r.type] || r.type}
                    </Badge>
                    <span className="text-xs text-text-muted">{r.date}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-sm font-semibold text-accent">
                  {Math.round(r.score * 100)}%
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
