/**
 * VPS API Router — Express routes for VPS management
 * Phase 80 Task 4
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Read VPS data from disk
 */
function readVpsData(vpsJsonPath) {
  try {
    if (fs.existsSync(vpsJsonPath)) {
      return JSON.parse(fs.readFileSync(vpsJsonPath, 'utf8'));
    }
  } catch {}
  return { servers: [] };
}

/**
 * Write VPS data to disk
 */
function writeVpsData(vpsJsonPath, data) {
  const dir = path.dirname(vpsJsonPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(vpsJsonPath, JSON.stringify(data, null, 2));
}

/**
 * Create VPS API router
 * @param {Object} options
 * @param {Object} options.sshClient - SSH client instance
 * @param {string} options.configDir - Directory for vps.json
 * @returns {express.Router}
 */
function createVpsRouter({ sshClient, configDir }) {
  const router = express.Router();
  const vpsJsonPath = path.join(configDir, 'vps.json');

  // GET /vps/servers
  router.get('/servers', (req, res) => {
    const data = readVpsData(vpsJsonPath);
    res.json(data.servers);
  });

  // POST /vps/servers
  router.post('/servers', (req, res) => {
    const { name, host, port, username, privateKeyPath, domain, provider, pool } = req.body;

    if (!name || !host || !username) {
      return res.status(400).json({ error: 'name, host, and username are required' });
    }

    const server = {
      id: crypto.randomUUID(),
      name,
      host,
      port: port || 22,
      username,
      privateKeyPath: privateKeyPath || '',
      domain: domain || '',
      provider: provider || '',
      pool: pool !== false,
      assignedProjects: [],
      status: 'unknown',
      lastChecked: null,
      bootstrapped: false,
      createdAt: new Date().toISOString(),
    };

    const data = readVpsData(vpsJsonPath);
    data.servers.push(server);
    writeVpsData(vpsJsonPath, data);

    res.status(201).json(server);
  });

  // GET /vps/servers/:id
  router.get('/servers/:id', (req, res) => {
    const data = readVpsData(vpsJsonPath);
    const server = data.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });
    res.json(server);
  });

  // PUT /vps/servers/:id
  router.put('/servers/:id', (req, res) => {
    const data = readVpsData(vpsJsonPath);
    const idx = data.servers.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Server not found' });

    const allowed = ['name', 'host', 'port', 'username', 'privateKeyPath', 'domain', 'provider', 'pool'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        data.servers[idx][key] = req.body[key];
      }
    }
    writeVpsData(vpsJsonPath, data);
    res.json(data.servers[idx]);
  });

  // DELETE /vps/servers/:id
  router.delete('/servers/:id', (req, res) => {
    const data = readVpsData(vpsJsonPath);
    const idx = data.servers.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Server not found' });
    data.servers.splice(idx, 1);
    writeVpsData(vpsJsonPath, data);
    res.json({ ok: true });
  });

  // POST /vps/servers/:id/test
  router.post('/servers/:id/test', async (req, res) => {
    const data = readVpsData(vpsJsonPath);
    const server = data.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    try {
      const info = await sshClient.testConnection({
        host: server.host,
        port: server.port,
        username: server.username,
        privateKeyPath: server.privateKeyPath,
      });

      // Update status
      const idx = data.servers.findIndex(s => s.id === req.params.id);
      data.servers[idx].status = 'online';
      data.servers[idx].lastChecked = new Date().toISOString();
      writeVpsData(vpsJsonPath, data);

      res.json(info);
    } catch (err) {
      res.status(502).json({ connected: false, error: err.message });
    }
  });

  // POST /vps/servers/:id/assign
  router.post('/servers/:id/assign', (req, res) => {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const data = readVpsData(vpsJsonPath);
    const idx = data.servers.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Server not found' });

    if (!data.servers[idx].assignedProjects) data.servers[idx].assignedProjects = [];
    if (!data.servers[idx].assignedProjects.includes(projectId)) {
      data.servers[idx].assignedProjects.push(projectId);
    }
    writeVpsData(vpsJsonPath, data);
    res.json(data.servers[idx]);
  });

  // POST /vps/servers/:id/unassign
  router.post('/servers/:id/unassign', (req, res) => {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const data = readVpsData(vpsJsonPath);
    const idx = data.servers.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Server not found' });

    if (data.servers[idx].assignedProjects) {
      data.servers[idx].assignedProjects = data.servers[idx].assignedProjects.filter(p => p !== projectId);
    }
    writeVpsData(vpsJsonPath, data);
    res.json(data.servers[idx]);
  });

  // GET /vps/pool
  router.get('/pool', (req, res) => {
    const data = readVpsData(vpsJsonPath);
    const pool = data.servers.filter(s => s.pool === true);
    res.json(pool);
  });

  return router;
}

module.exports = { createVpsRouter };
