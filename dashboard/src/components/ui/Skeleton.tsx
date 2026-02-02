import { Box, Text } from 'ink';
import React from 'react';

export type SkeletonVariant = 'text' | 'avatar' | 'card' | 'button' | 'table-row';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number;
  height?: number;
  lines?: number;
  size?: number;
  columns?: number;
  rounded?: boolean;
}

// Shimmer/pulse characters for animation feel
const SHIMMER_CHAR = '░';
const SHIMMER_CHAR_ALT = '▒';

function SkeletonLine({ width = 20 }: { width?: number }) {
  return <Text color="gray">{SHIMMER_CHAR.repeat(width)}</Text>;
}

function SkeletonBase({
  variant = 'text',
  width = 20,
  height = 1,
  lines = 1,
  size = 3,
  columns = 3,
  rounded = false,
}: SkeletonProps) {
  switch (variant) {
    case 'text':
      return (
        <Box flexDirection="column">
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonLine key={i} width={i === lines - 1 ? Math.floor(width * 0.7) : width} />
          ))}
        </Box>
      );

    case 'avatar':
      // Render a circle-ish shape using characters
      return (
        <Box flexDirection="column">
          {Array.from({ length: size }).map((_, row) => (
            <Box key={row}>
              {row === 0 || row === size - 1 ? (
                <Text color="gray">{' '.repeat(1)}{SHIMMER_CHAR.repeat(size - 2)}</Text>
              ) : (
                <Text color="gray">{SHIMMER_CHAR.repeat(size)}</Text>
              )}
            </Box>
          ))}
        </Box>
      );

    case 'card':
      const borderTop = rounded ? '╭' + '─'.repeat(width - 2) + '╮' : '┌' + '─'.repeat(width - 2) + '┐';
      const borderBottom = rounded ? '╰' + '─'.repeat(width - 2) + '╯' : '└' + '─'.repeat(width - 2) + '┘';
      return (
        <Box flexDirection="column">
          <Text color="gray">{borderTop}</Text>
          {Array.from({ length: height - 2 }).map((_, i) => (
            <Box key={i}>
              <Text color="gray">│</Text>
              <Text color="gray">{SHIMMER_CHAR.repeat(width - 2)}</Text>
              <Text color="gray">│</Text>
            </Box>
          ))}
          <Text color="gray">{borderBottom}</Text>
        </Box>
      );

    case 'button':
      return (
        <Box>
          <Text color="gray">[{SHIMMER_CHAR.repeat(width - 2)}]</Text>
        </Box>
      );

    case 'table-row':
      return (
        <Box>
          {Array.from({ length: columns }).map((_, i) => (
            <Box key={i} marginRight={2}>
              <Text color="gray">{SHIMMER_CHAR.repeat(Math.floor(width / columns))}</Text>
            </Box>
          ))}
        </Box>
      );

    default:
      return <SkeletonLine width={width} />;
  }
}

// Main Skeleton component with sub-components
export function Skeleton(props: SkeletonProps) {
  return <SkeletonBase {...props} />;
}

// Convenience sub-components
Skeleton.Text = function SkeletonText({ lines = 1, width = 20 }: { lines?: number; width?: number }) {
  return <SkeletonBase variant="text" lines={lines} width={width} />;
};

Skeleton.Avatar = function SkeletonAvatar({ size = 3 }: { size?: number }) {
  return <SkeletonBase variant="avatar" size={size} />;
};

Skeleton.Card = function SkeletonCard({ width = 30, height = 5 }: { width?: number; height?: number }) {
  return <SkeletonBase variant="card" width={width} height={height} />;
};

Skeleton.Button = function SkeletonButton({ width = 10 }: { width?: number }) {
  return <SkeletonBase variant="button" width={width} />;
};

Skeleton.TableRow = function SkeletonTableRow({ columns = 3, width = 30 }: { columns?: number; width?: number }) {
  return <SkeletonBase variant="table-row" columns={columns} width={width} />;
};

export default Skeleton;
