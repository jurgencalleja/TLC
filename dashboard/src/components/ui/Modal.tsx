import { Box, Text, useInput } from 'ink';
import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeable?: boolean;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  isTTY?: boolean;
}

const sizeMap = {
  small: { width: 40, height: 10 },
  medium: { width: 60, height: 15 },
  large: { width: 80, height: 20 },
  fullscreen: { width: '100%' as const, height: '100%' as const },
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeable = true,
  size = 'medium',
  isTTY = true,
}: ModalProps) {
  // Handle keyboard input
  useInput((input, key) => {
    if (!isOpen || !closeable) return;

    if (key.escape) {
      onClose();
    }
  }, { isActive: isTTY && isOpen });

  if (!isOpen) {
    return null;
  }

  const dimensions = sizeMap[size];
  const isFullscreen = size === 'fullscreen';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      width={isFullscreen ? undefined : dimensions.width}
      minHeight={isFullscreen ? undefined : dimensions.height}
      padding={1}
    >
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Box>
          {title && <Text bold color="cyan">{title}</Text>}
        </Box>
        {closeable && (
          <Text color="gray">[esc] ×</Text>
        )}
      </Box>

      {/* Separator */}
      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(isFullscreen ? 50 : (dimensions.width as number) - 4)}</Text>
      </Box>

      {/* Body */}
      <Box flexDirection="column" flexGrow={1}>
        {children}
      </Box>

      {/* Footer */}
      {footer && (
        <>
          <Box marginTop={1}>
            <Text color="gray">{'─'.repeat(isFullscreen ? 50 : (dimensions.width as number) - 4)}</Text>
          </Box>
          <Box marginTop={1}>
            {footer}
          </Box>
        </>
      )}
    </Box>
  );
}

export default Modal;
