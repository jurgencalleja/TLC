import React from 'react';
import { Box, Text, useInput } from 'ink';

export interface FocusArea {
  id: string;
  label: string;
  shortcut?: string;
}

export interface FocusIndicatorProps {
  areas: FocusArea[];
  currentArea: string;
  isTrapped?: boolean;
  trappedLabel?: string;
  showSkipLinks?: boolean;
  highContrast?: boolean;
  compact?: boolean;
  breadcrumb?: string[];
  isActive?: boolean;
  onFocusChange?: (areaId: string) => void;
  onEscape?: () => void;
}

export function FocusIndicator({
  areas,
  currentArea,
  isTrapped = false,
  trappedLabel,
  showSkipLinks = false,
  highContrast = false,
  compact = false,
  breadcrumb,
  isActive = true,
  onFocusChange,
  onEscape,
}: FocusIndicatorProps) {
  useInput(
    (input, key) => {
      if (!isActive) return;

      // Escape from trap
      if (key.escape && isTrapped && onEscape) {
        onEscape();
        return;
      }

      // Tab navigation
      if (key.tab && !isTrapped && onFocusChange) {
        const currentIndex = areas.findIndex((a) => a.id === currentArea);
        const nextIndex = key.shift
          ? (currentIndex - 1 + areas.length) % areas.length
          : (currentIndex + 1) % areas.length;
        onFocusChange(areas[nextIndex].id);
        return;
      }

      // Number shortcut navigation
      if (!isTrapped && onFocusChange) {
        const num = parseInt(input, 10);
        if (num >= 1 && num <= areas.length) {
          onFocusChange(areas[num - 1].id);
        }
      }
    },
    { isActive }
  );

  // Empty state
  if (areas.length === 0) {
    return (
      <Box>
        <Text dimColor>No focus areas</Text>
      </Box>
    );
  }

  // Trapped mode (modal)
  if (isTrapped) {
    return (
      <Box flexDirection="column">
        {/* Trapped indicator */}
        <Box>
          <Text color="yellow" bold>
            ▶ {trappedLabel || 'Modal'}
          </Text>
          <Text dimColor> (Esc to close)</Text>
        </Box>

        {/* Dimmed areas */}
        {!compact && (
          <Box marginTop={1}>
            <Text dimColor>
              {areas.map((a) => a.label).join(' │ ')}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  // Compact mode
  if (compact) {
    const current = areas.find((a) => a.id === currentArea);
    return (
      <Box>
        <Text color="cyan" bold>▶ {current?.label || currentArea}</Text>
        <Text dimColor> Tab to navigate</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Skip links */}
      {showSkipLinks && (
        <Box marginBottom={1}>
          <Text dimColor>[Skip to main content]</Text>
        </Box>
      )}

      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <Box marginBottom={1}>
          {breadcrumb.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <Text dimColor> › </Text>}
              <Text
                color={idx === breadcrumb.length - 1 ? 'cyan' : undefined}
                dimColor={idx !== breadcrumb.length - 1}
              >
                {item}
              </Text>
            </React.Fragment>
          ))}
        </Box>
      )}

      {/* Focus areas */}
      <Box>
        {areas.map((area, idx) => {
          const isCurrent = area.id === currentArea;

          return (
            <Box key={area.id} marginRight={2}>
              {/* Current indicator */}
              <Text color={isCurrent ? 'cyan' : undefined}>
                {isCurrent ? '▶ ' : '  '}
              </Text>

              {/* Shortcut */}
              {area.shortcut && (
                <Text color={highContrast ? 'white' : 'yellow'}>
                  [{area.shortcut}]
                </Text>
              )}

              {/* Label */}
              <Text
                bold={isCurrent || highContrast}
                color={isCurrent ? 'cyan' : highContrast ? 'white' : undefined}
                dimColor={!isCurrent && !highContrast}
              >
                {area.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Navigation hint */}
      <Box marginTop={1}>
        <Text dimColor>Tab next • Shift+Tab prev • 1-{areas.length} jump</Text>
      </Box>
    </Box>
  );
}
