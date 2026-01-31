import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Badge } from './Badge.js';

describe('Badge', () => {
  it('renders badge text', () => {
    const { lastFrame } = render(<Badge>Active</Badge>);
    expect(lastFrame()).toContain('Active');
  });

  describe('variants', () => {
    it('renders success variant', () => {
      const { lastFrame } = render(<Badge variant="success">Passed</Badge>);
      expect(lastFrame()).toContain('Passed');
    });

    it('renders warning variant', () => {
      const { lastFrame } = render(<Badge variant="warning">Pending</Badge>);
      expect(lastFrame()).toContain('Pending');
    });

    it('renders error variant', () => {
      const { lastFrame } = render(<Badge variant="error">Failed</Badge>);
      expect(lastFrame()).toContain('Failed');
    });

    it('renders info variant', () => {
      const { lastFrame } = render(<Badge variant="info">Note</Badge>);
      expect(lastFrame()).toContain('Note');
    });

    it('renders neutral variant', () => {
      const { lastFrame } = render(<Badge variant="neutral">Draft</Badge>);
      expect(lastFrame()).toContain('Draft');
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      const { lastFrame } = render(<Badge size="sm">Small</Badge>);
      expect(lastFrame()).toContain('Small');
    });

    it('renders medium size (default)', () => {
      const { lastFrame } = render(<Badge>Medium</Badge>);
      expect(lastFrame()).toContain('Medium');
    });
  });

  describe('dot indicator', () => {
    it('shows dot when enabled', () => {
      const { lastFrame } = render(<Badge showDot>Active</Badge>);
      const output = lastFrame();
      expect(output).toContain('Active');
      expect(output).toContain('●');
    });

    it('hides dot by default', () => {
      const { lastFrame } = render(<Badge>Status</Badge>);
      const output = lastFrame();
      expect(output).toContain('Status');
      expect(output).not.toContain('●');
    });
  });

  describe('brackets', () => {
    it('shows brackets by default', () => {
      const { lastFrame } = render(<Badge>Test</Badge>);
      const output = lastFrame();
      expect(output).toContain('[');
      expect(output).toContain(']');
    });

    it('can hide brackets', () => {
      const { lastFrame } = render(<Badge showBrackets={false}>Test</Badge>);
      const output = lastFrame();
      expect(output).toContain('Test');
    });
  });
});
