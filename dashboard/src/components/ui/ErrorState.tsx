import { Box, Text } from 'ink';
import type { FetchError } from '../../api/safeFetch.js';

export interface ErrorInfo {
  title: string;
  message: string;
  hint?: string;
}

/**
 * Maps error types to user-friendly messages with actionable hints
 */
const ERROR_MESSAGES: Record<string, ErrorInfo> = {
  'http-404': {
    title: 'Not Set Up',
    message: 'This feature needs configuration.',
    hint: 'Run tlc setup',
  },
  'http-401': {
    title: 'Not Authorized',
    message: 'Authentication required.',
    hint: 'Check your credentials',
  },
  'http-403': {
    title: 'Access Denied',
    message: 'You do not have permission.',
  },
  'http-500': {
    title: 'Server Error',
    message: 'Something went wrong on the server.',
  },
  'http-502': {
    title: 'Bad Gateway',
    message: 'The server is unreachable.',
    hint: 'Check if tlc server is running',
  },
  'http-503': {
    title: 'Service Unavailable',
    message: 'The server is temporarily unavailable.',
  },
  network: {
    title: 'Connection Lost',
    message: 'Cannot reach the server.',
    hint: 'Check if tlc server is running',
  },
  timeout: {
    title: 'Request Timeout',
    message: 'The server took too long to respond.',
    hint: 'Try again or check server health',
  },
  parse: {
    title: 'Invalid Response',
    message: 'The server returned unexpected data.',
  },
  unknown: {
    title: 'Unknown Error',
    message: 'An unexpected error occurred.',
  },
};

function getErrorInfo(error: FetchError): ErrorInfo {
  // Check for specific HTTP error codes
  if (error.type === 'http' && error.code) {
    const key = `http-${error.code}`;
    if (key in ERROR_MESSAGES) {
      return ERROR_MESSAGES[key];
    }
    // Default HTTP error
    return {
      title: `HTTP Error ${error.code}`,
      message: error.message,
    };
  }

  // Check for other error types
  return ERROR_MESSAGES[error.type] || ERROR_MESSAGES.unknown;
}

export interface ErrorStateProps {
  error: FetchError;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * Renders a user-friendly error state with optional retry button.
 * Maps technical errors to helpful messages with actionable hints.
 */
export function ErrorState({ error, onRetry, compact = false }: ErrorStateProps) {
  const info = getErrorInfo(error);

  if (compact) {
    return (
      <Box>
        <Text color="red">{info.title}</Text>
        {onRetry && <Text dimColor> [r] retry</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      {/* Error icon */}
      <Box marginBottom={1}>
        <Text>&#9888;</Text>
      </Box>

      {/* Title */}
      <Box marginBottom={1}>
        <Text color="red" bold>
          {info.title}
        </Text>
      </Box>

      {/* Message */}
      <Box marginBottom={1}>
        <Text color="gray">{info.message}</Text>
      </Box>

      {/* Hint */}
      {info.hint && (
        <Box
          marginBottom={1}
          paddingX={1}
          borderStyle="single"
          borderColor="gray"
        >
          <Text dimColor>{info.hint}</Text>
        </Box>
      )}

      {/* Retry button */}
      {onRetry && (
        <Box marginTop={1}>
          <Text color="cyan">[r] Retry</Text>
        </Box>
      )}
    </Box>
  );
}

export default ErrorState;
