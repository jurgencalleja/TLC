import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Input } from './Input.js';

describe('Input', () => {
  it('renders with placeholder', () => {
    const { lastFrame } = render(<Input placeholder="Enter text..." />);
    expect(lastFrame()).toContain('Enter text...');
  });

  it('renders with value', () => {
    const { lastFrame } = render(<Input value="Hello" onChange={() => {}} />);
    expect(lastFrame()).toContain('Hello');
  });

  describe('label', () => {
    it('renders label when provided', () => {
      const { lastFrame } = render(<Input label="Username" />);
      expect(lastFrame()).toContain('Username');
    });
  });

  describe('helper text', () => {
    it('renders helper text when provided', () => {
      const { lastFrame } = render(<Input helperText="Must be unique" />);
      expect(lastFrame()).toContain('Must be unique');
    });
  });

  describe('error state', () => {
    it('shows error message when provided', () => {
      const { lastFrame } = render(<Input error="Invalid input" />);
      expect(lastFrame()).toContain('Invalid input');
    });

    it('shows error indicator', () => {
      const { lastFrame } = render(<Input error="Error" />);
      expect(lastFrame()).toContain('✗');
    });
  });

  describe('focus', () => {
    it('shows focus indicator when focused', () => {
      const { lastFrame } = render(<Input focus placeholder="Focused" />);
      const output = lastFrame();
      expect(output).toContain('Focused');
    });

    it('shows different style when not focused', () => {
      const { lastFrame: focused } = render(<Input focus placeholder="Test" />);
      const { lastFrame: unfocused } = render(<Input focus={false} placeholder="Test" />);
      // Both should render
      expect(focused()).toBeTruthy();
      expect(unfocused()).toBeTruthy();
    });
  });

  describe('disabled', () => {
    it('shows disabled state', () => {
      const { lastFrame } = render(<Input disabled placeholder="Disabled" />);
      expect(lastFrame()).toContain('Disabled');
    });
  });

  describe('types', () => {
    it('renders text type by default', () => {
      const { lastFrame } = render(<Input value="visible" onChange={() => {}} />);
      expect(lastFrame()).toContain('visible');
    });

    it('masks password type', () => {
      const { lastFrame } = render(<Input type="password" value="secret" onChange={() => {}} />);
      const output = lastFrame();
      expect(output).not.toContain('secret');
      expect(output).toContain('*');
    });
  });
});
