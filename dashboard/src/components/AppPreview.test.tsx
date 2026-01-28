import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import {
  AppPreview,
  getProxyUrl,
  getDirectUrl,
  formatServiceUrl,
  getStateIndicator,
} from './AppPreview.js';

describe('AppPreview', () => {
  describe('getProxyUrl', () => {
    it('generates proxy URL with default port', () => {
      const url = getProxyUrl('api');
      expect(url).toBe('http://localhost:3147/proxy/api');
    });

    it('uses custom dashboard port', () => {
      const url = getProxyUrl('web', 8080);
      expect(url).toBe('http://localhost:8080/proxy/web');
    });
  });

  describe('getDirectUrl', () => {
    it('generates direct URL', () => {
      const url = getDirectUrl(3000);
      expect(url).toBe('http://localhost:3000');
    });
  });

  describe('formatServiceUrl', () => {
    const service = { name: 'api', port: 3001, state: 'running' as const };

    it('returns proxy URL by default', () => {
      const url = formatServiceUrl(service);
      expect(url).toContain('/proxy/api');
    });

    it('returns direct URL when proxy disabled', () => {
      const url = formatServiceUrl(service, false);
      expect(url).toBe('http://localhost:3001');
    });
  });

  describe('getStateIndicator', () => {
    it('returns green for running', () => {
      const { icon, color } = getStateIndicator('running');
      expect(color).toBe('green');
      expect(icon).toBe('●');
    });

    it('returns yellow for starting', () => {
      const { icon, color } = getStateIndicator('starting');
      expect(color).toBe('yellow');
    });

    it('returns gray for stopped', () => {
      const { icon, color } = getStateIndicator('stopped');
      expect(color).toBe('gray');
    });

    it('returns red for error', () => {
      const { icon, color } = getStateIndicator('error');
      expect(color).toBe('red');
    });
  });

  describe('component rendering', () => {
    it('renders empty state when no services', () => {
      const { lastFrame } = render(
        <AppPreview services={[]} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('No services configured');
    });

    it('shows message when no services running', () => {
      const services = [
        { name: 'api', port: 3001, state: 'stopped' as const },
      ];

      const { lastFrame } = render(
        <AppPreview services={services} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('No services running');
    });

    it('renders running services', () => {
      const services = [
        { name: 'api', port: 3001, state: 'running' as const },
        { name: 'web', port: 3000, state: 'running' as const },
      ];

      const { lastFrame } = render(
        <AppPreview services={services} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('api');
      expect(output).toContain('web');
      expect(output).toContain('2/2 running');
    });

    it('shows proxy and direct URLs', () => {
      const services = [
        { name: 'api', port: 3001, state: 'running' as const },
      ];

      const { lastFrame } = render(
        <AppPreview services={services} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('Proxy URL');
      expect(output).toContain('/proxy/api');
      expect(output).toContain('Direct URL');
      expect(output).toContain('3001');
    });

    it('shows selected service info', () => {
      const services = [
        { name: 'api', port: 3001, state: 'running' as const },
        { name: 'web', port: 3000, state: 'stopped' as const },
      ];

      const { lastFrame } = render(
        <AppPreview
          services={services}
          selectedService="api"
          isActive={false}
        />
      );
      const output = lastFrame();

      expect(output).toContain('Ready for preview');
    });

    it('shows starting state', () => {
      const services = [
        { name: 'api', port: 3001, state: 'starting' as const },
      ];

      const { lastFrame } = render(
        <AppPreview services={services} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('Starting');
    });

    it('shows error state indicator', () => {
      const services = [
        { name: 'api', port: 3001, state: 'error' as const },
      ];

      const { lastFrame } = render(
        <AppPreview services={services} isActive={false} />
      );
      const output = lastFrame();

      // Error services show the error indicator (✗) in the selector
      expect(output).toContain('✗');
      expect(output).toContain('api');
    });

    it('shows controls when active', () => {
      const services = [
        { name: 'api', port: 3001, state: 'running' as const },
      ];

      const { lastFrame } = render(
        <AppPreview services={services} isActive={true} />
      );
      const output = lastFrame();

      expect(output).toContain('Select');
      expect(output).toContain('Toggle proxy');
      expect(output).toContain('Open browser');
    });

    it('hides controls when inactive', () => {
      const services = [
        { name: 'api', port: 3001, state: 'running' as const },
      ];

      const { lastFrame } = render(
        <AppPreview services={services} isActive={false} />
      );
      const output = lastFrame();

      expect(output).not.toContain('Open browser');
    });

    it('shows proxy mode indicator', () => {
      const services = [
        { name: 'api', port: 3001, state: 'running' as const },
      ];

      const { lastFrame } = render(
        <AppPreview services={services} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('Mode:');
      expect(output).toContain('Proxy');
    });

    it('uses custom dashboard port', () => {
      const services = [
        { name: 'api', port: 3001, state: 'running' as const },
      ];

      const { lastFrame } = render(
        <AppPreview
          services={services}
          dashboardPort={8080}
          isActive={false}
        />
      );
      const output = lastFrame();

      expect(output).toContain('8080');
    });
  });
});
