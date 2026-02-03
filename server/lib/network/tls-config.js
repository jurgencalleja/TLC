/**
 * TLS Configuration Manager
 * Generates TLS configurations for various server types
 */

export const TLS_VERSIONS = {
  TLS_1_2: '1.2',
  TLS_1_3: '1.3',
};

export const CIPHER_SUITES = {
  MODERN: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
  ],
  COMPATIBLE: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'DHE-RSA-AES256-GCM-SHA384',
    'DHE-RSA-AES128-GCM-SHA256',
  ],
};

/**
 * Generate Caddyfile TLS block
 */
export function generateCaddyTls(options) {
  const { domain, minVersion, ocspStapling, email } = options;

  let config = `${domain} {\n`;
  config += '  tls';

  if (email) {
    config += ` ${email}`;
  }

  config += ' {\n';

  if (minVersion === '1.3') {
    config += '    protocols tls1.3\n';
  } else if (minVersion === '1.2') {
    config += '    protocols tls1.2 tls1.3\n';
  }

  if (ocspStapling) {
    config += '    ocsp_stapling on\n';
  }

  config += '  }\n';
  config += '}\n';

  return config;
}

/**
 * Generate Nginx SSL configuration
 */
export function generateNginxTls(options) {
  const { domain, minVersion, ciphers, ocspStapling } = options;

  let config = '';

  // SSL certificate paths
  config += `ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;\n`;
  config += `ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;\n\n`;

  // Protocol version
  if (minVersion === '1.3') {
    config += 'ssl_protocols TLSv1.3;\n';
  } else {
    config += 'ssl_protocols TLSv1.2 TLSv1.3;\n';
  }

  // Cipher configuration
  if (ciphers === 'modern') {
    config +=
      'ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;\n';
  } else {
    config += 'ssl_ciphers HIGH:!aNULL:!MD5;\n';
  }

  config += 'ssl_prefer_server_ciphers on;\n\n';

  // Session settings
  config += 'ssl_session_timeout 1d;\n';
  config += 'ssl_session_cache shared:SSL:50m;\n';
  config += 'ssl_session_tickets off;\n\n';

  // OCSP stapling
  if (ocspStapling) {
    config += 'ssl_stapling on;\n';
    config += 'ssl_stapling_verify on;\n';
    config += `ssl_trusted_certificate /etc/letsencrypt/live/${domain}/chain.pem;\n`;
  }

  return config;
}

/**
 * Generate Let's Encrypt / certbot configuration
 */
export function generateLetsEncryptConfig(options) {
  const { domain, email, wildcard, autoRenew, staging } = options;

  let config = '# Let\'s Encrypt Certificate Configuration\n\n';

  config += `domain=${domain}\n`;
  config += `email=${email}\n\n`;

  config += '# Certbot command:\n';
  config += 'certbot certonly \\\n';

  if (staging) {
    config += '  --staging \\\n';
  }

  if (wildcard) {
    config += '  --dns-cloudflare \\\n';
    config += '  --dns-cloudflare-credentials /etc/cloudflare.ini \\\n';
  } else {
    config += '  --webroot \\\n';
    config += '  --webroot-path /var/www/html \\\n';
  }

  config += `  -d ${domain} \\\n`;
  config += `  --email ${email} \\\n`;
  config += '  --agree-tos \\\n';
  config += '  --non-interactive\n\n';

  if (autoRenew) {
    config += '# Auto-renew cron job:\n';
    config += '# 0 0 * * * certbot renew --quiet\n';
  }

  return config;
}

/**
 * Generate CAA DNS record
 */
export function generateCaaRecord(options) {
  const { domain, ca, wildcard, reportEmail } = options;

  let record = `; CAA records for ${domain}\n`;

  // Standard issue record
  record += `${domain}. IN CAA 0 issue "${ca}"\n`;

  // Wildcard issue record
  if (wildcard) {
    record += `${domain}. IN CAA 0 issuewild "${ca}"\n`;
  }

  // Incident reporting
  if (reportEmail) {
    record += `${domain}. IN CAA 0 iodef "mailto:${reportEmail}"\n`;
  }

  return record;
}

/**
 * Generate TLS config for specified server type
 */
export function generateTlsConfig(options) {
  const { serverType, ...tlsOptions } = options;

  switch (serverType) {
    case 'caddy':
      return generateCaddyTls(tlsOptions);
    case 'nginx':
      return generateNginxTls(tlsOptions);
    default:
      throw new Error(`Unsupported server type: ${serverType}`);
  }
}

/**
 * Create a TLS configuration manager with default options
 */
export function createTlsConfigManager(config = {}) {
  const defaults = config.defaults || {};

  return {
    generateCaddy(options) {
      return generateCaddyTls({ ...defaults, ...options });
    },
    generateNginx(options) {
      return generateNginxTls({ ...defaults, ...options });
    },
    generateLetsEncrypt(options) {
      return generateLetsEncryptConfig({ ...defaults, ...options });
    },
    generateCaa(options) {
      return generateCaaRecord({ ...defaults, ...options });
    },
  };
}
