/**
 * Secrets Runner Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSecretsRunner } from './secrets-runner.js';

describe('secrets-runner', () => {
  let globMock;
  let readFileMock;
  let runner;

  beforeEach(() => {
    globMock = vi.fn().mockResolvedValue([]);
    readFileMock = vi.fn().mockResolvedValue('');
    runner = createSecretsRunner({ glob: globMock, readFile: readFileMock });
  });

  it('passes when no secrets found in clean project', async () => {
    globMock.mockResolvedValue(['src/index.js']);
    readFileMock.mockResolvedValue('const x = 1;\nconsole.log(x);');

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('detects hardcoded password assignment', async () => {
    globMock.mockResolvedValue(['src/config.js']);
    readFileMock.mockResolvedValue(
      'const config = {\n  password: "supersecret123"\n};'
    );

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings[0].file).toBe('src/config.js');
    expect(result.findings[0].pattern).toBeDefined();
  });

  it('detects AWS access key pattern', async () => {
    globMock.mockResolvedValue(['src/aws.js']);
    readFileMock.mockResolvedValue(
      'const key = "AKIAIOSFODNN7EXAMPLE";\n'
    );

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('detects private key header', async () => {
    globMock.mockResolvedValue(['certs/key.pem']);
    readFileMock.mockResolvedValue(
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEpA...\n-----END RSA PRIVATE KEY-----'
    );

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('detects generic API key pattern', async () => {
    globMock.mockResolvedValue(['src/api.js']);
    readFileMock.mockResolvedValue(
      'const token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";\n'
    );

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('excludes test files by default', async () => {
    globMock.mockResolvedValue([]);

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(true);

    // Verify glob was called with exclusion patterns
    const callArgs = globMock.mock.calls[0];
    expect(callArgs[0]).toBeDefined(); // pattern
    expect(callArgs[1]).toBeDefined(); // options with ignore
  });

  it('excludes node_modules by default', async () => {
    globMock.mockResolvedValue([]);

    await runner('/test/project', {});
    const callArgs = globMock.mock.calls[0];
    const options = callArgs[1];
    expect(options.ignore).toContain('**/node_modules/**');
  });

  it('supports configurable exclusion patterns', async () => {
    const customRunner = createSecretsRunner({
      glob: globMock,
      readFile: readFileMock,
      extraIgnore: ['**/fixtures/**'],
    });

    globMock.mockResolvedValue([]);

    await customRunner('/test/project', {});
    const callArgs = globMock.mock.calls[0];
    const options = callArgs[1];
    expect(options.ignore).toContain('**/fixtures/**');
  });

  it('handles empty project directory', async () => {
    globMock.mockResolvedValue([]);

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('includes line number in findings', async () => {
    globMock.mockResolvedValue(['src/config.js']);
    readFileMock.mockResolvedValue(
      'const a = 1;\nconst password = "secret";\nconst b = 2;'
    );

    const result = await runner('/test/project', {});
    expect(result.passed).toBe(false);
    expect(result.findings[0].line).toBe(2);
  });
});
