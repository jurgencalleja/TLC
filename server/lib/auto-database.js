const fs = require('fs');
const path = require('path');
const { execSync, spawn, spawnSync } = require('child_process');

let pgServer = null;
let pgliteInstance = null;
let dockerContainer = null;
let minioContainer = null;

/**
 * Install Docker automatically with sudo prompt
 */
async function installDocker(logger) {
  logger('Docker not found. Installing Docker (requires sudo)...');

  // Detect OS
  let os = 'unknown';
  try {
    if (fs.existsSync('/etc/os-release')) {
      const osRelease = fs.readFileSync('/etc/os-release', 'utf-8');
      if (osRelease.includes('ubuntu') || osRelease.includes('Ubuntu')) os = 'ubuntu';
      else if (osRelease.includes('debian') || osRelease.includes('Debian')) os = 'debian';
      else if (osRelease.includes('fedora')) os = 'fedora';
      else if (osRelease.includes('arch')) os = 'arch';
    }
  } catch (e) {
    // Ignore
  }

  if (os === 'unknown') {
    logger('Could not detect OS. Please install Docker manually: https://docs.docker.com/engine/install/');
    return false;
  }

  logger(`Detected OS: ${os}`);

  // Build install commands based on OS
  let installCommands;
  if (os === 'ubuntu' || os === 'debian') {
    installCommands = [
      'apt-get update',
      'apt-get install -y docker.io',
      `usermod -aG docker ${process.env.USER || process.env.LOGNAME}`,
      'service docker start || systemctl start docker || true'
    ].join(' && ');
  } else if (os === 'fedora') {
    installCommands = [
      'dnf install -y docker',
      `usermod -aG docker ${process.env.USER || process.env.LOGNAME}`,
      'systemctl start docker'
    ].join(' && ');
  } else if (os === 'arch') {
    installCommands = [
      'pacman -S --noconfirm docker',
      `usermod -aG docker ${process.env.USER || process.env.LOGNAME}`,
      'systemctl start docker'
    ].join(' && ');
  } else {
    logger('Unsupported OS for auto-install. Please install Docker manually.');
    return false;
  }

  logger('Running Docker installation (you may be prompted for your password)...');

  return new Promise((resolve) => {
    const child = spawn('sudo', ['bash', '-c', installCommands], {
      stdio: 'inherit'  // This allows password prompt to work
    });

    child.on('exit', (code) => {
      if (code === 0) {
        logger('Docker installed successfully!');

        // Pull postgres image
        logger('Pulling PostgreSQL image...');
        try {
          // Try without sudo first (if user was added to docker group in same session)
          execSync('docker pull postgres:16-alpine', { stdio: 'inherit', timeout: 300000 });
          logger('PostgreSQL image ready');
          resolve(true);
        } catch (e) {
          // Try with sudo
          try {
            execSync('sudo docker pull postgres:16-alpine', { stdio: 'inherit', timeout: 300000 });
            logger('PostgreSQL image ready');
            logger('NOTE: Log out and back in for Docker to work without sudo');
            resolve(true);
          } catch (e2) {
            logger('Failed to pull PostgreSQL image. Will retry on next start.');
            resolve(true); // Still return true since Docker is installed
          }
        }
      } else {
        logger('Docker installation failed. Please install manually: https://docs.docker.com/engine/install/');
        resolve(false);
      }
    });

    child.on('error', (err) => {
      logger(`Installation error: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * Detect if project needs a database
 */
function detectDatabaseNeed(projectDir) {
  // Check package.json for database dependencies
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    // PostgreSQL indicators
    if (allDeps['pg'] || allDeps['postgres'] || allDeps['drizzle-orm'] || allDeps['prisma'] || allDeps['@prisma/client']) {
      return 'postgres';
    }

    // SQLite indicators
    if (allDeps['better-sqlite3'] || allDeps['sqlite3']) {
      return 'sqlite';
    }

    // MySQL indicators
    if (allDeps['mysql2'] || allDeps['mysql']) {
      return 'mysql';
    }
  }

  // Check for DATABASE_URL references in code
  const serverDir = path.join(projectDir, 'server');
  const srcDir = path.join(projectDir, 'src');

  const dirsToCheck = [serverDir, srcDir, projectDir];
  for (const dir of dirsToCheck) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          if (content.includes('DATABASE_URL') || content.includes('drizzle') || content.includes('prisma')) {
            return 'postgres'; // Default to postgres for ORM usage
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }

  return null;
}

/**
 * Detect if project needs S3-compatible storage (MinIO)
 */
function detectStorageNeed(projectDir) {
  // Check package.json for S3/storage dependencies
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    // AWS S3 SDK indicators
    if (allDeps['aws-sdk'] || allDeps['@aws-sdk/client-s3'] || allDeps['@aws-sdk/s3-request-presigner']) {
      return 'minio';
    }

    // MinIO client
    if (allDeps['minio']) {
      return 'minio';
    }

    // Common S3-compatible libraries
    if (allDeps['multer-s3'] || allDeps['s3-blob-store'] || allDeps['@smithy/node-http-handler']) {
      return 'minio';
    }
  }

  // Check for S3/storage environment variable references in code
  const serverDir = path.join(projectDir, 'server');
  const srcDir = path.join(projectDir, 'src');

  const dirsToCheck = [serverDir, srcDir, projectDir];
  for (const dir of dirsToCheck) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          if (content.includes('S3_ENDPOINT') || content.includes('S3_BUCKET') ||
              content.includes('MINIO_ENDPOINT') || content.includes('AWS_S3_') ||
              content.includes('S3Client') || content.includes('new Minio')) {
            return 'minio';
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }

  return null;
}

/**
 * Check if S3/MinIO is already configured
 */
function hasStorageConfig() {
  return !!(process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3);
}

/**
 * Check if DATABASE_URL is already set
 */
function hasDatabaseUrl() {
  return !!process.env.DATABASE_URL;
}

/**
 * Run database migrations directly via PGlite
 * Executes SQL migration files before socket server starts
 */
async function runMigrations(projectDir, pglite, logger) {
  // Check for migrations folder with SQL files
  const migrationsDir = path.join(projectDir, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    logger('No migrations folder found');
    return;
  }

  const sqlFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Sort to run in order (0000_, 0001_, etc.)

  if (sqlFiles.length === 0) {
    logger('No SQL migration files found');
    return;
  }

  logger(`Found ${sqlFiles.length} migration file(s)`);

  // Check if migrations already applied by looking for a known table
  try {
    const result = await pglite.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);

    if (result.rows[0]?.exists) {
      logger('Database schema already exists, skipping migrations');
      return;
    }
  } catch (err) {
    // Table doesn't exist, proceed with migrations
  }

  logger('Running migrations...');

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Split by statement breakpoint marker used by drizzle
    const statements = sql.split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    logger(`Applying ${file} (${statements.length} statements)...`);

    for (const statement of statements) {
      try {
        await pglite.exec(statement);
      } catch (err) {
        // Some errors are expected (like "already exists")
        const errMsg = err && err.message ? err.message : String(err);
        if (!errMsg.includes('already exists') && !errMsg.includes('duplicate')) {
          logger(`Migration warning: ${errMsg.substring(0, 100)}`);
        }
      }
    }
  }

  logger('Migrations complete');
}

/**
 * Check if Docker is available
 */
function isDockerAvailable() {
  try {
    execSync('docker info', { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Docker is installed (even if not running)
 */
function isDockerInstalled() {
  try {
    execSync('which docker', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if running in WSL2 with Docker Desktop
 */
function isDockerDesktopWSL() {
  try {
    // Check if we're in WSL
    if (!fs.existsSync('/proc/version')) return false;
    const procVersion = fs.readFileSync('/proc/version', 'utf-8').toLowerCase();
    if (!procVersion.includes('microsoft') && !procVersion.includes('wsl')) return false;

    // Check if docker CLI points to Docker Desktop (contains 'desktop' in path or version)
    const dockerPath = execSync('which docker', { encoding: 'utf-8' }).trim();
    if (dockerPath.includes('docker-desktop') || dockerPath.includes('/mnt/')) return true;

    // Check docker version output for Desktop indicators
    try {
      const dockerVersion = execSync('docker version --format "{{.Client.Os}}"', { encoding: 'utf-8', timeout: 3000 }).trim();
      return true; // If docker CLI works at all in WSL, it's likely Docker Desktop integration
    } catch {
      return true; // Docker installed in WSL but not responding = likely Docker Desktop not running
    }
  } catch {
    return false;
  }
}

/**
 * Try to start Docker service with sudo
 */
async function startDockerService(logger) {
  // Don't try to start a service if using Docker Desktop in WSL
  if (isDockerDesktopWSL()) {
    logger('Docker Desktop detected in WSL. Please make sure Docker Desktop is running on Windows.');
    logger('Open Docker Desktop from the Windows Start menu, then try again.');
    return false;
  }

  logger('Docker installed but not running. Starting Docker service...');

  return new Promise((resolve) => {
    // Try service command first (works on most systems)
    const child = spawnSync('sudo', ['service', 'docker', 'start'], {
      stdio: 'inherit',
      timeout: 10000
    });

    if (child.status === 0) {
      // Wait a moment for Docker to fully start
      setTimeout(() => {
        if (isDockerAvailable()) {
          logger('Docker service started');
          resolve(true);
        } else {
          logger('Docker service started but not responding yet');
          resolve(false);
        }
      }, 2000);
      return;
    }

    // Try systemctl if service command failed
    const child2 = spawnSync('sudo', ['systemctl', 'start', 'docker'], {
      stdio: 'inherit',
      timeout: 10000
    });

    if (child2.status === 0) {
      setTimeout(() => {
        if (isDockerAvailable()) {
          logger('Docker service started');
          resolve(true);
        } else {
          logger('Docker service started but not responding yet');
          resolve(false);
        }
      }, 2000);
    } else {
      logger('Failed to start Docker service');
      resolve(false);
    }
  });
}

/**
 * Provision PostgreSQL using Docker (more stable than PGlite)
 */
async function provisionDockerPostgres(projectDir, logger) {
  const containerName = 'tlc-postgres';
  const port = 5433;
  const password = 'tlcdev';

  // Check if container already exists and is running
  try {
    const status = execSync(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (status === 'true') {
      logger('Using existing PostgreSQL container');
      const databaseUrl = `postgres://postgres:${password}@127.0.0.1:${port}/postgres`;
      // Run migrations via psql
      await runDockerMigrations(projectDir, containerName, logger);
      return databaseUrl;
    }
  } catch {
    // Container doesn't exist, create it
  }

  // Remove existing stopped container if any
  try {
    execSync(`docker rm -f ${containerName} 2>/dev/null`, { stdio: 'ignore' });
  } catch {
    // Ignore
  }

  logger('Starting PostgreSQL container...');

  // Create data directory for persistence
  const dataDir = path.join(projectDir, '.tlc', 'postgres-data');
  const tlcDir = path.join(projectDir, '.tlc');
  if (!fs.existsSync(tlcDir)) {
    fs.mkdirSync(tlcDir, { recursive: true });
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.tlc')) {
        fs.appendFileSync(gitignorePath, '\n# TLC local data\n.tlc/\n');
      }
    }
  }

  // Start PostgreSQL container
  const dockerCmd = [
    'docker', 'run', '-d',
    '--name', containerName,
    '-e', `POSTGRES_PASSWORD=${password}`,
    '-p', `${port}:5432`,
    '-v', `${dataDir}:/var/lib/postgresql/data`,
    'postgres:16-alpine'
  ].join(' ');

  execSync(dockerCmd, { stdio: 'inherit' });
  dockerContainer = containerName;

  // Wait for PostgreSQL to be ready
  logger('Waiting for PostgreSQL to start...');
  for (let i = 0; i < 30; i++) {
    try {
      execSync(`docker exec ${containerName} pg_isready -U postgres`, { stdio: 'ignore', timeout: 2000 });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const databaseUrl = `postgres://postgres:${password}@127.0.0.1:${port}/postgres`;
  logger(`Database ready: 127.0.0.1:${port}`);

  // Run migrations
  await runDockerMigrations(projectDir, containerName, logger);

  return databaseUrl;
}

/**
 * Run migrations via Docker psql
 */
async function runDockerMigrations(projectDir, containerName, logger) {
  const migrationsDir = path.join(projectDir, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const sqlFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) return;

  // Check if tables exist
  try {
    const result = execSync(
      `docker exec ${containerName} psql -U postgres -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"`,
      { encoding: 'utf-8' }
    ).trim();
    if (result === 't') {
      logger('Database schema exists');
      return;
    }
  } catch {
    // Continue with migrations
  }

  logger(`Running ${sqlFiles.length} migration(s)...`);

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Write SQL to temp file and copy to container
    const tempFile = `/tmp/tlc-migration-${Date.now()}.sql`;
    // Remove statement breakpoints for psql
    const cleanSql = sql.replace(/--> statement-breakpoint/g, '');
    fs.writeFileSync(tempFile, cleanSql);

    try {
      execSync(`docker cp ${tempFile} ${containerName}:/tmp/migration.sql`, { stdio: 'ignore' });
      execSync(`docker exec ${containerName} psql -U postgres -f /tmp/migration.sql`, { stdio: 'ignore' });
      logger(`Applied ${file}`);
    } catch (err) {
      logger(`Migration warning in ${file}`);
    }

    fs.unlinkSync(tempFile);
  }

  logger('Migrations complete');
}

/**
 * Provision PostgreSQL using Docker with sudo (for fresh installs)
 */
async function provisionDockerPostgresWithSudo(projectDir, logger) {
  const containerName = 'tlc-postgres';
  const port = 5433;
  const password = 'tlcdev';

  // Check if container already exists and is running
  try {
    const status = execSync(`sudo docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (status === 'true') {
      logger('Using existing PostgreSQL container');
      const databaseUrl = `postgres://postgres:${password}@127.0.0.1:${port}/postgres`;
      await runDockerMigrationsWithSudo(projectDir, containerName, logger);
      return databaseUrl;
    }
  } catch {
    // Container doesn't exist
  }

  // Remove existing stopped container
  try {
    execSync(`sudo docker rm -f ${containerName} 2>/dev/null`, { stdio: 'ignore' });
  } catch {
    // Ignore
  }

  logger('Starting PostgreSQL container...');

  // Create data directory
  const dataDir = path.join(projectDir, '.tlc', 'postgres-data');
  const tlcDir = path.join(projectDir, '.tlc');
  if (!fs.existsSync(tlcDir)) {
    fs.mkdirSync(tlcDir, { recursive: true });
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.tlc')) {
        fs.appendFileSync(gitignorePath, '\n# TLC local data\n.tlc/\n');
      }
    }
  }

  // Start PostgreSQL container with sudo
  execSync(`sudo docker run -d --name ${containerName} -e POSTGRES_PASSWORD=${password} -p ${port}:5432 postgres:16-alpine`, { stdio: 'inherit' });
  dockerContainer = containerName;

  // Wait for PostgreSQL to be ready
  logger('Waiting for PostgreSQL to start...');
  for (let i = 0; i < 30; i++) {
    try {
      execSync(`sudo docker exec ${containerName} pg_isready -U postgres`, { stdio: 'ignore', timeout: 2000 });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const databaseUrl = `postgres://postgres:${password}@127.0.0.1:${port}/postgres`;
  logger(`Database ready: 127.0.0.1:${port}`);

  // Run migrations
  await runDockerMigrationsWithSudo(projectDir, containerName, logger);

  return databaseUrl;
}

/**
 * Run migrations via Docker psql with sudo
 */
async function runDockerMigrationsWithSudo(projectDir, containerName, logger) {
  const migrationsDir = path.join(projectDir, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const sqlFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) return;

  // Check if tables exist
  try {
    const result = execSync(
      `sudo docker exec ${containerName} psql -U postgres -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"`,
      { encoding: 'utf-8' }
    ).trim();
    if (result === 't') {
      logger('Database schema exists');
      return;
    }
  } catch {
    // Continue with migrations
  }

  logger(`Running ${sqlFiles.length} migration(s)...`);

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const tempFile = `/tmp/tlc-migration-${Date.now()}.sql`;
    const cleanSql = sql.replace(/--> statement-breakpoint/g, '');
    fs.writeFileSync(tempFile, cleanSql);

    try {
      execSync(`sudo docker cp ${tempFile} ${containerName}:/tmp/migration.sql`, { stdio: 'ignore' });
      execSync(`sudo docker exec ${containerName} psql -U postgres -f /tmp/migration.sql`, { stdio: 'ignore' });
      logger(`Applied ${file}`);
    } catch (err) {
      logger(`Migration warning in ${file}`);
    }

    fs.unlinkSync(tempFile);
  }

  logger('Migrations complete');
}

/**
 * Provision a local PostgreSQL database using PGlite (fallback)
 */
async function provisionPGlite(projectDir, logger) {
  const dataDir = path.join(projectDir, '.tlc', 'postgres-data');

  // Ensure .tlc directory exists
  const tlcDir = path.join(projectDir, '.tlc');
  if (!fs.existsSync(tlcDir)) {
    fs.mkdirSync(tlcDir, { recursive: true });

    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.tlc')) {
        fs.appendFileSync(gitignorePath, '\n# TLC local data\n.tlc/\n');
      }
    }
  }

  logger('Provisioning PGlite database (note: may be unstable under heavy load)...');

  const port = 5433;

  try {
    const { PGlite } = await import('@electric-sql/pglite');
    const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');

    logger('Creating PGlite database...');
    pgliteInstance = new PGlite(dataDir);
    await pgliteInstance.waitReady;
    logger('Database initialized');

    // Run migrations directly via PGlite BEFORE starting socket server
    await runMigrations(projectDir, pgliteInstance, logger);

    // Start TCP server after migrations complete
    logger(`Starting PostgreSQL server on port ${port}...`);
    pgServer = new PGLiteSocketServer({
      db: pgliteInstance,
      port: port,
      host: '127.0.0.1'
    });
    await pgServer.start();

    const databaseUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    logger(`Database ready: 127.0.0.1:${port}`);

    return databaseUrl;
  } catch (err) {
    const errMsg = err && err.message ? err.message : String(err);
    logger(`Database error: ${errMsg}`);
    throw new Error(`Failed to provision database: ${errMsg}`);
  }
}

