/**
 * Metrics Collector
 * Prometheus format metrics collection and formatting
 */

export const METRIC_TYPES = {
  COUNTER: 'counter',
  HISTOGRAM: 'histogram',
  GAUGE: 'gauge',
};

/**
 * Create a counter metric
 * @param {string} name - Metric name
 * @param {Object} options - Configuration options
 * @param {Array} options.labels - Label names
 * @returns {Object} Counter with inc and get methods
 */
export function createCounter(name, options = {}) {
  const { labels = [] } = options;
  let value = 0;
  const labeledValues = new Map();

  function getLabelKey(labelValues) {
    return JSON.stringify(labelValues);
  }

  return {
    inc(amountOrLabels = 1) {
      if (typeof amountOrLabels === 'number') {
        value += amountOrLabels;
      } else if (typeof amountOrLabels === 'object' && labels.length > 0) {
        const key = getLabelKey(amountOrLabels);
        labeledValues.set(key, (labeledValues.get(key) || 0) + 1);
      } else {
        value += 1;
      }
    },

    get(labelValues) {
      if (labelValues && labels.length > 0) {
        const key = getLabelKey(labelValues);
        return labeledValues.get(key) || 0;
      }
      return value;
    },

    getName() {
      return name;
    },

    getType() {
      return METRIC_TYPES.COUNTER;
    },
  };
}

/**
 * Create a histogram metric
 * @param {string} name - Metric name
 * @param {Object} options - Configuration options
 * @param {Array} options.buckets - Bucket boundaries
 * @returns {Object} Histogram with observe and get methods
 */
export function createHistogram(name, options = {}) {
  const { buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] } = options;
  const observations = [];
  let sum = 0;

  return {
    observe(value) {
      observations.push(value);
      sum += value;
    },

    getCount() {
      return observations.length;
    },

    getSum() {
      return sum;
    },

    getPercentile(percentile) {
      if (observations.length === 0) return 0;

      const sorted = [...observations].sort((a, b) => a - b);
      const index = Math.floor((percentile / 100) * sorted.length);
      return sorted[Math.min(index, sorted.length - 1)];
    },

    getBuckets() {
      const result = {};
      for (const bucket of buckets) {
        result[bucket] = observations.filter((v) => v <= bucket).length;
      }
      return result;
    },

    getName() {
      return name;
    },

    getType() {
      return METRIC_TYPES.HISTOGRAM;
    },
  };
}

/**
 * Create a gauge metric
 * @param {string} name - Metric name
 * @param {Object} options - Configuration options
 * @returns {Object} Gauge with set, inc, dec, and get methods
 */
export function createGauge(name, options = {}) {
  let value = 0;

  return {
    set(newValue) {
      value = newValue;
    },

    inc(amount = 1) {
      value += amount;
    },

    dec(amount = 1) {
      value -= amount;
    },

    get() {
      return value;
    },

    getName() {
      return name;
    },

    getType() {
      return METRIC_TYPES.GAUGE;
    },
  };
}

/**
 * Collect system metrics
 * @param {Object} options - Configuration options
 * @param {boolean} options.cpu - Include CPU metrics
 * @param {boolean} options.memory - Include memory metrics
 * @param {boolean} options.eventLoop - Include event loop metrics
 * @returns {Object} Collected metrics
 */
export async function collectMetrics(options = {}) {
  const { cpu = false, memory = false, eventLoop = false } = options;
  const metrics = {};

  if (cpu) {
    const cpuUsage = process.cpuUsage();
    metrics.cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system,
    };
  }

  if (memory) {
    const memUsage = process.memoryUsage();
    metrics.memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };
  }

  if (eventLoop) {
    // Measure event loop lag
    const start = Date.now();
    await new Promise((resolve) => setImmediate(resolve));
    const lag = Date.now() - start;
    metrics.eventLoop = {
      lag,
    };
  }

  return metrics;
}

