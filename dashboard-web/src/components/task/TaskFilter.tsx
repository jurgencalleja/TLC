import { useState, useRef, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { TaskPriority } from './TaskCard';

export interface TaskFilterValues {
  assignees: string[];
  priorities: TaskPriority[];
}

export interface Assignee {
  id: string;
  name: string;
}

export interface TaskFilterProps {
  assignees: Assignee[];
  onFilterChange: (filters: TaskFilterValues) => void;
  initialFilters?: TaskFilterValues;
  className?: string;
}

const priorities: { id: TaskPriority; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

export function TaskFilter({
  assignees,
  onFilterChange,
  initialFilters,
  className = '',
}: TaskFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilterValues>(
    initialFilters || { assignees: [], priorities: [] }
  );
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleAssigneeToggle = (assigneeId: string) => {
    const newAssignees = filters.assignees.includes(assigneeId)
      ? filters.assignees.filter((id) => id !== assigneeId)
      : [...filters.assignees, assigneeId];

    const newFilters = { ...filters, assignees: newAssignees };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handlePriorityToggle = (priority: TaskPriority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];

    const newFilters = { ...filters, priorities: newPriorities };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearAll = () => {
    const newFilters = { assignees: [], priorities: [] };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const activeFilterCount = filters.assignees.length + filters.priorities.length;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        data-testid="task-filter"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2
          bg-surface border border-border rounded-md
          hover:bg-muted transition-colors
          text-foreground text-sm
        `}
      >
        <Filter className="w-4 h-4" />
        <span>Filter</span>
        {activeFilterCount > 0 && (
          <span
            data-testid="filter-count"
            className="px-1.5 py-0.5 text-xs font-medium bg-primary text-white rounded-full"
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          data-testid="filter-panel"
          className="
            absolute z-50 mt-1 w-64
            bg-surface border border-border rounded-md shadow-lg
            p-4 right-0
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-foreground">Filters</h4>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Assignees */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-foreground mb-2">Assignee</h5>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.assignees.includes('unassigned')}
                  onChange={() => handleAssigneeToggle('unassigned')}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Unassigned</span>
              </label>
              {assignees.map((assignee) => (
                <label key={assignee.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.assignees.includes(assignee.id)}
                    onChange={() => handleAssigneeToggle(assignee.id)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">{assignee.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priorities */}
          <div>
            <h5 className="text-sm font-medium text-foreground mb-2">Priority</h5>
            <div className="space-y-2">
              {priorities.map((priority) => (
                <label key={priority.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.priorities.includes(priority.id)}
                    onChange={() => handlePriorityToggle(priority.id)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">{priority.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
