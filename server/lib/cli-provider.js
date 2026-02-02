/**
 * CLI Provider - Provider implementation for CLI tools
 *
 * Supports running AI CLI tools locally or via devserver:
 * - claude (Claude Code)
 * - codex (Codex CLI)
 * - gemini (Gemini CLI)
 */

import { spawn } from 'child_process';
import { createProvider, PROVIDER_TYPES } from './provider-interface.js';

/**
 * Parse output, trying to extract JSON
 * @param {string} output - Raw output string
 * @returns {Object|null} Parsed JSON or null
 */
export function parseOutput(output) {
  if (!output || output.trim() === '') {
    return null;
  }

  // Try parsing the whole thing as JSON
  try {
    return JSON.parse(output);
  } catch (e) {
    // Try to find JSON in the output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Build command-line arguments for a CLI tool
 * @param {string} command - CLI command name
 * @param {string} prompt - The prompt
 * @param {Object} opts - Options
 * @returns {string[]} Array of arguments
 */
export function buildArgs(command, prompt, opts = {}) {
  const args = [...(opts.headlessArgs || [])];

  // Add the prompt
  args.push(prompt);

  return args;
}

/**
 * Run a CLI tool locally
 * @param {string} command - CLI command
 * @param {string} prompt - The prompt
 * @param {Object} opts - Options
 * @returns {Promise<Object>} ProviderResult
 */
export function runLocal(command, prompt, opts = {}) {
  return new Promise((resolve, reject) => {
    const args = buildArgs(command, prompt, opts);
    const timeout = opts.timeout || 120000;

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(command, args, {
      cwd: opts.cwd,
      env: process.env,
      shell: false,
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      reject(new Error(`CLI timeout after ${timeout}ms`));
    }, timeout);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);

      if (timedOut) return;

      const parsed = parseOutput(stdout);

      resolve({
        raw: stdout,
        parsed,
        exitCode: code || 0,
        stderr,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      if (!timedOut) {
        reject(err);
      }
    });
  });
}

/**
 * Run a CLI tool via devserver
 * @param {Object} params - Parameters
 * @param {string} params.devserverUrl - Devserver URL
 * @param {string} params.provider - Provider name
 * @param {string} params.prompt - The prompt
 * @param {Object} params.opts - Run options
 * @param {number} [params.pollInterval=1000] - Poll interval in ms
 * @param {number} [params.maxPollTime=300000] - Max poll time in ms
 * @returns {Promise<Object>} ProviderResult
 */
export async function runViaDevserver({
  devserverUrl,
  provider,
  prompt,
  opts = {},
  pollInterval = 1000,
  maxPollTime = 300000,
}) {
  // Submit task
  const submitResponse = await fetch(`${devserverUrl}/api/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider,
      prompt,
      opts,
    }),
  });

  if (!submitResponse.ok) {
    throw new Error(`Failed to submit task: ${submitResponse.statusText}`);
  }

  const { taskId } = await submitResponse.json();

  // Poll for result
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollTime) {
    const statusResponse = await fetch(`${devserverUrl}/api/task/${taskId}`);

    if (!statusResponse.ok) {
      throw new Error(`Failed to get task status: ${statusResponse.statusText}`);
    }

    const status = await statusResponse.json();

    if (status.status === 'completed') {
      return status.result;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Task failed');
    }

    // Wait before polling again
    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error('Task timed out waiting for devserver response');
}

/**
 * Create a CLI provider instance
 * @param {Object} config - Provider configuration
 * @returns {Object} Provider instance
 */
export function createCLIProvider(config) {
  const runner = async (prompt, opts) => {
    if (config.detected) {
      return runLocal(config.command, prompt, {
        ...opts,
        headlessArgs: config.headlessArgs,
      });
    }

    if (config.devserverUrl) {
      return runViaDevserver({
        devserverUrl: config.devserverUrl,
        provider: config.name,
        prompt,
        opts,
      });
    }

    throw new Error(`CLI ${config.name} not detected and no devserver configured`);
  };

  return createProvider({
    ...config,
    type: PROVIDER_TYPES.CLI,
    runner,
  });
}
