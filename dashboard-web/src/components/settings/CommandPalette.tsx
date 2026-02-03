import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  commands: Command[];
  open: boolean;
  onClose: () => void;
  className?: string;
}

function fuzzyMatch(query: string, text: string): boolean {
  query = query.toLowerCase();
  text = text.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === query.length;
}

export function CommandPalette({
  commands,
  open,
  onClose,
  className = '',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = query
    ? commands.filter((cmd) => fuzzyMatch(query, cmd.label))
    : commands;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = (command: Command) => {
    command.action();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      executeCommand(filteredCommands[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      data-testid="command-palette"
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[20vh] ${className}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 px-3 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                onClick={() => executeCommand(command)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 text-left
                  ${index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'}
                  transition-colors
                `}
              >
                <span className="text-foreground">{command.label}</span>
                {command.shortcut && (
                  <kbd className="px-2 py-1 text-xs bg-muted rounded border border-border">
                    {command.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
