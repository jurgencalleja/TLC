/**
 * Docker API Router — Express routes for Docker management
 * Phase 80 Task 1
 */

const express = require('express');

/**
 * Create Docker API router
 * @param {Object} options
 * @param {Object} options.dockerClient - Docker client instance
 * @returns {express.Router}
 */
function createDockerRouter({ dockerClient }) {
  const router = express.Router();

  // GET /docker/status
  router.get('/status', async (req, res) => {
    try {
      const status = await dockerClient.isAvailable();
      if (!status.available) {
        return res.status(503).json(status);
      }
      res.json(status);
    } catch (err) {
      res.status(503).json({ available: false, error: err.message });
    }
  });

  // GET /docker/containers
  router.get('/containers', async (req, res) => {
    try {
      const all = req.query.all === 'true';
      const containers = await dockerClient.listContainers(all);
      res.json(containers);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /docker/containers/:id
  router.get('/containers/:id', async (req, res) => {
    try {
      const detail = await dockerClient.getContainer(req.params.id);
      res.json(detail);
    } catch (err) {
      const status = err.statusCode === 404 ? 404 : 500;
      res.status(status).json({ error: err.message });
    }
  });

  // POST /docker/containers/:id/start
  router.post('/containers/:id/start', async (req, res) => {
    try {
      await dockerClient.startContainer(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /docker/containers/:id/stop
  router.post('/containers/:id/stop', async (req, res) => {
    try {
      await dockerClient.stopContainer(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /docker/containers/:id/restart
  router.post('/containers/:id/restart', async (req, res) => {
    try {
      await dockerClient.restartContainer(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /docker/containers/:id
  router.delete('/containers/:id', async (req, res) => {
    try {
      const force = req.query.force === 'true';
      await dockerClient.removeContainer(req.params.id, force);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /docker/containers/:id/logs
  router.get('/containers/:id/logs', async (req, res) => {
    try {
      const tail = req.query.tail ? parseInt(req.query.tail, 10) : 100;
      const logs = await dockerClient.getContainerLogs(req.params.id, { tail });
      res.json({ logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /docker/containers/:id/stats
  router.get('/containers/:id/stats', async (req, res) => {
    try {
      const stats = await dockerClient.getContainerStats(req.params.id);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /docker/images
  router.get('/images', async (req, res) => {
    try {
      const images = await dockerClient.listImages();
      res.json(images);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /docker/volumes
  router.get('/volumes', async (req, res) => {
    try {
      const volumes = await dockerClient.listVolumes();
      res.json(volumes);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createDockerRouter };
