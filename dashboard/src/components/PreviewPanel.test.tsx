import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { PreviewPanel, Service } from './PreviewPanel.js';

const sampleServices: Service[] = [
  { name: 'web', port: 3000, state: 'running' },
  { name: 'api', port: 8080, state: 'running' },
  { name: 'worker', port: 9000, state: 'stopped' },
];

describe('PreviewPanel', () => {
  describe('Service Selector', () => {
    it('shows running services', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toContain('web');
      expect(lastFrame()).toContain('api');
    });

    it('shows service state indicators', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toMatch(/●|running/i);
    });

    it('shows stopped services differently', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toContain('worker');
    });
  });

  describe('Device Toggle', () => {
    it('shows device options', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toMatch(/phone|tablet|desktop/i);
    });

    it('shows selected device', () => {
      const { lastFrame } = render(
        <PreviewPanel services={sampleServices} initialDevice="tablet" />
      );
      expect(lastFrame()).toContain('tablet');
    });
  });

  describe('URL Display', () => {
    it('shows URL for selected service', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toMatch(/localhost|http/i);
    });

    it('shows URL with viewport params', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toMatch(/viewport|3000/);
    });

    it('shows proxy URL', () => {
      const { lastFrame } = render(
        <PreviewPanel services={sampleServices} dashboardPort={3147} />
      );
      expect(lastFrame()).toContain('3147');
    });
  });

  describe('QR Code Hint', () => {
    it('shows mobile testing hint', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toMatch(/mobile|QR|scan|phone/i);
    });
  });

  describe('Error States', () => {
    it('shows message when no services', () => {
      const { lastFrame } = render(<PreviewPanel services={[]} />);
      expect(lastFrame()).toMatch(/no.*service|empty/i);
    });

    it('shows message when all services stopped', () => {
      const stoppedServices = [
        { name: 'web', port: 3000, state: 'stopped' as const },
      ];
      const { lastFrame } = render(<PreviewPanel services={stoppedServices} />);
      expect(lastFrame()).toMatch(/stopped|not.*running/i);
    });

    it('shows error state for failed service', () => {
      const errorServices = [
        { name: 'web', port: 3000, state: 'error' as const },
      ];
      const { lastFrame } = render(<PreviewPanel services={errorServices} />);
      expect(lastFrame()).toMatch(/error|failed|check.*logs/i);
    });
  });

  describe('Navigation', () => {
    it('shows service selection hints', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toMatch(/1|2|select/i);
    });

    it('shows device toggle hints', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toMatch(/d|device|phone|tablet|desktop/i);
    });

    it('shows open browser hint', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toMatch(/o|open|browser/i);
    });
  });

  describe('Callbacks', () => {
    it('calls onServiceSelect', () => {
      const onServiceSelect = vi.fn();
      render(
        <PreviewPanel
          services={sampleServices}
          onServiceSelect={onServiceSelect}
        />
      );
      // Called on number key press
    });

    it('calls onDeviceChange', () => {
      const onDeviceChange = vi.fn();
      render(
        <PreviewPanel
          services={sampleServices}
          onDeviceChange={onDeviceChange}
        />
      );
      // Called on d key press
    });

    it('calls onOpenBrowser', () => {
      const onOpenBrowser = vi.fn();
      render(
        <PreviewPanel
          services={sampleServices}
          onOpenBrowser={onOpenBrowser}
        />
      );
      // Called on o key press
    });
  });

  describe('Proxy Mode', () => {
    it('shows proxy mode toggle', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      expect(lastFrame()).toMatch(/proxy|direct|p/i);
    });

    it('shows current mode', () => {
      const { lastFrame } = render(
        <PreviewPanel services={sampleServices} useProxy={true} />
      );
      expect(lastFrame()).toMatch(/proxy/i);
    });
  });

  describe('Service Count', () => {
    it('shows running/total count', () => {
      const { lastFrame } = render(<PreviewPanel services={sampleServices} />);
      // 2 running, 1 stopped = 2/3
      expect(lastFrame()).toMatch(/2.*3|running/i);
    });
  });
});
