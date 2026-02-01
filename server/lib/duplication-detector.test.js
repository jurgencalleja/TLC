/**
 * Duplication Detector Tests
 * Task 2: Find copy-pasted and structurally similar code
 */

import { describe, it, expect } from 'vitest';

describe('DuplicationDetector', () => {
  describe('exact duplicate detection', () => {
    it('finds exact duplicate blocks across files', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const files = [
        {
          path: 'file1.js',
          content: `
            function validate(input) {
              if (!input) return false;
              if (input.length < 3) return false;
              if (input.length > 100) return false;
              return true;
            }

            function other() { return 1; }
          `,
        },
        {
          path: 'file2.js',
          content: `
            function checkInput(input) {
              if (!input) return false;
              if (input.length < 3) return false;
              if (input.length > 100) return false;
              return true;
            }
          `,
        },
      ];

      const result = detector.detect(files);

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].files).toContain('file1.js');
      expect(result.duplicates[0].files).toContain('file2.js');
    });

    it('finds multiple duplicate blocks', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const block1 = `
        const result = [];
        for (let i = 0; i < items.length; i++) {
          result.push(items[i].name);
        }
        return result;
      `;

      const block2 = `
        if (!user) throw new Error('Not found');
        if (!user.active) throw new Error('Inactive');
        if (!user.verified) throw new Error('Not verified');
      `;

      const files = [
        { path: 'a.js', content: `function foo() {${block1}}` },
        { path: 'b.js', content: `function bar() {${block1}}` },
        { path: 'c.js', content: `function check() {${block2}}` },
        { path: 'd.js', content: `function validate() {${block2}}` },
      ];

      const result = detector.detect(files);

      expect(result.duplicates.length).toBeGreaterThanOrEqual(2);
    });

    it('ignores small duplicates (less than 5 lines)', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const files = [
        { path: 'file1.js', content: 'const x = 1;\nconst y = 2;' },
        { path: 'file2.js', content: 'const x = 1;\nconst y = 2;' },
      ];

      const result = detector.detect(files);

      expect(result.duplicates).toHaveLength(0);
    });

    it('configures minimum line threshold', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector({ minLines: 2 });

      const files = [
        { path: 'file1.js', content: 'const x = 1;\nconst y = 2;\nconst z = 3;' },
        { path: 'file2.js', content: 'const x = 1;\nconst y = 2;\nconst z = 3;' },
      ];

      const result = detector.detect(files);

      expect(result.duplicates).toHaveLength(1);
    });
  });

  describe('structural similarity detection', () => {
    it('finds similar functions with renamed variables', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const files = [
        {
          path: 'file1.js',
          content: `
            function processUser(user) {
              const result = {};
              result.name = user.name;
              result.email = user.email;
              result.active = user.active;
              return result;
            }
          `,
        },
        {
          path: 'file2.js',
          content: `
            function transformProduct(product) {
              const output = {};
              output.name = product.name;
              output.email = product.email;
              output.active = product.active;
              return output;
            }
          `,
        },
      ];

      const result = detector.detect(files);

      expect(result.similar).toHaveLength(1);
      expect(result.similar[0].similarity).toBeGreaterThan(0.8);
    });

    it('detects similar structure with different literals', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const files = [
        {
          path: 'file1.js',
          content: `
            function getStatus(code) {
              if (code === 200) return 'OK';
              if (code === 404) return 'Not Found';
              if (code === 500) return 'Error';
              return 'Unknown';
            }
          `,
        },
        {
          path: 'file2.js',
          content: `
            function getMessage(type) {
              if (type === 'success') return 'Done';
              if (type === 'warning') return 'Caution';
              if (type === 'error') return 'Failed';
              return 'None';
            }
          `,
        },
      ];

      const result = detector.detect(files);

      expect(result.similar.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('file pair grouping', () => {
    it('reports file pairs with duplication', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const duplicateBlock = `
        function shared() {
          const data = fetch('/api');
          const parsed = JSON.parse(data);
          const filtered = parsed.filter(x => x.active);
          const mapped = filtered.map(x => x.name);
          return mapped;
        }
      `;

      const files = [
        { path: 'a.js', content: duplicateBlock },
        { path: 'b.js', content: duplicateBlock },
        { path: 'c.js', content: duplicateBlock },
      ];

      const result = detector.detect(files);

      expect(result.pairs).toBeDefined();
      expect(result.pairs.length).toBeGreaterThanOrEqual(1);

      const pairKeys = result.pairs.map(p => `${p.file1}-${p.file2}`);
      expect(pairKeys.some(k => k.includes('a.js') && k.includes('b.js'))).toBe(true);
    });

    it('groups by file pair with line ranges', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const block = `
        const x = 1;
        const y = 2;
        const z = 3;
        const a = 4;
        const b = 5;
      `;

      const files = [
        { path: 'src/utils.js', content: `// header\n${block}\n// footer` },
        { path: 'src/helpers.js', content: `${block}` },
      ];

      const result = detector.detect(files);

      if (result.pairs.length > 0) {
        expect(result.pairs[0].file1).toBeDefined();
        expect(result.pairs[0].file2).toBeDefined();
        expect(result.pairs[0].lines1).toBeDefined();
        expect(result.pairs[0].lines2).toBeDefined();
      }
    });
  });

  describe('duplication percentage', () => {
    it('calculates accurate duplication percentage per file', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const duplicateBlock = `
        function duplicate() {
          const a = 1;
          const b = 2;
          const c = 3;
          const d = 4;
          const e = 5;
          return a + b + c + d + e;
        }
      `;

      const files = [
        {
          path: 'file1.js',
          content: `
            ${duplicateBlock}
            function unique1() { return 1; }
            function unique2() { return 2; }
          `,
        },
        {
          path: 'file2.js',
          content: duplicateBlock,
        },
      ];

      const result = detector.detect(files);

      expect(result.fileStats).toBeDefined();
      expect(result.fileStats['file1.js']).toBeDefined();
      expect(result.fileStats['file2.js']).toBeDefined();
      expect(result.fileStats['file2.js'].duplicationPercentage).toBe(100);
      expect(result.fileStats['file1.js'].duplicationPercentage).toBeLessThan(100);
    });

    it('returns 0% for files with no duplication', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const files = [
        { path: 'file1.js', content: 'function a() { return 1; }' },
        { path: 'file2.js', content: 'function b() { return 2; }' },
      ];

      const result = detector.detect(files);

      expect(result.fileStats['file1.js'].duplicationPercentage).toBe(0);
      expect(result.fileStats['file2.js'].duplicationPercentage).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty files gracefully', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const files = [
        { path: 'empty.js', content: '' },
        { path: 'also-empty.js', content: '' },
      ];

      const result = detector.detect(files);

      expect(result.duplicates).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('handles single file input', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const files = [
        { path: 'only.js', content: 'function x() { return 1; }' },
      ];

      const result = detector.detect(files);

      expect(result.duplicates).toEqual([]);
    });

    it('handles files with only whitespace', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const files = [
        { path: 'whitespace.js', content: '   \n\n   \t\t\n   ' },
        { path: 'other.js', content: 'function x() { return 1; }' },
      ];

      const result = detector.detect(files);

      expect(result.error).toBeUndefined();
    });

    it('ignores import/require statements in duplication', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const files = [
        {
          path: 'file1.js',
          content: `
            const fs = require('fs');
            const path = require('path');
            const util = require('util');
            const http = require('http');
            const https = require('https');
          `,
        },
        {
          path: 'file2.js',
          content: `
            const fs = require('fs');
            const path = require('path');
            const util = require('util');
            const http = require('http');
            const https = require('https');
          `,
        },
      ];

      const result = detector.detect(files);

      // Import blocks should not count as meaningful duplication
      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe('summary statistics', () => {
    it('provides overall duplication summary', async () => {
      const { DuplicationDetector } = await import('./duplication-detector.js');
      const detector = new DuplicationDetector();

      const block = `
        function common() {
          const x = 1;
          const y = 2;
          const z = 3;
          const a = 4;
          const b = 5;
          return x + y + z + a + b;
        }
      `;

      const files = [
        { path: 'a.js', content: block },
        { path: 'b.js', content: block },
        { path: 'c.js', content: 'function unique() { return 1; }' },
      ];

      const result = detector.detect(files);

      expect(result.summary).toBeDefined();
      expect(result.summary.totalFiles).toBe(3);
      expect(result.summary.filesWithDuplication).toBe(2);
      expect(result.summary.totalDuplicateBlocks).toBeGreaterThanOrEqual(1);
    });
  });
});
