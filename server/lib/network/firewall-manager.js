/**
 * Firewall Manager - UFW rules generation and management
 */

/**
 * UFW policy constants
 */
export const UFW_POLICIES = {
  ALLOW: 'allow',
  DENY: 'deny',
  REJECT: 'reject',
};

/**
 * Generate UFW enable command
 * @param {Object} options - Options
 * @param {boolean} options.force - Include --force flag
 * @returns {string} UFW enable command
 */
export function generateUfwEnableCommand(options = {}) {
  const { force = false } = options;
  if (force) {
    return 'ufw --force enable';
  }
  return 'ufw enable';
}

/**
 * Set default policy
 * @param {Object} options - Options
 * @param {string} options.direction - 'incoming' or 'outgoing'
 * @param {string} options.policy - 'allow', 'deny', or 'reject'
 * @returns {string} UFW default policy command
 */
export function setDefaultPolicy(options) {
  const { direction, policy } = options;
  return `ufw default ${policy} ${direction}`;
}

/**
 * Generate allow rule for port
 * @param {Object} options - Options
 * @param {number|string} options.port - Port number, range, or service name
 * @param {string} options.protocol - Protocol (tcp, udp)
 * @returns {string} UFW allow rule
 */
export function allowPort(options) {
  const { port, protocol } = options;
  if (protocol) {
    return `ufw allow ${port}/${protocol}`;
  }
  return `ufw allow ${port}`;
}

/**
 * Generate allow rule for IP
 * @param {Object} options - Options
 * @param {string} options.ip - IP address or CIDR range
 * @param {number} options.port - Port number (optional)
 * @returns {string} UFW allow from IP rule
 */
export function allowFromIp(options) {
  const { ip, port } = options;
  if (port) {
    return `ufw allow from ${ip} to any port ${port}`;
  }
  return `ufw allow from ${ip}`;
}

/**
 * Generate deny rule for port
 * @param {Object} options - Options
 * @param {number|string} options.port - Port number
 * @param {string} options.protocol - Protocol (tcp, udp)
 * @returns {string} UFW deny rule
 */
export function denyPort(options) {
  const { port, protocol } = options;
  if (protocol) {
    return `ufw deny ${port}/${protocol}`;
  }
  return `ufw deny ${port}`;
}

/**
 * Validate UFW rule syntax
 * @param {string} rule - UFW rule to validate
 * @returns {Object} Validation result with valid and error properties
 */
export function validateRule(rule) {
  // Check for port numbers
  const portMatch = rule.match(/(?:port\s+|allow\s+|deny\s+)(\d+)/);
  if (portMatch) {
    const port = parseInt(portMatch[1], 10);
    if (port < 1 || port > 65535) {
      return { valid: false, error: 'Invalid port number' };
    }
  }

  // Check for IP addresses
  const ipMatch = rule.match(/from\s+([\d.]+(?:\/\d+)?)/);
  if (ipMatch) {
    const ipPart = ipMatch[1];
    const [ip, cidr] = ipPart.split('/');

    // Validate IP octets
    const octets = ip.split('.');
    if (octets.length !== 4) {
      return { valid: false, error: 'Invalid IP address format' };
    }

    for (const octet of octets) {
      const num = parseInt(octet, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        return { valid: false, error: 'Invalid IP address' };
      }
    }

    // Validate CIDR if present
    if (cidr !== undefined) {
      const cidrNum = parseInt(cidr, 10);
      if (isNaN(cidrNum) || cidrNum < 0 || cidrNum > 32) {
        return { valid: false, error: 'Invalid CIDR notation' };
      }
    }
  }

  return { valid: true };
}

/**
 * Generate complete UFW rules configuration
 * @param {Object} options - Options
 * @param {number[]} options.allowPorts - Ports to allow
 * @param {number} options.sshPort - SSH port
 * @param {string[]} options.adminIps - Admin IP addresses
 * @param {boolean} options.rateLimit - Enable rate limiting
 * @param {string} options.format - Output format ('rules' or 'script')
 * @returns {string} UFW rules or script
 */
export function generateUfwRules(options) {
  const {
    allowPorts = [],
    sshPort = 22,
    adminIps = [],
    rateLimit = false,
    format = 'rules',
  } = options;

  const lines = [];

  if (format === 'script') {
    lines.push('#!/bin/bash');
    lines.push('');
  }

  // Default policies
  lines.push('ufw default deny incoming');
  lines.push('ufw default allow outgoing');

  // SSH rule
  if (rateLimit) {
    lines.push(`ufw limit ${sshPort}`);
  } else {
    lines.push(`ufw allow ${sshPort}`);
  }

  // Allowed ports
  for (const port of allowPorts) {
    lines.push(`ufw allow ${port}`);
  }

  // Admin IPs
  for (const ip of adminIps) {
    lines.push(`ufw allow from ${ip}`);
  }

  return lines.join('\n');
}

/**
 * Create a firewall manager instance
 * @param {Object} options - Initial options
 * @returns {Object} Firewall manager object
 */
export function createFirewallManager(options = {}) {
  const { sshPort = 22 } = options;
  const rules = [];

  return {
    /**
     * Generate rules using the current configuration
     */
    generateRules(opts = {}) {
      return generateUfwRules({ ...opts, sshPort });
    },

    /**
     * Add an allow port rule
     */
    allowPort(opts) {
      const rule = allowPort(opts);
      rules.push(rule);
      return rule;
    },

    /**
     * Add a deny port rule
     */
    denyPort(opts) {
      const rule = denyPort(opts);
      rules.push(rule);
      return rule;
    },

    /**
     * Add an allow from IP rule
     */
    allowFromIp(opts) {
      const rule = allowFromIp(opts);
      rules.push(rule);
      return rule;
    },

    /**
     * Validate a rule
     */
    validate(rule) {
      return validateRule(rule);
    },

    /**
     * Get all added rules
     */
    getRules() {
      return [...rules];
    },

    /**
     * Generate complete configuration
     */
    generateConfig() {
      const lines = [
        'ufw default deny incoming',
        'ufw default allow outgoing',
        `ufw allow ${sshPort}`,
        ...rules,
      ];
      return lines.join('\n');
    },
  };
}
