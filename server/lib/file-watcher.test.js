import { describe, it, expect } from 'vitest';
import {
  DEFAULT_IGNORE_PATTERNS,
  ChangeTypes,
  shouldIgnore,
  getAffectedService,
  getFileType,
  getReloadAction,
  createChangeEvent,
  getDebounceConfig,
  createWatcherOptions,
  batchChanges,
} from './file-watcher.js';

describe('file-watcher', () => {
  describe('shouldIgnore', () => {
    it('ignores node_modules', () => {
      expect(shouldIgnore('src/node_modules/lodash/index.js')).toBe(true);
      expect(shouldIgnore('node_modules/lodash/index.js')).toBe(true);
    });

    it('ignores .git directory', () => {
      expect(shouldIgnore('.git/config')).toBe(true);
      expect(shouldIgnore('src/.git/objects')).toBe(true);
    });

    it('ignores by extension pattern', () => {
      expect(shouldIgnore('debug.log')).toBe(true);
      expect(shouldIgnore('src/temp.tmp')).toBe(true);
    });

    it('ignores exact file matches', () => {
      expect(shouldIgnore('.DS_Store')).toBe(true);
      expect(shouldIgnore('folder/.DS_Store')).toBe(true);
    });

    it('does not ignore source files', () => {
      expect(shouldIgnore('src/index.js')).toBe(false);
      expect(shouldIgnore('lib/utils.ts')).toBe(false);
    });

    it('uses custom patterns', () => {
      const patterns = ['custom_dir', '*.custom'];
      expect(shouldIgnore('custom_dir/file.js', patterns)).toBe(true);
      expect(shouldIgnore('file.custom', patterns)).toBe(true);
      expect(shouldIgnore('node_modules/x.js', patterns)).toBe(false);
    });
  });

  describe('getAffectedService', () => {
    const services = [
      { name: 'api', path: 'services/api' },
      { name: 'web', path: 'services/web' },
      { name: 'root', path: '.' },
    ];

    it('matches file to service by path', () => {
      const service = getAffectedService('services/api/src/index.js', services);
      expect(service?.name).toBe('api');
    });

    it('matches root service for non-service files', () => {
      const service = getAffectedService('package.json', services);
      expect(service?.name).toBe('root');
    });

    it('returns null when no service matches', () => {
      const servicesNoRoot = [
        { name: 'api', path: 'services/api' },
      ];
      const service = getAffectedService('other/file.js', servicesNoRoot);
      expect(service).toBeNull();
    });

    it('handles Windows paths', () => {
      const service = getAffectedService('services\\api\\src\\index.js', services);
      expect(service?.name).toBe('api');
    });
  });

  describe('getFileType', () => {
    it('identifies source files', () => {
      expect(getFileType('index.js')).toBe('source');
      expect(getFileType('app.ts')).toBe('source');
      expect(getFileType('component.tsx')).toBe('source');
      expect(getFileType('main.py')).toBe('source');
      expect(getFileType('main.go')).toBe('source');
    });

    it('identifies config files', () => {
      expect(getFileType('package.json')).toBe('config');
      expect(getFileType('config.yaml')).toBe('config');
      expect(getFileType('settings.toml')).toBe('config');
    });

    it('identifies style files', () => {
      expect(getFileType('styles.css')).toBe('style');
      expect(getFileType('app.scss')).toBe('style');
    });

    it('identifies template files', () => {
      expect(getFileType('index.html')).toBe('template');
      expect(getFileType('App.vue')).toBe('template');
      expect(getFileType('page.svelte')).toBe('template');
    });

    it('identifies asset files', () => {
      expect(getFileType('logo.png')).toBe('asset');
      expect(getFileType('icon.svg')).toBe('asset');
      expect(getFileType('font.woff2')).toBe('asset');
    });

    it('identifies docs', () => {
      expect(getFileType('README.md')).toBe('docs');
      expect(getFileType('notes.txt')).toBe('docs');
    });

    it('returns other for unknown types', () => {
      expect(getFileType('file.xyz')).toBe('other');
    });
  });

  describe('getReloadAction', () => {
    it('requires rebuild for package.json', () => {
      const action = getReloadAction('package.json', 'change');
      expect(action.action).toBe('rebuild');
      expect(action.priority).toBe('high');
    });

    it('requires rebuild for Dockerfile', () => {
      const action = getReloadAction('Dockerfile', 'change');
      expect(action.action).toBe('rebuild');
    });

    it('requires restart for docker-compose', () => {
      const action = getReloadAction('docker-compose.yml', 'change');
      expect(action.action).toBe('restart');
    });

    it('requires restart for config files', () => {
      const action = getReloadAction('config.yaml', 'change');
      expect(action.action).toBe('restart');
      expect(action.priority).toBe('medium');
    });

    it('triggers hot-reload for source files', () => {
      const action = getReloadAction('src/index.js', 'change');
      expect(action.action).toBe('hot-reload');
      expect(action.priority).toBe('low');
    });

    it('triggers hot-reload for style files', () => {
      const action = getReloadAction('styles.css', 'change');
      expect(action.action).toBe('hot-reload');
    });

    it('requires no action for docs', () => {
      const action = getReloadAction('README.md', 'change');
      expect(action.action).toBe('none');
    });

    it('requires no action for assets', () => {
      const action = getReloadAction('logo.png', 'add');
      expect(action.action).toBe('none');
    });
  });

  describe('createChangeEvent', () => {
    it('creates event with all properties', () => {
      const service = { name: 'api' };
      const event = createChangeEvent('src/index.js', 'change', service);

      expect(event.path).toBe('src/index.js');
      expect(event.changeType).toBe('change');
      expect(event.fileType).toBe('source');
      expect(event.service).toBe('api');
      expect(event.action).toBe('hot-reload');
      expect(event.timestamp).toBeDefined();
    });

    it('handles null service', () => {
      const event = createChangeEvent('orphan.js', 'add', null);

      expect(event.service).toBeNull();
    });
  });

  describe('getDebounceConfig', () => {
    it('returns default config', () => {
      const config = getDebounceConfig();

      expect(config.stabilityThreshold).toBe(100);
      expect(config.pollInterval).toBe(100);
    });

    it('accepts custom values', () => {
      const config = getDebounceConfig({ stabilityThreshold: 200 });

      expect(config.stabilityThreshold).toBe(200);
      expect(config.awaitWriteFinish.stabilityThreshold).toBe(200);
    });
  });

  describe('createWatcherOptions', () => {
    it('creates options with ignored function', () => {
      const options = createWatcherOptions();

      expect(typeof options.ignored).toBe('function');
      expect(options.ignored('node_modules/x.js')).toBe(true);
      expect(options.ignored('src/index.js')).toBe(false);
    });

    it('uses custom ignore patterns', () => {
      const options = createWatcherOptions({
        ignorePatterns: ['custom'],
      });

      expect(options.ignored('custom/file.js')).toBe(true);
      expect(options.ignored('node_modules/x.js')).toBe(false);
    });

    it('sets persistence and initial ignore', () => {
      const options = createWatcherOptions();

      expect(options.persistent).toBe(true);
      expect(options.ignoreInitial).toBe(true);
    });
  });

  describe('batchChanges', () => {
    it('returns none for empty changes', () => {
      const result = batchChanges([]);

      expect(result.action).toBe('none');
      expect(result.changes).toHaveLength(0);
    });

    it('uses highest priority action', () => {
      const changes = [
        { action: 'hot-reload', priority: 'low', service: 'api' },
        { action: 'rebuild', priority: 'high', service: 'api' },
      ];

      const result = batchChanges(changes);

      expect(result.action).toBe('rebuild');
    });

    it('collects affected services', () => {
      const changes = [
        { action: 'hot-reload', priority: 'low', service: 'api' },
        { action: 'hot-reload', priority: 'low', service: 'web' },
        { action: 'hot-reload', priority: 'low', service: 'api' },
      ];

      const result = batchChanges(changes);

      expect(result.services).toContain('api');
      expect(result.services).toContain('web');
      expect(result.services).toHaveLength(2);
    });

    it('counts total changes', () => {
      const changes = [
        { action: 'hot-reload', priority: 'low' },
        { action: 'hot-reload', priority: 'low' },
        { action: 'hot-reload', priority: 'low' },
      ];

      const result = batchChanges(changes);

      expect(result.changes).toBe(3);
      expect(result.reason).toContain('3 files');
    });

    it('uses single reason for single change', () => {
      const changes = [
        { action: 'hot-reload', priority: 'low', reason: 'Source changed' },
      ];

      const result = batchChanges(changes);

      expect(result.reason).toBe('Source changed');
    });
  });
});
