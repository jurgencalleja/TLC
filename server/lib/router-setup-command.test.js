import { describe, it, expect, vi } from 'vitest';
import { RouterSetup } from './router-setup-command.js';

describe('Router Setup Command', () => {
  it('detects local CLIs', async () => {
    const setup = new RouterSetup();
    setup._detectAllCLIs = vi.fn().mockResolvedValue({ claude: { found: true }, codex: { found: false } });
    
    const result = await setup.detectCLIs();
    
    expect(result.claude.found).toBe(true);
  });

  it('tests devserver connection', async () => {
    const setup = new RouterSetup();
    setup._fetch = vi.fn().mockResolvedValue({ ok: true });
    
    const result = await setup.testDevserver('https://dev.example.com');
    
    expect(result.connected).toBe(true);
  });

  it('shows routing table', async () => {
    const setup = new RouterSetup();
    const table = setup.formatRoutingTable({
      claude: { location: 'local' },
      deepseek: { location: 'devserver' },
    });
    
    expect(table).toContain('claude');
    expect(table).toContain('local');
  });

  it('shows cost estimate', () => {
    const setup = new RouterSetup();
    const estimate = setup.estimateCosts({ review: 10, 'code-gen': 5 });
    
    expect(estimate).toHaveProperty('total');
  });

  it('configures provider', () => {
    const setup = new RouterSetup();
    setup.config = { providers: {} };
    
    setup.configureProvider('test', { type: 'cli', command: 'test' });
    
    expect(setup.config.providers.test).toBeDefined();
  });

  it('configures capability', () => {
    const setup = new RouterSetup();
    setup.config = { capabilities: {} };
    
    setup.configureCapability('review', ['claude', 'codex']);
    
    expect(setup.config.capabilities.review.providers).toHaveLength(2);
  });

  it('validates provider connectivity', async () => {
    const setup = new RouterSetup();
    setup._detectCLI = vi.fn().mockResolvedValue({ found: true });
    
    const result = await setup.testProvider('claude');
    
    expect(result.available).toBe(true);
  });

  it('formats routing summary', () => {
    const setup = new RouterSetup();
    const summary = setup.formatRoutingSummary({
      providers: { claude: { location: 'local' }, deepseek: { location: 'devserver' } },
    });
    
    expect(summary).toContain('local');
    expect(summary).toContain('devserver');
  });

  it('estimates costs per capability', () => {
    const setup = new RouterSetup();
    const costs = setup.estimateCostsPerCapability({
      review: { count: 10, avgTokens: 1000 },
    });
    
    expect(costs.review).toBeDefined();
  });

  it('saves config', async () => {
    const setup = new RouterSetup();
    setup._writeFile = vi.fn().mockResolvedValue(undefined);
    setup.config = { providers: {} };
    
    await setup.saveConfig();
    
    expect(setup._writeFile).toHaveBeenCalled();
  });
});
