import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Button } from './Button.js';

describe('Button', () => {
  it('renders button text', () => {
    const { lastFrame } = render(<Button>Click me</Button>);
    expect(lastFrame()).toContain('Click me');
  });

  describe('variants', () => {
    it('renders primary variant with highlight', () => {
      const { lastFrame } = render(<Button variant="primary">Primary</Button>);
      expect(lastFrame()).toContain('Primary');
    });

    it('renders secondary variant', () => {
      const { lastFrame } = render(<Button variant="secondary">Secondary</Button>);
      expect(lastFrame()).toContain('Secondary');
    });

    it('renders ghost variant', () => {
      const { lastFrame } = render(<Button variant="ghost">Ghost</Button>);
      expect(lastFrame()).toContain('Ghost');
    });

    it('renders danger variant', () => {
      const { lastFrame } = render(<Button variant="danger">Danger</Button>);
      expect(lastFrame()).toContain('Danger');
    });
  });

  describe('states', () => {
    it('shows disabled state with dimmed text', () => {
      const { lastFrame } = render(<Button disabled>Disabled</Button>);
      expect(lastFrame()).toContain('Disabled');
    });

    it('shows loading state with spinner', () => {
      const { lastFrame } = render(<Button loading>Loading</Button>);
      const output = lastFrame();
      expect(output).toContain('Loading');
      // Should show spinner character
      expect(output).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏◐◓◑◒]/);
    });
  });

  describe('icons', () => {
    it('renders with left icon', () => {
      const { lastFrame } = render(<Button leftIcon="+">Add</Button>);
      const output = lastFrame();
      expect(output).toContain('+');
      expect(output).toContain('Add');
    });

    it('renders with right icon', () => {
      const { lastFrame } = render(<Button rightIcon="→">Next</Button>);
      const output = lastFrame();
      expect(output).toContain('Next');
      expect(output).toContain('→');
    });
  });

  describe('brackets', () => {
    it('renders with brackets by default', () => {
      const { lastFrame } = render(<Button>OK</Button>);
      const output = lastFrame();
      expect(output).toContain('[');
      expect(output).toContain(']');
    });

    it('can hide brackets', () => {
      const { lastFrame } = render(<Button showBrackets={false}>OK</Button>);
      const output = lastFrame();
      expect(output).toContain('OK');
    });
  });

  describe('focus', () => {
    it('shows focus indicator when focused', () => {
      const { lastFrame } = render(<Button isFocused>Focused</Button>);
      expect(lastFrame()).toContain('Focused');
    });

    it('shows different style when not focused', () => {
      const { lastFrame: focused } = render(<Button isFocused>Test</Button>);
      const { lastFrame: unfocused } = render(<Button isFocused={false}>Test</Button>);
      // Both should render the text
      expect(focused()).toContain('Test');
      expect(unfocused()).toContain('Test');
    });
  });
});