/**
 * Format metric in Prometheus format
 * @param {Object} metric - Metric to format
 * @param {string} metric.name - Metric name
 * @param {string} metric.type - Metric type
 * @param {number} metric.value - Metric value (for counter/gauge)
 * @param {Object} metric.buckets - Bucket values (for histogram)
 * @param {number} metric.sum - Sum (for histogram)
 * @param {number} metric.count - Count (for histogram)
 * @param {Object} metric.labels - Labels
 * @returns {string} Prometheus formatted string
 */
export function formatPrometheus(metric) {
  const { name, type, value, buckets, sum, count, labels } = metric;
  const lines = [];

  // Type declaration
  lines.push(`# TYPE ${name} ${type}`);

  // Format labels
  let labelStr = '';
  if (labels && Object.keys(labels).length > 0) {
    const labelParts = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
    labelStr = `{${labelParts.join(',')}}`;
  }

  if (type === 'histogram') {
    // Histogram buckets
    for (const [le, bucketCount] of Object.entries(buckets)) {
      const bucketLabel = labelStr ? labelStr.replace('}', `,le="${le}"}`) : `{le="${le}"}`;
      lines.push(`${name}_bucket${bucketLabel} ${bucketCount}`);
    }
    // Add +Inf bucket
    const infLabel = labelStr ? labelStr.replace('}', ',le="+Inf"}') : '{le="+Inf"}';
    lines.push(`${name}_bucket${infLabel} ${count}`);
    lines.push(`${name}_sum${labelStr} ${sum}`);
    lines.push(`${name}_count${labelStr} ${count}`);
  } else {
    // Counter or Gauge
    lines.push(`${name}${labelStr} ${value}`);
  }

  return lines.join('\n');
}

/**
 * Create a metrics collector
 * @param {Object} options - Configuration options
 * @param {number} options.retentionMs - Retention period in milliseconds
 * @returns {Object} Metrics collector
 */
export function createMetricsCollector(options = {}) {
  const { retentionMs = 3600000 } = options;

  const counters = new Map();
  const histograms = new Map();
  const gauges = new Map();
  const requestMetrics = [];

  // Create default request metrics
  const requestCounter = createCounter('http_requests_total', { labels: ['method', 'path', 'status'] });
  const requestDuration = createHistogram('http_request_duration_seconds');

  return {
    counter(name, opts) {
      if (!counters.has(name)) {
        counters.set(name, createCounter(name, opts));
      }
      return counters.get(name);
    },

    histogram(name, opts) {
      if (!histograms.has(name)) {
        histograms.set(name, createHistogram(name, opts));
      }
      return histograms.get(name);
    },

    gauge(name, opts) {
      if (!gauges.has(name)) {
        gauges.set(name, createGauge(name, opts));
      }
      return gauges.get(name);
    },

    trackRequest({ method, path, status, duration }) {
      requestCounter.inc({ method, path, status: String(status) });
      requestDuration.observe(duration);
      requestMetrics.push({
        method,
        path,
        status,
        duration,
        timestamp: Date.now(),
      });

      // Clean up old metrics based on retention
      const cutoff = Date.now() - retentionMs;
      while (requestMetrics.length > 0 && requestMetrics[0].timestamp < cutoff) {
        requestMetrics.shift();
      }
    },

    collect() {
      return {
        counters: Object.fromEntries(counters),
        histograms: Object.fromEntries(histograms),
        gauges: Object.fromEntries(gauges),
        requests: requestMetrics,
      };
    },

    format() {
      const output = [];

      for (const [name, counter] of counters) {
        output.push(formatPrometheus({
          name,
          type: 'counter',
          value: counter.get(),
        }));
      }

      for (const [name, histogram] of histograms) {
        output.push(formatPrometheus({
          name,
          type: 'histogram',
          buckets: histogram.getBuckets(),
          sum: histogram.getSum(),
          count: histogram.getCount(),
        }));
      }

      for (const [name, gauge] of gauges) {
        output.push(formatPrometheus({
          name,
          type: 'gauge',
          value: gauge.get(),
        }));
      }

      return output.join('\n\n');
    },

    getRetention() {
      return retentionMs;
    },
  };
}
