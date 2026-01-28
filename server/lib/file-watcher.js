/**
 * File Watcher Module
 * Handles file system watching for hot reload triggers
 */

/**
 * Default ignore patterns for file watching
 */
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '__pycache__',
  '*.pyc',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.tmp',
  '.env.local',
  'coverage',
  '.nyc_output',
];

/**
 * File change event types
 */
const ChangeTypes = {
  ADD: 'add',
  CHANGE: 'change',
  UNLINK: 'unlink',
  ADD_DIR: 'addDir',
  UNLINK_DIR: 'unlinkDir',
};

/**
 * Check if a path matches any ignore pattern
 * @param {string} path - File path to check
 * @param {Array<string>} patterns - Ignore patterns
 * @returns {boolean} True if path should be ignored
 */
function shouldIgnore(path, patterns = DEFAULT_IGNORE_PATTERNS) {
  const normalizedPath = path.replace(/\\/g, '/');

  for (const pattern of patterns) {
    // Exact directory match
    if (normalizedPath.includes(`/${pattern}/`) || normalizedPath.startsWith(`${pattern}/`)) {
      return true;
    }

    // File extension pattern (*.ext)
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (normalizedPath.endsWith(ext)) {
        return true;
      }
    }

    // Exact file match
    if (normalizedPath.endsWith(`/${pattern}`) || normalizedPath === pattern) {
      return true;
    }
  }

  return false;
}

/**
 * Determine which service a file change affects
 * @param {string} path - Changed file path
 * @param {Array<Object>} services - List of services with paths
 * @returns {Object|null} Affected service or null
 */
function getAffectedService(path, services) {
  const normalizedPath = path.replace(/\\/g, '/');

  for (const service of services) {
    const servicePath = (service.path || '.').replace(/\\/g, '/');

    // Check if file is within service directory
    if (servicePath === '.') {
      // Root service - check if not in another service's path
      const inOtherService = services.some(
        s => s.path && s.path !== '.' && normalizedPath.startsWith(s.path.replace(/\\/g, '/'))
      );
      if (!inOtherService) {
        return service;
      }
    } else if (normalizedPath.startsWith(servicePath)) {
      return service;
    }
  }

  return null;
}

/**
 * Determine the type of file that changed
 * @param {string} path - File path
 * @returns {string} File type category
 */
function getFileType(path) {
  const ext = path.split('.').pop()?.toLowerCase();

  const typeMap = {
    // Source files
    js: 'source',
    jsx: 'source',
    ts: 'source',
    tsx: 'source',
    py: 'source',
    go: 'source',
    rb: 'source',
    rs: 'source',

    // Config files
    json: 'config',
    yaml: 'config',
    yml: 'config',
    toml: 'config',
    ini: 'config',

    // Style files
    css: 'style',
    scss: 'style',
    sass: 'style',
    less: 'style',

    // Template files
    html: 'template',
    ejs: 'template',
    hbs: 'template',
    pug: 'template',
    vue: 'template',
    svelte: 'template',

    // Asset files
    png: 'asset',
    jpg: 'asset',
    jpeg: 'asset',
    gif: 'asset',
    svg: 'asset',
    ico: 'asset',
    woff: 'asset',
    woff2: 'asset',
    ttf: 'asset',
    eot: 'asset',

    // Documentation
    md: 'docs',
    txt: 'docs',
    rst: 'docs',
  };

  return typeMap[ext] || 'other';
}

/**
 * Determine reload action needed for a file change
 * @param {string} path - File path
 * @param {string} changeType - Type of change (add, change, unlink)
 * @returns {Object} Reload action
 */