/**
 * Provision PostgreSQL - try Docker first, install if needed, fall back to PGlite
 */
async function provisionPostgres(projectDir, logger) {
  // Try Docker first (more stable)
  if (isDockerAvailable()) {
    try {
      return await provisionDockerPostgres(projectDir, logger);
    } catch (err) {
      logger(`Docker PostgreSQL failed: ${err.message}, falling back to PGlite`);
    }
  } else if (isDockerInstalled()) {
    // Docker is installed but not running - try to start it
    const started = await startDockerService(logger);
    if (started) {
      try {
        return await provisionDockerPostgres(projectDir, logger);
      } catch (err) {
        logger(`Docker PostgreSQL failed: ${err.message}, falling back to PGlite`);
      }
    }
  } else {
    // Docker not installed - try to install it
    logger('Docker not found - attempting auto-install...');

    const installed = await installDocker(logger);

    if (installed) {
      // Check if Docker is now available (might need sudo for first use)
      if (isDockerAvailable()) {
        try {
          return await provisionDockerPostgres(projectDir, logger);
        } catch (err) {
          logger(`Docker PostgreSQL failed after install: ${err.message}`);
        }
      } else {
        // Try with sudo docker commands
        logger('Docker installed. Trying with elevated permissions...');
        try {
          return await provisionDockerPostgresWithSudo(projectDir, logger);
        } catch (err) {
          logger(`Docker with sudo failed: ${err.message}`);
        }
      }
    }

    // If Docker install failed or still not working, fall back to PGlite
    logger('Falling back to PGlite (may be unstable under heavy load)');
  }

  // Fall back to PGlite
  return await provisionPGlite(projectDir, logger);
}

