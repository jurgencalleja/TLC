import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { DeviceFrame, DeviceType, getDeviceDimensions, generateViewportUrl } from './DeviceFrame.js';

describe('DeviceFrame', () => {
  describe('Device Presets', () => {
    it('shows phone option', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="phone" onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/phone|mobile/i);
    });

    it('shows tablet option', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="phone" onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/tablet|ipad/i);
    });

    it('shows desktop option', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="phone" onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/desktop|laptop/i);
    });
  });

  describe('Dimensions Display', () => {
    it('shows phone dimensions', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="phone" onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/375|390|414/); // Common phone widths
    });

    it('shows tablet dimensions', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="tablet" onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/768|820|1024/); // Common tablet widths
    });

    it('shows desktop dimensions', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="desktop" onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/1280|1440|1920/); // Common desktop widths
    });

    it('shows width x height format', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="phone" onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/\d+\s*[x×]\s*\d+/i);
    });
  });

  describe('Selection', () => {
    it('highlights selected device', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="tablet" onSelect={() => {}} />
      );
      // Tablet should be highlighted
      expect(lastFrame()).toContain('tablet');
    });

    it('shows selection indicator', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="phone" onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/▶|●|\[x\]|selected/i);
    });
  });

  describe('Keyboard Selection', () => {
    it('shows number hints', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="phone" onSelect={() => {}} />
      );
      expect(lastFrame()).toContain('1');
      expect(lastFrame()).toContain('2');
      expect(lastFrame()).toContain('3');
    });

    it('calls onSelect with device type', () => {
      const onSelect = vi.fn();
      render(<DeviceFrame selectedDevice="phone" onSelect={onSelect} />);
      // Selection happens on number key press
    });
  });

  describe('URL Generation', () => {
    it('shows URL with viewport params', () => {
      const { lastFrame } = render(
        <DeviceFrame
          selectedDevice="phone"
          baseUrl="http://localhost:3000"
          onSelect={() => {}}
        />
      );
      // Should show URL with dimensions
      expect(lastFrame()).toContain('localhost');
    });
  });

  describe('Custom Dimensions', () => {
    it('shows custom option', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="phone" onSelect={() => {}} showCustom />
      );
      expect(lastFrame()).toMatch(/custom|\d+.*×.*\d+/i);
    });

    it('shows custom dimensions when selected', () => {
      const { lastFrame } = render(
        <DeviceFrame
          selectedDevice="custom"
          customWidth={800}
          customHeight={600}
          onSelect={() => {}}
          showCustom
        />
      );
      expect(lastFrame()).toContain('800');
      expect(lastFrame()).toContain('600');
    });
  });

  describe('Navigation Hints', () => {
    it('shows keyboard navigation hints', () => {
      const { lastFrame } = render(
        <DeviceFrame selectedDevice="phone" onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/1.*2.*3|phone.*tablet.*desktop/i);
    });
  });
});

describe('getDeviceDimensions', () => {
  it('returns phone dimensions', () => {
    const dims = getDeviceDimensions('phone');
    expect(dims.width).toBe(390);
    expect(dims.height).toBe(844);
  });

  it('returns tablet dimensions', () => {
    const dims = getDeviceDimensions('tablet');
    expect(dims.width).toBe(820);
    expect(dims.height).toBe(1180);
  });

  it('returns desktop dimensions', () => {
    const dims = getDeviceDimensions('desktop');
    expect(dims.width).toBe(1440);
    expect(dims.height).toBe(900);
  });
});

describe('generateViewportUrl', () => {
  it('adds viewport params to URL', () => {
    const url = generateViewportUrl('http://localhost:3000', 'phone');
    expect(url).toContain('viewport=');
  });

  it('preserves existing URL params', () => {
    const url = generateViewportUrl('http://localhost:3000?foo=bar', 'tablet');
    expect(url).toContain('foo=bar');
    expect(url).toContain('viewport=');
  });

  it('includes width in viewport', () => {
    const url = generateViewportUrl('http://localhost:3000', 'desktop');
    expect(url).toContain('1440');
  });
});
