/**
 * API Provider - Provider implementation for REST API endpoints
 * Phase 33, Task 4
 */

export function calculateCost(tokenUsage, pricing) {
  const inputCost = (tokenUsage.input / 1000) * pricing.inputPer1k;
  const outputCost = (tokenUsage.output / 1000) * pricing.outputPer1k;
  return inputCost + outputCost;
}

export class APIProvider {
  constructor(config) {
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.pricing = config.pricing || { inputPer1k: 0, outputPer1k: 0 };
    this.maxRetries = config.maxRetries || 3;
    this._fetch = null;
  }

  async run(prompt, options = {}) {
    const fetch = this._fetch || globalThis.fetch;
    const url = this.baseUrl + '/v1/chat/completions';

    const body = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
    };

    if (options.outputSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'response',
          schema: options.outputSchema,
        },
      };
    }

    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this.apiKey,
          },
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          // Rate limited, wait and retry
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'API error');
        }

        const data = await response.json();
        return this._parseResponse(data);
      } catch (err) {
        lastError = err;
        if (err.message.includes('network') || err.message.includes('Network')) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  _parseResponse(data) {
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};

    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Not JSON
    }

    const tokenUsage = {
      input: usage.prompt_tokens || 0,
      output: usage.completion_tokens || 0,
    };

    return {
      raw: content,
      parsed,
      exitCode: 0,
      tokenUsage,
      cost: calculateCost(tokenUsage, this.pricing),
    };
  }
}

export default { APIProvider, calculateCost };
