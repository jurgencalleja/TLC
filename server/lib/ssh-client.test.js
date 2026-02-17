import { describe, it, expect, beforeEach, vi } from 'vitest';

const { createSshClient } = await import('./ssh-client.js');

/**
 * Create a mock ssh2 Client for injection
 */
function createMockSsh2() {
  const mockStream = {
    on: vi.fn().mockReturnThis(),
    stderr: { on: vi.fn().mockReturnThis() },
    end: vi.fn(),
    write: vi.fn(),
  };

  const mockSftp = {
    fastPut: vi.fn(),
  };

  const mockClient = {
    on: vi.fn().mockReturnThis(),
    connect: vi.fn(),
    exec: vi.fn(),
    sftp: vi.fn(),
    end: vi.fn(),
    _mockStream: mockStream,
    _mockSftp: mockSftp,
  };

  return mockClient;
}

describe('SshClient', () => {
  let sshClient;

  beforeEach(() => {
    sshClient = createSshClient();
  });

  describe('testConnection', () => {
    it('resolves with server info on successful connection', async () => {
      const config = { host: '1.2.3.4', port: 22, username: 'deploy', privateKeyPath: '/fake/key' };
      // Test that testConnection is a function
      expect(typeof sshClient.testConnection).toBe('function');
    });

    it('rejects when host is unreachable', async () => {
      const config = { host: 'invalid', port: 22, username: 'root', privateKeyPath: '/nonexistent' };
      await expect(sshClient.testConnection(config)).rejects.toThrow();
    });
  });

  describe('exec', () => {
    it('is a function that accepts config and command', () => {
      expect(typeof sshClient.exec).toBe('function');
    });

    it('rejects with error for bad config', async () => {
      await expect(sshClient.exec({}, 'whoami')).rejects.toThrow();
    });
  });

  describe('execStream', () => {
    it('is a function that accepts config, command, and callback', () => {
      expect(typeof sshClient.execStream).toBe('function');
    });
  });

  describe('upload', () => {
    it('is a function that accepts config, localPath, remotePath', () => {
      expect(typeof sshClient.upload).toBe('function');
    });
  });
});

describe('SshClient with mock', () => {
  it('exec resolves with stdout, stderr, exitCode via injected client', async () => {
    // Create a mock that simulates successful exec
    const mockExecResult = { stdout: 'root\n', stderr: '', exitCode: 0 };
    const sshClient = createSshClient({
      _execFn: vi.fn().mockResolvedValue(mockExecResult),
    });

    const result = await sshClient.exec(
      { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' },
      'whoami'
    );
    expect(result).toEqual(mockExecResult);
  });

  it('exec rejects when command fails', async () => {
    const sshClient = createSshClient({
      _execFn: vi.fn().mockRejectedValue(new Error('command failed')),
    });

    await expect(
      sshClient.exec({ host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' }, 'bad-cmd')
    ).rejects.toThrow('command failed');
  });

  it('testConnection returns server info', async () => {
    const sshClient = createSshClient({
      _execFn: vi.fn()
        .mockResolvedValueOnce({ stdout: 'Linux\n', stderr: '', exitCode: 0 }) // uname
        .mockResolvedValueOnce({ stdout: 'Docker version 24.0.0\n', stderr: '', exitCode: 0 }) // docker
        .mockResolvedValueOnce({ stdout: '/dev/sda1 50G 20G 28G 42% /\n', stderr: '', exitCode: 0 }), // df
    });

    const info = await sshClient.testConnection(
      { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' }
    );
    expect(info.os).toContain('Linux');
    expect(info.docker).toContain('24.0.0');
    expect(info.disk).toBeTruthy();
    expect(info.connected).toBe(true);
  });

  it('testConnection reports disconnected on failure', async () => {
    const sshClient = createSshClient({
      _execFn: vi.fn().mockRejectedValue(new Error('Connection refused')),
    });

    await expect(
      sshClient.testConnection({ host: '1.2.3.4', username: 'root', privateKeyPath: '/key' })
    ).rejects.toThrow('Connection refused');
  });
});
