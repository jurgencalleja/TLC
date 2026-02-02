import { Box, Text } from 'ink';
import React from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  variant: ToastVariant;
  message: string;
  title?: string;
  dismissable?: boolean;
  onDismiss?: () => void;
  actions?: ToastAction[];
}

export interface ToastData {
  id: string;
  variant: ToastVariant;
  message: string;
  title?: string;
  dismissable?: boolean;
  duration?: number;
  actions?: ToastAction[];
}

export interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss?: (id: string) => void;
  position?: ToastPosition;
  maxVisible?: number;
}

const variantConfig = {
  success: { icon: '✓', color: 'green' as const },
  error: { icon: '✕', color: 'red' as const },
  warning: { icon: '⚠', color: 'yellow' as const },
  info: { icon: 'ℹ', color: 'blue' as const },
};

export function Toast({
  variant,
  message,
  title,
  dismissable = true,
  onDismiss,
  actions,
}: ToastProps) {
  const config = variantConfig[variant];

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={config.color}
      paddingX={1}
      marginBottom={1}
    >
      {/* Header row */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={config.color}>{config.icon} </Text>
          {title ? (
            <Text bold color={config.color}>{title}</Text>
          ) : (
            <Text bold color={config.color}>{variant}</Text>
          )}
        </Box>
        {dismissable && (
          <Text color="gray">×</Text>
        )}
      </Box>

      {/* Message */}
      <Box marginTop={title ? 1 : 0}>
        <Text>{message}</Text>
      </Box>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <Box marginTop={1}>
          {actions.map((action, idx) => (
            <Box key={idx} marginRight={2}>
              <Text color="cyan">[{action.label}]</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
  maxVisible = 5,
}: ToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  const visibleToasts = toasts.slice(0, maxVisible);
  const hiddenCount = toasts.length - maxVisible;

  return (
    <Box flexDirection="column">
      {visibleToasts.map(toast => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          message={toast.message}
          title={toast.title}
          dismissable={toast.dismissable ?? true}
          onDismiss={() => onDismiss?.(toast.id)}
          actions={toast.actions}
        />
      ))}
      {hiddenCount > 0 && (
        <Box>
          <Text color="gray">+{hiddenCount} more...</Text>
        </Box>
      )}
    </Box>
  );
}

export default Toast;
