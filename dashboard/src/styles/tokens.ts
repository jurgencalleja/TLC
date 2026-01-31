/**
 * Design Tokens - Colors, spacing, typography, and themes
 */

export const colors = {
  // Primary palette
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Neutral grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Status colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Pure colors
  white: '#ffffff',
  black: '#000000',
};

export const spacing = {
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
};

export const typography = {
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  fontFamily: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
};

export const themes = {
  light: {
    background: colors.white,
    foreground: colors.gray[900],
    muted: colors.gray[100],
    mutedForeground: colors.gray[500],
    border: colors.gray[200],
    primary: colors.primary[600],
    primaryForeground: colors.white,
    secondary: colors.gray[100],
    secondaryForeground: colors.gray[900],
    accent: colors.primary[50],
    accentForeground: colors.primary[700],
    success: colors.success[600],
    warning: colors.warning[600],
    error: colors.error[600],
    info: colors.info[600],
  },

  dark: {
    background: colors.gray[900],
    foreground: colors.gray[50],
    muted: colors.gray[800],
    mutedForeground: colors.gray[400],
    border: colors.gray[700],
    primary: colors.primary[500],
    primaryForeground: colors.white,
    secondary: colors.gray[800],
    secondaryForeground: colors.gray[100],
    accent: colors.gray[800],
    accentForeground: colors.primary[400],
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
    info: colors.info[500],
  },
};

export type Theme = keyof typeof themes;

/**
 * Generate CSS custom properties for a theme
 */
export function generateCSSVariables(theme: Theme): string {
  const themeTokens = themes[theme];
  const lines: string[] = [];

  // Theme colors
  for (const [key, value] of Object.entries(themeTokens)) {
    lines.push(`  --color-${key}: ${value};`);
  }

  // Primary palette
  for (const [shade, value] of Object.entries(colors.primary)) {
    lines.push(`  --color-primary-${shade}: ${value};`);
  }

  // Gray palette
  for (const [shade, value] of Object.entries(colors.gray)) {
    lines.push(`  --color-gray-${shade}: ${value};`);
  }

  // Spacing
  for (const [key, value] of Object.entries(spacing)) {
    const normalizedKey = String(key).replace('.', '_');
    lines.push(`  --spacing-${normalizedKey}: ${value};`);
  }

  // Typography
  for (const [key, value] of Object.entries(typography.fontSize)) {
    lines.push(`  --font-size-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(typography.fontWeight)) {
    lines.push(`  --font-weight-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(typography.lineHeight)) {
    lines.push(`  --line-height-${key}: ${value};`);
  }

  return `:root {\n${lines.join('\n')}\n}`;
}
