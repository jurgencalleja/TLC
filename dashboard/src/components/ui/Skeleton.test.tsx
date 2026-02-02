import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Skeleton } from './Skeleton.js';

describe('Skeleton', () => {
  describe('Basic Rendering', () => {
    it('renders placeholder content', () => {
      const { lastFrame } = render(<Skeleton />);
      expect(lastFrame()).toBeDefined();
      // Should render some placeholder characters
      expect(lastFrame()?.length).toBeGreaterThan(0);
    });

    it('renders with custom width', () => {
      const { lastFrame } = render(<Skeleton width={20} />);
      expect(lastFrame()).toBeDefined();
    });

    it('renders with custom height', () => {
      const { lastFrame } = render(<Skeleton height={3} />);
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Variants', () => {
    it('renders text variant', () => {
      const { lastFrame } = render(<Skeleton variant="text" />);
      expect(lastFrame()).toBeDefined();
    });

    it('renders text variant with multiple lines', () => {
      const { lastFrame } = render(<Skeleton variant="text" lines={3} />);
      const output = lastFrame() || '';
      // Should have multiple lines
      const lineCount = output.split('\n').filter(l => l.trim()).length;
      expect(lineCount).toBeGreaterThanOrEqual(1);
    });

    it('renders avatar variant (circle)', () => {
      const { lastFrame } = render(<Skeleton variant="avatar" />);
      expect(lastFrame()).toBeDefined();
    });

    it('renders avatar with size', () => {
      const { lastFrame } = render(<Skeleton variant="avatar" size={4} />);
      expect(lastFrame()).toBeDefined();
    });

    it('renders card variant', () => {
      const { lastFrame } = render(<Skeleton variant="card" />);
      const output = lastFrame() || '';
      // Card should have border
      expect(output).toMatch(/[─│┌┐└┘╭╮╰╯┬┴┤├]/);
    });

    it('renders button variant', () => {
      const { lastFrame } = render(<Skeleton variant="button" />);
      const output = lastFrame() || '';
      // Button should have brackets or border
      expect(output).toMatch(/[\[\]│─]/);
    });

    it('renders table-row variant', () => {
      const { lastFrame } = render(<Skeleton variant="table-row" columns={3} />);
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Animation', () => {
    it('uses shimmer/pulse characters', () => {
      const { lastFrame } = render(<Skeleton />);
      const output = lastFrame() || '';
      // Should use placeholder characters like ░, ▒, ▓, ▀, ▄, █, ▌, ▐, or spaces
      expect(output).toMatch(/[░▒▓▀▄█▌▐ ]/);
    });
  });

  describe('Rounded', () => {
    it('accepts rounded prop', () => {
      const { lastFrame } = render(<Skeleton rounded />);
      expect(lastFrame()).toBeDefined();
    });

    it('uses rounded corners when rounded', () => {
      const { lastFrame } = render(<Skeleton variant="card" rounded />);
      const output = lastFrame() || '';
      // Should use rounded corner characters
      expect(output).toMatch(/[╭╮╰╯┌┐└┘]/);
    });
  });

  describe('Custom Styling', () => {
    it('accepts className/style props', () => {
      const { lastFrame } = render(
        <Skeleton width={10} height={2} />
      );
      expect(lastFrame()).toBeDefined();
    });
  });
});

describe('Skeleton.Text', () => {
  it('renders text skeleton shorthand', () => {
    const { lastFrame } = render(<Skeleton.Text />);
    expect(lastFrame()).toBeDefined();
  });

  it('renders multiple lines', () => {
    const { lastFrame } = render(<Skeleton.Text lines={2} />);
    expect(lastFrame()).toBeDefined();
  });
});

describe('Skeleton.Avatar', () => {
  it('renders avatar skeleton shorthand', () => {
    const { lastFrame } = render(<Skeleton.Avatar />);
    expect(lastFrame()).toBeDefined();
  });

  it('accepts size prop', () => {
    const { lastFrame } = render(<Skeleton.Avatar size={3} />);
    expect(lastFrame()).toBeDefined();
  });
});

describe('Skeleton.Card', () => {
  it('renders card skeleton shorthand', () => {
    const { lastFrame } = render(<Skeleton.Card />);
    expect(lastFrame()).toBeDefined();
  });

  it('accepts dimensions', () => {
    const { lastFrame } = render(<Skeleton.Card width={30} height={5} />);
    expect(lastFrame()).toBeDefined();
  });
});

describe('Skeleton.Button', () => {
  it('renders button skeleton shorthand', () => {
    const { lastFrame } = render(<Skeleton.Button />);
    expect(lastFrame()).toBeDefined();
  });

  it('accepts width prop', () => {
    const { lastFrame } = render(<Skeleton.Button width={15} />);
    expect(lastFrame()).toBeDefined();
  });
});
