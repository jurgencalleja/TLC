/**
 * Docker Client — wraps dockerode for Docker socket communication
 * Phase 80 Task 1
 */

const Docker = require('dockerode');

/**
 * Create a Docker client instance
 * @param {Object} options
 * @param {string} [options.socketPath=/var/run/docker.sock] - Docker socket path
 * @param {Object} [options._docker] - Injected Docker instance (for testing)
 * @returns {Object} Docker client API
 */
function createDockerClient(options = {}) {
  const socketPath = options.socketPath || '/var/run/docker.sock';
  const docker = options._docker || new Docker({ socketPath });

  /**
   * Check if Docker daemon is accessible
   */
  async function isAvailable() {
    try {
      await docker.ping();
      const info = await docker.version();
      return { available: true, version: info.Version, apiVersion: info.ApiVersion };
    } catch (err) {
      return { available: false, error: err.message };
    }
  }

  /**
   * List containers
   * @param {boolean} [all=false] - Include stopped containers
   */
  async function listContainers(all = false) {
    const containers = await docker.listContainers({ all });
    return containers.map(c => ({
      id: c.Id,
      name: (c.Names[0] || '').replace(/^\//, ''),
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: (c.Ports || []).map(p => ({
        private: p.PrivatePort,
        public: p.PublicPort,
        type: p.Type,
      })),
      created: c.Created,
      labels: c.Labels || {},
    }));
  }

  /**
   * Get container detail
   * @param {string} id - Container ID or name
   */
  async function getContainer(id) {
    const container = docker.getContainer(id);
    const info = await container.inspect();
    return {
      id: info.Id,
      name: (info.Name || '').replace(/^\//, ''),
      image: info.Config.Image,
      state: info.State.Status,
      startedAt: info.State.StartedAt,
      env: info.Config.Env || [],
      mounts: (info.Mounts || []).map(m => ({
        source: m.Source,
        destination: m.Destination,
        rw: m.RW,
      })),
      networks: info.NetworkSettings.Networks || {},
      ports: info.HostConfig.PortBindings || {},
    };
  }

  /**
   * Start a container
   * @param {string} id - Container ID
   */
  async function startContainer(id) {
    const container = docker.getContainer(id);
    await container.start();
  }

  /**
   * Stop a container
   * @param {string} id - Container ID
   */
  async function stopContainer(id) {
    const container = docker.getContainer(id);
    await container.stop();
  }

  /**
   * Restart a container
   * @param {string} id - Container ID
   */
  async function restartContainer(id) {
    const container = docker.getContainer(id);
    await container.restart();
  }

  /**
   * Remove a container
   * @param {string} id - Container ID
   * @param {boolean} [force=false] - Force removal
   */
  async function removeContainer(id, force = false) {
    const container = docker.getContainer(id);
    await container.remove({ force });
  }

  /**
   * Get container stats snapshot
   * @param {string} id - Container ID
   */
  async function getContainerStats(id) {
    const container = docker.getContainer(id);
    const stats = await container.stats({ stream: false });

    // Calculate CPU %
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

    // Memory
    const cache = (stats.memory_stats.stats && stats.memory_stats.stats.cache) || 0;
    const memoryUsage = stats.memory_stats.usage - cache;
    const memoryLimit = stats.memory_stats.limit;

    // Network
    let networkRx = 0;
    let networkTx = 0;
    if (stats.networks) {
      for (const iface of Object.values(stats.networks)) {
        networkRx += iface.rx_bytes || 0;
        networkTx += iface.tx_bytes || 0;
      }
    }

    return { cpuPercent, memoryUsage, memoryLimit, networkRx, networkTx };
  }

  /**
   * Get container logs
   * @param {string} id - Container ID
   * @param {Object} [opts]
   * @param {number} [opts.tail=100] - Number of lines
   */
  async function getContainerLogs(id, opts = {}) {
    const container = docker.getContainer(id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: opts.tail || 100,
      timestamps: true,
    });
    // logs may be Buffer or string
    return typeof logs === 'string' ? logs : logs.toString('utf8');
  }

  /**
   * Stream container logs (live)
   * @param {string} id - Container ID
   * @param {Function} callback - Called with each log chunk
   * @returns {Function} abort function
   */
  function streamContainerLogs(id, callback) {
    let aborted = false;
    const container = docker.getContainer(id);
    container.logs({ follow: true, stdout: true, stderr: true, tail: 50, timestamps: true })
      .then(stream => {
        if (aborted) { stream.destroy && stream.destroy(); return; }
        stream.on('data', chunk => {
          if (!aborted) callback(chunk.toString('utf8'));
        });
        stream.on('end', () => {});
      })
      .catch(() => {});
    return () => { aborted = true; };
  }

  /**
   * Stream container stats (live)
   * @param {string} id - Container ID
   * @param {Function} callback - Called with each stats update
   * @returns {Function} abort function
   */
  function streamContainerStats(id, callback) {
    let aborted = false;
    const container = docker.getContainer(id);
    container.stats({ stream: true })
      .then(stream => {
        if (aborted) { stream.destroy && stream.destroy(); return; }
        let buffer = '';
        stream.on('data', chunk => {
          if (aborted) { stream.destroy(); return; }
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.trim()) {
              try {
                const stats = JSON.parse(line);
                const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
                const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
                const numCpus = stats.cpu_stats.online_cpus || 1;
                callback({
                  cpuPercent: systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0,
                  memoryUsage: stats.memory_stats.usage || 0,
                  memoryLimit: stats.memory_stats.limit || 0,
                });
              } catch {}
            }
          }
        });
      })
      .catch(() => {});
    return () => { aborted = true; };
  }

  /**
   * List images
   */
  async function listImages() {
    const images = await docker.listImages();
    return images.map(img => ({
      id: img.Id,
      tags: img.RepoTags || [],
      size: img.Size,
      created: img.Created,
    }));
  }

  /**
   * List volumes
   */
  async function listVolumes() {
    const result = await docker.listVolumes();
    return (result.Volumes || []).map(v => ({
      name: v.Name,
      driver: v.Driver,
      mountpoint: v.Mountpoint,
      createdAt: v.CreatedAt,
    }));
  }

  /**
   * Match a container to a TLC project by name or labels
   * @param {Object} container - { name, labels }
   * @param {Array} projects - [{ name, path }]
   * @returns {string|null} matched project name or null
   */
  function matchContainerToProject(container, projects) {
    // Match by compose project label
    const composeProject = container.labels && container.labels['com.docker.compose.project'];
    if (composeProject) {
      const match = projects.find(p => p.name.toLowerCase() === composeProject.toLowerCase());
      if (match) return match.name;
    }

    // Match by container name containing project name
    const cName = (container.name || '').toLowerCase();
    for (const project of projects) {
      const pName = project.name.toLowerCase();
      if (cName.includes(pName)) return project.name;
    }

    return null;
  }

  return {
    isAvailable,
    listContainers,
    getContainer,
    startContainer,
    stopContainer,
    restartContainer,
    removeContainer,
    getContainerStats,
    getContainerLogs,
    streamContainerLogs,
    streamContainerStats,
    listImages,
    listVolumes,
    matchContainerToProject,
  };
}

module.exports = { createDockerClient };
