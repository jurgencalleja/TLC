import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { AgentProgressMonitor } = await import('./agent-progress-monitor.js');

describe('AgentProgressMonitor', () => {
  let tempDir;
  let monitor;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-monitor-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeAgentOutput(agentId, lines) {
    const outputPath = path.join(tempDir, `${agentId}.output`);
    const content = lines.map(line => JSON.stringify(line)).join('\n');
    fs.writeFileSync(outputPath, content);
    return outputPath;
  }

  describe('parsing agent output', () => {
    it('extracts agent description from initial message', () => {
      const outputPath = writeAgentOutput('agent1', [
        { type: 'user', message: { content: [{ type: 'text', text: 'Build Task 1: README Generator' }] } },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Starting work...' }] } },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent1');

      expect(status.description).toContain('README Generator');
    });

    it('counts tool uses (turns)', () => {
      const outputPath = writeAgentOutput('agent2', [
        { type: 'assistant', message: { content: [] } },
        { type: 'assistant', message: { content: [] } },
        { type: 'assistant', message: { content: [] } },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent2');

      expect(status.turns).toBe(3);
    });

    it('detects files created from Write tool results', () => {
      const outputPath = writeAgentOutput('agent3', [
        { type: 'tool_result', content: 'File created successfully at: /path/to/file.js' },
        { type: 'tool_result', content: 'File created successfully at: /path/to/file.test.js' },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent3');

      expect(status.filesCreated).toContain('/path/to/file.js');
      expect(status.filesCreated).toContain('/path/to/file.test.js');
    });

    it('detects test results from vitest output', () => {
      const outputPath = writeAgentOutput('agent4', [
        { type: 'tool_result', content: 'Tests  15 passed (15)' },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent4');

      expect(status.testsPassed).toBe(15);
    });

    it('detects failing tests', () => {
      const outputPath = writeAgentOutput('agent5', [
        { type: 'tool_result', content: 'Tests  1 failed | 14 passed (15)' },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent5');

      expect(status.testsFailed).toBe(1);
      expect(status.testsPassed).toBe(14);
    });

    it('detects current action from last assistant message', () => {
      const outputPath = writeAgentOutput('agent6', [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Now implementing the generator...' }] } },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Running tests to verify...' }] } },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent6');

      expect(status.currentAction).toContain('Running tests');
    });

    it('detects commit messages', () => {
      const outputPath = writeAgentOutput('agent7', [
        { type: 'tool_result', content: '[main abc1234] feat(27): readme generator (Task 1)' },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent7');

      expect(status.committed).toBe(true);
      expect(status.commitMessage).toContain('readme generator');
    });
  });

  describe('multiple agents', () => {
    it('tracks multiple agents simultaneously', () => {
      writeAgentOutput('agentA', [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Working on Task A' }] } },
      ]);
      writeAgentOutput('agentB', [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Working on Task B' }] } },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const allStatus = monitor.getAllAgentStatus(['agentA', 'agentB']);

      expect(allStatus).toHaveLength(2);
      expect(allStatus[0].agentId).toBe('agentA');
      expect(allStatus[1].agentId).toBe('agentB');
    });
  });

  describe('formatting', () => {
    it('formats status as compact summary', () => {
      const outputPath = writeAgentOutput('agent8', [
        { type: 'user', message: { content: [{ type: 'text', text: 'Build Task 1: README Generator' }] } },
        { type: 'assistant', message: { content: [] } },
        { type: 'assistant', message: { content: [] } },
        { type: 'tool_result', content: 'File created successfully at: /path/to/readme-generator.js' },
        { type: 'tool_result', content: 'Tests  10 passed (10)' },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const summary = monitor.formatStatus('agent8');

      expect(summary).toContain('README Generator');
      expect(summary).toContain('10');
    });

    it('shows phase indicator (writing tests, implementing, committing)', () => {
      const outputPath = writeAgentOutput('agent9', [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Writing failing tests first...' }] } },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent9');

      expect(status.phase).toBe('writing-tests');
    });

    it('detects implementing phase', () => {
      const outputPath = writeAgentOutput('agent10', [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Now implementing the code...' }] } },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent10');

      expect(status.phase).toBe('implementing');
    });

    it('detects committing phase', () => {
      const outputPath = writeAgentOutput('agent11', [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Committing the changes...' }] } },
      ]);

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('agent11');

      expect(status.phase).toBe('committing');
    });
  });

  describe('error handling', () => {
    it('handles missing output file gracefully', () => {
      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('nonexistent');

      expect(status.error).toBe('Output file not found');
    });

    it('handles malformed JSON lines gracefully', () => {
      const outputPath = path.join(tempDir, 'badagent.output');
      fs.writeFileSync(outputPath, 'not json\n{"type":"assistant"}\nalso not json');

      monitor = new AgentProgressMonitor(tempDir);
      const status = monitor.getAgentStatus('badagent');

      // Should not throw, should parse what it can
      expect(status.turns).toBeGreaterThanOrEqual(0);
    });
  });
});
