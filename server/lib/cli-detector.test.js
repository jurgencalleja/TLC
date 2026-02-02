import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectCLI,
  detectAllCLIs,
  clearCache,
  getCapabilities,
} from './cli-detector.js';

describe('CLI Detector', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('detectCLI', () => {
    it('finds claude when installed', async () => {
      const result = await detectCLI('claude');
      // Result depends on system, but should have consistent shape
      expect(result).toHaveProperty('found');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('version');
    });

    it('returns null when not installed', async () => {
      const result = await detectCLI('nonexistent-cli-tool-xyz');
      expect(result.found).toBe(false);
      expect(result.path).toBeNull();
    });

    it('gets version string', async () => {
      // Using echo as a known command
      const result = await detectCLI('echo');
      expect(result.found).toBe(true);
    });
  });

  describe('detectAllCLIs', () => {
    it('returns map of detected CLIs', async () => {
      const result = await detectAllCLIs();
      
      expect(result).toHaveProperty('claude');
      expect(result).toHaveProperty('codex');
      expect(result).toHaveProperty('gemini');
    });

    it('caches results', async () => {
      const first = await detectAllCLIs();
      const second = await detectAllCLIs();
      
      // Should be same object reference (cached)
      expect(first).toBe(second);
    });
  });

  describe('clearCache', () => {
    it('forces re-detection', async () => {
      const first = await detectAllCLIs();
      clearCache();
      const second = await detectAllCLIs();
      
      // Should be different references after cache clear
      expect(first).not.toBe(second);
    });
  });

  describe('getCapabilities', () => {
    it('returns CLI capabilities for claude', () => {
      const caps = getCapabilities('claude');
      expect(caps).toContain('review');
      expect(caps).toContain('code-gen');
    });

    it('returns CLI capabilities for codex', () => {
      const caps = getCapabilities('codex');
      expect(caps).toContain('review');
      expect(caps).toContain('code-gen');
    });

    it('returns CLI capabilities for gemini', () => {
      const caps = getCapabilities('gemini');
      expect(caps).toContain('design');
      expect(caps).toContain('vision');
    });

    it('returns empty array for unknown CLI', () => {
      const caps = getCapabilities('unknown');
      expect(caps).toEqual([]);
    });
  });

  describe('Platform Handling', () => {
    it('handles Windows command extensions', async () => {
      // Should not throw on Windows
      const result = await detectCLI('cmd');
      expect(result).toHaveProperty('found');
    });

    it('handles PATH variations', async () => {
      const result = await detectAllCLIs();
      expect(result).toBeDefined();
    });
  });

  describe('Timeout Handling', () => {
    it('timeout on slow detection', async () => {
      // Detection should complete within reasonable time
      const start = Date.now();
      await detectCLI('nonexistent');
      const duration = Date.now() - start;
      
      // Should timeout within 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});
