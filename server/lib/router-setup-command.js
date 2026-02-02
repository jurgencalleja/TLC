/**
 * Router Setup Command - Interactive setup for multi-model routing
 * Phase 33, Task 10
 */

import { detectAllCLIs, detectCLI } from './cli-detector.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const PRICING = {
  claude: { inputPer1k: 0.003, outputPer1k: 0.015 },
  codex: { inputPer1k: 0.002, outputPer1k: 0.008 },
  gemini: { inputPer1k: 0.001, outputPer1k: 0.002 },
  deepseek: { inputPer1k: 0.0001, outputPer1k: 0.0002 },
};

export class RouterSetup {
  constructor() {
    this.config = { providers: {}, capabilities: {}, devserver: {} };
    this._detectAllCLIs = detectAllCLIs;
    this._detectCLI = detectCLI;
    this._fetch = globalThis.fetch;
    this._writeFile = null;
  }

  async detectCLIs() {
    return this._detectAllCLIs();
  }

  async testDevserver(url) {
    try {
      const res = await this._fetch(url + '/health');
      return { connected: res.ok };
    } catch {
      return { connected: false };
    }
  }

  formatRoutingTable(providers) {
    const lines = ['Provider     Location'];
    for (const [name, info] of Object.entries(providers)) {
      lines.push(name.padEnd(12) + ' ' + info.location);
    }
    return lines.join('\n');
  }

  estimateCosts(usage) {
    let total = 0;
    for (const [cap, count] of Object.entries(usage)) {
      total += count * 0.01; // Simplified
    }
    return { total, breakdown: usage };
  }

  configureProvider(name, config) {
    this.config.providers[name] = config;
  }

  configureCapability(name, providers) {
    this.config.capabilities[name] = { providers };
  }

  async testProvider(name) {
    const result = await this._detectCLI(name);
    return { available: result.found };
  }

  formatRoutingSummary(config) {
    const lines = [];
    for (const [name, info] of Object.entries(config.providers || {})) {
      lines.push(name + ': ' + info.location);
    }
    return lines.join('\n');
  }

  estimateCostsPerCapability(usage) {
    const costs = {};
    for (const [cap, info] of Object.entries(usage)) {
      costs[cap] = info.count * info.avgTokens * 0.000001;
    }
    return costs;
  }

  async saveConfig() {
    const json = JSON.stringify({ router: this.config }, null, 2);
    if (this._writeFile) {
      await this._writeFile(json);
    } else {
      await writeFile(join(process.cwd(), '.tlc.json'), json);
    }
  }
}

export default { RouterSetup };
