import { Box, Text, useInput } from 'ink';
import React, { useState, useMemo } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  onSelect: (value: string | string[]) => void;
  value?: string | string[];
  placeholder?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  multiple?: boolean;
  filterable?: boolean;
  filterQuery?: string;
  onFilterChange?: (query: string) => void;
  maxHeight?: number;
  isTTY?: boolean;
}

export function Dropdown({
  options,
  onSelect,
  value,
  placeholder = 'Select...',
  isOpen = false,
  onOpenChange,
  multiple = false,
  filterable = false,
  filterQuery = '',
  onFilterChange,
  maxHeight = 10,
  isTTY = true,
}: DropdownProps) {
  const [highlightIndex, setHighlightIndex] = useState(0);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!filterQuery) return options;
    const query = filterQuery.toLowerCase();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(query) ||
      opt.value.toLowerCase().includes(query)
    );
  }, [options, filterQuery]);

  // Group options
  const groupedOptions = useMemo(() => {
    const groups: Record<string, DropdownOption[]> = {};
    filteredOptions.forEach(opt => {
      const group = opt.group || '__default__';
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
    });
    return groups;
  }, [filteredOptions]);

  // Get display value
  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    if (Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      const labels = value.map(v => {
        const opt = options.find(o => o.value === v);
        return opt?.label || v;
      });
      return labels.join(', ');
    }
    const opt = options.find(o => o.value === value);
    return opt?.label || placeholder;
  }, [value, options, placeholder]);

  // Check if option is selected
  const isSelected = (optValue: string) => {
    if (Array.isArray(value)) return value.includes(optValue);
    return value === optValue;
  };

  // Handle keyboard input
  useInput((input, key) => {
    if (!isOpen || !isTTY) return;

    if (key.escape) {
      onOpenChange?.(false);
      return;
    }

    if (key.downArrow || input === 'j') {
      setHighlightIndex(prev => {
        let next = prev + 1;
        while (next < filteredOptions.length && filteredOptions[next]?.disabled) {
          next++;
        }
        return next < filteredOptions.length ? next : prev;
      });
      return;
    }

    if (key.upArrow || input === 'k') {
      setHighlightIndex(prev => {
        let next = prev - 1;
        while (next >= 0 && filteredOptions[next]?.disabled) {
          next--;
        }
        return next >= 0 ? next : prev;
      });
      return;
    }

    if (key.return) {
      const selected = filteredOptions[highlightIndex];
      if (selected && !selected.disabled) {
        if (multiple) {
          const currentValues = Array.isArray(value) ? value : [];
          const newValues = isSelected(selected.value)
            ? currentValues.filter(v => v !== selected.value)
            : [...currentValues, selected.value];
          onSelect(newValues);
        } else {
          onSelect(selected.value);
          onOpenChange?.(false);
        }
      }
      return;
    }

    // Type-ahead filtering
    if (filterable && input && input.length === 1 && /[a-zA-Z0-9]/.test(input)) {
      onFilterChange?.(filterQuery + input);
    }
  }, { isActive: isTTY && isOpen });

  if (!isOpen) {
    // Closed state - show trigger
    return (
      <Box>
        <Text>{displayValue}</Text>
        <Text color="gray"> ▾</Text>
      </Box>
    );
  }

  // Open state - show dropdown list
  return (
    <Box flexDirection="column">
      {/* Trigger */}
      <Box>
        <Text bold>{displayValue}</Text>
        <Text color="cyan"> ▴</Text>
      </Box>

      {/* Filter input */}
      {filterable && (
        <Box marginTop={1}>
          <Text color="gray">&gt; </Text>
          <Text>{filterQuery}</Text>
          <Text color="cyan">▏</Text>
        </Box>
      )}

      {/* Options list */}
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        {filteredOptions.length === 0 ? (
          <Text color="gray">No matching options</Text>
        ) : (
          Object.entries(groupedOptions).map(([group, opts]) => (
            <Box key={group} flexDirection="column">
              {group !== '__default__' && (
                <Text bold color="cyan">{group}</Text>
              )}
              {opts.slice(0, maxHeight).map((opt, idx) => {
                const globalIdx = filteredOptions.indexOf(opt);
                const isHighlighted = globalIdx === highlightIndex;
                const isChecked = isSelected(opt.value);

                return (
                  <Box key={opt.value}>
                    <Text color={isHighlighted ? 'cyan' : undefined}>
                      {isHighlighted ? '▶ ' : '  '}
                    </Text>
                    {multiple && (
                      <Text color={isChecked ? 'green' : 'gray'}>
                        {isChecked ? '☑ ' : '☐ '}
                      </Text>
                    )}
                    <Text
                      color={opt.disabled ? 'gray' : undefined}
                      dimColor={opt.disabled}
                    >
                      {opt.label}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          ))
        )}
      </Box>

      {/* Navigation hints */}
      <Box marginTop={1}>
        <Text color="gray">↑↓ navigate | Enter select | Esc close</Text>
      </Box>
    </Box>
  );
}

export default Dropdown;
