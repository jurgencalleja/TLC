import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  findOrphanedAgents,
  resetCleanup,
} from './server/lib/agent-cleanup.js';
import { getAgentRegistry, resetRegistry } from './server/lib/agent-registry.js';
import { STATES } from './server/lib/agent-state.js';

describe('debug', () => {
  const BASE_TIME = new Date('2025-01-01T12:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    resetRegistry();
    resetCleanup();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debug test', () => {
    const registry = getAgentRegistry();
    
    console.log('BASE_TIME:', BASE_TIME);
    console.log('Date.now() in test:', Date.now());
    
    const lastActivity = Date.now() - 35 * 60 * 1000;
    console.log('lastActivity:', lastActivity);
    
    const id = registry.registerAgent({
      name: 'stuck-agent',
      model: 'claude-3',
      type: 'worker',
      status: STATES.RUNNING,
      lastActivity: lastActivity,
    });
    
    const agent = registry.getAgent(id);
    console.log('Registered agent:', agent);
    console.log('Agent status:', agent.status);
    console.log('Agent lastActivity:', agent.lastActivity);
    
    const running = registry.listAgents({ status: STATES.RUNNING });
    console.log('Running agents:', running.length);
    
    const orphans = findOrphanedAgents();
    console.log('Orphans found:', orphans.length);

    // Let's see what Date.now() returns inside the filter
    const timeout = 30 * 60 * 1000;
    const now = Date.now();
    console.log('now in test scope:', now);
    console.log('lastActivity:', agent.lastActivity);
    console.log('inactiveTime would be:', now - agent.lastActivity);
    console.log('timeout:', timeout);
    console.log('inactiveTime > timeout:', (now - agent.lastActivity) > timeout);

    expect(orphans).toHaveLength(1);
  });
});
