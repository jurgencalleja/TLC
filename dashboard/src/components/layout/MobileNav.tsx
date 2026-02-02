import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface MobileNavProps {
  items: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  compact?: boolean;
  maxItems?: number;
  isTTY?: boolean;
}

export function MobileNav({
  items,
  activeKey,
  onNavigate,
  compact = false,
  maxItems = 5,
  isTTY = true,
}: MobileNavProps) {
  const [focusIndex, setFocusIndex] = useState(
    items.findIndex(i => i.key === activeKey)
  );

  // Handle keyboard navigation
  useInput((input, key) => {
    if (!isTTY) return;

    if (key.leftArrow || input === 'h') {
      setFocusIndex(prev => Math.max(0, prev - 1));
    }
    if (key.rightArrow || input === 'l') {
      setFocusIndex(prev => Math.min(items.length - 1, prev + 1));
    }
    if (key.return) {
      const item = items[focusIndex];
      if (item) {
        onNavigate(item.key);
      }
    }
  }, { isActive: isTTY });

  const visibleItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
      justifyContent="space-around"
    >
      {visibleItems.map((item, idx) => {
        const isActive = item.key === activeKey;
        const isFocused = idx === focusIndex;

        return (
          <Box key={item.key} flexDirection="column" alignItems="center" marginX={1}>
            {/* Active indicator */}
            {isActive && <Text color="cyan">●</Text>}
            {!isActive && <Text> </Text>}

            {/* Icon */}
            <Text color={isActive ? 'cyan' : isFocused ? 'white' : 'gray'}>
              {item.icon}
            </Text>

            {/* Badge */}
            {item.badge !== undefined && item.badge > 0 && (
              <Text color="red" bold>{item.badge}</Text>
            )}

            {/* Label (unless compact) */}
            {!compact && (
              <Text
                color={isActive ? 'cyan' : isFocused ? 'white' : 'gray'}
                dimColor={!isActive && !isFocused}
              >
                {item.label.length > 8 ? item.label.slice(0, 6) + '..' : item.label}
              </Text>
            )}
          </Box>
        );
      })}

      {/* Overflow indicator */}
      {hasMore && (
        <Box flexDirection="column" alignItems="center" marginX={1}>
          <Text color="gray">⋯</Text>
          {!compact && <Text color="gray">more</Text>}
        </Box>
      )}
    </Box>
  );
}

export default MobileNav;
