/**
 * Deploy Engine — deploy projects to VPS via SSH
 * Phase 80 Task 6
 */

const { generateSiteConfig } = require('./nginx-config.js');
const { isValidBranch, isValidRepoUrl, isValidDomain, isValidProjectName } = require('./input-sanitizer.js');

/**
 * Sanitize branch name for DNS/container use
 */
function sanitizeBranch(branch) {
  if (!branch) return 'unknown';
  return branch.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
}

/**
 * Create deploy engine
 * @param {Object} options
 * @param {Object} options.sshClient - SSH client instance
 * @returns {Object} Deploy engine API
 */
function createDeployEngine({ sshClient }) {
  const BASE_PORT = 4000;

  /**
   * Deploy a project to VPS
   */
  async function deploy(sshConfig, project, options = {}, onProgress) {
    const { domain, branch = 'main' } = options;
    if (!isValidProjectName(project.name)) throw new Error(`Invalid project name: ${project.name}`);
    if (!isValidBranch(branch)) throw new Error(`Invalid branch name: ${branch}`);
    if (project.repoUrl && !isValidRepoUrl(project.repoUrl)) throw new Error(`Invalid repo URL: ${project.repoUrl}`);
    if (domain && !isValidDomain(domain)) throw new Error(`Invalid domain: ${domain}`);
    const deployDir = `/opt/deploys/${project.name}`;
    const report = (step, msg) => onProgress && onProgress({ step, message: msg });

    // Step 1: Ensure deploy directory
    report('prepare', 'Creating deploy directory...');
    await sshClient.exec(sshConfig, `mkdir -p ${deployDir}`);

    // Step 2: Clone or pull
    report('git', 'Fetching latest code...');
    const checkGit = await sshClient.exec(sshConfig, `test -d ${deployDir}/.git && echo "exists" || echo "new"`);
    if (checkGit.stdout.trim() === 'exists') {
      await sshClient.exec(sshConfig, `cd ${deployDir} && git fetch origin && git checkout ${branch} && git pull origin ${branch}`);
    } else {
      await sshClient.exec(sshConfig, `git clone ${project.repoUrl} ${deployDir} && cd ${deployDir} && git checkout ${branch}`);
    }

    // Step 3: Docker compose up
    report('docker', 'Starting containers...');
    await sshClient.exec(sshConfig, `cd ${deployDir} && docker compose up -d --build`);

    // Step 4: Nginx config
    if (domain) {
      report('nginx', 'Configuring Nginx...');
      const nginxConf = generateSiteConfig({ domain, port: 3000, proxyPass: 'http://127.0.0.1:3000' });
      await sshClient.exec(sshConfig, `cat > /etc/nginx/sites-available/${project.name} << 'NGINX_EOF'\n${nginxConf}\nNGINX_EOF`);
      await sshClient.exec(sshConfig, `ln -sf /etc/nginx/sites-available/${project.name} /etc/nginx/sites-enabled/`);
      await sshClient.exec(sshConfig, `nginx -t && nginx -s reload`);
    }

    // Step 5: SSL
    if (domain) {
      report('ssl', 'Setting up SSL...');
      await sshClient.exec(sshConfig, `certbot --nginx -d ${domain} --non-interactive --agree-tos --email admin@${domain} 2>/dev/null || true`);
    }

    report('done', 'Deployment complete');
  }

  /**
   * Deploy a branch preview
   */
  async function deployBranch(sshConfig, project, branch, baseDomain, onProgress) {
    if (!isValidProjectName(project.name)) throw new Error(`Invalid project name: ${project.name}`);
    if (!isValidBranch(branch)) throw new Error(`Invalid branch name: ${branch}`);
    if (project.repoUrl && !isValidRepoUrl(project.repoUrl)) throw new Error(`Invalid repo URL: ${project.repoUrl}`);
    if (baseDomain && !isValidDomain(baseDomain)) throw new Error(`Invalid base domain: ${baseDomain}`);
    const sanitized = sanitizeBranch(branch);
    const deployDir = `/opt/deploys/${project.name}/branches/${sanitized}`;
    const containerName = `tlc-${sanitizeBranch(project.name)}-${sanitized}`;
    const report = (step, msg) => onProgress && onProgress({ step, message: msg });

    // Allocate port
    report('prepare', 'Allocating port...');
    let portData = {};
    try {
      const portsResult = await sshClient.exec(sshConfig, `cat /opt/deploys/${project.name}/ports.json 2>/dev/null || echo "{}"`);
      portData = JSON.parse(portsResult.stdout.trim());
    } catch {}
    const usedPorts = Object.values(portData);
    let port = BASE_PORT;
    while (usedPorts.includes(port)) port++;
    portData[sanitized] = port;
    const portJson = Buffer.from(JSON.stringify(portData)).toString('base64');
    await sshClient.exec(sshConfig, `mkdir -p /opt/deploys/${project.name} && echo '${portJson}' | base64 -d > /opt/deploys/${project.name}/ports.json`);

    // Clone branch
    report('git', `Cloning branch ${branch}...`);
    await sshClient.exec(sshConfig, `mkdir -p ${deployDir}`);
    const checkGit = await sshClient.exec(sshConfig, `test -d ${deployDir}/.git && echo "exists" || echo "new"`);
    if (checkGit.stdout.trim() === 'exists') {
      await sshClient.exec(sshConfig, `cd ${deployDir} && git fetch origin && git reset --hard origin/${branch} 2>/dev/null || git checkout -b ${branch} origin/${branch}`);
    } else {
      await sshClient.exec(sshConfig, `git clone -b ${branch} ${project.repoUrl} ${deployDir}`);
    }

    // Docker compose with custom port
    report('docker', 'Starting container...');
    await sshClient.exec(sshConfig, `cd ${deployDir} && APP_PORT=${port} COMPOSE_PROJECT_NAME=${containerName} docker compose up -d --build`);

    // Nginx for subdomain
    report('nginx', `Configuring ${sanitized}.${baseDomain}...`);
    const nginxConf = generateSiteConfig({
      domain: `${sanitized}.${baseDomain}`,
      port,
      proxyPass: `http://127.0.0.1:${port}`,
    });
    await sshClient.exec(sshConfig, `cat > /etc/nginx/sites-available/${containerName} << 'NGINX_EOF'\n${nginxConf}\nNGINX_EOF`);
    await sshClient.exec(sshConfig, `ln -sf /etc/nginx/sites-available/${containerName} /etc/nginx/sites-enabled/`);
    await sshClient.exec(sshConfig, `nginx -t && nginx -s reload`);

    report('done', `Preview at ${sanitized}.${baseDomain}`);
    return { subdomain: `${sanitized}.${baseDomain}`, port, containerName };
  }

  /**
   * Rollback to previous commit
   */
  async function rollback(sshConfig, project, onProgress) {
    const deployDir = `/opt/deploys/${project.name}`;
    const report = (step, msg) => onProgress && onProgress({ step, message: msg });

    report('rollback', 'Rolling back...');
    await sshClient.exec(sshConfig, `cd ${deployDir} && git checkout HEAD~1`);
    await sshClient.exec(sshConfig, `cd ${deployDir} && docker compose up -d --build`);
    report('done', 'Rollback complete');
  }

  /**
   * Clean up a branch preview
   */
  async function cleanupBranch(sshConfig, project, branch) {
    const sanitized = sanitizeBranch(branch);
    const containerName = `tlc-${sanitizeBranch(project.name)}-${sanitized}`;
    const deployDir = `/opt/deploys/${project.name}/branches/${sanitized}`;

    // Stop and remove containers
    await sshClient.exec(sshConfig, `cd ${deployDir} && docker compose down 2>/dev/null; docker stop ${containerName} 2>/dev/null; docker rm ${containerName} 2>/dev/null || true`);

    // Remove nginx config
    await sshClient.exec(sshConfig, `rm -f /etc/nginx/sites-enabled/${containerName} /etc/nginx/sites-available/${containerName}`);
    await sshClient.exec(sshConfig, `nginx -t && nginx -s reload 2>/dev/null || true`);

    // Remove deploy directory
    await sshClient.exec(sshConfig, `rm -rf ${deployDir}`);

    // Remove from port allocation
    try {
      const portsResult = await sshClient.exec(sshConfig, `cat /opt/deploys/${project.name}/ports.json 2>/dev/null || echo "{}"`);
      const portData = JSON.parse(portsResult.stdout.trim());
      delete portData[sanitized];
      const portJson = Buffer.from(JSON.stringify(portData)).toString('base64');
      await sshClient.exec(sshConfig, `echo '${portJson}' | base64 -d > /opt/deploys/${project.name}/ports.json`);
    } catch {}
  }

  /**
   * List active deployments
   */
  async function listDeployments(sshConfig, project) {
    const result = await sshClient.exec(sshConfig, `ls /opt/deploys/${project.name}/branches/ 2>/dev/null || echo ""`);
    const branches = result.stdout.trim().split('\n').filter(Boolean);
    return branches.map(name => ({ branch: name, directory: `/opt/deploys/${project.name}/branches/${name}` }));
  }

  return { deploy, deployBranch, rollback, cleanupBranch, listDeployments, sanitizeBranch };
}

module.exports = { createDeployEngine };
