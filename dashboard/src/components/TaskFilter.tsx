import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { TaskStatus, TaskPriority } from './TaskCard.js';

export interface FilterState {
  assignee?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
}

export interface TaskFilterProps {
  assignees: string[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

type FilterSection = 'assignee' | 'status' | 'priority';

const statuses: { key: TaskStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const priorities: { key: TaskPriority; label: string }[] = [
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

export function TaskFilter({
  assignees,
  filters,
  onChange,
}: TaskFilterProps) {
  const [activeSection, setActiveSection] = useState<FilterSection>(
    assignees.length > 0 ? 'assignee' : 'status'
  );
  const [activeIndex, setActiveIndex] = useState(0);

  // Build options for current section
  const currentOptions = useMemo(() => {
    switch (activeSection) {
      case 'assignee':
        return ['All', ...assignees];
      case 'status':
        return statuses.map((s) => s.label);
      case 'priority':
        return priorities.map((p) => p.label);
    }
  }, [activeSection, assignees]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.assignee) count++;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.priority && filters.priority.length > 0) count++;
    return count;
  }, [filters]);

  // Get sections to show
  const sections: FilterSection[] = useMemo(() => {
    const s: FilterSection[] = [];
    if (assignees.length > 0) s.push('assignee');
    s.push('status', 'priority');
    return s;
  }, [assignees]);

  useInput((input, key) => {
    // Section navigation (Tab)
    if (key.tab) {
      const currentIdx = sections.indexOf(activeSection);
      const nextIdx = (currentIdx + 1) % sections.length;
      setActiveSection(sections[nextIdx]);
      setActiveIndex(0);
      return;
    }

    // Item navigation
    if (key.downArrow || input === 'j') {
      setActiveIndex((prev) => Math.min(prev + 1, currentOptions.length - 1));
    } else if (key.upArrow || input === 'k') {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }

    // Toggle selection
    else if (input === ' ' || key.return) {
      handleToggle();
    }

    // Clear all
    else if (input === 'c') {
      onChange({});
    }
  });

  const handleToggle = () => {
    const newFilters = { ...filters };

    switch (activeSection) {
      case 'assignee': {
        const selected = currentOptions[activeIndex];
        if (selected === 'All') {
          delete newFilters.assignee;
        } else {
          newFilters.assignee = selected;
        }
        break;
      }
      case 'status': {
        const statusKey = statuses[activeIndex].key;
        const current = filters.status || [];
        if (current.includes(statusKey)) {
          newFilters.status = current.filter((s) => s !== statusKey);
          if (newFilters.status.length === 0) delete newFilters.status;
        } else {
          newFilters.status = [...current, statusKey];
        }
        break;
      }
      case 'priority': {
        const priorityKey = priorities[activeIndex].key;
        const current = filters.priority || [];
        if (current.includes(priorityKey)) {
          newFilters.priority = current.filter((p) => p !== priorityKey);
          if (newFilters.priority.length === 0) delete newFilters.priority;
        } else {
          newFilters.priority = [...current, priorityKey];
        }
        break;
      }
    }

    onChange(newFilters);
  };

  const isSelected = (section: FilterSection, index: number): boolean => {
    switch (section) {
      case 'assignee':
        const option = index === 0 ? undefined : assignees[index - 1];
        return filters.assignee === option;
      case 'status':
        return (filters.status || []).includes(statuses[index].key);
      case 'priority':
        return (filters.priority || []).includes(priorities[index].key);
    }
  };

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Filters</Text>
        {activeFilterCount > 0 && (
          <Text dimColor> ({activeFilterCount} active)</Text>
        )}
      </Box>

      {/* Assignee Section */}
      {assignees.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={activeSection === 'assignee' ? 'cyan' : 'white'}>
            Assignee
          </Text>
          {['All', ...assignees].map((name, idx) => {
            const isActive = activeSection === 'assignee' && activeIndex === idx;
            const selected = name === 'All' ? !filters.assignee : filters.assignee === name;
            return (
              <Box key={name}>
                <Text color={isActive ? 'cyan' : undefined}>
                  {isActive ? '▶ ' : '  '}
                </Text>
                <Text color={selected ? 'green' : 'gray'}>
                  {selected ? '● ' : '○ '}
                </Text>
                <Text>{name}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Status Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={activeSection === 'status' ? 'cyan' : 'white'}>
          Status
        </Text>
        {statuses.map((status, idx) => {
          const isActive = activeSection === 'status' && activeIndex === idx;
          const selected = (filters.status || []).includes(status.key);
          return (
            <Box key={status.key}>
              <Text color={isActive ? 'cyan' : undefined}>
                {isActive ? '▶ ' : '  '}
              </Text>
              <Text color={selected ? 'green' : 'gray'}>
                {selected ? '[x] ' : '[ ] '}
              </Text>
              <Text>{status.label}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Priority Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={activeSection === 'priority' ? 'cyan' : 'white'}>
          Priority
        </Text>
        {priorities.map((priority, idx) => {
          const isActive = activeSection === 'priority' && activeIndex === idx;
          const selected = (filters.priority || []).includes(priority.key);
          return (
            <Box key={priority.key}>
              <Text color={isActive ? 'cyan' : undefined}>
                {isActive ? '▶ ' : '  '}
              </Text>
              <Text color={selected ? 'green' : 'gray'}>
                {selected ? '[x] ' : '[ ] '}
              </Text>
              <Text>{priority.label}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Actions */}
      <Box marginTop={1}>
        <Text dimColor>↑/k ↓/j navigate • Space toggle • Tab section • c clear</Text>
      </Box>
    </Box>
  );
}
