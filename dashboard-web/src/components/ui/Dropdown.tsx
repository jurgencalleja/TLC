import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  trigger: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({
  items,
  onSelect,
  trigger,
  align = 'left',
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [typeahead, setTypeahead] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const typeaheadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  // Reset highlight when closing
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
      setTypeahead('');
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          return next >= items.length ? 0 : next;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? items.length - 1 : next;
        });
        break;

      case 'Enter':
        e.preventDefault();
        const selectedItem = items[highlightedIndex];
        if (highlightedIndex >= 0 && selectedItem && !selectedItem.disabled) {
          handleSelect(selectedItem);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;

      default:
        // Type-ahead search
        if (e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
          const newTypeahead = typeahead + e.key.toLowerCase();
          setTypeahead(newTypeahead);

          // Find matching item
          const matchIndex = items.findIndex((item) =>
            item.label.toLowerCase().startsWith(newTypeahead)
          );
          if (matchIndex >= 0) {
            setHighlightedIndex(matchIndex);
          }

          // Clear typeahead after delay
          if (typeaheadTimeoutRef.current) {
            clearTimeout(typeaheadTimeoutRef.current);
          }
          typeaheadTimeoutRef.current = setTimeout(() => {
            setTypeahead('');
          }, 500);
        }
        break;
    }
  };

  const handleSelect = (item: DropdownItem) => {
    if (item.disabled) return;
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2
          bg-surface border border-border rounded-md
          hover:bg-muted transition-colors
          text-foreground
        "
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={`
            absolute z-50 mt-1 min-w-[180px]
            bg-surface border border-border rounded-md shadow-lg
            py-1 max-h-60 overflow-auto
            ${align === 'left' ? 'left-0' : 'right-0'}
          `}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              role="menuitem"
              tabIndex={-1}
              aria-disabled={item.disabled}
              onClick={() => handleSelect(item)}
              className={`
                flex items-center gap-2 px-3 py-2 cursor-pointer
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}
                ${highlightedIndex === index ? 'bg-muted' : ''}
                ${item.disabled ? '' : 'text-foreground'}
              `}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