function getReloadAction(path, changeType) {
  const fileType = getFileType(path);
  const filename = path.split('/').pop() || path;

  // Package.json changes require full rebuild
  if (filename === 'package.json' || filename === 'package-lock.json') {
    return {
      action: 'rebuild',
      reason: 'Dependencies may have changed',
      priority: 'high',
    };
  }

  // Dockerfile changes require rebuild
  if (filename === 'Dockerfile' || filename.startsWith('Dockerfile.')) {
    return {
      action: 'rebuild',
      reason: 'Container definition changed',
      priority: 'high',
    };
  }

  // Docker-compose changes require restart
  if (filename.startsWith('docker-compose')) {
    return {
      action: 'restart',
      reason: 'Compose configuration changed',
      priority: 'high',
    };
  }

  // Config file changes usually need restart
  if (fileType === 'config') {
    return {
      action: 'restart',
      reason: 'Configuration changed',
      priority: 'medium',
    };
  }

  // Source and style files trigger hot reload
  if (fileType === 'source' || fileType === 'style' || fileType === 'template') {
    return {
      action: 'hot-reload',
      reason: `${fileType} file ${changeType}`,
      priority: 'low',
    };
  }

  // Assets and docs don't need reload
  if (fileType === 'asset' || fileType === 'docs') {
    return {
      action: 'none',
      reason: 'No reload needed for assets/docs',
      priority: 'none',
    };
  }

  return {
    action: 'hot-reload',
    reason: 'File changed',
    priority: 'low',
  };
}

/**
 * Create a change event object
 * @param {string} path - File path
 * @param {string} changeType - Type of change
 * @param {Object} service - Affected service
 * @returns {Object} Change event
 */
function createChangeEvent(path, changeType, service = null) {
  const reloadAction = getReloadAction(path, changeType);

  return {
    path,
    changeType,
    fileType: getFileType(path),
    service: service?.name || null,
    timestamp: new Date().toISOString(),
    ...reloadAction,
  };
}

/**
 * Debounce configuration for file watching
 * @param {Object} options - Debounce options
 * @returns {Object} Debounce config
 */
function getDebounceConfig(options = {}) {
  const {
    stabilityThreshold = 100,
    pollInterval = 100,
    binaryInterval = 300,
  } = options;

  return {
    stabilityThreshold, // Wait this ms after last change
    pollInterval,       // How often to poll for changes
    binaryInterval,     // Interval for binary files
    awaitWriteFinish: {
      stabilityThreshold,
      pollInterval,
    },
  };
}

/**
 * Create watcher options for chokidar
 * @param {Object} options - Watch options
 * @returns {Object} Chokidar options
 */
function createWatcherOptions(options = {}) {
  const {
    ignorePatterns = DEFAULT_IGNORE_PATTERNS,
    persistent = true,
    ignoreInitial = true,
    followSymlinks = false,
    debounce = {},
  } = options;

  const debounceConfig = getDebounceConfig(debounce);

  return {
    ignored: (path) => shouldIgnore(path, ignorePatterns),
    persistent,
    ignoreInitial,
    followSymlinks,
    ...debounceConfig,
  };
}

/**
 * Batch multiple file changes into a single reload action
 * @param {Array<Object>} changes - Array of change events
 * @returns {Object} Batched reload action
 */
function batchChanges(changes) {
  if (changes.length === 0) {
    return { action: 'none', changes: [] };
  }

  // Find highest priority action
  const priorities = { high: 3, medium: 2, low: 1, none: 0 };
  const actions = { rebuild: 3, restart: 2, 'hot-reload': 1, none: 0 };

  let maxPriority = 0;
  let maxAction = 'none';
  const affectedServices = new Set();

  for (const change of changes) {
    if (priorities[change.priority] > maxPriority) {
      maxPriority = priorities[change.priority];
    }
    if (actions[change.action] > actions[maxAction]) {
      maxAction = change.action;
    }
    if (change.service) {
      affectedServices.add(change.service);
    }
  }

  return {
    action: maxAction,
    services: Array.from(affectedServices),
    changes: changes.length,
    reason: changes.length === 1
      ? changes[0].reason
      : `${changes.length} files changed`,
  };
}

module.exports = {
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
};
