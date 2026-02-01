/**
 * Refactor Progress Tracker
 * Show progress for large codebase analysis with ETA
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const crypto = require('crypto');

class RefactorProgress extends EventEmitter {
  constructor(options = {}) {
    super();
    this.cacheFile = options.cacheFile || '.tlc/refactor-cache.json';
    this.cache = {};
    this.cancelled = false;
    this.stats = {
      total: 0,
      completed: 0,
      startTime: null,
      speeds: [], // rolling average
    };
  }

  /**
   * Load cache from disk
   */
  async loadCache() {
    try {
      const content = await fs.promises.readFile(this.cacheFile, 'utf-8');
      this.cache = JSON.parse(content);
    } catch {
      // Keep existing cache if disk read fails (don't reset)
    }
  }

  /**
   * Save cache to disk
   */
  async saveCache() {
    try {
      const dir = require('path').dirname(this.cacheFile);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch {
      // Ignore cache save errors
    }
  }

  /**
   * Get file hash for cache key
   */
  getFileHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if file result is cached
   */
  getCached(filePath, content) {
    const hash = this.getFileHash(content);
    const cached = this.cache[filePath];
    if (cached && cached.hash === hash) {
      return cached.result;
    }
    return null;
  }

  /**
   * Store result in cache
   */
  setCached(filePath, content, result) {
    const hash = this.getFileHash(content);
    this.cache[filePath] = { hash, result, timestamp: Date.now() };
  }

  /**
   * Start tracking progress
   */
  start(totalFiles) {
    this.stats.total = totalFiles;
    this.stats.completed = 0;
    this.stats.startTime = Date.now();
    this.stats.speeds = [];
    this.cancelled = false;
  }

  /**
   * Update progress after completing a file
   */
  update(filePath) {
    if (this.cancelled) return;

    this.stats.completed++;
    const elapsed = Date.now() - this.stats.startTime;
    const speed = this.stats.completed / (elapsed / 1000); // files per second

    // Keep rolling average of last 10 speeds
    this.stats.speeds.push(speed);
    if (this.stats.speeds.length > 10) {
      this.stats.speeds.shift();
    }

    const progress = this.getProgress();
    this.emit('progress', progress);
  }

  /**
   * Get current progress info
   */
  getProgress() {
    const { total, completed, startTime, speeds } = this.stats;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate ETA from rolling average speed
    const avgSpeed = speeds.length > 0
      ? speeds.reduce((a, b) => a + b, 0) / speeds.length
      : 0;

    const remaining = total - completed;
    const etaSeconds = avgSpeed > 0 ? Math.round(remaining / avgSpeed) : 0;

    return {
      total,
      completed,
      remaining,
      percentage,
      eta: this.formatEta(etaSeconds),
      etaSeconds,
      message: `Analyzing ${completed}/${total} files`,
    };
  }

  /**
   * Format ETA as human-readable string
   */
  formatEta(seconds) {
    if (seconds <= 0) return 'calculating...';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  }

  /**
   * Cancel the analysis
   */
  cancel() {
    this.cancelled = true;
    this.emit('cancelled');
  }

  /**
   * Check if cancelled
   */
  isCancelled() {
    return this.cancelled;
  }

  /**
   * Analyze files with progress tracking
   */
  async analyze(files, analyzer) {
    await this.loadCache();
    this.start(files.length);

    const results = [];

    for (const file of files) {
      if (this.cancelled) break;

      // Check cache
      let result = this.getCached(file.path, file.content);

      if (!result) {
        // Analyze and cache
        result = await analyzer(file);
        this.setCached(file.path, file.content, result);
      }

      results.push({ file: file.path, ...result });
      this.update(file.path);
    }

    await this.saveCache();

    return {
      results,
      cancelled: this.cancelled,
      stats: this.getProgress(),
    };
  }
}

module.exports = { RefactorProgress };
