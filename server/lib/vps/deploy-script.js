/**
 * Deploy Script Generator
 * Blue-green and rolling deployment scripts for VPS
 */

/**
 * Generates a blue-green deployment script
 * @param {Object} options - Deployment options
 * @param {string} options.service - Service name
 * @returns {string} Blue-green deployment script
 */
export function generateBlueGreenScript({ service }) {
  return `#!/bin/bash
set -euo pipefail

# Blue-green deployment for ${service}
SERVICE="${service}"
CURRENT_COLOR=$(docker ps --filter "name=\${SERVICE}" --format '{{.Names}}' | grep -o 'blue\\|green' || echo "blue")

if [ "\$CURRENT_COLOR" = "blue" ]; then
  NEW_COLOR="green"
else
  NEW_COLOR="blue"
fi

echo "Current: \$CURRENT_COLOR, Deploying to: \$NEW_COLOR"

# Deploy to new color
docker-compose up -d "\${SERVICE}-\${NEW_COLOR}"

# Wait for health check
sleep 10

# Switch traffic
docker exec nginx nginx -s reload

# Stop old color
docker-compose stop "\${SERVICE}-\${CURRENT_COLOR}"

echo "Deployed \${SERVICE} to \${NEW_COLOR}"
`;
}

/**
 * Generates a rolling update deployment script
 * @param {Object} options - Deployment options
 * @param {string} options.service - Service name
 * @param {number} [options.replicas=3] - Number of replicas
 * @returns {string} Rolling update script
 */
export function generateRollingScript({ service, replicas = 3 }) {
  return `#!/bin/bash
set -euo pipefail

# Rolling update for ${service}
SERVICE="${service}"
REPLICAS=${replicas}

echo "Starting rolling update for \${SERVICE} with \${REPLICAS} replicas"

for i in $(seq 1 \$REPLICAS); do
  echo "Updating replica \$i of \$REPLICAS..."

  # Stop old instance
  docker-compose stop "\${SERVICE}-\$i" || true

  # Start new instance
  docker-compose up -d "\${SERVICE}-\$i"

  # Wait for health
  sleep 5

  echo "Replica \$i updated"
done

echo "Rolling update complete"
`;
}

/**
 * Adds health verification to deployment
 * @param {Object} options - Health check options
 * @param {string} options.endpoint - Health endpoint
 * @param {number} [options.timeout=30] - Timeout in seconds
 * @param {number} [options.retries=5] - Number of retries
 * @returns {string} Health verification script snippet
 */
export function addHealthVerification({ endpoint, timeout = 30, retries = 5 }) {
  return `# Health check verification
HEALTH_ENDPOINT="${endpoint}"
TIMEOUT=${timeout}
RETRIES=${retries}

check_health() {
  local attempt=1
  while [ \$attempt -le \$RETRIES ]; do
    echo "Health check attempt \$attempt/\$RETRIES..."
    if curl -sf "\${HEALTH_ENDPOINT}" > /dev/null; then
      echo "Health check passed"
      return 0
    fi
    sleep \$(( TIMEOUT / RETRIES ))
    attempt=\$((attempt + 1))
  done
  echo "Health check failed"
  return 1
}
`;
}

/**
 * Adds rollback support to deployment
 * @param {Object} options - Rollback options
 * @returns {string} Rollback script snippet
 */
export function addRollbackSupport(options = {}) {
  return `# Rollback support
PREVIOUS_VERSION=""

save_previous_version() {
  PREVIOUS_VERSION=\$(docker images --format '{{.Tag}}' | head -1)
  echo "Saved previous version: \$PREVIOUS_VERSION"
}

rollback() {
  echo "Rolling back to \$PREVIOUS_VERSION..."
  docker-compose down
  docker tag "\${SERVICE}:\${PREVIOUS_VERSION}" "\${SERVICE}:latest"
  docker-compose up -d
  echo "Rollback complete"
}

# Call rollback on failure
trap 'rollback' ERR
`;
}

/**
 * Generates pre and post deployment hooks
 * @param {Object} options - Hook options
 * @param {string} [options.pre] - Pre-deployment command
 * @param {string} [options.post] - Post-deployment command
 * @returns {Object} Generated hooks
 */
export function generateHooks({ pre, post }) {
  const hooks = {};

  if (pre) {
    hooks.pre = `# Pre-deployment hook
echo "Running pre-deployment hook..."
${pre}
echo "Pre-deployment hook complete"
`;
  }

  if (post) {
    hooks.post = `# Post-deployment hook
echo "Running post-deployment hook..."
${post}
echo "Post-deployment hook complete"
`;
  }

  return hooks;
}

/**
 * Creates a deploy script generator instance
 * @returns {Object} Generator with blueGreen and rolling methods
 */
export function createDeployScriptGenerator() {
  return {
    /**
     * Generates a blue-green deployment script
     * @param {Object} options - Deployment options
     * @returns {string} Deployment script
     */
    blueGreen(options) {
      let script = generateBlueGreenScript(options);

      if (options.healthEndpoint) {
        script += '\n' + addHealthVerification({ endpoint: options.healthEndpoint });
      }

      if (options.rollback !== false) {
        script += '\n' + addRollbackSupport();
      }

      return script;
    },

    /**
     * Generates a rolling update deployment script
     * @param {Object} options - Deployment options
     * @returns {string} Deployment script
     */
    rolling(options) {
      let script = generateRollingScript(options);

      if (options.healthEndpoint) {
        script += '\n' + addHealthVerification({ endpoint: options.healthEndpoint });
      }

      if (options.rollback !== false) {
        script += '\n' + addRollbackSupport();
      }

      return script;
    }
  };
}
