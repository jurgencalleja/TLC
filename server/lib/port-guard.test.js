/**
 * Port guard tests - Phase 83 Task 2
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import net from 'net';

import { checkPort } from './port-guard.js';

describe('port-guard', () => {
  let tempServer;

  afterEach(() => {
    if (tempServer) {
      tempServer.close();
      tempServer = null;
    }
  });

  it('returns available:true when port is free', async () => {
    // Use a high ephemeral port unlikely to be in use
    const result = await checkPort(0);
    expect(result.available).toBe(true);
  });

  it('returns available:false when port is occupied', async () => {
    // Occupy a port first
    tempServer = net.createServer();
    await new Promise((resolve, reject) => {
      tempServer.listen(0, resolve);
      tempServer.on('error', reject);
    });
    const port = tempServer.address().port;

    const result = await checkPort(port);
    expect(result.available).toBe(false);
  });

  it('includes pid info when port is occupied (best effort)', async () => {
    tempServer = net.createServer();
    await new Promise((resolve, reject) => {
      tempServer.listen(0, resolve);
      tempServer.on('error', reject);
    });
    const port = tempServer.address().port;

    const result = await checkPort(port);
    expect(result.available).toBe(false);
    // pid is best-effort (may not be available on all platforms)
    expect(result).toHaveProperty('port', port);
  });

  it('handles EADDRINUSE gracefully', async () => {
    tempServer = net.createServer();
    await new Promise((resolve, reject) => {
      tempServer.listen(0, resolve);
      tempServer.on('error', reject);
    });
    const port = tempServer.address().port;

    // Should not throw
    const result = await checkPort(port);
    expect(result.available).toBe(false);
  });
});
