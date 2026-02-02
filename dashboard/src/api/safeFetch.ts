/**
 * Self-healing error boundary utilities for fetch operations.
 * Provides consistent error handling, timeout support, and typed responses.
 */

export interface FetchResult<T> {
  data: T | null;
  error: FetchError | null;
  status: 'success' | 'error';
}

export interface FetchError {
  type: 'http' | 'network' | 'timeout' | 'parse' | 'unknown';
  code?: number;
  message: string;
  original?: Error;
}

export interface SafeFetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Maps error conditions to user-friendly error info
 */
function categorizeError(error: unknown, url: string): FetchError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: 'Request timed out',
    };
  }

  if (error instanceof TypeError) {
    // Network errors like failed to fetch
    return {
      type: 'network',
      message: 'Cannot reach the server',
      original: error,
    };
  }

  if (error instanceof SyntaxError) {
    return {
      type: 'parse',
      message: 'Invalid response from server',
      original: error,
    };
  }

  if (error instanceof Error) {
    return {
      type: 'unknown',
      message: error.message,
      original: error,
    };
  }

  return {
    type: 'unknown',
    message: String(error),
  };
}

/**
 * Safe fetch wrapper that never throws.
 * Always returns a FetchResult with either data or error.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options plus optional timeout (default 10s)
 * @returns Promise<FetchResult<T>> - Always resolves, never rejects
 *
 * @example
 * ```typescript
 * const { data, error } = await safeFetch<RouterData>('/api/router');
 * if (error) {
 *   // Handle error - render error state
 *   return <ErrorState error={error} onRetry={() => refresh()} />;
 * }
 * // Use data safely
 * ```
 */
export async function safeFetch<T>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<FetchResult<T>> {
  const { timeout = 10000, ...fetchOptions } = options;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        data: null,
        error: {
          type: 'http',
          code: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
        status: 'error',
      };
    }

    const data = await response.json();
    return {
      data: data as T,
      error: null,
      status: 'success',
    };
  } catch (err) {
    console.error(`Fetch error for ${url}:`, err);
    return {
      data: null,
      error: categorizeError(err, url),
      status: 'error',
    };
  }
}

/**
 * POST helper with JSON body
 */
export async function safePost<T, B = unknown>(
  url: string,
  body: B,
  options: SafeFetchOptions = {}
): Promise<FetchResult<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * PUT helper with JSON body
 */
export async function safePut<T, B = unknown>(
  url: string,
  body: B,
  options: SafeFetchOptions = {}
): Promise<FetchResult<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * DELETE helper
 */
export async function safeDelete<T>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<FetchResult<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'DELETE',
  });
}

export default safeFetch;
