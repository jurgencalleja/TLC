/**
 * Memory Hooks Integration Tests - Phase 81 Task 6
 *
 * Tests for createServerMemoryCapture() which wires memory hooks
 * into the TLC server lifecycle so that conversations are automatically
 * captured without user action.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// The function under test — will be created in implementation
import { createServerMemoryCapture } from './memory-hooks.js';

describe('memory-hooks server integration', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-hooks-integration-'));
    // Create minimal memory structure
    fs.mkdirSync(path.join(testDir, '.tlc', 'memory', 'team', 'decisions'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.tlc', 'memory', '.local', 'sessions'), { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('createServerMemoryCapture returns object with expected methods', () => {
    const capture = createServerMemoryCapture({
      projectRoot: testDir,
      observeAndRemember: vi.fn(),
    });

    expect(capture).toHaveProperty('onAssistantResponse');
    expect(capture).toHaveProperty('onTlcCommand');
    expect(typeof capture.onAssistantResponse).toBe('function');
    expect(typeof capture.onTlcCommand).toBe('function');
  });

  it('onAssistantResponse triggers observeAndRemember', async () => {
    const mockObserve = vi.fn();
    const capture = createServerMemoryCapture({
      projectRoot: testDir,
      observeAndRemember: mockObserve,
    });

    await capture.onAssistantResponse('We should use PostgreSQL for better JSON support');

    expect(mockObserve).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledWith(
      testDir,
      expect.objectContaining({ assistant: 'We should use PostgreSQL for better JSON support' })
    );
  });

  it('onTlcCommand triggers capture flush', async () => {
    const mockObserve = vi.fn();
    const capture = createServerMemoryCapture({
      projectRoot: testDir,
      observeAndRemember: mockObserve,
    });

    // Add some responses first
    await capture.onAssistantResponse('first response');
    await capture.onAssistantResponse('second response');

    // TLC command should work without error
    expect(() => capture.onTlcCommand('build')).not.toThrow();
  });

  it('capture failure does not throw', async () => {
    const failingObserve = vi.fn().mockRejectedValue(new Error('Observation failed'));
    const capture = createServerMemoryCapture({
      projectRoot: testDir,
      observeAndRemember: failingObserve,
    });

    // Should not throw despite observer failure
    await expect(
      capture.onAssistantResponse('this will fail to observe')
    ).resolves.not.toThrow();
  });

  it('works when projectRoot has no memory structure', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-empty-'));

    expect(() => createServerMemoryCapture({
      projectRoot: emptyDir,
      observeAndRemember: vi.fn(),
    })).not.toThrow();

    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});
