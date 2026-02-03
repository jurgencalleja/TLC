import { useState, useRef, useEffect } from 'react';
import { GitBranch, ChevronDown, Search } from 'lucide-react';

export interface Branch {
  name: string;
  isDefault: boolean;
  ahead: number;
  behind: number;
}

export interface BranchSelectorProps {
  branches: Branch[];
  currentBranch: string;
  onBranchChange: (branchName: string) => void;
  showSearch?: boolean;
  className?: string;
}

export function BranchSelector({
  branches,
  currentBranch,
  onBranchChange,
  showSearch = false,
  className = '',
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (branchName: string) => {
    onBranchChange(branchName);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        data-testid="branch-selector"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2
          bg-surface border border-border rounded-md
          hover:bg-muted transition-colors
          text-foreground text-sm
          ${className}
        `}
      >
        <GitBranch data-testid="branch-icon" className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">{currentBranch}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="
            absolute z-50 mt-1 w-64
            bg-surface border border-border rounded-md shadow-lg
            py-1 max-h-80 overflow-auto
            left-0
          "
        >
          {showSearch && (
            <div className="px-2 py-1.5 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search branches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="
                    w-full pl-8 pr-3 py-1.5
                    bg-muted border-none rounded
                    text-sm text-foreground
                    placeholder:text-muted-foreground
                    focus:outline-none focus:ring-1 focus:ring-primary
                  "
                />
              </div>
            </div>
          )}

          {filteredBranches.map((branch) => (
            <div
              key={branch.name}
              role="menuitem"
              onClick={() => handleSelect(branch.name)}
              className={`
                flex items-center justify-between px-3 py-2 cursor-pointer
                hover:bg-muted
                ${branch.name === currentBranch ? 'bg-primary/10' : ''}
              `}
            >
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate text-sm">{branch.name}</span>
                {branch.isDefault && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {branch.ahead > 0 && (
                  <span className="text-success">↑{branch.ahead}</span>
                )}
                {branch.behind > 0 && (
                  <span className="text-error">↓{branch.behind}</span>
                )}
              </div>
            </div>
          ))}

          {filteredBranches.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No branches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
