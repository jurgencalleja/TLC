/**
 * Provider Executor
 *
 * Actually execute LLM requests through any provider.
 * The bridge between "provider detected" and "review completed."
 * Supports CLI (spawn) and API (HTTP) providers.
 *
 * @module llm/provider-executor
 */

/** Strip ANSI escape codes from output */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Execute a CLI provider by spawning the process
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Execution options
 * @param {string} options.command - CLI command to run
 * @param {string[]} options.args - CLI arguments
 * @param {Function} options.spawn - Spawn function (injectable)
 * @param {number} options.timeout - Timeout in ms
 * @returns {Promise<{response: string}>}
 */
function executeCliProvider(prompt, options = {}) {
  const { command, args = [], spawn, timeout } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer;

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);

      if (code !== 0) {
        reject(new Error('Provider exited with exit code ' + code + ': ' + stderr));
        return;
      }

      resolve({ response: stripAnsi(stdout) });
    });

    // Write prompt to stdin
    proc.stdin.write(prompt);
    proc.stdin.end();

    // Timeout handling
    if (timeout) {
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (proc.kill) proc.kill();
        reject(new Error('CLI provider timeout after ' + timeout + 'ms'));
      }, timeout);
    }
  });
}

/**
 * Execute an API provider via HTTP POST
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Execution options
 * @param {string} options.url - API endpoint URL
 * @param {string} options.model - Model name
 * @param {string} options.apiKey - API key
 * @param {Function} options.fetch - Fetch function (injectable)
 * @param {number} options.timeout - Timeout in ms
 * @returns {Promise<{response: string, model: string, tokens: number}>}
 */
async function executeApiProvider(prompt, options = {}) {
  const { url, model, apiKey, timeout } = options;
  const fetchFn = options.fetch || globalThis.fetch;

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
  };

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = 'Bearer ' + apiKey;
  }

  let fetchPromise = fetchFn(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (timeout) {
    fetchPromise = Promise.race([
      fetchPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API provider timeout after ' + timeout + 'ms')), timeout)
      ),
    ]);
  }

  const resp = await fetchPromise;

  if (!resp.ok) {
    throw new Error('API returned status ' + resp.status);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    response: content,
    model: data.model || model,
    tokens: data.usage?.total_tokens || 0,
  };
}

/**
 * Create a unified executor with injectable dependencies
 * @param {Object} deps - Dependencies
 * @param {Function} deps.spawn - Spawn function
 * @param {Function} deps.fetch - Fetch function
 * @returns {Object} Executor with execute method
 */
function createExecutor(deps = {}) {
  return {
    execute: async (prompt, provider) => {
      const start = Date.now();

      let result;
      if (provider.type === 'api') {
        result = await executeApiProvider(prompt, {
          ...provider,
          fetch: deps.fetch,
        });
      } else {
        result = await executeCliProvider(prompt, {
          ...provider,
          spawn: deps.spawn,
        });
      }

      return {
        response: result.response,
        model: provider.model || provider.command || 'unknown',
        latency: Date.now() - start,
        tokens: result.tokens || 0,
      };
    },
  };
}

module.exports = {
  executeCliProvider,
  executeApiProvider,
  createExecutor,
};
