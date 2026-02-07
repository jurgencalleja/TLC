/**
 * Database Rules Tests
 *
 * Detects new Date() in ORM .set() blocks and inline billing math.
 */
import { describe, it, expect } from 'vitest';

const {
  checkNewDateInSet,
  checkInlineBillingMath,
} = require('./database-rules.js');

describe('Database Rules', () => {
  describe('checkNewDateInSet', () => {
    it('detects new Date() in .set({}) block', () => {
      const code = `
        db.update(leads).set({
          status: "active",
          updatedAt: new Date(),
        });
      `;
      const findings = checkNewDateInSet('src/leads/leads.service.ts', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('block');
      expect(findings[0].rule).toBe('no-new-date-in-set');
      expect(findings[0].fix).toContain('sql');
    });

    it('detects new Date() in .set() with convertedAt', () => {
      const code = `
        db.update(leads).set({
          convertedAt: new Date(),
          updatedAt: new Date(),
        });
      `;
      const findings = checkNewDateInSet('src/leads/leads.service.ts', code);
      expect(findings.length).toBeGreaterThanOrEqual(1);
    });

    it('allows new Date() in logging context', () => {
      const code = `
        console.log('Started at', new Date());
        const timestamp = new Date();
      `;
      const findings = checkNewDateInSet('src/utils/logger.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('allows sql`now()` in .set()', () => {
      const code = `
        db.update(leads).set({
          status: "active",
          updatedAt: sql\`now()\`,
        });
      `;
      const findings = checkNewDateInSet('src/leads/leads.service.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips test files', () => {
      const code = 'db.update(leads).set({ updatedAt: new Date() });';
      const findings = checkNewDateInSet('src/leads/leads.test.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('detects across multiline .set() call', () => {
      const code = [
        'await db',
        '  .update(invoices)',
        '  .set({',
        '    paidAt: new Date(),',
        '    status: "paid",',
        '  });',
      ].join('\n');
      const findings = checkNewDateInSet('src/invoices/invoices.service.ts', code);
      expect(findings).toHaveLength(1);
    });
  });

  describe('checkInlineBillingMath', () => {
    it('detects quantity * rate pattern', () => {
      const code = 'const lineTotal = quantity * rate;';
      const findings = checkInlineBillingMath('src/invoices/editor.tsx', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('warn');
      expect(findings[0].rule).toBe('no-inline-billing-math');
    });

    it('detects subtotal - discount pattern', () => {
      const code = 'const total = subtotal - discount + tax;';
      const findings = checkInlineBillingMath('src/invoices/sheet.tsx', code);
      expect(findings).toHaveLength(1);
    });

    it('allows math in calculation utility files', () => {
      const code = 'const lineTotal = quantity * rate;';
      const findings = checkInlineBillingMath('src/lib/billing-calculations.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('allows math in files with "calc" in name', () => {
      const code = 'const total = subtotal - discount;';
      const findings = checkInlineBillingMath('src/utils/price-calc.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips test files', () => {
      const code = 'const lineTotal = quantity * rate;';
      const findings = checkInlineBillingMath('src/invoices/editor.test.tsx', code);
      expect(findings).toHaveLength(0);
    });

    it('allows non-billing arithmetic', () => {
      const code = 'const area = width * height;';
      const findings = checkInlineBillingMath('src/utils/geometry.ts', code);
      expect(findings).toHaveLength(0);
    });
  });
});
