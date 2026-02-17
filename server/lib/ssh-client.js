/**
 * SSH Client — wraps ssh2 for VPS communication
 * Phase 80 Task 4
 */

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

/**
 * Resolve ~ in key paths
 */
function resolveKeyPath(keyPath) {
  if (!keyPath) return null;
  if (keyPath.startsWith('~')) {
    return path.join(require('os').homedir(), keyPath.slice(1));
  }
  return keyPath;
}

/**
 * Create an SSH client wrapper
 * @param {Object} [options]
 * @param {Function} [options._execFn] - Injected exec function (for testing)
 * @returns {Object} SSH client API
 */
function createSshClient(options = {}) {
  const injectedExec = options._execFn;

  /**
   * Execute a command via SSH
   * @param {Object} config - { host, port, username, privateKeyPath }
   * @param {string} command
   * @returns {Promise<{ stdout, stderr, exitCode }>}
   */
  async function exec(config, command) {
    if (injectedExec) {
      return injectedExec(config, command);
    }

    if (!config.host || !config.username) {
      throw new Error('SSH config requires host and username');
    }

    const keyPath = resolveKeyPath(config.privateKeyPath);

    return new Promise((resolve, reject) => {
      const conn = new Client();
      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) { conn.end(); return reject(err); }

          let stdout = '';
          let stderr = '';

          stream.on('data', (data) => { stdout += data.toString(); });
          stream.stderr.on('data', (data) => { stderr += data.toString(); });
          stream.on('close', (code) => {
            conn.end();
            resolve({ stdout, stderr, exitCode: code });
          });
        });
      });
      conn.on('error', (err) => reject(err));

      const connOpts = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
      };
      if (keyPath && fs.existsSync(keyPath)) {
        connOpts.privateKey = fs.readFileSync(keyPath);
      }
      conn.connect(connOpts);
    });
  }

  /**
   * Execute with streaming output
   * @param {Object} config
   * @param {string} command
   * @param {Function} onData - Called with each output chunk
   * @returns {Promise<number>} exit code
   */
  async function execStream(config, command, onData) {
    if (injectedExec) {
      const result = await injectedExec(config, command);
      if (onData && result.stdout) onData(result.stdout);
      return result.exitCode;
    }

    if (!config.host || !config.username) {
      throw new Error('SSH config requires host and username');
    }

    const keyPath = resolveKeyPath(config.privateKeyPath);

    return new Promise((resolve, reject) => {
      const conn = new Client();
      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) { conn.end(); return reject(err); }
          stream.on('data', (data) => onData && onData(data.toString()));
          stream.stderr.on('data', (data) => onData && onData(data.toString()));
          stream.on('close', (code) => { conn.end(); resolve(code); });
        });
      });
      conn.on('error', (err) => reject(err));

      const connOpts = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
      };
      if (keyPath && fs.existsSync(keyPath)) {
        connOpts.privateKey = fs.readFileSync(keyPath);
      }
      conn.connect(connOpts);
    });
  }

  /**
   * Upload a file via SFTP
   * @param {Object} config
   * @param {string} localPath
   * @param {string} remotePath
   */
  async function upload(config, localPath, remotePath) {
    if (!config.host || !config.username) {
      throw new Error('SSH config requires host and username');
    }

    const keyPath = resolveKeyPath(config.privateKeyPath);

    return new Promise((resolve, reject) => {
      const conn = new Client();
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) { conn.end(); return reject(err); }
          sftp.fastPut(localPath, remotePath, (err) => {
            conn.end();
            if (err) reject(err);
            else resolve();
          });
        });
      });
      conn.on('error', (err) => reject(err));

      const connOpts = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
      };
      if (keyPath && fs.existsSync(keyPath)) {
        connOpts.privateKey = fs.readFileSync(keyPath);
      }
      conn.connect(connOpts);
    });
  }

  /**
   * Test SSH connection and gather server info
   * @param {Object} config
   * @returns {Promise<{ connected, os, docker, disk }>}
   */
  async function testConnection(config) {
    const osResult = await exec(config, 'uname -a');
    const dockerResult = await exec(config, 'docker --version 2>/dev/null || echo "not installed"');
    const diskResult = await exec(config, 'df -h / | tail -1');

    return {
      connected: true,
      os: osResult.stdout.trim(),
      docker: dockerResult.stdout.trim(),
      disk: diskResult.stdout.trim(),
    };
  }

  return { exec, execStream, upload, testConnection };
}

module.exports = { createSshClient };
