/**
 * Global TLC Configuration - Persistent config at ~/.tlc/config.json
 *
 * Stores workspace root paths and settings that survive reinstalls.
 * XDG-aware: uses $TLC_CONFIG_DIR or defaults to ~/.tlc/
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILENAME = 'config.json';

/**
 * Get the config directory path
 * @returns {string}
 */
function getConfigDir() {
  if (process.env.TLC_CONFIG_DIR) {
    return process.env.TLC_CONFIG_DIR;
  }
  return path.join(os.homedir(), '.tlc');
}

/**
 * Default config structure
 * @returns {object}
 */
function defaultConfig() {
  return {
    version: 1,
    roots: [],
    scanDepth: 5,
    lastScans: {},
  };
}

class GlobalConfig {
  constructor() {
    this.configDir = getConfigDir();
    this.configPath = path.join(this.configDir, CONFIG_FILENAME);
    this._config = null;
  }

  /**
   * Load config from disk, creating defaults if needed
   * @returns {object} The config object
   */
  load() {
    this._ensureDir();

    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        this._config = JSON.parse(raw);
        return this._config;
      } catch (err) {
        // Corrupted JSON — reset to defaults
        console.error('Corrupted config, resetting to defaults:', err.message);
        this._config = defaultConfig();
        this._save();
        return this._config;
      }
    }

    // First access — create defaults
    this._config = defaultConfig();
    this._save();
    return this._config;
  }

  /**
   * Get all configured root paths
   * @returns {string[]}
   */
  getRoots() {
    this._ensureLoaded();
    return [...this._config.roots];
  }

  /**
   * Add a root directory path
   * @param {string} rootPath - Absolute path to a directory
   * @throws {Error} If path is invalid
   */
  addRoot(rootPath) {
    this._ensureLoaded();

    const resolved = path.resolve(rootPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Path does not exist: ${resolved}`);
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolved}`);
    }

    if (this._config.roots.includes(resolved)) {
      throw new Error(`Root already configured: ${resolved}`);
    }

    this._config.roots.push(resolved);
    this._save();
  }

  /**
   * Remove a root directory path
   * @param {string} rootPath - Path to remove
   */
  removeRoot(rootPath) {
    this._ensureLoaded();

    const resolved = path.resolve(rootPath);
    this._config.roots = this._config.roots.filter((r) => r !== resolved);

    // Clean up lastScans entry
    delete this._config.lastScans[resolved];

    this._save();
  }

  /**
   * Check if any roots are configured
   * @returns {boolean}
   */
  isConfigured() {
    this._ensureLoaded();
    return this._config.roots.length > 0;
  }

  /**
   * Set scan depth
   * @param {number} depth
   */
  setScanDepth(depth) {
    this._ensureLoaded();
    this._config.scanDepth = depth;
    this._save();
  }

  /**
   * Set last scan timestamp for a root
   * @param {string} rootPath
   * @param {number} timestamp
   */
  setLastScan(rootPath, timestamp) {
    this._ensureLoaded();
    const resolved = path.resolve(rootPath);
    this._config.lastScans[resolved] = timestamp;
    this._save();
  }

  /**
   * Get last scan timestamp for a root
   * @param {string} rootPath
   * @returns {number|null}
   */
  getLastScan(rootPath) {
    this._ensureLoaded();
    const resolved = path.resolve(rootPath);
    return this._config.lastScans[resolved] || null;
  }

  /**
   * Ensure config directory exists
   * @private
   */
  _ensureDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Ensure config is loaded
   * @private
   */
  _ensureLoaded() {
    if (!this._config) {
      this.load();
    }
  }

  /**
   * Atomic write to config file
   * @private
   */
  _save() {
    this._ensureDir();
    const tmpPath = this.configPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(this._config, null, 2), 'utf-8');
    fs.renameSync(tmpPath, this.configPath);
  }
}

module.exports = { GlobalConfig };
