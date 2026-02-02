import React from 'react';
import { Box, Text, useInput } from 'ink';

export interface UpdateBannerProps {
  /** Current installed version */
  current: string;
  /** Latest available version */
  latest: string;
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Changelog items for the new version */
  changelog?: string[];
  /** Whether the banner can be dismissed */
  dismissable?: boolean;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Show compact single-line version */
  compact?: boolean;
  /** Whether this component is active for keyboard input */
  isActive?: boolean;
}

/**
 * UpdateBanner - Shows when a new TLC version is available
 *
 * Displays the latest version number and optional changelog.
 * Can be dismissed by pressing 'x'.
 */
export function UpdateBanner({
  current,
  latest,
  updateAvailable,
  changelog = [],
  dismissable = true,
  onDismiss,
  compact = false,
  isActive = true,
}: UpdateBannerProps) {
  // Handle keyboard input
  useInput(
    (input) => {
      if (!isActive || !dismissable) return;

      // Dismiss on 'x' key
      if (input === 'x' && onDismiss) {
        onDismiss();
      }
    },
    { isActive: isActive && dismissable }
  );

  // Don't render if no update available
  if (!updateAvailable) {
    return null;
  }

  // Compact mode - single line
  if (compact) {
    return (
      <Box>
        <Text color="green" bold>
          NEW
        </Text>
        <Text color="green"> v{latest} available</Text>
        {dismissable && (
          <Text dimColor> (x dismiss)</Text>
        )}
      </Box>
    );
  }

  // Full mode with changelog
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="green"
      paddingX={1}
      paddingY={0}
    >
      {/* Header line */}
      <Box>
        <Text color="green" bold>
          Update Available
        </Text>
        <Text color="white"> v{latest}</Text>
        <Text dimColor> (current: v{current})</Text>
        {dismissable && (
          <Box marginLeft={2}>
            <Text dimColor>x dismiss</Text>
          </Box>
        )}
      </Box>

      {/* Changelog items */}
      {changelog.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>What's new:</Text>
          {changelog.map((item, index) => (
            <Box key={index}>
              <Text dimColor>  - </Text>
              <Text>{item}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Update hint */}
      <Box marginTop={1}>
        <Text dimColor>Run </Text>
        <Text color="cyan">npm update tlc-server</Text>
        <Text dimColor> to update</Text>
      </Box>
    </Box>
  );
}

export default UpdateBanner;
