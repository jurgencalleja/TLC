/**
 * Usage History - Track 7-day rolling history of usage per model
 */

const fs = require('fs');
const path = require('path');

const MAX_HISTORY_DAYS = 7;

class UsageHistory {
  constructor(configPath = '.tlc/usage-history.json') {
    this.configPath = configPath;
    this.history = {};
    this.load();
  }

  /**
   * Load history from file
   */
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        this.history = JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to load usage history:', err.message);
      this.history = {};
    }
  }

  /**
   * Save history to file
   */
  save() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.history, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save usage history:', err.message);
    }
  }

  /**
   * Get current date as YYYY-MM-DD string
   * @returns {string}
   */
  getDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Record a daily usage snapshot for a model
   * @param {string} model - Model name
   * @param {Object} usage - Usage data { daily, monthly }
   */
  recordDailySnapshot(model, usage) {
    const dateStr = this.getDateString();

    // Initialize model history if needed
    if (!this.history[model]) {
      this.history[model] = [];
    }

    // Find existing entry for today
    const existingIndex = this.history[model].findIndex(s => s.date === dateStr);

    const snapshot = {
      date: dateStr,
      daily: usage.daily,
      monthly: usage.monthly,
    };

    if (existingIndex >= 0) {
      // Update existing entry for today
      this.history[model][existingIndex] = snapshot;
    } else {
      // Add new entry
      this.history[model].push(snapshot);
    }

    // Sort by date
    this.history[model].sort((a, b) => a.date.localeCompare(b.date));

    // Maintain 7-day rolling window
    while (this.history[model].length > MAX_HISTORY_DAYS) {
      this.history[model].shift();
    }

    this.save();
  }

  /**
   * Get history for a model
   * @param {string} model - Model name
   * @returns {Array} Array of snapshots sorted by date ascending
   */
  getHistory(model) {
    if (!this.history[model]) {
      return [];
    }

    // Return a copy, sorted by date ascending
    return [...this.history[model]].sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get all tracked models
   * @returns {Array} Array of model names
   */
  getAllModels() {
    return Object.keys(this.history);
  }
}

module.exports = {
  UsageHistory,
};