/**
 * Provision MinIO using Docker
 */
async function provisionDockerMinio(projectDir, logger) {
  const containerName = 'tlc-minio';
  const apiPort = 9000;
  const consolePort = 9001;
  const accessKey = 'minioadmin';
  const secretKey = 'minioadmin';
  const defaultBucket = 'uploads';

  // Check if container already exists and is running
  try {
    const status = execSync(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (status === 'true') {
      logger('Using existing MinIO container');
      return getMinioEnvVars(apiPort, accessKey, secretKey, defaultBucket);
    }
  } catch {
    // Container doesn't exist, create it
  }

  // Remove existing stopped container if any
  try {
    execSync(`docker rm -f ${containerName} 2>/dev/null`, { stdio: 'ignore' });
  } catch {
    // Ignore
  }

  logger('Starting MinIO container...');

  // Create data directory for persistence
  const dataDir = path.join(projectDir, '.tlc', 'minio-data');
  const tlcDir = path.join(projectDir, '.tlc');
  if (!fs.existsSync(tlcDir)) {
    fs.mkdirSync(tlcDir, { recursive: true });
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.tlc')) {
        fs.appendFileSync(gitignorePath, '\n# TLC local data\n.tlc/\n');
      }
    }
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Start MinIO container
  const dockerCmd = [
    'docker', 'run', '-d',
    '--name', containerName,
    '-e', `MINIO_ROOT_USER=${accessKey}`,
    '-e', `MINIO_ROOT_PASSWORD=${secretKey}`,
    '-p', `${apiPort}:9000`,
    '-p', `${consolePort}:9001`,
    '-v', `${dataDir}:/data`,
    'minio/minio:latest',
    'server', '/data', '--console-address', ':9001'
  ].join(' ');

  execSync(dockerCmd, { stdio: 'inherit' });
  minioContainer = containerName;

  // Wait for MinIO to be ready
  logger('Waiting for MinIO to start...');
  for (let i = 0; i < 30; i++) {
    try {
      execSync(`docker exec ${containerName} curl -sf http://127.0.0.1:9000/minio/health/live`, { stdio: 'ignore', timeout: 2000 });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Create default bucket
  await createMinioBucket(containerName, defaultBucket, logger);

  logger(`MinIO ready: http://127.0.0.1:${apiPort} (console: http://127.0.0.1:${consolePort})`);

  return getMinioEnvVars(apiPort, accessKey, secretKey, defaultBucket);
}

/**
 * Create a bucket in MinIO
 */
async function createMinioBucket(containerName, bucketName, logger, useSudo = false) {
  const sudoPrefix = useSudo ? 'sudo ' : '';
  try {
    // Use mc (MinIO Client) inside the container to create bucket
    execSync(
      `${sudoPrefix}docker exec ${containerName} mc alias set local http://127.0.0.1:9000 minioadmin minioadmin`,
      { stdio: 'ignore', timeout: 5000 }
    );
    execSync(
      `${sudoPrefix}docker exec ${containerName} mc mb --ignore-existing local/${bucketName}`,
      { stdio: 'ignore', timeout: 5000 }
    );
    logger(`Created bucket: ${bucketName}`);
  } catch (err) {
    // Bucket might already exist or mc not available, that's OK
    logger(`Bucket setup: ${bucketName} (may already exist)`);
  }
}

/**
 * Get MinIO environment variables
 */
function getMinioEnvVars(port, accessKey, secretKey, bucket) {
  return {
    S3_ENDPOINT: `http://127.0.0.1:${port}`,
    S3_ACCESS_KEY: accessKey,
    S3_SECRET_KEY: secretKey,
    S3_BUCKET: bucket,
    S3_REGION: 'us-east-1',
    S3_FORCE_PATH_STYLE: 'true',
    // Also set AWS-style vars for broader compatibility
    AWS_ENDPOINT_URL_S3: `http://127.0.0.1:${port}`,
    AWS_ACCESS_KEY_ID: accessKey,
    AWS_SECRET_ACCESS_KEY: secretKey,
    AWS_REGION: 'us-east-1'
  };
}

/**
 * Provision MinIO with sudo (for fresh Docker installs)
 */
async function provisionDockerMinioWithSudo(projectDir, logger) {
  const containerName = 'tlc-minio';
  const apiPort = 9000;
  const consolePort = 9001;
  const accessKey = 'minioadmin';
  const secretKey = 'minioadmin';
  const defaultBucket = 'uploads';

  // Check if container already exists and is running
  try {
    const status = execSync(`sudo docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (status === 'true') {
      logger('Using existing MinIO container');
      return getMinioEnvVars(apiPort, accessKey, secretKey, defaultBucket);
    }
  } catch {
    // Container doesn't exist
  }

  // Remove existing stopped container
  try {
    execSync(`sudo docker rm -f ${containerName} 2>/dev/null`, { stdio: 'ignore' });
  } catch {
    // Ignore
  }

  logger('Starting MinIO container...');

  // Create data directory
  const dataDir = path.join(projectDir, '.tlc', 'minio-data');
  const tlcDir = path.join(projectDir, '.tlc');
  if (!fs.existsSync(tlcDir)) {
    fs.mkdirSync(tlcDir, { recursive: true });
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.tlc')) {
        fs.appendFileSync(gitignorePath, '\n# TLC local data\n.tlc/\n');
      }
    }
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Start MinIO container with sudo
  execSync(
    `sudo docker run -d --name ${containerName} -e MINIO_ROOT_USER=${accessKey} -e MINIO_ROOT_PASSWORD=${secretKey} -p ${apiPort}:9000 -p ${consolePort}:9001 -v ${dataDir}:/data minio/minio:latest server /data --console-address :9001`,
    { stdio: 'inherit' }
  );
  minioContainer = containerName;

  // Wait for MinIO to be ready
  logger('Waiting for MinIO to start...');
  for (let i = 0; i < 30; i++) {
    try {
      execSync(`sudo docker exec ${containerName} curl -sf http://127.0.0.1:9000/minio/health/live`, { stdio: 'ignore', timeout: 2000 });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Create default bucket
  await createMinioBucket(containerName, defaultBucket, logger, true);

  logger(`MinIO ready: http://127.0.0.1:${apiPort} (console: http://127.0.0.1:${consolePort})`);

  return getMinioEnvVars(apiPort, accessKey, secretKey, defaultBucket);
}

/**
 * Provision MinIO - try Docker, with fallback handling
 */
async function provisionMinio(projectDir, logger) {
  // Try Docker first
  if (isDockerAvailable()) {
    try {
      return await provisionDockerMinio(projectDir, logger);
    } catch (err) {
      logger(`Docker MinIO failed: ${err.message}`);
      throw err;
    }
  } else if (isDockerInstalled()) {
    // Docker is installed but not running - try to start it
    const started = await startDockerService(logger);
    if (started) {
      try {
        return await provisionDockerMinio(projectDir, logger);
      } catch (err) {
        logger(`Docker MinIO failed: ${err.message}`);
        throw err;
      }
    }
  }

  // Try with sudo if Docker was just installed
  if (isDockerInstalled()) {
    logger('Trying MinIO with elevated permissions...');
    try {
      return await provisionDockerMinioWithSudo(projectDir, logger);
    } catch (err) {
      logger(`Docker MinIO with sudo failed: ${err.message}`);
      throw err;
    }
  }

  // No fallback for MinIO - it requires Docker
  throw new Error('MinIO requires Docker. Please install Docker to use S3-compatible storage.');
}

/**
 * Stop the database if running
 */
async function stopDatabase() {
  // Stop PGlite socket server
  if (pgServer) {
    try {
      await pgServer.stop();
      pgServer = null;
    } catch (e) {
      // Ignore stop errors
    }
  }

  // Close PGlite instance
  if (pgliteInstance) {
    try {
      await pgliteInstance.close();
      pgliteInstance = null;
    } catch (e) {
      // Ignore close errors
    }
  }

  // Note: We don't stop the Docker container by default to preserve data
  // and speed up subsequent starts. Container can be stopped manually with:
  // docker stop tlc-postgres
}

/**
 * Auto-provision database and storage if needed
 * Returns environment variables to add
 */
async function autoProvision(projectDir, logger = console.log) {
  const envVars = {};

  // Check for database needs
  const dbType = detectDatabaseNeed(projectDir);
  if (dbType) {
    if (hasDatabaseUrl()) {
      logger('Using existing DATABASE_URL');
    } else {
      logger(`Detected ${dbType} database requirement`);
      if (dbType === 'postgres') {
        const databaseUrl = await provisionPostgres(projectDir, logger);
        envVars.DATABASE_URL = databaseUrl;
      } else {
        logger(`Auto-provisioning for ${dbType} not yet supported`);
      }
    }
  }

  // Check for storage needs
  const storageType = detectStorageNeed(projectDir);
  if (storageType) {
    if (hasStorageConfig()) {
      logger('Using existing S3/MinIO configuration');
    } else {
      logger(`Detected ${storageType} storage requirement`);
      if (storageType === 'minio') {
        try {
          const storageEnv = await provisionMinio(projectDir, logger);
          Object.assign(envVars, storageEnv);
        } catch (err) {
          logger(`Storage provisioning failed: ${err.message}`);
        }
      }
    }
  }

  return envVars;
}

module.exports = {
  detectDatabaseNeed,
  detectStorageNeed,
  autoProvision,
  stopDatabase
};
