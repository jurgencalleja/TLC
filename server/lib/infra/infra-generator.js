/**
 * Infrastructure Blueprint Generator
 *
 * Generates Docker dev environment with observability stack
 * (Prometheus, Grafana, MailHog, MinIO, pgAdmin) from selectable services.
 *
 * @module infra/infra-generator
 */

/** Available infrastructure services */
const AVAILABLE_SERVICES = [
  'postgres', 'redis', 'prometheus', 'grafana', 'mailhog', 'minio', 'pgadmin',
];

/** Default ports for each service */
const DEFAULT_PORTS = {
  postgres: 5432,
  redis: 6379,
  prometheus: 9090,
  grafana: 3000,
  mailhog: 8025,
  minio: 9000,
  pgadmin: 5050,
};

/** Network assignments per service */
const SERVICE_NETWORKS = {
  postgres: ['app', 'storage'],
  redis: ['app'],
  prometheus: ['monitoring'],
  grafana: ['monitoring'],
  mailhog: ['app'],
  minio: ['app', 'storage'],
  pgadmin: ['app', 'storage'],
};

/** Dollar sign helper for template literals */
const D = '$';

/**
 * Generate service YAML block
 * @param {string} service - Service name
 * @param {Object} ports - Port overrides
 * @returns {string} YAML block for the service
 */
function generateServiceBlock(service, ports = {}) {
  const port = ports[service] || DEFAULT_PORTS[service];
  const networks = SERVICE_NETWORKS[service] || ['app'];
  const networkYaml = networks.map(n => '        - ' + n).join('\n');

  const lines = [];

  switch (service) {
    case 'postgres':
      lines.push(
        '    postgres:',
        '      image: postgres:16-alpine',
        '      ports:',
        '        - "' + port + ':5432"',
        '      environment:',
        '        POSTGRES_USER: ' + D + '{POSTGRES_USER:-app}',
        '        POSTGRES_PASSWORD: ' + D + '{POSTGRES_PASSWORD:-secret}',
        '        POSTGRES_DB: ' + D + '{POSTGRES_DB:-app_dev}',
        '      volumes:',
        '        - postgres_data:/var/lib/postgresql/data',
        '      networks:',
        networkYaml,
        '      healthcheck:',
        '        test: ["CMD-SHELL", "pg_isready -U ' + D + D + '{POSTGRES_USER:-app}"]',
        '        interval: 10s',
        '        timeout: 5s',
        '        retries: 5'
      );
      break;

    case 'redis':
      lines.push(
        '    redis:',
        '      image: redis:7-alpine',
        '      ports:',
        '        - "' + port + ':6379"',
        '      volumes:',
        '        - redis_data:/data',
        '      networks:',
        networkYaml,
        '      healthcheck:',
        '        test: ["CMD", "redis-cli", "ping"]',
        '        interval: 10s',
        '        timeout: 5s',
        '        retries: 5'
      );
      break;

    case 'prometheus':
      lines.push(
        '    prometheus:',
        '      image: prom/prometheus:latest',
        '      ports:',
        '        - "' + port + ':9090"',
        '      volumes:',
        '        - prometheus_data:/prometheus',
        '      networks:',
        networkYaml,
        '      healthcheck:',
        '        test: ["CMD", "wget", "--spider", "-q", "http://localhost:9090/-/healthy"]',
        '        interval: 10s',
        '        timeout: 5s',
        '        retries: 5'
      );
      break;

    case 'grafana':
      lines.push(
        '    grafana:',
        '      image: grafana/grafana:latest',
        '      ports:',
        '        - "' + port + ':3000"',
        '      environment:',
        '        GF_SECURITY_ADMIN_PASSWORD: ' + D + '{GRAFANA_PASSWORD:-admin}',
        '        GF_DATASOURCES_DEFAULT_NAME: prometheus',
        '        GF_DATASOURCES_DEFAULT_TYPE: prometheus',
        '        GF_DATASOURCES_DEFAULT_URL: http://prometheus:9090',
        '      volumes:',
        '        - grafana_data:/var/lib/grafana',
        '      networks:',
        networkYaml,
        '      healthcheck:',
        '        test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]',
        '        interval: 10s',
        '        timeout: 5s',
        '        retries: 5'
      );
      break;

    case 'mailhog':
      lines.push(
        '    mailhog:',
        '      image: mailhog/mailhog:latest',
        '      ports:',
        '        - "' + port + ':8025"',
        '        - "1025:1025"',
        '      networks:',
        networkYaml,
        '      healthcheck:',
        '        test: ["CMD", "wget", "--spider", "-q", "http://localhost:8025"]',
        '        interval: 10s',
        '        timeout: 5s',
        '        retries: 5'
      );
      break;

    case 'minio':
      lines.push(
        '    minio:',
        '      image: minio/minio:latest',
        '      ports:',
        '        - "' + port + ':9000"',
        '        - "9001:9001"',
        '      environment:',
        '        MINIO_ROOT_USER: ' + D + '{MINIO_ROOT_USER:-minioadmin}',
        '        MINIO_ROOT_PASSWORD: ' + D + '{MINIO_ROOT_PASSWORD:-minioadmin}',
        '      command: server /data --console-address ":9001"',
        '      volumes:',
        '        - minio_data:/data',
        '      networks:',
        networkYaml,
        '      healthcheck:',
        '        test: ["CMD", "mc", "ready", "local"]',
        '        interval: 10s',
        '        timeout: 5s',
        '        retries: 5'
      );
      break;

    case 'pgadmin':
      lines.push(
        '    pgadmin:',
        '      image: dpage/pgadmin4:latest',
        '      ports:',
        '        - "' + port + ':80"',
        '      environment:',
        '        PGADMIN_DEFAULT_EMAIL: ' + D + '{PGADMIN_DEFAULT_EMAIL:-admin@local.dev}',
        '        PGADMIN_DEFAULT_PASSWORD: ' + D + '{PGADMIN_DEFAULT_PASSWORD:-admin}',
        '      volumes:',
        '        - pgadmin_data:/var/lib/pgadmin',
        '      networks:',
        networkYaml,
        '      healthcheck:',
        '        test: ["CMD", "wget", "--spider", "-q", "http://localhost:80/misc/ping"]',
        '        interval: 10s',
        '        timeout: 5s',
        '        retries: 5'
      );
      break;
  }

  return lines.join('\n');
}

