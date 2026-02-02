import { test, expect } from '@playwright/test';

test.describe('Phase 32: Agent Registry API', () => {
  const baseUrl = process.env.TLC_BASE_URL || 'http://localhost:3147';

  // Helper to create unique agent IDs for test isolation
  const uniqueId = () => `test-agent-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  test.describe('GET /api/agents', () => {
    test('returns empty array when no agents registered', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/agents`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.agents)).toBe(true);
    });

    test('returns agents list with filters', async ({ request }) => {
      // First register an agent
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'filter-test-agent',
          model: 'claude',
          taskType: 'test'
        }
      });

      // Get with status filter
      const response = await request.get(`${baseUrl}/api/agents?status=pending`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.agents)).toBe(true);

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('filters agents by model', async ({ request }) => {
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'model-filter-test',
          model: 'claude-opus',
          taskType: 'test'
        }
      });

      const response = await request.get(`${baseUrl}/api/agents?model=claude-opus`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Should contain our agent
      const found = data.agents.find((a: any) => a.id === agentId);
      expect(found).toBeTruthy();

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });
  });

  test.describe('POST /api/agents', () => {
    test('registers new agent successfully', async ({ request }) => {
      const agentId = uniqueId();
      const response = await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'test-create-agent',
          model: 'claude',
          taskType: 'build'
        }
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent.id).toBe(agentId);
      expect(data.agent.name).toBe('test-create-agent');
      expect(data.agent.state.current).toBe('pending');

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('generates ID if not provided', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/agents`, {
        data: {
          name: 'auto-id-agent',
          model: 'gpt-4',
          taskType: 'test'
        }
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent.id).toBeTruthy();

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${data.agent.id}`);
    });

    test('returns error when name is missing', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/agents`, {
        data: {
          model: 'claude',
          taskType: 'test'
        }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('name');
    });
  });

  test.describe('GET /api/agents/:id', () => {
    test('returns agent by ID', async ({ request }) => {
      // First create an agent
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'get-test-agent',
          model: 'claude',
          taskType: 'test'
        }
      });

      // Get by ID
      const response = await request.get(`${baseUrl}/api/agents/${agentId}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent.id).toBe(agentId);
      expect(data.agent.name).toBe('get-test-agent');

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('returns 404 for non-existent agent', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/agents/non-existent-agent-id`);
      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  test.describe('PATCH /api/agents/:id', () => {
    test('transitions agent state to running', async ({ request }) => {
      // Create agent
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'state-test-agent',
          model: 'claude',
          taskType: 'test'
        }
      });

      // Transition to running
      const response = await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: {
          state: 'running'
        }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent.state.current).toBe('running');

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('transitions running agent to completed', async ({ request }) => {
      // Create and start agent
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'complete-test-agent',
          model: 'claude',
          taskType: 'test'
        }
      });
      await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: { state: 'running' }
      });

      // Complete it
      const response = await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: {
          state: 'completed'
        }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent.state.current).toBe('completed');

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('transitions running agent to failed', async ({ request }) => {
      // Create and start agent
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'fail-test-agent',
          model: 'claude',
          taskType: 'test'
        }
      });
      await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: { state: 'running' }
      });

      // Fail it
      const response = await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: {
          state: 'failed',
          reason: 'Test failure reason'
        }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent.state.current).toBe('failed');

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('transitions running agent to cancelled', async ({ request }) => {
      // Create and start agent
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'cancel-test-agent',
          model: 'claude',
          taskType: 'test'
        }
      });
      await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: { state: 'running' }
      });

      // Cancel it
      const response = await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: {
          state: 'cancelled'
        }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent.state.current).toBe('cancelled');

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('rejects invalid state transition', async ({ request }) => {
      // Create agent (starts in pending)
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'invalid-transition-agent',
          model: 'claude',
          taskType: 'test'
        }
      });

      // Try invalid transition: pending -> completed (should fail)
      const response = await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: {
          state: 'completed'
        }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('updates agent tokens', async ({ request }) => {
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'token-test-agent',
          model: 'claude',
          taskType: 'test'
        }
      });

      const response = await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: {
          tokens: { input: 100, output: 50 }
        }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent.metadata.tokens.input).toBe(100);
      expect(data.agent.metadata.tokens.output).toBe(50);

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('returns 404 for non-existent agent', async ({ request }) => {
      const response = await request.patch(`${baseUrl}/api/agents/non-existent`, {
        data: { state: 'running' }
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('DELETE /api/agents/:id', () => {
    test('removes agent from registry', async ({ request }) => {
      // Create agent
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'delete-test-agent',
          model: 'claude',
          taskType: 'test'
        }
      });

      // Delete it
      const response = await request.delete(`${baseUrl}/api/agents/${agentId}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify it's gone
      const getResponse = await request.get(`${baseUrl}/api/agents/${agentId}`);
      expect(getResponse.status()).toBe(404);
    });

    test('returns 404 for non-existent agent', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/agents/non-existent`);
      expect(response.status()).toBe(404);
    });
  });

  test.describe('GET /api/agents-stats', () => {
    test('returns aggregate statistics', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/agents-stats`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.stats.total).toBe('number');
      expect(typeof data.stats.byStatus).toBe('object');
      expect(typeof data.stats.byModel).toBe('object');
    });

    test('stats reflect registered agents', async ({ request }) => {
      // Get initial stats
      const initialResponse = await request.get(`${baseUrl}/api/agents-stats`);
      const initialStats = await initialResponse.json();
      const initialTotal = initialStats.stats.total;

      // Register an agent
      const agentId = uniqueId();
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'stats-test-agent',
          model: 'claude',
          taskType: 'test'
        }
      });

      // Check updated stats - total should increase (may be more than +1 due to parallel tests)
      const response = await request.get(`${baseUrl}/api/agents-stats`);
      const data = await response.json();
      expect(data.stats.total).toBeGreaterThanOrEqual(initialTotal + 1);

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });
  });

  test.describe('Agent Lifecycle Integration', () => {
    test('full agent lifecycle: create -> start -> complete', async ({ request }) => {
      const agentId = uniqueId();

      // Create
      const createResponse = await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'lifecycle-agent',
          model: 'claude',
          taskType: 'build'
        }
      });
      expect(createResponse.status()).toBe(201);
      const createData = await createResponse.json();
      expect(createData.agent.state.current).toBe('pending');

      // Start (pending -> running)
      const startResponse = await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: { state: 'running' }
      });
      expect(startResponse.status()).toBe(200);
      const startData = await startResponse.json();
      expect(startData.agent.state.current).toBe('running');

      // Complete (running -> completed)
      const completeResponse = await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: { state: 'completed' }
      });
      expect(completeResponse.status()).toBe(200);
      const completeData = await completeResponse.json();
      expect(completeData.agent.state.current).toBe('completed');

      // Verify state history
      expect(completeData.agent.state.history.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('agent lifecycle with failure: create -> start -> fail', async ({ request }) => {
      const agentId = uniqueId();

      // Create and start
      await request.post(`${baseUrl}/api/agents`, {
        data: {
          id: agentId,
          name: 'failure-lifecycle-agent',
          model: 'claude',
          taskType: 'build'
        }
      });
      await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: { state: 'running' }
      });

      // Fail with reason
      const failResponse = await request.patch(`${baseUrl}/api/agents/${agentId}`, {
        data: {
          state: 'failed',
          reason: 'Build failed: syntax error in module'
        }
      });
      expect(failResponse.status()).toBe(200);
      const failData = await failResponse.json();
      expect(failData.agent.state.current).toBe('failed');

      // Cleanup
      await request.delete(`${baseUrl}/api/agents/${agentId}`);
    });

    test('multiple concurrent agents', async ({ request }) => {
      const agents = [
        { id: uniqueId(), name: 'concurrent-1', model: 'claude' },
        { id: uniqueId(), name: 'concurrent-2', model: 'gpt-4' },
        { id: uniqueId(), name: 'concurrent-3', model: 'claude' }
      ];

      // Create all agents
      await Promise.all(agents.map(agent =>
        request.post(`${baseUrl}/api/agents`, {
          data: { ...agent, taskType: 'test' }
        })
      ));

      // Start some, leave others pending
      await request.patch(`${baseUrl}/api/agents/${agents[0].id}`, {
        data: { state: 'running' }
      });
      await request.patch(`${baseUrl}/api/agents/${agents[1].id}`, {
        data: { state: 'running' }
      });

      // Complete one
      await request.patch(`${baseUrl}/api/agents/${agents[0].id}`, {
        data: { state: 'completed' }
      });

      // Check stats reflect correct state distribution
      const statsResponse = await request.get(`${baseUrl}/api/agents-stats`);
      const stats = await statsResponse.json();

      // Should have various statuses
      expect(stats.stats.byStatus.pending).toBeGreaterThanOrEqual(1);
      expect(stats.stats.byStatus.running).toBeGreaterThanOrEqual(1);
      expect(stats.stats.byStatus.completed).toBeGreaterThanOrEqual(1);

      // Cleanup
      await Promise.all(agents.map(agent =>
        request.delete(`${baseUrl}/api/agents/${agent.id}`)
      ));
    });
  });
});
