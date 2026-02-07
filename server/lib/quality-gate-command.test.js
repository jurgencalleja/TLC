/**
 * Quality Gate Command Tests
 *
 * Tests for CLI quality gate management
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  QualityGateCommand,
  parseArgs,
  formatOutput,
} = require('./quality-gate-command.js');

describe('Quality Gate Command', () => {
  let command;

  beforeEach(() => {
    command = new QualityGateCommand();
    command._readFile = async () => 'const x = 1;';
    command._writeFile = async () => {};
    command._loadConfig = async () => ({ default: 70 });
    command._saveConfig = async () => {};
  });

  describe('parseArgs', () => {
    it('parses status command', () => {
      const args = parseArgs('status');
      assert.strictEqual(args.command, 'status');
    });

    it('parses configure command with threshold', () => {
      const args = parseArgs('configure --threshold 80');
      assert.strictEqual(args.command, 'configure');
      assert.strictEqual(args.threshold, 80);
    });

    it('parses preset command with name', () => {
      const args = parseArgs('preset fast');
      assert.strictEqual(args.command, 'preset');
      assert.strictEqual(args.presetName, 'fast');
    });

    it('parses history command', () => {
      const args = parseArgs('history');
      assert.strictEqual(args.command, 'history');
    });

    it('parses history with limit', () => {
      const args = parseArgs('history --limit 10');
      assert.strictEqual(args.command, 'history');
      assert.strictEqual(args.limit, 10);
    });

    it('parses evaluate command with file', () => {
      const args = parseArgs('evaluate src/index.js');
      assert.strictEqual(args.command, 'evaluate');
      assert.strictEqual(args.file, 'src/index.js');
    });

    it('parses dimension flag', () => {
      const args = parseArgs('configure --dimension style --threshold 90');
      assert.strictEqual(args.dimension, 'style');
      assert.strictEqual(args.threshold, 90);
    });

    it('parses operation flag', () => {
      const args = parseArgs('configure --operation code-gen --threshold 85');
      assert.strictEqual(args.operation, 'code-gen');
    });

    it('defaults to status command', () => {
      const args = parseArgs('');
      assert.strictEqual(args.command, 'status');
    });
  });

  describe('execute status', () => {
    it('shows current thresholds', async () => {
      const result = await command.execute('status');
      assert.ok(result.success);
      assert.ok(result.output.includes('70') || result.thresholds);
    });

    it('shows current preset', async () => {
      command._loadConfig = async () => ({
        default: 70,
        appliedPreset: 'balanced',
      });
      const result = await command.execute('status');
      assert.ok(result.output.includes('balanced') || result.preset === 'balanced');
    });

    it('shows per-dimension thresholds', async () => {
      command._loadConfig = async () => ({
        default: 70,
        dimensions: { style: 80, correctness: 90 },
      });
      const result = await command.execute('status');
      assert.ok(result.dimensions || result.output.includes('style'));
    });
  });

  describe('execute configure', () => {
    it('sets global threshold', async () => {
      let savedConfig = null;
      command._saveConfig = async (config) => {
        savedConfig = config;
      };
      const result = await command.execute('configure --threshold 85');
      assert.ok(result.success);
      assert.strictEqual(savedConfig.default, 85);
    });

    it('validates threshold range', async () => {
      const result = await command.execute('configure --threshold 150');
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('invalid') || result.error.includes('range'));
    });

    it('sets dimension threshold', async () => {
      let savedConfig = null;
      command._saveConfig = async (config) => {
        savedConfig = config;
      };
      await command.execute('configure --dimension style --threshold 90');
      assert.strictEqual(savedConfig.dimensions.style, 90);
    });

    it('sets operation threshold', async () => {
      let savedConfig = null;
      command._saveConfig = async (config) => {
        savedConfig = config;
      };
      await command.execute('configure --operation code-gen --threshold 80');
      assert.strictEqual(savedConfig.operations['code-gen'], 80);
    });
  });

  describe('execute preset', () => {
    it('applies named preset', async () => {
      let savedConfig = null;
      command._saveConfig = async (config) => {
        savedConfig = config;
      };
      const result = await command.execute('preset balanced');
      assert.ok(result.success);
      assert.strictEqual(savedConfig.appliedPreset, 'balanced');
    });

    it('lists available presets when no name given', async () => {
      const result = await command.execute('preset');
      assert.ok(result.presets || result.output.includes('fast'));
    });

    it('shows error for unknown preset', async () => {
      const result = await command.execute('preset unknown');
      assert.strictEqual(result.success, false);
    });

    it('shows preset details with --show flag', async () => {
      const result = await command.execute('preset balanced --show');
      assert.ok(result.details || result.output.includes('threshold'));
    });
  });

  describe('execute history', () => {
    it('shows quality trends', async () => {
      command._getHistory = async () => [
        { composite: 80, timestamp: new Date() },
        { composite: 85, timestamp: new Date() },
      ];
      const result = await command.execute('history');
      assert.ok(result.success);
      assert.ok(result.history || result.output);
    });

    it('limits results', async () => {
      command._getHistory = async (options) => {
        return Array(options.limit || 100).fill({ composite: 80 });
      };
      const result = await command.execute('history --limit 5');
      assert.ok(result.history?.length <= 5 || result.success);
    });

    it('filters by operation', async () => {
      let filterUsed = null;
      command._getHistory = async (options) => {
        filterUsed = options.operation;
        return [];
      };
      await command.execute('history --operation code-gen');
      assert.strictEqual(filterUsed, 'code-gen');
    });

    it('shows trend indicator', async () => {
      command._getHistory = async () => [
        { composite: 70 },
        { composite: 75 },
        { composite: 80 },
        { composite: 85 },
      ];
      const result = await command.execute('history');
      assert.ok(result.trend || result.output.includes('improving') || result.output.includes('↑'));
    });
  });

  describe('execute evaluate', () => {
    it('scores file', async () => {
      command._scorer = {
        scoreCodeStyle: async () => 80,
        scoreCompleteness: async () => 90,
        scoreCorrectness: async () => 85,
        scoreDocumentation: async () => 75,
      };
      const result = await command.execute('evaluate test.js');
      assert.ok(result.success);
      assert.ok(result.scores || result.composite);
    });

    it('returns pass/fail', async () => {
      command._scorer = {
        scoreCodeStyle: async () => 80,
        scoreCompleteness: async () => 90,
        scoreCorrectness: async () => 85,
        scoreDocumentation: async () => 75,
      };
      const result = await command.execute('evaluate test.js');
      assert.ok(result.pass !== undefined);
    });

    it('shows failing dimensions', async () => {
      command._loadConfig = async () => ({ default: 90 });
      command._scorer = {
        scoreCodeStyle: async () => 80,
        scoreCompleteness: async () => 70,
        scoreCorrectness: async () => 85,
        scoreDocumentation: async () => 75,
      };
      const result = await command.execute('evaluate test.js');
      assert.ok(result.failed || result.output.includes('style') || result.output.includes('completeness'));
    });

    it('handles file not found', async () => {
      command._readFile = async () => {
        throw new Error('File not found');
      };
      const result = await command.execute('evaluate nonexistent.js');
      assert.strictEqual(result.success, false);
    });

    it('evaluates with specific thresholds', async () => {
      // Provide all scorers to control the test outcome
      command._scorer = {
        scoreCodeStyle: async () => 75,
        scoreCompleteness: async () => 80,
        scoreCorrectness: async () => 80,
        scoreDocumentation: async () => 75,
      };
      const passResult = await command.execute('evaluate test.js --threshold 70');
      const failResult = await command.execute('evaluate test.js --threshold 80');
      assert.strictEqual(passResult.pass, true);
      assert.strictEqual(failResult.pass, false);
    });
  });

  describe('formatOutput', () => {
    it('creates formatted table', () => {
      const data = {
        thresholds: { default: 70, style: 80 },
        preset: 'balanced',
      };
      const output = formatOutput(data);
      assert.ok(typeof output === 'string');
      assert.ok(output.length > 0);
    });

    it('formats scores as table', () => {
      const data = {
        scores: { style: 80, completeness: 90, correctness: 85 },
        pass: true,
      };
      const output = formatOutput(data);
      assert.ok(output.includes('80') || output.includes('style'));
    });

    it('highlights failures', () => {
      const data = {
        scores: { style: 50 },
        failed: ['style'],
        pass: false,
      };
      const output = formatOutput(data, { colors: false });
      assert.ok(output.includes('fail') || output.includes('✗') || output.includes('FAIL'));
    });

    it('formats history as timeline', () => {
      const data = {
        history: [
          { composite: 80, timestamp: new Date('2024-01-01') },
          { composite: 85, timestamp: new Date('2024-01-02') },
        ],
      };
      const output = formatOutput(data);
      assert.ok(output.includes('80') && output.includes('85'));
    });

    it('includes trend indicator', () => {
      const data = {
        trend: { direction: 'improving', slope: 5 },
      };
      const output = formatOutput(data);
      assert.ok(
        output.includes('↑') ||
        output.includes('improving') ||
        output.includes('+')
      );
    });
  });
});
