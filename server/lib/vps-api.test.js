import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { createVpsRouter } = await import('./vps-api.js');

function createMockSshClient() {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    execStream: vi.fn().mockResolvedValue(),
    testConnection: vi.fn().mockResolvedValue({
      connected: true,
      os: 'Linux',
      docker: 'Docker version 24.0.0',
      disk: '42%',
    }),
    upload: vi.fn().mockResolvedValue(),
  };
}

describe('VPS API Router', () => {
  let app;
  let mockSsh;
  let tempDir;
  let vpsJsonPath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vps-api-test-'));
    vpsJsonPath = path.join(tempDir, 'vps.json');
    mockSsh = createMockSshClient();

    const router = createVpsRouter({
      sshClient: mockSsh,
      configDir: tempDir,
    });

    app = express();
    app.use(express.json());
    app.use('/vps', router);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('GET /vps/servers', () => {
    it('returns empty list when no servers registered', async () => {
      const res = await request(app).get('/vps/servers');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns registered servers', async () => {
      fs.writeFileSync(vpsJsonPath, JSON.stringify({
        servers: [{ id: '1', name: 'dev-1', host: '1.2.3.4', port: 22, username: 'deploy' }],
      }));
      const res = await request(app).get('/vps/servers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('dev-1');
    });
  });

  describe('POST /vps/servers', () => {
    it('creates a new server with UUID', async () => {
      const res = await request(app).post('/vps/servers').send({
        name: 'dev-1',
        host: '1.2.3.4',
        port: 22,
        username: 'deploy',
        privateKeyPath: '~/.ssh/id_rsa',
        domain: 'myapp.dev',
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      expect(res.body.name).toBe('dev-1');
      expect(res.body.host).toBe('1.2.3.4');

      // Verify persisted
      const data = JSON.parse(fs.readFileSync(vpsJsonPath, 'utf8'));
      expect(data.servers).toHaveLength(1);
    });

    it('validates required fields', async () => {
      const res = await request(app).post('/vps/servers').send({ name: 'dev-1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });
  });

  describe('GET /vps/servers/:id', () => {
    it('returns server detail', async () => {
      fs.writeFileSync(vpsJsonPath, JSON.stringify({
        servers: [{ id: 'abc', name: 'dev-1', host: '1.2.3.4', port: 22, username: 'deploy' }],
      }));
      const res = await request(app).get('/vps/servers/abc');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('abc');
    });

    it('returns 404 for unknown server', async () => {
      const res = await request(app).get('/vps/servers/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /vps/servers/:id', () => {
    it('updates server config', async () => {
      fs.writeFileSync(vpsJsonPath, JSON.stringify({
        servers: [{ id: 'abc', name: 'dev-1', host: '1.2.3.4', port: 22, username: 'deploy' }],
      }));
      const res = await request(app).put('/vps/servers/abc').send({ name: 'dev-updated' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('dev-updated');

      // Verify persisted
      const data = JSON.parse(fs.readFileSync(vpsJsonPath, 'utf8'));
      expect(data.servers[0].name).toBe('dev-updated');
    });
  });

  describe('DELETE /vps/servers/:id', () => {
    it('removes server', async () => {
      fs.writeFileSync(vpsJsonPath, JSON.stringify({
        servers: [{ id: 'abc', name: 'dev-1', host: '1.2.3.4', port: 22, username: 'deploy' }],
      }));
      const res = await request(app).delete('/vps/servers/abc');
      expect(res.status).toBe(200);

      const data = JSON.parse(fs.readFileSync(vpsJsonPath, 'utf8'));
      expect(data.servers).toHaveLength(0);
    });
  });

  describe('POST /vps/servers/:id/test', () => {
    it('tests SSH connection and returns server info', async () => {
      fs.writeFileSync(vpsJsonPath, JSON.stringify({
        servers: [{
          id: 'abc', name: 'dev-1', host: '1.2.3.4', port: 22,
          username: 'deploy', privateKeyPath: '~/.ssh/id_rsa',
        }],
      }));
      const res = await request(app).post('/vps/servers/abc/test');
      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(mockSsh.testConnection).toHaveBeenCalled();
    });
  });

  describe('POST /vps/servers/:id/assign', () => {
    it('assigns project to server', async () => {
      fs.writeFileSync(vpsJsonPath, JSON.stringify({
        servers: [{
          id: 'abc', name: 'dev-1', host: '1.2.3.4', port: 22,
          username: 'deploy', assignedProjects: [],
        }],
      }));
      const res = await request(app).post('/vps/servers/abc/assign').send({ projectId: 'proj1' });
      expect(res.status).toBe(200);
      expect(res.body.assignedProjects).toContain('proj1');
    });

    it('does not duplicate project assignment', async () => {
      fs.writeFileSync(vpsJsonPath, JSON.stringify({
        servers: [{
          id: 'abc', name: 'dev-1', host: '1.2.3.4', port: 22,
          username: 'deploy', assignedProjects: ['proj1'],
        }],
      }));
      const res = await request(app).post('/vps/servers/abc/assign').send({ projectId: 'proj1' });
      expect(res.status).toBe(200);
      expect(res.body.assignedProjects.filter(p => p === 'proj1')).toHaveLength(1);
    });
  });

  describe('POST /vps/servers/:id/unassign', () => {
    it('removes project from server', async () => {
      fs.writeFileSync(vpsJsonPath, JSON.stringify({
        servers: [{
          id: 'abc', name: 'dev-1', host: '1.2.3.4', port: 22,
          username: 'deploy', assignedProjects: ['proj1', 'proj2'],
        }],
      }));
      const res = await request(app).post('/vps/servers/abc/unassign').send({ projectId: 'proj1' });
      expect(res.status).toBe(200);
      expect(res.body.assignedProjects).not.toContain('proj1');
      expect(res.body.assignedProjects).toContain('proj2');
    });
  });

  describe('GET /vps/pool', () => {
    it('returns only pool servers', async () => {
      fs.writeFileSync(vpsJsonPath, JSON.stringify({
        servers: [
          { id: '1', name: 'shared', host: '1.1.1.1', port: 22, username: 'deploy', pool: true },
          { id: '2', name: 'dedicated', host: '2.2.2.2', port: 22, username: 'deploy', pool: false },
        ],
      }));
      const res = await request(app).get('/vps/pool');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('shared');
    });
  });
});
