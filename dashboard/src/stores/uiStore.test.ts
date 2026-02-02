import { describe, it, expect, beforeEach } from 'vitest';
import { createUIStore, UIStore } from './uiStore.js';

describe('uiStore', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  describe('Theme', () => {
    it('defaults to dark theme', () => {
      expect(store.getState().theme).toBe('dark');
    });

    it('toggles theme from dark to light', () => {
      store.getState().toggleTheme();
      expect(store.getState().theme).toBe('light');
    });

    it('toggles theme from light to dark', () => {
      store.getState().setTheme('light');
      store.getState().toggleTheme();
      expect(store.getState().theme).toBe('dark');
    });

    it('sets theme directly', () => {
      store.getState().setTheme('light');
      expect(store.getState().theme).toBe('light');
    });
  });

  describe('Sidebar', () => {
    it('defaults to sidebar open', () => {
      expect(store.getState().sidebarOpen).toBe(true);
    });

    it('toggles sidebar', () => {
      store.getState().toggleSidebar();
      expect(store.getState().sidebarOpen).toBe(false);
    });

    it('sets sidebar state directly', () => {
      store.getState().setSidebarOpen(false);
      expect(store.getState().sidebarOpen).toBe(false);
    });
  });

  describe('Active View', () => {
    it('defaults to projects view', () => {
      expect(store.getState().activeView).toBe('projects');
    });

    it('sets active view', () => {
      store.getState().setActiveView('tasks');
      expect(store.getState().activeView).toBe('tasks');
    });

    it('accepts valid view names', () => {
      const views = ['projects', 'tasks', 'chat', 'agents', 'logs', 'settings'];
      views.forEach(view => {
        store.getState().setActiveView(view);
        expect(store.getState().activeView).toBe(view);
      });
    });
  });

  describe('Command Palette', () => {
    it('defaults to command palette closed', () => {
      expect(store.getState().commandPaletteOpen).toBe(false);
    });

    it('opens command palette', () => {
      store.getState().openCommandPalette();
      expect(store.getState().commandPaletteOpen).toBe(true);
    });

    it('closes command palette', () => {
      store.getState().openCommandPalette();
      store.getState().closeCommandPalette();
      expect(store.getState().commandPaletteOpen).toBe(false);
    });

    it('toggles command palette', () => {
      store.getState().toggleCommandPalette();
      expect(store.getState().commandPaletteOpen).toBe(true);
      store.getState().toggleCommandPalette();
      expect(store.getState().commandPaletteOpen).toBe(false);
    });
  });

  describe('Help Modal', () => {
    it('defaults to help modal closed', () => {
      expect(store.getState().helpOpen).toBe(false);
    });

    it('toggles help modal', () => {
      store.getState().toggleHelp();
      expect(store.getState().helpOpen).toBe(true);
    });
  });

  describe('Mobile Mode', () => {
    it('defaults to desktop mode', () => {
      expect(store.getState().isMobile).toBe(false);
    });

    it('sets mobile mode', () => {
      store.getState().setMobile(true);
      expect(store.getState().isMobile).toBe(true);
    });
  });
});
