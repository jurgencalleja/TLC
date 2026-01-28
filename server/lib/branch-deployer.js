/**
 * Branch Deployer
 * Per-branch Docker deployments with subdomain routing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEPLOYMENT_STATUS = {
  PENDING: 'pending',
  CLONING: 'cloning',
  BUILDING: 'building',
  STARTING: 'starting',
  RUNNING: 'running',
  FAILED: 'failed',
  STOPPED: 'stopped',
};

/**
 * Sanitize branch name for use in container/subdomain names
 * @param {string} branch - Branch name
 * @returns {string} Sanitized name
 */
function sanitizeBranchName(branch) {
  if (!branch) return 'unknown';

  return branch
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63); // DNS label limit
}

/**
 * Generate subdomain for branch
 * @param {string} branch - Branch name
 * @param {string} baseDomain - Base domain
 * @returns {string} Full subdomain
 */
function generateSubdomain(branch, baseDomain) {
  const sanitized = sanitizeBranchName(branch);
  return `${sanitized}.${baseDomain}`;
}

/**
 * Generate container name for branch
 * @param {string} project - Project name
 * @param {string} branch - Branch name
 * @returns {string} Container name
 */
function generateContainerName(project, branch) {
  const sanitizedProject = sanitizeBranchName(project);
  const sanitizedBranch = sanitizeBranchName(branch);
  return `tlc-${sanitizedProject}-${sanitizedBranch}`;
}

/**
 * Generate unique port for branch deployment
 * @param {string} branch - Branch name
 * @param {number} basePort - Base port number
 * @returns {number} Port number
 */
function generatePort(branch, basePort = 10000) {
  // Simple hash to generate consistent port
  let hash = 0;
  for (const char of branch) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash = hash & hash;
  }
  return basePort + (Math.abs(hash) % 10000);
}

/**
 * Execute shell command and return promise
 * @param {string} command - Command to execute
 * @param {Object} options - Spawn options
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const proc = spawn(cmd, args, {
      shell: true,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Clone or update repository
 * @param {Object} options - Clone options
 * @returns {Promise<Object>} Clone result
 */
async function cloneOrUpdateRepo(options = {}) {
  const {
    repoUrl,
    branch,
    targetDir,
    shallow = true,
  } = options;

  if (!repoUrl || !branch || !targetDir) {
    throw new Error('repoUrl, branch, and targetDir are required');
  }

  const exists = fs.existsSync(targetDir);

  if (exists) {
    // Update existing repo
    const fetchResult = await execCommand(
      `git -C "${targetDir}" fetch origin ${branch}`,
      { cwd: targetDir }
    );

    if (fetchResult.code !== 0) {
      return {
        success: false,
        action: 'fetch',
        error: fetchResult.stderr,
      };
    }

    const resetResult = await execCommand(
      `git -C "${targetDir}" reset --hard origin/${branch}`,
      { cwd: targetDir }
    );

    return {
      success: resetResult.code === 0,
      action: 'update',
      error: resetResult.code !== 0 ? resetResult.stderr : null,
    };
  }

  // Clone new repo
  const depthFlag = shallow ? '--depth 1' : '';
  const cloneResult = await execCommand(
    `git clone ${depthFlag} -b ${branch} "${repoUrl}" "${targetDir}"`
  );

  return {
    success: cloneResult.code === 0,
    action: 'clone',
    error: cloneResult.code !== 0 ? cloneResult.stderr : null,
  };
}

/**
 * Build Docker image for branch
 * @param {Object} options - Build options
 * @returns {Promise<Object>} Build result
 */
async function buildDockerImage(options = {}) {
  const {
    projectDir,
    imageName,
    dockerfile = 'Dockerfile',
    buildArgs = {},
  } = options;

  if (!projectDir || !imageName) {
    throw new Error('projectDir and imageName are required');
  }

  const dockerfilePath = path.join(projectDir, dockerfile);

  if (!fs.existsSync(dockerfilePath)) {
    return {
      success: false,
      error: `Dockerfile not found: ${dockerfilePath}`,
    };
  }

  const buildArgsStr = Object.entries(buildArgs)
    .map(([k, v]) => `--build-arg ${k}=${v}`)
    .join(' ');

  const command = `docker build -t ${imageName} -f "${dockerfilePath}" ${buildArgsStr} "${projectDir}"`;
  const result = await execCommand(command);

  return {
    success: result.code === 0,
    imageName,
    output: result.stdout,
    error: result.code !== 0 ? result.stderr : null,
  };
}

/**
 * Start Docker container for branch
 * @param {Object} options - Container options
 * @returns {Promise<Object>} Start result
 */
