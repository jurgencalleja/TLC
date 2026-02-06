import { describe, it, expect, vi } from 'vitest';
import {
  createGateRunner,
  runGates,
} from './release-gate.js';

/** Helper: a parsed tag object matching parseTag('v1.0.0-rc.1') shape */
const rcTag = {
  version: '1.0.0-rc.1',
  major: 1,
  minor: 0,
  patch: 0,
  prerelease: 'rc.1',
  tier: 'rc',
  valid: true,
};

/** Helper: minimal release config matching loadReleaseConfig() shape */
const defaultConfig = {
  tagPattern: 'v*',
  tiers: {
    rc: {
      gates: ['tests', 'security', 'coverage', 'qa-approval'],
      coverageThreshold: 80,
      autoPromote: false,
    },
    beta: {
      gates: ['tests', 'security'],
      coverageThreshold: 70,
      autoPromote: false,
    },
  },
};

describe('release-gate', () => {
  describe('tests gate', () => {
    it('passes when all tests pass', async () => {
      const checkers = {
        tests: async () => ({ passed: true, total: 42, failed: 0 }),
      };
      const result = await runGates(rcTag, ['tests'], defaultConfig, { checkers });

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].gate).toBe('tests');
      expect(result.results[0].status).toBe('pass');
    });

    it('fails when tests fail with failure details including count', async () => {
      const checkers = {
        tests: async () => ({ passed: false, total: 42, failed: 3 }),
      };
      const result = await runGates(rcTag, ['tests'], defaultConfig, { checkers });

      expect(result.passed).toBe(false);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].details.failed).toBe(3);
      expect(result.results[0].details.total).toBe(42);
    });
  });

  describe('security gate', () => {
    it('passes when no secrets detected', async () => {
      const checkers = {
        security: async () => ({ passed: true, secrets: [] }),
      };
      const result = await runGates(rcTag, ['security'], defaultConfig, { checkers });

      expect(result.passed).toBe(true);
      expect(result.results[0].gate).toBe('security');
      expect(result.results[0].status).toBe('pass');
    });

    it('fails when secrets detected and returns secret locations', async () => {
      const secrets = [
        { file: 'config.js', line: 10, type: 'AWS_KEY' },
        { file: '.env', line: 2, type: 'DB_PASSWORD' },
      ];
      const checkers = {
        security: async () => ({ passed: false, secrets }),
      };
      const result = await runGates(rcTag, ['security'], defaultConfig, { checkers });

      expect(result.passed).toBe(false);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].details.secrets).toEqual(secrets);
    });
  });

  describe('coverage gate', () => {
    it('passes when above threshold', async () => {
      const checkers = {
        coverage: async () => ({ passed: true, percentage: 85 }),
      };
      const result = await runGates(rcTag, ['coverage'], defaultConfig, { checkers });

      expect(result.passed).toBe(true);
      expect(result.results[0].gate).toBe('coverage');
      expect(result.results[0].status).toBe('pass');
    });

    it('fails below threshold and returns actual vs required', async () => {
      const checkers = {
        coverage: async () => ({ passed: false, percentage: 65 }),
      };
      const result = await runGates(rcTag, ['coverage'], defaultConfig, { checkers });

      expect(result.passed).toBe(false);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].details.percentage).toBe(65);
      expect(result.results[0].details.threshold).toBe(80);
    });
  });

  describe('qa-approval gate', () => {
    it('stays pending until explicit approval', async () => {
      const result = await runGates(rcTag, ['qa-approval'], defaultConfig, {});

      expect(result.passed).toBe(false);
      expect(result.results[0].gate).toBe('qa-approval');
      expect(result.results[0].status).toBe('pending');
      expect(result.results[0].approve).toBeTypeOf('function');
      expect(result.results[0].reject).toBeTypeOf('function');
    });

    it('passes after approve() called', async () => {
      const result = await runGates(rcTag, ['qa-approval'], defaultConfig, {});
      const qaResult = result.results[0];

      qaResult.approve();

      expect(qaResult.status).toBe('pass');
    });

    it('fails after reject() called with reason', async () => {
      const result = await runGates(rcTag, ['qa-approval'], defaultConfig, {});
      const qaResult = result.results[0];

      qaResult.reject('UI regression found on login page');

      expect(qaResult.status).toBe('fail');
      expect(qaResult.details.reason).toBe('UI regression found on login page');
    });
  });

  describe('gate execution order', () => {
    it('gates run in configured order (first gate runs before second)', async () => {
      const order = [];
      const checkers = {
        tests: async () => { order.push('tests'); return { passed: true, total: 10, failed: 0 }; },
        security: async () => { order.push('security'); return { passed: true, secrets: [] }; },
      };
      await runGates(rcTag, ['tests', 'security'], defaultConfig, { checkers });

      expect(order).toEqual(['tests', 'security']);
    });

    it('failed gate blocks subsequent gates (second gate does not run)', async () => {
      const order = [];
      const checkers = {
        tests: async () => { order.push('tests'); return { passed: false, total: 10, failed: 5 }; },
        security: async () => { order.push('security'); return { passed: true, secrets: [] }; },
      };
      const result = await runGates(rcTag, ['tests', 'security'], defaultConfig, { checkers });

      expect(order).toEqual(['tests']);
      expect(result.results).toHaveLength(2);
      expect(result.results[1].status).toBe('skipped');
    });
  });

  describe('gate result structure', () => {
    it('gate results include timing (duration in ms)', async () => {
      const checkers = {
        tests: async () => {
          await new Promise(r => setTimeout(r, 10));
          return { passed: true, total: 1, failed: 0 };
        },
      };
      const result = await runGates(rcTag, ['tests'], defaultConfig, { checkers });

      expect(result.results[0].duration).toBeTypeOf('number');
      expect(result.results[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('gate results include pass/fail status and details object', async () => {
      const checkers = {
        tests: async () => ({ passed: true, total: 5, failed: 0 }),
      };
      const result = await runGates(rcTag, ['tests'], defaultConfig, { checkers });

      const gateResult = result.results[0];
      expect(gateResult).toHaveProperty('gate');
      expect(gateResult).toHaveProperty('status');
      expect(gateResult).toHaveProperty('duration');
      expect(gateResult).toHaveProperty('details');
      expect(typeof gateResult.details).toBe('object');
    });

    it('skipped gates (after failure) marked as skipped not fail', async () => {
      const checkers = {
        tests: async () => ({ passed: false, total: 10, failed: 2 }),
        security: async () => ({ passed: true, secrets: [] }),
        coverage: async () => ({ passed: true, percentage: 90 }),
      };
      const result = await runGates(
        rcTag,
        ['tests', 'security', 'coverage'],
        defaultConfig,
        { checkers },
      );

      expect(result.results[0].status).toBe('fail');
      expect(result.results[1].status).toBe('skipped');
      expect(result.results[2].status).toBe('skipped');
    });
  });

  describe('overall result', () => {
    it('all gates pass returns overall pass', async () => {
      const checkers = {
        tests: async () => ({ passed: true, total: 10, failed: 0 }),
        security: async () => ({ passed: true, secrets: [] }),
      };
      const result = await runGates(rcTag, ['tests', 'security'], defaultConfig, { checkers });

      expect(result.passed).toBe(true);
      expect(result.results.every(r => r.status === 'pass')).toBe(true);
    });

    it('any gate fail returns overall fail with failed gate info', async () => {
      const checkers = {
        tests: async () => ({ passed: false, total: 10, failed: 3 }),
      };
      const result = await runGates(rcTag, ['tests'], defaultConfig, { checkers });

      expect(result.passed).toBe(false);
      const failedGates = result.results.filter(r => r.status === 'fail');
      expect(failedGates).toHaveLength(1);
      expect(failedGates[0].gate).toBe('tests');
    });

    it('empty gates list returns pass immediately', async () => {
      const result = await runGates(rcTag, [], defaultConfig, {});

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it('pending qa-approval gate means overall not passed', async () => {
      const result = await runGates(rcTag, ['qa-approval'], defaultConfig, {});

      expect(result.passed).toBe(false);
    });
  });

  describe('error handling', () => {
    it('unknown gate type returns error result', async () => {
      const result = await runGates(rcTag, ['unknown-gate'], defaultConfig, {});

      expect(result.passed).toBe(false);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].details.error).toMatch(/unknown.*gate/i);
    });
  });

  describe('custom gate implementations', () => {
    it('gate runner accepts custom gate implementations', async () => {
      const checkers = {
        tests: async () => ({ passed: true, total: 1, failed: 0 }),
        'custom-lint': async () => ({ passed: true, warnings: 0 }),
      };
      const result = await runGates(
        rcTag,
        ['tests', 'custom-lint'],
        defaultConfig,
        { checkers },
      );

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[1].gate).toBe('custom-lint');
      expect(result.results[1].status).toBe('pass');
    });

    it('each gate receives tag info and config', async () => {
      let receivedTag = null;
      let receivedConfig = null;
      const checkers = {
        tests: async (tag, config) => {
          receivedTag = tag;
          receivedConfig = config;
          return { passed: true, total: 1, failed: 0 };
        },
      };
      await runGates(rcTag, ['tests'], defaultConfig, { checkers });

      expect(receivedTag).toEqual(rcTag);
      expect(receivedConfig).toEqual(defaultConfig);
    });
  });

  describe('full pipeline integration', () => {
    it('runs all four built-in gates end-to-end when all pass', async () => {
      const checkers = {
        tests: async () => ({ passed: true, total: 50, failed: 0 }),
        security: async () => ({ passed: true, secrets: [] }),
        coverage: async () => ({ passed: true, percentage: 92 }),
      };
      // qa-approval will be pending, so we test a pipeline with tests+security+coverage
      const result = await runGates(
        rcTag,
        ['tests', 'security', 'coverage'],
        defaultConfig,
        { checkers },
      );

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.map(r => r.gate)).toEqual(['tests', 'security', 'coverage']);
      expect(result.results.every(r => r.status === 'pass')).toBe(true);
      expect(result.results.every(r => typeof r.duration === 'number')).toBe(true);
    });
  });

  describe('createGateRunner', () => {
    it('creates a runner instance with run method', () => {
      const runner = createGateRunner(defaultConfig);

      expect(runner).toBeDefined();
      expect(runner.run).toBeTypeOf('function');
    });

    it('runner.run executes gates with bound config', async () => {
      const checkers = {
        tests: async () => ({ passed: true, total: 5, failed: 0 }),
      };
      const runner = createGateRunner(defaultConfig);
      const result = await runner.run(rcTag, ['tests'], { checkers });

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('pass');
    });

    it('runner uses config bound at creation time', async () => {
      const customConfig = {
        ...defaultConfig,
        tiers: {
          rc: { ...defaultConfig.tiers.rc, coverageThreshold: 95 },
        },
      };
      let receivedConfig = null;
      const checkers = {
        coverage: async (tag, config) => {
          receivedConfig = config;
          return { passed: true, percentage: 96 };
        },
      };
      const runner = createGateRunner(customConfig);
      await runner.run(rcTag, ['coverage'], { checkers });

      expect(receivedConfig.tiers.rc.coverageThreshold).toBe(95);
    });
  });
});
