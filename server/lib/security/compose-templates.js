/**
 * Hardened Docker Compose Templates
 *
 * CIS Docker Benchmark compliant compose configurations.
 */

/**
 * Default security settings for all services
 */
export const SECURITY_DEFAULTS = {
  cap_drop: ['ALL'],
  security_opt: ['no-new-privileges:true'],
  read_only: true,
  restart: 'on-failure:5',
  deploy: {
    resources: {
      limits: {
        memory: '512M',
        cpus: '0.5',
      },
      reservations: {
        memory: '128M',
      },
    },
  },
};

/**
 * Generate production-ready docker-compose configuration
 */
export function generateProductionCompose(options = {}) {
  const {
    serverImage = 'tlc-server:latest',
    dashboardImage = 'tlc-dashboard:latest',
    includeDb = false,
    includeRedis = false,
    domain = 'localhost',
  } = options;

  const compose = {
    version: '3.8',
    services: {
      server: {
        image: serverImage,
        ...SECURITY_DEFAULTS,
        cap_add: ['NET_BIND_SERVICE'],
        environment: {
          NODE_ENV: 'production',
          PORT: '5001',
        },
        networks: ['frontend', 'backend'],
        healthcheck: {
          test: ['CMD', 'node', '-e', "require('http').get('http://localhost:5001/health')"],
          interval: '30s',
          timeout: '10s',
          retries: 3,
        },
        tmpfs: ['/tmp'],
      },
      dashboard: {
        image: dashboardImage,
        ...SECURITY_DEFAULTS,
        cap_add: ['CHOWN', 'SETGID', 'SETUID'],
        ports: ['80:80', '443:443'],
        networks: ['frontend'],
        depends_on: ['server'],
        healthcheck: {
          test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:80/'],
          interval: '30s',
          timeout: '10s',
          retries: 3,
        },
      },
    },
    networks: {
      frontend: {
        driver: 'bridge',
      },
      backend: {
        driver: 'bridge',
        internal: true,
      },
    },
  };

  if (includeDb) {
    compose.services.postgres = {
      image: 'postgres:16-alpine',
      cap_drop: ['ALL'],
      cap_add: ['CHOWN', 'SETGID', 'SETUID', 'DAC_OVERRIDE', 'FOWNER'],
      security_opt: ['no-new-privileges:true'],
      read_only: false, // Database needs write access
      restart: 'on-failure:5',
      environment: {
        POSTGRES_DB: '${POSTGRES_DB}',
        POSTGRES_USER: '${POSTGRES_USER}',
        POSTGRES_PASSWORD_FILE: '/run/secrets/db_password',
      },
      volumes: ['postgres_data:/var/lib/postgresql/data'],
      networks: ['internal'],
      deploy: {
        resources: {
          limits: {
            memory: '1G',
          },
        },
      },
      healthcheck: {
        test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}'],
        interval: '10s',
        timeout: '5s',
        retries: 5,
      },
    };
    compose.networks.internal = {
      driver: 'bridge',
      internal: true,
    };
    compose.volumes = { postgres_data: {} };
    compose.services.server.networks.push('internal');
  }

  if (includeRedis) {
    compose.services.redis = {
      image: 'redis:7-alpine',
      cap_drop: ['ALL'],
      security_opt: ['no-new-privileges:true'],
      read_only: true,
      restart: 'on-failure:5',
      command: ['redis-server', '--appendonly', 'yes', '--maxmemory', '256mb'],
      volumes: ['redis_data:/data'],
      networks: ['internal'],
      deploy: {
        resources: {
          limits: {
            memory: '512M',
          },
        },
      },
    };
    if (!compose.networks.internal) {
      compose.networks.internal = { driver: 'bridge', internal: true };
    }
    if (!compose.volumes) compose.volumes = {};
    compose.volumes.redis_data = {};
    if (!compose.services.server.networks.includes('internal')) {
      compose.services.server.networks.push('internal');
    }
  }

  return compose;
}

/**
 * Generate security overlay for additional hardening
 */
export function generateSecurityCompose(options = {}) {
  const { apparmor = false, seccompProfile = 'default' } = options;

  const securityOpt = ['no-new-privileges:true', `seccomp:${seccompProfile}`];
  if (apparmor) {
    securityOpt.push('apparmor:docker-default');
  }

  return {
    version: '3.8',
    services: {
      server: {
        security_opt: securityOpt,
        pids_limit: 100,
        ulimits: {
          nofile: {
            soft: 65535,
            hard: 65535,
          },
          nproc: {
            soft: 1024,
            hard: 2048,
          },
        },
        privileged: false,
      },
      dashboard: {
        security_opt: securityOpt,
        pids_limit: 50,
        ulimits: {
          nofile: {
            soft: 32768,
            hard: 32768,
          },
        },
        privileged: false,
      },
    },
  };
}

/**
 * Generate development docker-compose configuration
 */
export function generateDevCompose(options = {}) {
  const { serverPort = 5001, dashboardPort = 3000 } = options;

  return {
    version: '3.8',
    services: {
      server: {
        build: {
          context: './server',
          dockerfile: 'Dockerfile.dev',
        },
        cap_drop: ['ALL'],
        cap_add: ['NET_BIND_SERVICE'],
        security_opt: ['no-new-privileges:true'],
        ports: [`${serverPort}:5001`],
        volumes: ['./server:/app:cached', '/app/node_modules'],
        environment: {
          NODE_ENV: 'development',
          DEBUG: '*',
        },
        networks: ['dev'],
      },
      dashboard: {
        build: {
          context: './dashboard-web',
          dockerfile: 'Dockerfile.dev',
        },
        cap_drop: ['ALL'],
        security_opt: ['no-new-privileges:true'],
        ports: [`${dashboardPort}:3000`],
        volumes: ['./dashboard-web:/app:cached', '/app/node_modules'],
        environment: {
          NODE_ENV: 'development',
          VITE_API_URL: `http://localhost:${serverPort}`,
        },
        networks: ['dev'],
        depends_on: ['server'],
      },
    },
    networks: {
      dev: {
        driver: 'bridge',
      },
    },
  };
}

/**
 * Deep merge compose files (overlay pattern)
 */
export function mergeComposeFiles(base, overlay) {
  const result = JSON.parse(JSON.stringify(base));

  // Merge services
  if (overlay.services) {
    for (const [name, svc] of Object.entries(overlay.services)) {
      if (result.services[name]) {
        result.services[name] = mergeService(result.services[name], svc);
      } else {
        result.services[name] = svc;
      }
    }
  }

  // Merge networks
  if (overlay.networks) {
    result.networks = { ...result.networks, ...overlay.networks };
  }

  // Merge volumes
  if (overlay.volumes) {
    result.volumes = { ...result.volumes, ...overlay.volumes };
  }

  // Merge secrets
  if (overlay.secrets) {
    result.secrets = { ...result.secrets, ...overlay.secrets };
  }

  return result;
}

/**
 * Merge a single service configuration
 */
function mergeService(base, overlay) {
  const result = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    if (Array.isArray(value)) {
      // Arrays from overlay replace base arrays
      result[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Objects are deep merged
      result[key] = mergeService(result[key] || {}, value);
    } else {
      // Primitives are replaced
      result[key] = value;
    }
  }

  return result;
}

/**
 * Generate complete production stack
 */
export function generateFullStack(options = {}) {
  const base = generateProductionCompose(options);
  const security = generateSecurityCompose(options);
  return mergeComposeFiles(base, security);
}
