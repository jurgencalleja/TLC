/**
 * Dependency Runner Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDependencyRunner } from './dependency-runner.js';

describe('dependency-runner', () => {
  let execMock;
  let fsMock;
  let runner;

  beforeEach(() => {
    execMock = vi.fn();
    fsMock = { existsSync: vi.fn().mockReturnValue(true) };
    runner = createDependencyRunner({ exec: execMock, fs: fsMock });
  });

  it('passes when npm audit returns no vulnerabilities', async () => {
    execMock.mockResolvedValue({
      stdout: JSON.stringify({ vulnerabilities: {} }),
      exitCode: 0,
    });

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('fails when npm audit finds high-severity vulnerability', async () => {
    execMock.mockResolvedValue({
      stdout: JSON.stringify({
        vulnerabilities: {
          'bad-pkg': {
            name: 'bad-pkg',
            severity: 'high',
            title: 'Prototype Pollution',
            url: 'https://npmjs.com/advisories/123',
            fixAvailable: true,
          },
        },
      }),
      exitCode: 1,
    });

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('high');
    expect(result.findings[0].package).toBe('bad-pkg');
    expect(result.findings[0].title).toBe('Prototype Pollution');
  });

  it('passes when only low/moderate vulnerabilities found', async () => {
    execMock.mockResolvedValue({
      stdout: JSON.stringify({
        vulnerabilities: {
          'ok-pkg': {
            name: 'ok-pkg',
            severity: 'moderate',
            title: 'ReDoS',
            url: 'https://npmjs.com/advisories/456',
            fixAvailable: true,
          },
        },
      }),
      exitCode: 1,
    });

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(true);
    expect(result.findings).toHaveLength(1);
  });

  it('fails when critical vulnerability found', async () => {
    execMock.mockResolvedValue({
      stdout: JSON.stringify({
        vulnerabilities: {
          'evil-pkg': {
            name: 'evil-pkg',
            severity: 'critical',
            title: 'RCE',
            url: 'https://npmjs.com/advisories/789',
            fixAvailable: false,
          },
        },
      }),
      exitCode: 1,
    });

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(false);
    expect(result.findings[0].severity).toBe('critical');
  });

  it('handles missing package.json', async () => {
    fsMock.existsSync.mockReturnValue(false);

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('handles npm audit JSON parse error', async () => {
    execMock.mockResolvedValue({
      stdout: 'not valid json',
      exitCode: 1,
    });

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles npm audit process error', async () => {
    execMock.mockRejectedValue(new Error('npm not found'));

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(false);
    expect(result.error).toContain('npm not found');
  });

  it('respects configurable severity threshold', async () => {
    execMock.mockResolvedValue({
      stdout: JSON.stringify({
        vulnerabilities: {
          'bad-pkg': {
            name: 'bad-pkg',
            severity: 'high',
            title: 'Prototype Pollution',
            url: 'https://npmjs.com/advisories/123',
            fixAvailable: true,
          },
        },
      }),
      exitCode: 1,
    });

    const lenientRunner = createDependencyRunner({
      exec: execMock,
      fs: fsMock,
      severityThreshold: 'critical',
    });

    const result = await lenientRunner('/test/project', {});
    expect(result.passed).toBe(true);
    expect(result.findings).toHaveLength(1);
  });
});
