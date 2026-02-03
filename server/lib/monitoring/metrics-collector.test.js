/**
 * Metrics Collector Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createCounter,
  createHistogram,
  createGauge,
  collectMetrics,
  formatPrometheus,
  METRIC_TYPES,
  createMetricsCollector,
} from './metrics-collector.js';

describe('metrics-collector', () => {
  describe('METRIC_TYPES', () => {
    it('defines metric type constants', () => {
      expect(METRIC_TYPES.COUNTER).toBe('counter');
      expect(METRIC_TYPES.HISTOGRAM).toBe('histogram');
      expect(METRIC_TYPES.GAUGE).toBe('gauge');
    });
  });

  describe('createCounter', () => {
    it('creates counter with initial value 0', () => {
      const counter = createCounter('http_requests_total');
      expect(counter.get()).toBe(0);
    });

    it('increments counter', () => {
      const counter = createCounter('http_requests_total');
      counter.inc();
      expect(counter.get()).toBe(1);
    });

    it('increments by specific value', () => {
      const counter = createCounter('http_requests_total');
      counter.inc(5);
      expect(counter.get()).toBe(5);
    });

    it('supports labels', () => {
      const counter = createCounter('http_requests_total', { labels: ['method', 'status'] });
      counter.inc({ method: 'GET', status: '200' });
      expect(counter.get({ method: 'GET', status: '200' })).toBe(1);
    });
  });

  describe('createHistogram', () => {
    it('records observations', () => {
      const histogram = createHistogram('http_request_duration_seconds');
      histogram.observe(0.5);
      expect(histogram.getCount()).toBe(1);
    });

    it('calculates percentiles', () => {
      const histogram = createHistogram('http_request_duration_seconds');
      for (let i = 0; i < 100; i++) histogram.observe(i / 100);

      expect(histogram.getPercentile(50)).toBeCloseTo(0.5, 1);
      expect(histogram.getPercentile(95)).toBeCloseTo(0.95, 1);
      expect(histogram.getPercentile(99)).toBeCloseTo(0.99, 1);
    });

    it('tracks sum', () => {
      const histogram = createHistogram('http_request_duration_seconds');
      histogram.observe(1);
      histogram.observe(2);
      expect(histogram.getSum()).toBe(3);
    });
  });

  describe('createGauge', () => {
    it('sets value', () => {
      const gauge = createGauge('memory_usage_bytes');
      gauge.set(1024);
      expect(gauge.get()).toBe(1024);
    });

    it('increments value', () => {
      const gauge = createGauge('active_connections');
      gauge.set(10);
      gauge.inc();
      expect(gauge.get()).toBe(11);
    });

    it('decrements value', () => {
      const gauge = createGauge('active_connections');
      gauge.set(10);
      gauge.dec();
      expect(gauge.get()).toBe(9);
    });
  });

  describe('collectMetrics', () => {
    it('collects CPU usage', async () => {
      const metrics = await collectMetrics({ cpu: true });
      expect(metrics.cpu).toBeDefined();
    });

    it('collects memory usage', async () => {
      const metrics = await collectMetrics({ memory: true });
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.heapUsed).toBeDefined();
    });

    it('collects event loop lag', async () => {
      const metrics = await collectMetrics({ eventLoop: true });
      expect(metrics.eventLoop).toBeDefined();
    });
  });

  describe('formatPrometheus', () => {
    it('formats counter metric', () => {
      const output = formatPrometheus({
        name: 'http_requests_total',
        type: 'counter',
        value: 100,
      });
      expect(output).toContain('# TYPE http_requests_total counter');
      expect(output).toContain('http_requests_total 100');
    });

    it('formats histogram metric', () => {
      const output = formatPrometheus({
        name: 'http_request_duration_seconds',
        type: 'histogram',
        buckets: { 0.1: 10, 0.5: 50, 1: 100 },
        sum: 25,
        count: 100,
      });
      expect(output).toContain('# TYPE http_request_duration_seconds histogram');
      expect(output).toContain('_bucket');
      expect(output).toContain('_sum');
      expect(output).toContain('_count');
    });

    it('includes labels', () => {
      const output = formatPrometheus({
        name: 'http_requests_total',
        type: 'counter',
        value: 100,
        labels: { method: 'GET', status: '200' },
      });
      expect(output).toContain('{method="GET",status="200"}');
    });
  });

  describe('createMetricsCollector', () => {
    it('creates collector with methods', () => {
      const collector = createMetricsCollector();
      expect(collector.counter).toBeDefined();
      expect(collector.histogram).toBeDefined();
      expect(collector.gauge).toBeDefined();
      expect(collector.collect).toBeDefined();
      expect(collector.format).toBeDefined();
    });

    it('tracks request metrics', () => {
      const collector = createMetricsCollector();
      collector.trackRequest({ method: 'GET', path: '/api/users', status: 200, duration: 0.1 });

      const metrics = collector.collect();
      expect(metrics.requests).toBeDefined();
    });

    it('configures retention period', () => {
      const collector = createMetricsCollector({ retentionMs: 3600000 });
      expect(collector.getRetention()).toBe(3600000);
    });
  });
});
