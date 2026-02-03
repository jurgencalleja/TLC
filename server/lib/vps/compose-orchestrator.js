/**
 * Docker Compose Orchestrator
 * Docker Compose orchestration for production deployments
 */

import YAML from 'js-yaml';

/**
 * Generate a production Docker Compose configuration
 * @param {Object} options - Compose configuration options
 * @param {string[]} options.services - List of service names
 * @param {string} [options.version='3.8'] - Compose file version
 * @returns {string} Docker Compose YAML configuration
 */
export function generateProductionCompose(options = {}) {
  const { services = [], version = '3.8' } = options;

  const compose = {
    version,
    services: {},
    networks: {
      default: {
        driver: 'bridge',
      },
    },
  };

  for (const serviceName of services) {
    compose.services[serviceName] = {
      image: `${serviceName}:latest`,
      restart: 'always',
      networks: ['default'],
    };
  }

  return YAML.dump(compose);
}

/**
 * Add health check configuration to a service
 * @param {Object} options - Health check options
 * @param {string} options.test - Health check command
 * @param {string} [options.interval='30s'] - Check interval
 * @param {string} [options.timeout='10s'] - Check timeout
 * @param {number} [options.retries=3] - Number of retries
 * @returns {Object} Service configuration with health check
 */
export function addHealthCheck(options = {}) {
  const {
    test,
    interval = '30s',
    timeout = '10s',
    retries = 3,
    startPeriod = '40s',
  } = options;

  return {
    healthcheck: {
      test: `CMD-SHELL ${test}`,
      interval,
      timeout,
      retries,
      start_period: startPeriod,
    },
  };
}

/**
 * Set resource limits for a service
 * @param {Object} options - Resource limit options
 * @param {string} [options.memory] - Memory limit (e.g., '512M')
 * @param {string} [options.cpus] - CPU limit (e.g., '0.5')
 * @returns {Object} Service configuration with resource limits
 */
export function setResourceLimits(options = {}) {
  const { memory, cpus } = options;

  const limits = {};
  const reservations = {};

  if (memory) {
    limits.memory = memory;
    // Reserve half of the limit by default
    reservations.memory = memory;
  }

  if (cpus) {
    limits.cpus = cpus;
  }

  return {
    deploy: {
      resources: {
        limits,
        reservations,
      },
    },
  };
}

/**
 * Configure logging for a service
 * @param {Object} options - Logging options
 * @param {string} [options.driver='json-file'] - Logging driver
 * @param {string} [options.maxSize='10m'] - Max log file size
 * @param {string} [options.maxFile='3'] - Max number of log files
 * @returns {Object} Service configuration with logging
 */
export function configureLogging(options = {}) {
  const {
    driver = 'json-file',
    maxSize = '10m',
    maxFile = '3',
  } = options;

  return {
    logging: {
      driver,
      options: {
        'max-size': maxSize,
        'max-file': maxFile,
      },
    },
  };
}

/**
 * Create a Docker Compose orchestrator
 * @returns {Object} Compose orchestrator with methods
 */
export function createComposeOrchestrator() {
  const services = {};
  let composeVersion = '3.8';

  return {
    /**
     * Add a service to the compose configuration
     * @param {string} name - Service name
     * @param {Object} config - Service configuration
     */
    addService(name, config = {}) {
      services[name] = {
        image: config.image || `${name}:latest`,
        restart: 'always',
        ...config,
      };
    },

    /**
     * Set the compose file version
     * @param {string} version - Compose version
     */
    setVersion(version) {
      composeVersion = version;
    },

    /**
     * Generate the complete Docker Compose configuration
     * @returns {string} Docker Compose YAML
     */
    generate() {
      const compose = {
        version: composeVersion,
        services,
        networks: {
          default: {
            driver: 'bridge',
          },
        },
      };

      return YAML.dump(compose);
    },

    /**
     * Get all configured services
     * @returns {Object} Services configuration
     */
    getServices() {
      return { ...services };
    },

    /**
     * Add health check to a service
     * @param {string} serviceName - Service name
     * @param {Object} healthCheckOptions - Health check options
     */
    addHealthCheck(serviceName, healthCheckOptions) {
      if (services[serviceName]) {
        const healthConfig = addHealthCheck(healthCheckOptions);
        services[serviceName] = { ...services[serviceName], ...healthConfig };
      }
    },

    /**
     * Set resource limits for a service
     * @param {string} serviceName - Service name
     * @param {Object} resourceOptions - Resource limit options
     */
    setResourceLimits(serviceName, resourceOptions) {
      if (services[serviceName]) {
        const resourceConfig = setResourceLimits(resourceOptions);
        services[serviceName] = { ...services[serviceName], ...resourceConfig };
      }
    },

    /**
     * Configure logging for a service
     * @param {string} serviceName - Service name
     * @param {Object} loggingOptions - Logging options
     */
    configureLogging(serviceName, loggingOptions) {
      if (services[serviceName]) {
        const loggingConfig = configureLogging(loggingOptions);
        services[serviceName] = { ...services[serviceName], ...loggingConfig };
      }
    },
  };
}
