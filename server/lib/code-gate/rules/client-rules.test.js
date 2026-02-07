/**
 * Client-Side Pattern Rules Tests
 *
 * Detects Zustand stores without persistence and
 * Zod schemas with z.date() instead of z.coerce.date().
 */
import { describe, it, expect } from 'vitest';

const {
  checkZustandPersistence,
  checkZodDateCoercion,
} = require('./client-rules.js');

describe('Client Rules', () => {
  describe('checkZustandPersistence', () => {
    it('detects create() without persist', () => {
      const code = `
        import { create } from 'zustand';
        const useFormStore = create((set) => ({
          data: null,
          setData: (data) => set({ data }),
        }));
      `;
      const findings = checkZustandPersistence('src/stores/form-store.ts', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('warn');
      expect(findings[0].rule).toBe('zustand-needs-persist');
    });

    it('passes create(persist(...))', () => {
      const code = `
        import { create } from 'zustand';
        import { persist } from 'zustand/middleware';
        const useFormStore = create(persist((set) => ({
          data: null,
        }), { name: 'form-store' }));
      `;
      const findings = checkZustandPersistence('src/stores/form-store.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('allows stores in ephemeral files', () => {
      const code = `
        import { create } from 'zustand';
        const useUIStore = create((set) => ({ open: false }));
      `;
      const findings = checkZustandPersistence('src/stores/ui-store.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips test files', () => {
      const code = `
        import { create } from 'zustand';
        const useTestStore = create((set) => ({ x: 1 }));
      `;
      const findings = checkZustandPersistence('src/stores/form.test.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('handles create<Type>() generic syntax', () => {
      const code = `
        import { create } from 'zustand';
        interface FormState { data: string | null; }
        const useFormStore = create<FormState>((set) => ({
          data: null,
        }));
      `;
      const findings = checkZustandPersistence('src/stores/form-store.ts', code);
      expect(findings).toHaveLength(1);
    });
  });

  describe('checkZodDateCoercion', () => {
    it('detects z.date() in schema files', () => {
      const code = `
        const insertLeadSchema = z.object({
          name: z.string(),
          createdAt: z.date(),
        });
      `;
      const findings = checkZodDateCoercion('src/db/schema/leads.ts', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('warn');
      expect(findings[0].rule).toBe('zod-use-coerce-date');
    });

    it('passes z.coerce.date()', () => {
      const code = `
        const insertLeadSchema = z.object({
          name: z.string(),
          createdAt: z.coerce.date(),
        });
      `;
      const findings = checkZodDateCoercion('src/db/schema/leads.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('allows z.date() in non-schema files', () => {
      const code = 'const validator = z.date();';
      const findings = checkZodDateCoercion('src/utils/helpers.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips test files', () => {
      const code = 'const schema = z.object({ at: z.date() });';
      const findings = checkZodDateCoercion('src/db/schema/leads.test.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('detects in insertSchema definitions', () => {
      const code = `
        export const insertQuoteSchema = z.object({
          validUntil: z.date(),
          amount: z.number(),
        });
      `;
      const findings = checkZodDateCoercion('server/schemas/quotes.ts', code);
      expect(findings).toHaveLength(1);
    });
  });
});
