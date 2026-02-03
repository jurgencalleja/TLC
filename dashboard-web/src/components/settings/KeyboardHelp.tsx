import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
  modifier?: string;
}

export interface KeyboardHelpProps {
  shortcuts: KeyboardShortcut[];
  open: boolean;
  onClose: () => void;
  className?: string;
}

function groupByCategory(shortcuts: KeyboardShortcut[]): Record<string, KeyboardShortcut[]> {
  return shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );
}

export function KeyboardHelp({
  shortcuts,
  open,
  onClose,
  className = '',
}: KeyboardHelpProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const grouped = groupByCategory(shortcuts);

  return (
    <div
      data-testid="keyboard-help"
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
    >
      {/* Backdrop */}
      <div
        data-testid="keyboard-help-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-surface border border-border rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(grouped).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={`${shortcut.key}-${index}`}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.modifier && (
                        <kbd className="px-2 py-1 text-xs bg-muted rounded border border-border">
                          {shortcut.modifier}
                        </kbd>
                      )}
                      <kbd className="px-2 py-1 text-xs bg-muted rounded border border-border">
                        {shortcut.key}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