async function startContainer(options = {}) {
  const {
    imageName,
    containerName,
    port,
    hostPort,
    envVars = {},
    volumes = [],
    network,
    labels = {},
  } = options;

  if (!imageName || !containerName) {
    throw new Error('imageName and containerName are required');
  }

  // Stop and remove existing container if any
  await execCommand(`docker stop ${containerName} 2>/dev/null || true`);
  await execCommand(`docker rm ${containerName} 2>/dev/null || true`);

  // Build docker run command
  const envStr = Object.entries(envVars)
    .map(([k, v]) => `-e ${k}="${v}"`)
    .join(' ');

  const volumeStr = volumes
    .map((v) => `-v ${v}`)
    .join(' ');

  const labelStr = Object.entries(labels)
    .map(([k, v]) => `-l ${k}="${v}"`)
    .join(' ');

  const portMapping = hostPort && port ? `-p ${hostPort}:${port}` : '';
  const networkFlag = network ? `--network ${network}` : '';

  const command = `docker run -d --name ${containerName} ${portMapping} ${envStr} ${volumeStr} ${labelStr} ${networkFlag} ${imageName}`;
  const result = await execCommand(command);

  if (result.code !== 0) {
    return {
      success: false,
      error: result.stderr,
    };
  }

  const containerId = result.stdout.trim();

  return {
    success: true,
    containerId,
    containerName,
    port: hostPort,
  };
}

/**
 * Stop and remove container
 * @param {string} containerName - Container name
 * @returns {Promise<Object>} Stop result
 */
async function stopContainer(containerName) {
  const stopResult = await execCommand(`docker stop ${containerName}`);
  const rmResult = await execCommand(`docker rm ${containerName}`);

  return {
    success: stopResult.code === 0 || rmResult.code === 0,
    stopped: stopResult.code === 0,
    removed: rmResult.code === 0,
  };
}

/**
 * Get container status
 * @param {string} containerName - Container name
 * @returns {Promise<Object>} Container status
 */
async function getContainerStatus(containerName) {
  const result = await execCommand(
    `docker inspect --format '{{.State.Status}}' ${containerName} 2>/dev/null`
  );

  if (result.code !== 0) {
    return {
      exists: false,
      status: DEPLOYMENT_STATUS.STOPPED,
    };
  }

  const status = result.stdout.trim();

  return {
    exists: true,
    status: status === 'running' ? DEPLOYMENT_STATUS.RUNNING : DEPLOYMENT_STATUS.STOPPED,
    dockerStatus: status,
  };
}

/**
 * Get container logs
 * @param {string} containerName - Container name
 * @param {Object} options - Log options
 * @returns {Promise<Object>} Logs
 */
async function getContainerLogs(containerName, options = {}) {
  const { tail = 100, since, timestamps = false } = options;

  let command = `docker logs ${containerName}`;

  if (tail) {
    command += ` --tail ${tail}`;
  }

  if (since) {
    command += ` --since ${since}`;
  }

  if (timestamps) {
    command += ' -t';
  }

  const result = await execCommand(command);

  return {
    success: result.code === 0,
    logs: result.stdout + result.stderr,
    error: result.code !== 0 ? result.stderr : null,
  };
}

/**
 * Generate nginx/caddy config for branch subdomain
 * @param {Object} options - Config options
 * @returns {string} Config content
 */
function generateProxyConfig(options = {}) {
  const {
    type = 'caddy',
    subdomain,
    targetPort,
    ssl = true,
  } = options;

  if (type === 'caddy') {
    return `${subdomain} {
  reverse_proxy localhost:${targetPort}
${ssl ? '  tls internal' : ''}
}`;
  }

  if (type === 'nginx') {
    return `server {
    server_name ${subdomain};

    location / {
        proxy_pass http://localhost:${targetPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}`;
  }

  throw new Error(`Unknown proxy type: ${type}`);
}

/**
 * Create deployment for a branch
 * @param {Object} options - Deployment options
 * @returns {Promise<Object>} Deployment result
 */