/**
 * Generate volume definition with explicit name
 * @param {string} service - Service name
 * @returns {string} Volume YAML with name property
 */
function generateVolumeBlock(service) {
  const volumeName = service + '_data';
  return '    ' + volumeName + ':\n      name: ' + volumeName;
}

/**
 * Get unique networks needed for selected services
 * @param {string[]} services - Selected services
 * @returns {string[]} Unique network names
 */
function getRequiredNetworks(services) {
  const networks = new Set();
  for (const service of services) {
    const serviceNets = SERVICE_NETWORKS[service] || ['app'];
    for (const net of serviceNets) {
      networks.add(net);
    }
  }
  return Array.from(networks);
}

/**
 * Generate docker-compose.yml content
 * @param {Object} options - Generation options
 * @param {string[]} options.services - Services to include
 * @param {Object} options.ports - Port overrides
 * @returns {Object} { content, filename }
 */
function generateDockerCompose(options = {}) {
  const { services = [], ports = {} } = options;

  let content = 'version: "3.8"\n\nservices:\n';

  if (services.length === 0) {
    content += '    # No services selected\n';
  } else {
    const blocks = services
      .filter(s => AVAILABLE_SERVICES.includes(s))
      .map(s => generateServiceBlock(s, ports));
    content += blocks.join('\n\n') + '\n';
  }

  // Volumes section
  if (services.length > 0) {
    content += '\nvolumes:\n';
    for (const service of services) {
      if (AVAILABLE_SERVICES.includes(service)) {
        content += generateVolumeBlock(service) + '\n';
      }
    }
  }

  // Networks section
  const networks = getRequiredNetworks(services);
  if (networks.length > 0) {
    content += '\nnetworks:\n';
    for (const net of networks) {
      content += '    ' + net + ':\n      name: ' + net + '\n';
    }
  }

  return {
    content,
    filename: 'docker-compose.dev.yml',
  };
}

/**
 * Generate .env.example file content
 * @param {Object} options - Generation options
 * @param {string[]} options.services - Services to include
 * @returns {Object} { content, filename }
 */
function generateEnvExample(options = {}) {
  const { services = [] } = options;
  const lines = ['# Infrastructure Environment Variables', ''];

  const envVars = {
    postgres: [
      'POSTGRES_USER=app',
      'POSTGRES_PASSWORD=secret',
      'POSTGRES_DB=app_dev',
    ],
    redis: [
      'REDIS_URL=redis://localhost:6379',
    ],
    prometheus: [
      'PROMETHEUS_URL=http://localhost:9090',
    ],
    grafana: [
      'GRAFANA_PASSWORD=admin',
    ],
    mailhog: [
      'SMTP_HOST=localhost',
      'SMTP_PORT=1025',
    ],
    minio: [
      'MINIO_ROOT_USER=minioadmin',
      'MINIO_ROOT_PASSWORD=minioadmin',
      'MINIO_ENDPOINT=http://localhost:9000',
    ],
    pgadmin: [
      'PGADMIN_DEFAULT_EMAIL=admin@local.dev',
      'PGADMIN_DEFAULT_PASSWORD=admin',
    ],
  };

  for (const service of services) {
    const vars = envVars[service];
    if (vars) {
      lines.push('# ' + service.charAt(0).toUpperCase() + service.slice(1));
      lines.push(...vars);
      lines.push('');
    }
  }

  return {
    content: lines.join('\n'),
    filename: '.env.example',
  };
}

module.exports = {
  generateDockerCompose,
  generateEnvExample,
  AVAILABLE_SERVICES,
};
