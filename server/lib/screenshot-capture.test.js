import { describe, it, expect } from 'vitest';
import {
  DEFAULT_OPTIONS,
  buildViewportOptions,
  buildScreenshotOptions,
  generateFilename,
  parseFilename,
  validateCaptureRequest,
  isValidUrl,
  createCaptureRequest,
  formatMetadata,
  getStoragePath,
  getThumbnailSize,
  DevicePresets,
  getDevicePreset,
} from './screenshot-capture.js';

describe('screenshot-capture', () => {
  describe('buildViewportOptions', () => {
    it('returns default viewport', () => {
      const viewport = buildViewportOptions();

      expect(viewport.width).toBe(DEFAULT_OPTIONS.width);
      expect(viewport.height).toBe(DEFAULT_OPTIONS.height);
      expect(viewport.deviceScaleFactor).toBe(1);
    });

    it('accepts custom dimensions', () => {
      const viewport = buildViewportOptions({ width: 1920, height: 1080 });

      expect(viewport.width).toBe(1920);
      expect(viewport.height).toBe(1080);
    });

    it('supports mobile options', () => {
      const viewport = buildViewportOptions({ isMobile: true, hasTouch: true });

      expect(viewport.isMobile).toBe(true);
      expect(viewport.hasTouch).toBe(true);
    });
  });

  describe('buildScreenshotOptions', () => {
    it('returns default options', () => {
      const opts = buildScreenshotOptions();

      expect(opts.type).toBe('png');
      expect(opts.fullPage).toBe(false);
    });

    it('includes quality for jpeg', () => {
      const opts = buildScreenshotOptions({ format: 'jpeg', quality: 80 });

      expect(opts.type).toBe('jpeg');
      expect(opts.quality).toBe(80);
    });

    it('excludes quality for png', () => {
      const opts = buildScreenshotOptions({ format: 'png', quality: 80 });

      expect(opts.quality).toBeUndefined();
    });

    it('supports clip region', () => {
      const opts = buildScreenshotOptions({
        clip: { x: 10, y: 20, width: 100, height: 200 },
      });

      expect(opts.clip.x).toBe(10);
      expect(opts.clip.y).toBe(20);
      expect(opts.clip.width).toBe(100);
      expect(opts.clip.height).toBe(200);
    });
  });

  describe('generateFilename', () => {
    it('generates filename with timestamp', () => {
      const filename = generateFilename({
        service: 'api',
        timestamp: new Date('2024-01-15T10:30:00Z').getTime(),
      });

      expect(filename).toBe('screenshot-api-2024-01-15-10-30-00.png');
    });

    it('uses default service name', () => {
      const filename = generateFilename({
        timestamp: new Date('2024-01-15T10:30:00Z').getTime(),
      });

      expect(filename).toContain('app');
    });

    it('supports custom format', () => {
      const filename = generateFilename({ format: 'jpeg' });

      expect(filename).toMatch(/\.jpeg$/);
    });

    it('supports custom prefix', () => {
      const filename = generateFilename({ prefix: 'bug' });

      expect(filename).toMatch(/^bug-/);
    });
  });

  describe('parseFilename', () => {
    it('parses valid filename', () => {
      const result = parseFilename('screenshot-api-2024-01-15-10-30-00.png');

      expect(result.prefix).toBe('screenshot');
      expect(result.service).toBe('api');
      expect(result.date).toBe('2024-01-15');
      expect(result.time).toBe('10:30:00');
      expect(result.format).toBe('png');
    });

    it('returns null for invalid filename', () => {
      expect(parseFilename('invalid.png')).toBeNull();
      expect(parseFilename('')).toBeNull();
    });
  });

  describe('validateCaptureRequest', () => {
    it('validates correct request', () => {
      const result = validateCaptureRequest({
        url: 'http://localhost:3000',
        width: 1280,
        height: 720,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('requires URL', () => {
      const result = validateCaptureRequest({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('URL is required');
    });

    it('validates URL format', () => {
      const result = validateCaptureRequest({ url: 'not-a-url' });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid URL'))).toBe(true);
    });

    it('validates width range', () => {
      const result = validateCaptureRequest({
        url: 'http://localhost:3000',
        width: 50,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Width'))).toBe(true);
    });

    it('validates height range', () => {
      const result = validateCaptureRequest({
        url: 'http://localhost:3000',
        height: 5000,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Height'))).toBe(true);
    });

    it('validates format', () => {
      const result = validateCaptureRequest({
        url: 'http://localhost:3000',
        format: 'gif',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Format'))).toBe(true);
    });

    it('validates quality range', () => {
      const result = validateCaptureRequest({
        url: 'http://localhost:3000',
        quality: 150,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Quality'))).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it('accepts http URLs', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
    });

    it('accepts https URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('rejects non-http protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('file:///path')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('createCaptureRequest', () => {
    it('creates request from bug report', () => {
      const bug = {
        serviceName: 'api',
        url: 'http://localhost:3001/users',
      };

      const request = createCaptureRequest(bug);

      expect(request.url).toBe('http://localhost:3001/users');
      expect(request.service).toBe('api');
    });

    it('uses service port when no URL', () => {
      const bug = { serviceName: 'web' };
      const services = { web: { port: 3000 } };

      const request = createCaptureRequest(bug, services);

      expect(request.url).toBe('http://localhost:3000');
    });

    it('uses default dimensions', () => {
      const bug = { url: 'http://localhost:3000' };

      const request = createCaptureRequest(bug);

      expect(request.width).toBe(DEFAULT_OPTIONS.width);
      expect(request.height).toBe(DEFAULT_OPTIONS.height);
    });

    it('uses custom viewport', () => {
      const bug = {
        url: 'http://localhost:3000',
        viewport: { width: 800, height: 600 },
      };

      const request = createCaptureRequest(bug);

      expect(request.width).toBe(800);
      expect(request.height).toBe(600);
    });
  });

  describe('formatMetadata', () => {
    it('formats capture metadata', () => {
      const capture = {
        filename: 'screenshot.png',
        url: 'http://localhost:3000',
        service: 'app',
        width: 1280,
        height: 720,
        size: 50000,
        timestamp: 1705312200000,
      };

      const metadata = formatMetadata(capture);

      expect(metadata.filename).toBe('screenshot.png');
      expect(metadata.dimensions.width).toBe(1280);
      expect(metadata.capturedAt).toBe(1705312200000);
    });

    it('generates ID if not provided', () => {
      const metadata = formatMetadata({ filename: 'test.png' });

      expect(metadata.id).toMatch(/^cap_/);
    });
  });

  describe('getStoragePath', () => {
    it('builds storage path', () => {
      const path = getStoragePath({
        service: 'api',
        filename: 'screenshot.png',
      });

      expect(path).toBe('.tlc/screenshots/api/screenshot.png');
    });

    it('uses custom base directory', () => {
      const path = getStoragePath({
        baseDir: '/tmp/captures',
        filename: 'test.png',
      });

      expect(path).toBe('/tmp/captures/app/test.png');
    });
  });

  describe('getThumbnailSize', () => {
    it('scales down large images', () => {
      const size = getThumbnailSize(1280, 720, 200);

      expect(size.width).toBeLessThanOrEqual(200);
      expect(size.height).toBeLessThanOrEqual(200);
    });

    it('maintains aspect ratio', () => {
      const size = getThumbnailSize(1600, 900, 200);
      const ratio = size.width / size.height;

      expect(ratio).toBeCloseTo(1600 / 900, 1);
    });

    it('does not upscale small images', () => {
      const size = getThumbnailSize(100, 80, 200);

      expect(size.width).toBe(100);
      expect(size.height).toBe(80);
    });
  });

  describe('DevicePresets', () => {
    it('has desktop preset', () => {
      expect(DevicePresets.desktop.width).toBe(1920);
      expect(DevicePresets.desktop.height).toBe(1080);
    });

    it('has mobile preset with touch', () => {
      expect(DevicePresets.mobile.isMobile).toBe(true);
      expect(DevicePresets.mobile.hasTouch).toBe(true);
    });
  });

  describe('getDevicePreset', () => {
    it('returns preset by name', () => {
      const preset = getDevicePreset('tablet');

      expect(preset).toEqual(DevicePresets.tablet);
    });

    it('returns null for unknown preset', () => {
      expect(getDevicePreset('unknown')).toBeNull();
    });
  });
});