async function deployBranch(options = {}) {
  const {
    repoUrl,
    branch,
    project,
    workDir,
    baseDomain,
    basePort = 10000,
    envVars = {},
    onStatusChange,
  } = options;

  const deployment = {
    branch,
    project,
    status: DEPLOYMENT_STATUS.PENDING,
    startedAt: new Date().toISOString(),
    subdomain: null,
    port: null,
    containerName: null,
    error: null,
  };

  const updateStatus = (status, extra = {}) => {
    deployment.status = status;
    Object.assign(deployment, extra);
    if (onStatusChange) {
      onStatusChange(deployment);
    }
  };

  try {
    // Generate names and ports
    const containerName = generateContainerName(project, branch);
    const port = generatePort(branch, basePort);
    const subdomain = baseDomain ? generateSubdomain(branch, baseDomain) : null;
    const targetDir = path.join(workDir, containerName);

    deployment.containerName = containerName;
    deployment.port = port;
    deployment.subdomain = subdomain;

    // Clone/update repo
    updateStatus(DEPLOYMENT_STATUS.CLONING);
    const cloneResult = await cloneOrUpdateRepo({
      repoUrl,
      branch,
      targetDir,
    });

    if (!cloneResult.success) {
      throw new Error(`Clone failed: ${cloneResult.error}`);
    }

    // Build image
    updateStatus(DEPLOYMENT_STATUS.BUILDING);
    const imageName = `${containerName}:latest`;
    const buildResult = await buildDockerImage({
      projectDir: targetDir,
      imageName,
    });

    if (!buildResult.success) {
      throw new Error(`Build failed: ${buildResult.error}`);
    }

    // Start container
    updateStatus(DEPLOYMENT_STATUS.STARTING);
    const startResult = await startContainer({
      imageName,
      containerName,
      port: 3000, // Internal port
      hostPort: port,
      envVars: {
        NODE_ENV: 'production',
        PORT: '3000',
        ...envVars,
      },
      labels: {
        'tlc.project': project,
        'tlc.branch': branch,
        'tlc.managed': 'true',
      },
    });

    if (!startResult.success) {
      throw new Error(`Start failed: ${startResult.error}`);
    }

    updateStatus(DEPLOYMENT_STATUS.RUNNING, {
      containerId: startResult.containerId,
      completedAt: new Date().toISOString(),
    });

    return deployment;
  } catch (error) {
    updateStatus(DEPLOYMENT_STATUS.FAILED, {
      error: error.message,
      failedAt: new Date().toISOString(),
    });

    return deployment;
  }
}

/**
 * List all TLC-managed deployments
 * @returns {Promise<Array>} List of deployments
 */
async function listDeployments() {
  const result = await execCommand(
    `docker ps -a --filter "label=tlc.managed=true" --format '{{json .}}'`
  );

  if (result.code !== 0) {
    return [];
  }

  const lines = result.stdout.trim().split('\n').filter(Boolean);
  const deployments = [];

  for (const line of lines) {
    try {
      const container = JSON.parse(line);
      deployments.push({
        containerId: container.ID,
        containerName: container.Names,
        image: container.Image,
        status: container.State === 'running' ? DEPLOYMENT_STATUS.RUNNING : DEPLOYMENT_STATUS.STOPPED,
        ports: container.Ports,
        created: container.CreatedAt,
      });
    } catch {
      // Skip invalid JSON
    }
  }

  return deployments;
}

/**
 * Remove deployment for branch
 * @param {string} project - Project name
 * @param {string} branch - Branch name
 * @returns {Promise<Object>} Removal result
 */
async function removeDeployment(project, branch) {
  const containerName = generateContainerName(project, branch);

  const stopResult = await stopContainer(containerName);

  // Remove image
  const imageName = `${containerName}:latest`;
  await execCommand(`docker rmi ${imageName} 2>/dev/null || true`);

  return {
    success: stopResult.success,
    containerName,
    removed: stopResult.removed,
  };
}

/**
 * Create branch deployer instance
 * @param {Object} options - Deployer options
 * @returns {Object} Deployer instance
 */
function createBranchDeployer(options = {}) {
  const {
    workDir = '/var/tlc/deployments',
    baseDomain,
    basePort = 10000,
  } = options;

  const deployments = new Map();

  return {
    async deploy(repoUrl, branch, project, envVars = {}) {
      const deployment = await deployBranch({
        repoUrl,
        branch,
        project,
        workDir,
        baseDomain,
        basePort,
        envVars,
        onStatusChange: (d) => {
          deployments.set(d.containerName, d);
        },
      });

      deployments.set(deployment.containerName, deployment);
      return deployment;
    },

    async stop(project, branch) {
      return removeDeployment(project, branch);
    },

    async status(project, branch) {
      const containerName = generateContainerName(project, branch);
      return getContainerStatus(containerName);
    },

    async logs(project, branch, options) {
      const containerName = generateContainerName(project, branch);
      return getContainerLogs(containerName, options);
    },

    async list() {
      return listDeployments();
    },

    getDeployment(project, branch) {
      const containerName = generateContainerName(project, branch);
      return deployments.get(containerName);
    },

    generateSubdomain,
    generateContainerName,
    generatePort,
    DEPLOYMENT_STATUS,
  };
}

module.exports = {
  DEPLOYMENT_STATUS,
  sanitizeBranchName,
  generateSubdomain,
  generateContainerName,
  generatePort,
  execCommand,
  cloneOrUpdateRepo,
  buildDockerImage,
  startContainer,
  stopContainer,
  getContainerStatus,
  getContainerLogs,
  generateProxyConfig,
  deployBranch,
  listDeployments,
  removeDeployment,
  createBranchDeployer,
};
