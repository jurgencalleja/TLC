import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

export interface LogSearchProps {
  onSearch: (query: string) => void;
  searchQuery?: string;
  matchCount?: number;
  totalCount?: number;
  currentMatch?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
  className?: string;
}

export function LogSearch({
  onSearch,
  searchQuery = '',
  matchCount,
  totalCount,
  currentMatch,
  onNavigate,
  className = '',
}: LogSearchProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onNavigate?.(e.shiftKey ? 'prev' : 'next');
    } else if (e.key === 'Escape') {
      onSearch('');
    }
  };

  const handleClear = () => {
    onSearch('');
  };

  const hasMatches = matchCount !== undefined && matchCount > 0;
  const showNoMatches = searchQuery && matchCount === 0;

  return (
    <div
      data-testid="log-search"
      className={`flex items-center gap-2 ${className}`}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="
            w-full pl-9 pr-8 py-2
            bg-surface border border-border rounded-md
            text-sm text-foreground
            placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          "
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Match info */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm">
          {showNoMatches ? (
            <span className="text-muted-foreground">No matches</span>
          ) : matchCount !== undefined ? (
            currentMatch !== undefined ? (
              <span data-testid="current-match" className="text-muted-foreground">
                {currentMatch} of {matchCount}
              </span>
            ) : (
              <span data-testid="match-count" className="text-muted-foreground">
                {matchCount} of {totalCount}
              </span>
            )
          ) : null}
        </div>
      )}

      {/* Navigation */}
      {onNavigate && (
        <div className="flex items-center">
          <button
            onClick={() => onNavigate('prev')}
            disabled={!hasMatches}
            aria-label="Previous match"
            className="
              p-1.5 rounded hover:bg-muted
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('next')}
            disabled={!hasMatches}
            aria-label="Next match"
            className="
              p-1.5 rounded hover:bg-muted
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
