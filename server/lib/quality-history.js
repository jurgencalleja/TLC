/**
 * Quality History Module
 *
 * Track quality improvements over time
 */

/**
 * Create a quality history store
 * @param {Object} options - History options
 * @returns {Object} History store
 */
function createQualityHistory(options = {}) {
  return {
    records: [],
    options: {
      retentionDays: options.retentionDays ?? 90,
      alertThreshold: options.alertThreshold ?? -15,
      ...options,
    },
  };
}

/**
 * Generate unique ID
 */
function generateId() {
  return `qh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Record a quality score
 * @param {Object} history - History store
 * @param {Object} scoreData - Score data to record
 */
function recordScore(history, scoreData) {
  const record = {
    id: generateId(),
    timestamp: scoreData.timestamp || new Date(),
    composite: scoreData.composite,
    scores: scoreData.scores,
    operation: scoreData.operation,
    model: scoreData.model,
    ...scoreData,
  };

  history.records.push(record);
}

/**
 * Get history records
 * @param {Object} history - History store
 * @param {Object} options - Query options
 * @returns {Array} History records
 */
function getHistory(history, options = {}) {
  let records = [...history.records];

  // Filter by date range
  if (options.from) {
    const fromTime = options.from.getTime();
    records = records.filter((r) => new Date(r.timestamp).getTime() >= fromTime);
  }
  if (options.to) {
    const toTime = options.to.getTime();
    records = records.filter((r) => new Date(r.timestamp).getTime() <= toTime);
  }

  // Sort chronologically
  if (options.sorted) {
    records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // Limit results
  if (options.limit && records.length > options.limit) {
    records = records.slice(-options.limit);
  }

  return records;
}

/**
 * Get history filtered by operation
 * @param {Object} history - History store
 * @param {string} operation - Operation type
 * @returns {Array} Filtered records
 */
function getHistoryByOperation(history, operation) {
  return history.records.filter((r) => r.operation === operation);
}

/**
 * Get history filtered by model
 * @param {Object} history - History store
 * @param {string} model - Model name
 * @param {Object} options - Filter options
 * @returns {Array} Filtered records
 */
function getHistoryByModel(history, model, options = {}) {
  if (options.family) {
    // Match model family (e.g., 'gpt-4' matches 'gpt-4', 'gpt-4-turbo')
    return history.records.filter((r) => r.model && r.model.startsWith(model));
  }
  return history.records.filter((r) => r.model === model);
}

/**
 * Calculate quality trend
 * @param {Object} history - History store
 * @param {Object} options - Trend options
 * @returns {Object} Trend analysis
 */
function calculateTrend(history, options = {}) {
  const { dimension = null, windowSize = 5 } = options;

  const records = getHistory(history, { sorted: true });
  if (records.length < 2) {
    return { direction: 'stable', slope: 0, magnitude: 0 };
  }

  // Get scores for the dimension or composite
  const scores = records.map((r) => {
    if (dimension && r.scores?.[dimension] !== undefined) {
      return r.scores[dimension];
    }
    return r.composite ?? 0;
  });

  // Use recent window
  const recentScores = scores.slice(-windowSize);

  // Calculate simple linear regression
  const n = recentScores.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recentScores[i];
    sumXY += i * recentScores[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const magnitude = Math.abs(slope * n);

  let direction = 'stable';
  if (slope > 1) {
    direction = 'improving';
  } else if (slope < -1) {
    direction = 'declining';
  }

  return {
    direction,
    slope: Math.round(slope * 100) / 100,
    magnitude: Math.round(magnitude * 100) / 100,
  };
}

/**
 * Detect significant improvement
 * @param {Object} history - History store
 * @param {Object} options - Detection options
 * @returns {Object} Improvement detection result
 */
function detectImprovement(history, options = {}) {
  const { threshold = 10, details = false } = options;

  const records = getHistory(history, { sorted: true });
  if (records.length < 2) {
    return { detected: false };
  }

  const first = records[0];
  const last = records[records.length - 1];
  const gain = (last.composite ?? 0) - (first.composite ?? 0);

  if (gain >= threshold) {
    const result = { detected: true, gain };
    if (details) {
      result.from = first;
      result.to = last;
    }
    return result;
  }

  return { detected: false, gain };
}

/**
 * Detect significant degradation
 * @param {Object} history - History store
 * @param {Object} options - Detection options
 * @returns {Object} Degradation detection result
 */
function detectDegradation(history, options = {}) {
  const { threshold = 10, details = false } = options;

  const records = getHistory(history, { sorted: true });
  if (records.length < 2) {
    return { detected: false };
  }

  const first = records[0];
  const last = records[records.length - 1];
  const loss = (first.composite ?? 0) - (last.composite ?? 0);

  if (loss >= threshold) {
    const result = { detected: true, loss };
    if (details) {
      result.from = first;
      result.to = last;
    }
    return result;
  }

  return { detected: false, loss: Math.max(0, loss) };
}

/**
 * Set up degradation alerting
 * @param {Object} history - History store
 * @param {Function} callback - Alert callback
 */
function alertOnDegradation(history, callback) {
  const threshold = Math.abs(history.options.alertThreshold);
  const degradation = detectDegradation(history, { threshold, details: true });

  if (degradation.detected) {
    callback(degradation);
  }
}

/**
 * Clean up old history records
 * @param {Object} history - History store
 * @param {Object} options - Cleanup options
 * @returns {Object} Cleanup result
 */
function cleanupHistory(history, options = {}) {
  const retentionDays = options.retentionDays ?? history.options.retentionDays;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffTime = cutoff.getTime();

  const before = history.records.length;
  history.records = history.records.filter(
    (r) => new Date(r.timestamp).getTime() >= cutoffTime
  );
  const removed = before - history.records.length;

  return { removed, remaining: history.records.length };
}

module.exports = {
  createQualityHistory,
  recordScore,
  getHistory,
  getHistoryByOperation,
  getHistoryByModel,
  calculateTrend,
  detectImprovement,
  detectDegradation,
  alertOnDegradation,
  cleanupHistory,
};
