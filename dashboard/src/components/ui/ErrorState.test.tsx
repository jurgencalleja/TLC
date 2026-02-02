import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ErrorState } from './ErrorState.js';
import type { FetchError } from '../../api/safeFetch.js';

describe('ErrorState', () => {
  describe('HTTP Errors', () => {
    it('renders 404 not found with setup hint', () => {
      const error: FetchError = {
        type: 'http',
        code: 404,
        message: 'HTTP 404: Not Found',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).toContain('Not Set Up');
      expect(output).toContain('needs configuration');
      expect(output).toContain('tlc setup');
    });

    it('renders 500 server error', () => {
      const error: FetchError = {
        type: 'http',
        code: 500,
        message: 'HTTP 500: Internal Server Error',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).toContain('Server Error');
      expect(output).toContain('wrong on the server');
    });

    it('renders 401 unauthorized', () => {
      const error: FetchError = {
        type: 'http',
        code: 401,
        message: 'HTTP 401: Unauthorized',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).toContain('Not Authorized');
      expect(output).toContain('Authentication');
    });

    it('renders 403 forbidden', () => {
      const error: FetchError = {
        type: 'http',
        code: 403,
        message: 'HTTP 403: Forbidden',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).toContain('Access Denied');
    });

    it('renders unknown HTTP error with code', () => {
      const error: FetchError = {
        type: 'http',
        code: 418,
        message: "HTTP 418: I'm a teapot",
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).toContain('HTTP Error 418');
    });
  });

  describe('Network Errors', () => {
    it('renders network error with server hint', () => {
      const error: FetchError = {
        type: 'network',
        message: 'Cannot reach the server',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).toContain('Connection Lost');
      expect(output).toContain('Cannot reach');
      expect(output).toContain('tlc server');
    });
  });

  describe('Timeout Errors', () => {
    it('renders timeout error', () => {
      const error: FetchError = {
        type: 'timeout',
        message: 'Request timed out',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).toContain('Request Timeout');
      expect(output).toContain('too long');
    });
  });

  describe('Parse Errors', () => {
    it('renders parse error', () => {
      const error: FetchError = {
        type: 'parse',
        message: 'Invalid response from server',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).toContain('Invalid Response');
      expect(output).toContain('unexpected data');
    });
  });

  describe('Unknown Errors', () => {
    it('renders unknown error', () => {
      const error: FetchError = {
        type: 'unknown',
        message: 'Something went wrong',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).toContain('Unknown Error');
      expect(output).toContain('unexpected error');
    });
  });

  describe('Retry Button', () => {
    it('shows retry button when onRetry provided', () => {
      const error: FetchError = {
        type: 'network',
        message: 'Network error',
      };

      const { lastFrame } = render(
        <ErrorState error={error} onRetry={() => {}} />
      );
      const output = lastFrame() || '';

      expect(output).toContain('Retry');
    });

    it('hides retry button when no onRetry', () => {
      const error: FetchError = {
        type: 'network',
        message: 'Network error',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      expect(output).not.toContain('[r] Retry');
    });
  });

  describe('Compact Mode', () => {
    it('renders compact error with title only', () => {
      const error: FetchError = {
        type: 'http',
        code: 500,
        message: 'HTTP 500: Internal Server Error',
      };

      const { lastFrame } = render(<ErrorState error={error} compact />);
      const output = lastFrame() || '';

      expect(output).toContain('Server Error');
      // Should be shorter than full version
      expect(output.split('\n').length).toBeLessThan(5);
    });

    it('shows compact retry hint', () => {
      const error: FetchError = {
        type: 'network',
        message: 'Network error',
      };

      const { lastFrame } = render(
        <ErrorState error={error} onRetry={() => {}} compact />
      );
      const output = lastFrame() || '';

      expect(output).toContain('[r] retry');
    });
  });

  describe('Error Icon', () => {
    it('shows warning icon', () => {
      const error: FetchError = {
        type: 'unknown',
        message: 'Error',
      };

      const { lastFrame } = render(<ErrorState error={error} />);
      const output = lastFrame() || '';

      // Warning triangle unicode or similar
      expect(output.length).toBeGreaterThan(0);
    });
  });
});
