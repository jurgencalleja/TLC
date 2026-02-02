/**
 * CLI Provider - Provider implementation for CLI tools
 * Phase 33, Task 3
 */

import { spawn } from 'child_process';

export function buildArgs(cliName, prompt, options = {}) {
  const args = [];

  if (options.outputFormat) {
    args.push('--output-format', options.outputFormat);
  }

  if (cliName === 'codex' && options.sandbox) {
    args.push('--sandbox', options.sandbox);
  }

  args.push(prompt);
  return args;
}

export class CLIProvider {
  constructor(config) {
    this.name = config.name;
    this.command = config.command;
    this.headlessArgs = config.headlessArgs || [];
    this.devserverUrl = config.devserverUrl;
    this.timeout = config.timeout || 120000;
    this._spawn = null;
    this._fetch = null;
  }

  async runLocal(prompt, options = {}) {
    const args = [...this.headlessArgs, prompt];

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('CLI timeout'));
      }, this.timeout);

      if (this._spawn) {
        this._spawn(this.command, args)
          .then((result) => {
            clearTimeout(timeoutId);
            resolve(this._parseResult(result));
          })
          .catch((err) => {
            clearTimeout(timeoutId);
            reject(err);
          });
        return;
      }

      let stdout = '';
      let stderr = '';

      const proc = spawn(this.command, args, {
        shell: true,
        timeout: this.timeout,
      });

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve(this._parseResult({ stdout, stderr, exitCode: code }));
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }

  _parseResult(result) {
    const { stdout, exitCode } = result;
    let parsed = null;

    try {
      parsed = JSON.parse(stdout);
    } catch {
      // Not JSON output
    }

    return {
      raw: stdout,
      parsed,
      exitCode: exitCode || 0,
      tokenUsage: { input: 0, output: 0 },
      cost: 0,
    };
  }

  async runViaDevserver(prompt, options = {}) {
    const fetch = this._fetch || globalThis.fetch;

    // Submit task
    const submitRes = await fetch(this.devserverUrl + '/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: this.name,
        prompt,
        options,
      }),
    });

    const { taskId } = await submitRes.json();

    // Poll for result
    while (true) {
      const pollRes = await fetch(this.devserverUrl + '/api/task/' + taskId);
      const task = await pollRes.json();

      if (task.status === 'completed') {
        return {
          raw: JSON.stringify(task.result),
          parsed: task.result,
          exitCode: 0,
          tokenUsage: task.tokenUsage || { input: 0, output: 0 },
          cost: task.cost || 0,
        };
      }

      if (task.status === 'failed') {
        throw new Error(task.error || 'Task failed');
      }

      await new Promise(r => setTimeout(r, 500));
    }
  }
}

export default { CLIProvider, buildArgs };
