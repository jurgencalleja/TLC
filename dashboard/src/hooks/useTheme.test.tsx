import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { ThemeProvider, useTheme } from './useTheme.js';

// Test component that uses the hook
function ThemeConsumer() {
  const { theme, isDark, isLight, colors, useSystemTheme } = useTheme();

  return (
    <Text>
      {`theme:${theme}|isDark:${String(isDark)}|isLight:${String(isLight)}|accent:${colors.accent}|useSystem:${String(useSystemTheme)}`}
    </Text>
  );
}

function LightThemeConsumer() {
  const { theme, isDark, isLight } = useTheme();
  return (
    <Text>{`theme:${theme}|isDark:${String(isDark)}|isLight:${String(isLight)}`}</Text>
  );
}

describe('useTheme', () => {
  describe('Initial State', () => {
    it('returns theme object', () => {
      const { lastFrame } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('theme:');
    });

    it('defaults to dark theme', () => {
      const { lastFrame } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('theme:dark');
    });

    it('returns isDark helper', () => {
      const { lastFrame } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('isDark:true');
    });

    it('returns isLight helper', () => {
      const { lastFrame } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('isLight:false');
    });
  });

  describe('Default Theme Override', () => {
    it('accepts light as default theme', () => {
      const { lastFrame } = render(
        <ThemeProvider defaultTheme="light">
          <LightThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('theme:light');
    });

    it('sets isDark false when light theme', () => {
      const { lastFrame } = render(
        <ThemeProvider defaultTheme="light">
          <LightThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('isDark:false');
    });

    it('sets isLight true when light theme', () => {
      const { lastFrame } = render(
        <ThemeProvider defaultTheme="light">
          <LightThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('isLight:true');
    });
  });

  describe('Theme Colors', () => {
    it('provides color tokens', () => {
      const { lastFrame } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('accent:');
    });

    it('provides accent color for dark theme', () => {
      const { lastFrame } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('accent:#3b82f6');
    });
  });

  describe('System Preference', () => {
    it('provides useSystemTheme option', () => {
      const { lastFrame } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('useSystem:');
    });

    it('defaults useSystemTheme to false', () => {
      const { lastFrame } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('useSystem:false');
    });
  });

  describe('Hook Functions', () => {
    it('provides toggleTheme function', () => {
      const TestFunctions = () => {
        const { toggleTheme } = useTheme();
        return <Text>{`hasToggle:${typeof toggleTheme === 'function'}`}</Text>;
      };
      const { lastFrame } = render(
        <ThemeProvider>
          <TestFunctions />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('hasToggle:true');
    });

    it('provides setTheme function', () => {
      const TestFunctions = () => {
        const { setTheme } = useTheme();
        return <Text>{`hasSetTheme:${typeof setTheme === 'function'}`}</Text>;
      };
      const { lastFrame } = render(
        <ThemeProvider>
          <TestFunctions />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('hasSetTheme:true');
    });

    it('provides setUseSystemTheme function', () => {
      const TestFunctions = () => {
        const { setUseSystemTheme } = useTheme();
        return <Text>{`hasSetSystem:${typeof setUseSystemTheme === 'function'}`}</Text>;
      };
      const { lastFrame } = render(
        <ThemeProvider>
          <TestFunctions />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('hasSetSystem:true');
    });
  });
});
