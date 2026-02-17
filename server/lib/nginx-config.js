/**
 * Nginx Config Generator — server blocks, wildcard routing, SSL
 * Phase 80 Task 5 (replaces caddy-config.js)
 */

const { isValidDomain } = require('./input-sanitizer.js');

/**
 * Generate Nginx site config for a project
 * @param {Object} options
 * @param {string} options.domain - Server domain
 * @param {number} options.port - App port
 * @param {string} options.proxyPass - Upstream URL
 * @returns {string} Nginx config
 */
function generateSiteConfig({ domain, port, proxyPass }) {
  if (!isValidDomain(domain)) throw new Error(`Invalid domain: ${domain}`);
  return `# TLC generated Nginx config for ${domain}
server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass ${proxyPass};

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
`;
}

/**
 * Generate wildcard Nginx config for branch previews
 * @param {string} baseDomain - Base domain (e.g. myapp.dev)
 * @param {Object} options
 * @param {Array} [options.branches] - [{ subdomain, port }]
 * @returns {string} Nginx config
 */
function generateWildcardConfig(baseDomain, options = {}) {
  if (!isValidDomain(baseDomain)) throw new Error(`Invalid domain: ${baseDomain}`);
  const branches = options.branches || [];

  // Map blocks for each branch
  const mapEntries = branches
    .map(b => `        ${b.subdomain}.${baseDomain} 127.0.0.1:${b.port};`)
    .join('\n');

  return `# TLC wildcard config for *.${baseDomain}

map $host $branch_upstream {
    default "";
${mapEntries}
}

# Default server for unknown subdomains
server {
    listen 80 default_server;
    server_name *.${baseDomain};

    location / {
        if ($branch_upstream = "") {
            return 404 "No deployment for this branch";
        }
        proxy_pass http://$branch_upstream;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
`;
}

/**
 * Generate SSL config snippet for a domain
 * @param {string} domain
 * @returns {string} SSL config lines
 */
function generateSslConfig(domain) {
  if (!isValidDomain(domain)) throw new Error(`Invalid domain: ${domain}`);
  return `    # SSL Configuration for ${domain}
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
`;
}

module.exports = { generateSiteConfig, generateWildcardConfig, generateSslConfig };
