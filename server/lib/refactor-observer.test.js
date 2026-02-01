import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { RefactorObserver } from './refactor-observer.js';

describe('RefactorObserver', () => {
  let testDir;
  let observer;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-refactor-observer-test-'));
    // Create .tlc directory
    fs.mkdirSync(path.join(testDir, '.tlc'), { recursive: true });
    observer = new RefactorObserver(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('observeBuild', () => {
    it('detects high-complexity function during build', async () => {
      // Create a complex function with many branches
      const complexCode = `
function processOrder(order) {
  if (!order) return null;
  if (!order.items) return null;
  if (order.items.length === 0) return null;

  let total = 0;
  for (const item of order.items) {
    if (item.discount) {
      if (item.discount > 50) {
        total += item.price * 0.5;
      } else if (item.discount > 25) {
        total += item.price * 0.75;
      } else {
        total += item.price * (1 - item.discount / 100);
      }
    } else {
      total += item.price;
    }

    if (item.tax) {
      if (item.taxRate > 0.1) {
        total += total * 0.1;
      } else {
        total += total * item.taxRate;
      }
    }
  }

  if (order.coupon) {
    if (order.coupon.type === 'percent') {
      total = total * (1 - order.coupon.value / 100);
    } else if (order.coupon.type === 'fixed') {
      total = total - order.coupon.value;
    }
  }

  return total > 0 ? total : 0;
}
`;
      const filePath = path.join(testDir, 'order.js');
      fs.writeFileSync(filePath, complexCode);

      await observer.observeBuild(filePath, complexCode);

      // Give time for async processing
      await new Promise(r => setTimeout(r, 100));

      // Check candidates file was created
      const candidatesPath = path.join(testDir, '.tlc', 'REFACTOR-CANDIDATES.md');
      expect(fs.existsSync(candidatesPath)).toBe(true);

      const content = fs.readFileSync(candidatesPath, 'utf8');
      expect(content).toContain('processOrder');
      expect(content).toContain('complexity');
    });

    it('adds to candidates without user prompt', async () => {
      const code = `
function deeplyNested(a, b, c) {
  if (a) {
    if (b) {
      if (c) {
        if (a > b) {
          if (b > c) {
            return a;
          }
        }
      }
    }
  }
  return null;
}
`;
      const filePath = path.join(testDir, 'nested.js');
      fs.writeFileSync(filePath, code);

      // No user interaction should happen
      const promptSpy = vi.fn();
      global.prompt = promptSpy;

      await observer.observeBuild(filePath, code);
      await new Promise(r => setTimeout(r, 100));

      expect(promptSpy).not.toHaveBeenCalled();

      // But candidate should be added
      const candidatesPath = path.join(testDir, '.tlc', 'REFACTOR-CANDIDATES.md');
      expect(fs.existsSync(candidatesPath)).toBe(true);
    });

    it('runs in background (does not block main operation)', async () => {
      const code = `function simple() { return 1; }`;
      const filePath = path.join(testDir, 'simple.js');
      fs.writeFileSync(filePath, code);

      const start = Date.now();
      await observer.observeBuild(filePath, code);
      const elapsed = Date.now() - start;

      // Should return quickly (fire-and-forget async)
      expect(elapsed).toBeLessThan(100);
    });

    it('respects refactor.autoDetect: false config', async () => {
      // Create config with autoDetect disabled
      const config = { refactor: { autoDetect: false } };
      fs.writeFileSync(
        path.join(testDir, '.tlc.json'),
        JSON.stringify(config)
      );

      const disabledObserver = new RefactorObserver(testDir);

      const code = `
function complex(a,b,c,d,e) {
  if(a){if(b){if(c){if(d){if(e){return 1;}}}}}
  return 0;
}
`;
      const filePath = path.join(testDir, 'complex.js');
      fs.writeFileSync(filePath, code);

      await disabledObserver.observeBuild(filePath, code);
      await new Promise(r => setTimeout(r, 100));

      // No candidates file should be created
      const candidatesPath = path.join(testDir, '.tlc', 'REFACTOR-CANDIDATES.md');
      expect(fs.existsSync(candidatesPath)).toBe(false);
    });
  });

  describe('observeReview', () => {
    it('captures refactoring suggestions from review', async () => {
      const reviewResult = {
        file: 'src/utils.js',
        suggestions: [
          'Consider extracting this logic into a helper function',
          'This function is too long, split into smaller units',
        ],
        issues: [
          { message: 'Function too complex', severity: 'warning' },
        ],
      };

      await observer.observeReview(reviewResult);
      await new Promise(r => setTimeout(r, 100));

      const candidatesPath = path.join(testDir, '.tlc', 'REFACTOR-CANDIDATES.md');
      expect(fs.existsSync(candidatesPath)).toBe(true);

      const content = fs.readFileSync(candidatesPath, 'utf8');
      expect(content).toContain('src/utils.js');
      expect(content).toContain('extracting');
    });

    it('handles review with no suggestions', async () => {
      const reviewResult = {
        file: 'src/clean.js',
        suggestions: [],
        issues: [],
      };

      await observer.observeReview(reviewResult);
      await new Promise(r => setTimeout(r, 100));

      // Should not create file for empty suggestions
      const candidatesPath = path.join(testDir, '.tlc', 'REFACTOR-CANDIDATES.md');
      // If file exists, should not have entry for this file
      if (fs.existsSync(candidatesPath)) {
        const content = fs.readFileSync(candidatesPath, 'utf8');
        expect(content).not.toContain('src/clean.js');
      }
    });
  });

  describe('error handling', () => {
    it('handles file write errors gracefully', async () => {
      // Make .tlc directory read-only (this won't work on Windows, so we mock)
      const mockWriteFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      const mockAppendFile = vi.spyOn(fs, 'appendFileSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const code = `
function complex(a,b,c) {
  if(a){if(b){if(c){return 1;}}}
  return 0;
}
`;
      const filePath = path.join(testDir, 'test.js');

      // Should not throw
      await expect(observer.observeBuild(filePath, code)).resolves.not.toThrow();

      mockWriteFile.mockRestore();
      mockAppendFile.mockRestore();
    });

    it('handles parse errors gracefully', async () => {
      const invalidCode = `function broken( { syntax error`;
      const filePath = path.join(testDir, 'broken.js');

      // Should not throw
      await expect(observer.observeBuild(filePath, invalidCode)).resolves.not.toThrow();
    });

    it('handles missing .tlc directory', async () => {
      // Remove .tlc directory
      fs.rmSync(path.join(testDir, '.tlc'), { recursive: true, force: true });

      const code = `function test() { return 1; }`;
      const filePath = path.join(testDir, 'test.js');

      // Should not throw, and should create directory
      await expect(observer.observeBuild(filePath, code)).resolves.not.toThrow();
    });
  });

  describe('getCandidates', () => {
    it('returns empty array when no candidates file exists', () => {
      const candidates = observer.getCandidates();
      expect(candidates).toEqual([]);
    });

    it('returns parsed candidates from file', async () => {
      const code = `
function veryComplex(a,b,c,d,e,f) {
  if(a){if(b){if(c){if(d){if(e){if(f){return 1;}}}}}}
  return 0;
}
`;
      const filePath = path.join(testDir, 'complex.js');
      fs.writeFileSync(filePath, code);

      await observer.observeBuild(filePath, code);
      await new Promise(r => setTimeout(r, 100));

      const candidates = observer.getCandidates();
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]).toHaveProperty('file');
      expect(candidates[0]).toHaveProperty('reason');
    });
  });

  describe('isEnabled', () => {
    it('returns true by default', () => {
      expect(observer.isEnabled()).toBe(true);
    });

    it('returns false when config disables it', () => {
      const config = { refactor: { autoDetect: false } };
      fs.writeFileSync(
        path.join(testDir, '.tlc.json'),
        JSON.stringify(config)
      );

      const disabledObserver = new RefactorObserver(testDir);
      expect(disabledObserver.isEnabled()).toBe(false);
    });

    it('returns true when config explicitly enables it', () => {
      const config = { refactor: { autoDetect: true } };
      fs.writeFileSync(
        path.join(testDir, '.tlc.json'),
        JSON.stringify(config)
      );

      const enabledObserver = new RefactorObserver(testDir);
      expect(enabledObserver.isEnabled()).toBe(true);
    });
  });
});
