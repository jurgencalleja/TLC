/**
 * Network Security Policy Module
 *
 * Validates network configuration for container security.
 */

const DATABASE_IMAGES = [/postgres/i, /mysql/i, /mariadb/i, /mongo/i, /redis/i, /elasticsearch/i];
const DATABASE_PORTS = ['5432', '3306', '27017', '6379', '9200', '9300'];

function isDatabase(name, service) {
  if (DATABASE_IMAGES.some(p => p.test(service.image || ''))) return true;
  if (/db|database|postgres|mysql|mongo|redis/i.test(name)) return true;
  return false;
}

export function validateNetworkConfig(config) {
  const findings = [];
  const services = config.services || {};
  const networks = config.networks || {};

  const hasCustomNetworks = Object.keys(networks).length > 0;
  const servicesUsingNetworks = Object.values(services).filter(s => s.networks?.length > 0);

  if (!hasCustomNetworks || servicesUsingNetworks.length === 0) {
    findings.push({
      rule: 'no-default-bridge',
      severity: 'medium',
      message: 'Services using default bridge network. Define custom networks for isolation.',
      fix: 'Create custom networks and assign services to them.',
    });
  }

  // Check database network isolation
  for (const [name, service] of Object.entries(services)) {
    if (isDatabase(name, service) && service.networks) {
      const hasInternalNetwork = service.networks.some(netName => networks[netName]?.internal === true);
      if (!hasInternalNetwork) {
        findings.push({
          rule: 'database-internal-only',
          severity: 'high',
          service: name,
          message: `Database '${name}' should be on internal network only.`,
          fix: 'Add "internal: true" to database network.',
        });
      }
    }
  }

  // Check for network segmentation
  const networkUsage = {};
  for (const [name, service] of Object.entries(services)) {
    for (const net of service.networks || []) {
      networkUsage[net] = networkUsage[net] || [];
      networkUsage[net].push(name);
    }
  }

  const sharedNetworks = Object.entries(networkUsage).filter(([, svcs]) => svcs.length > 2);
  if (sharedNetworks.length > 0 && Object.keys(networks).length === 1) {
    findings.push({
      rule: 'recommend-network-segmentation',
      severity: 'low',
      message: 'Multiple services share single network. Consider segmenting by function.',
      fix: 'Create separate networks for frontend, backend, and data tiers.',
    });
  }

  return { findings, score: Math.max(0, 100 - findings.length * 15) };
}

export function analyzeNetworkTopology(config) {
  const services = config.services || {};
  const networks = config.networks || {};
  const topology = { services: {}, networks: {}, externalAccessPoints: [] };

  // Map services to networks
  for (const [name, service] of Object.entries(services)) {
    topology.services[name] = {
      networks: service.networks || [],
      canReach: [],
      ports: service.ports || [],
    };
    if (service.ports?.length > 0) {
      topology.externalAccessPoints.push(name);
    }
  }

  // Calculate reachability
  for (const [name, data] of Object.entries(topology.services)) {
    for (const [otherName, otherData] of Object.entries(topology.services)) {
      if (name !== otherName) {
        const sharedNetworks = data.networks.filter(n => otherData.networks.includes(n));
        if (sharedNetworks.length > 0) {
          data.canReach.push(otherName);
        }
      }
    }
  }

  // Network info
  for (const [name, config] of Object.entries(networks)) {
    topology.networks[name] = { internal: config.internal || false };
  }

  return topology;
}

export function detectExposedPorts(config) {
  const findings = [];
  const services = config.services || {};

  for (const [name, service] of Object.entries(services)) {
    const ports = service.ports || [];

    for (const portMapping of ports) {
      const portStr = String(portMapping);

      // Check for database ports exposed
      if (isDatabase(name, service)) {
        const containerPort = portStr.split(':').pop();
        if (DATABASE_PORTS.includes(containerPort)) {
          findings.push({
            rule: 'database-port-exposed',
            severity: 'high',
            service: name,
            message: `Database port ${containerPort} exposed externally.`,
            fix: 'Use "expose" instead of "ports" for internal-only access.',
          });
        }
      }

      // Check for binding to all interfaces
      if (portStr.startsWith('0.0.0.0:')) {
        findings.push({
          rule: 'avoid-bind-all-interfaces',
          severity: 'medium',
          service: name,
          message: `Port binding to 0.0.0.0 (all interfaces).`,
          fix: 'Bind to 127.0.0.1 for local-only access.',
        });
      }
    }
  }

  return { findings, score: Math.max(0, 100 - findings.length * 20) };
}

export function createNetworkValidator(options = {}) {
  return {
    validate(config) {
      const networkResult = validateNetworkConfig(config);
      const portsResult = detectExposedPorts(config);
      const topology = analyzeNetworkTopology(config);

      const findings = [...networkResult.findings, ...portsResult.findings];
      const score = Math.max(0, 100 - findings.length * 10);

      return {
        findings,
        score,
        topology: {
          nodes: Object.keys(config.services || {}),
          ...topology,
        },
        summary: {
          total: findings.length,
          high: findings.filter(f => f.severity === 'high').length,
          medium: findings.filter(f => f.severity === 'medium').length,
          low: findings.filter(f => f.severity === 'low').length,
        },
      };
    },
  };
}
