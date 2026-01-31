import { describe, it, expect } from 'vitest';
import {
  colors,
  spacing,
  typography,
  themes,
  generateCSSVariables,
} from './tokens';

describe('tokens', () => {
  describe('colors', () => {
    it('has primary color palette', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primary[500]).toBeDefined();
    });

    it('has status colors', () => {
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.info).toBeDefined();
    });

    it('has neutral grays', () => {
      expect(colors.gray).toBeDefined();
      expect(colors.gray[50]).toBeDefined();
      expect(colors.gray[900]).toBeDefined();
    });
  });

  describe('spacing', () => {
    it('has spacing scale', () => {
      expect(spacing[0]).toBe('0');
      expect(spacing[1]).toBe('0.25rem');
      expect(spacing[4]).toBe('1rem');
      expect(spacing[8]).toBe('2rem');
    });

    it('has 16 steps', () => {
      expect(Object.keys(spacing).length).toBeGreaterThanOrEqual(13);
    });
  });

  describe('typography', () => {
    it('has font sizes', () => {
      expect(typography.fontSize.xs).toBeDefined();
      expect(typography.fontSize.sm).toBeDefined();
      expect(typography.fontSize.base).toBeDefined();
      expect(typography.fontSize.lg).toBeDefined();
      expect(typography.fontSize.xl).toBeDefined();
    });

    it('has font weights', () => {
      expect(typography.fontWeight.normal).toBe(400);
      expect(typography.fontWeight.medium).toBe(500);
      expect(typography.fontWeight.semibold).toBe(600);
      expect(typography.fontWeight.bold).toBe(700);
    });

    it('has line heights', () => {
      expect(typography.lineHeight.tight).toBeDefined();
      expect(typography.lineHeight.normal).toBeDefined();
      expect(typography.lineHeight.relaxed).toBeDefined();
    });
  });

  describe('themes', () => {
    it('has light theme', () => {
      expect(themes.light).toBeDefined();
      expect(themes.light.background).toBeDefined();
      expect(themes.light.foreground).toBeDefined();
      expect(themes.light.primary).toBeDefined();
    });

    it('has dark theme', () => {
      expect(themes.dark).toBeDefined();
      expect(themes.dark.background).toBeDefined();
      expect(themes.dark.foreground).toBeDefined();
      expect(themes.dark.primary).toBeDefined();
    });

    it('has contrasting background/foreground', () => {
      expect(themes.light.background).not.toBe(themes.light.foreground);
      expect(themes.dark.background).not.toBe(themes.dark.foreground);
    });
  });

  describe('generateCSSVariables', () => {
    it('generates CSS custom properties', () => {
      const css = generateCSSVariables('light');

      expect(css).toContain('--color-primary');
      expect(css).toContain('--color-background');
      expect(css).toContain('--spacing-4');
    });

    it('generates different values for dark theme', () => {
      const lightCSS = generateCSSVariables('light');
      const darkCSS = generateCSSVariables('dark');

      expect(lightCSS).not.toBe(darkCSS);
    });

    it('includes spacing variables', () => {
      const css = generateCSSVariables('light');

      expect(css).toContain('--spacing-0');
      expect(css).toContain('--spacing-1');
      expect(css).toContain('--spacing-8');
    });

    it('includes typography variables', () => {
      const css = generateCSSVariables('light');

      expect(css).toContain('--font-size-sm');
      expect(css).toContain('--font-size-base');
      expect(css).toContain('--font-weight-bold');
    });
  });
});
