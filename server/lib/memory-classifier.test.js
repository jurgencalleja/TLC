import { describe, it, expect } from 'vitest';
import { classifyMemory, CLASSIFICATION } from './memory-classifier.js';

describe('memory-classifier', () => {
  describe('classifyMemory', () => {
    describe('team classification', () => {
      it('classifies architectural decision as team', () => {
        const item = {
          type: 'decision',
          choice: 'PostgreSQL',
          context: 'database selection',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.TEAM);
      });

      it('classifies technology choice as team', () => {
        const item = {
          type: 'decision',
          choice: 'React',
          reasoning: 'for frontend',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.TEAM);
      });

      it('classifies project gotcha as team', () => {
        const item = {
          type: 'gotcha',
          subject: 'auth service',
          issue: 'needs warm up time',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.TEAM);
      });

      it('classifies "we decided" language as team', () => {
        const item = {
          type: 'decision',
          raw: 'we decided to use REST',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.TEAM);
      });

      it('classifies API/infrastructure decisions as team', () => {
        const item = {
          type: 'decision',
          choice: 'REST API',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.TEAM);
      });
    });

    describe('personal classification', () => {
      it('classifies style preference as personal', () => {
        const item = {
          type: 'preference',
          preference: 'functional programming',
          category: 'codeStyle',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.PERSONAL);
      });

      it('classifies code correction as personal', () => {
        const item = {
          type: 'preference',
          preference: 'named exports',
          antiPreference: 'default exports',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.PERSONAL);
      });

      it('classifies "I prefer" language as personal', () => {
        const item = {
          type: 'preference',
          raw: 'I prefer small functions',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.PERSONAL);
      });

      it('classifies formatting preference as personal', () => {
        const item = {
          type: 'preference',
          preference: 'tabs over spaces',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.PERSONAL);
      });

      it('classifies comment style as personal', () => {
        const item = {
          type: 'preference',
          preference: 'minimal comments',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.PERSONAL);
      });
    });

    describe('edge cases', () => {
      it('defaults to personal when ambiguous', () => {
        const item = {
          type: 'unknown',
          content: 'something vague',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.PERSONAL);
      });

      it('handles empty item', () => {
        expect(classifyMemory({})).toBe(CLASSIFICATION.PERSONAL);
      });

      it('handles undefined', () => {
        expect(classifyMemory(undefined)).toBe(CLASSIFICATION.PERSONAL);
      });

      it('classifies reasoning as team when about architecture', () => {
        const item = {
          type: 'reasoning',
          content: 'because the database needs to scale',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.TEAM);
      });

      it('classifies reasoning as personal when about style', () => {
        const item = {
          type: 'reasoning',
          content: 'because I find it more readable',
        };

        expect(classifyMemory(item)).toBe(CLASSIFICATION.PERSONAL);
      });
    });

    describe('keyword detection', () => {
      it('detects team keywords in content', () => {
        const teamKeywords = ['database', 'API', 'infrastructure', 'deployment', 'architecture'];

        for (const keyword of teamKeywords) {
          const item = { type: 'decision', choice: `something with ${keyword}` };
          expect(classifyMemory(item)).toBe(CLASSIFICATION.TEAM);
        }
      });

      it('detects personal keywords in content', () => {
        const personalKeywords = ['prefer', 'style', 'formatting', 'indentation'];

        for (const keyword of personalKeywords) {
          const item = { type: 'preference', preference: `my ${keyword} choice` };
          expect(classifyMemory(item)).toBe(CLASSIFICATION.PERSONAL);
        }
      });
    });
  });

  describe('CLASSIFICATION', () => {
    it('exports classification constants', () => {
      expect(CLASSIFICATION.TEAM).toBe('team');
      expect(CLASSIFICATION.PERSONAL).toBe('personal');
    });
  });
});
