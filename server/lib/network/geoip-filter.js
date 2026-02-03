/**
 * GeoIP Filter - Country allow/block lists with MaxMind
 */

/**
 * GeoIP mode constants
 */
export const GEOIP_MODES = {
  ALLOWLIST: 'allowlist',
  BLOCKLIST: 'blocklist',
};

/**
 * Check if an IP address is internal/private
 * @param {string} ip - IP address to check
 * @returns {boolean} True if internal
 */
export function isInternalIp(ip) {
  // Localhost
  if (ip === '127.0.0.1' || ip === '::1') {
    return true;
  }

  // IPv6 private ranges
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) {
    return true;
  }

  // IPv4 private ranges
  const parts = ip.split('.');
  if (parts.length === 4) {
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);

    // 10.0.0.0/8
    if (first === 10) {
      return true;
    }

    // 172.16.0.0/12
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }

    // 192.168.0.0/16
    if (first === 192 && second === 168) {
      return true;
    }
  }

  return false;
}

/**
 * Look up country code for an IP address
 * @param {string} ip - IP address
 * @param {Object} options - Options
 * @param {Object} options.db - MaxMind database reader
 * @returns {Promise<string|null>} Country code or null
 */
export async function lookupCountry(ip, options = {}) {
  const { db } = options;

  // Skip internal IPs
  if (isInternalIp(ip)) {
    return null;
  }

  if (!db) {
    return null;
  }

  try {
    const result = db.get(ip);
    return result?.country?.iso_code || null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a country is allowed
 * @param {string|null} countryCode - Country code
 * @param {Object} options - Options
 * @param {string} options.mode - 'allowlist' or 'blocklist'
 * @param {string[]} options.countries - List of countries
 * @param {boolean} options.allowUnknown - Allow unknown countries
 * @returns {boolean} True if allowed
 */
export function isAllowedCountry(countryCode, options) {
  const { mode, countries, allowUnknown = false } = options;

  if (countryCode === null) {
    return allowUnknown;
  }

  if (mode === 'allowlist') {
    return countries.includes(countryCode);
  }

  // Blocklist mode - allowed if NOT in the list
  return !countries.includes(countryCode);
}

/**
 * Check if a country is blocked
 * @param {string|null} countryCode - Country code
 * @param {Object} options - Options
 * @param {string} options.mode - 'allowlist' or 'blocklist'
 * @param {string[]} options.countries - List of countries
 * @returns {boolean} True if blocked
 */
export function isBlockedCountry(countryCode, options) {
  const { mode, countries } = options;

  if (mode === 'blocklist') {
    return countries.includes(countryCode);
  }

  // Allowlist mode - blocked if NOT in the list
  return !countries.includes(countryCode);
}

/**
 * Generate Caddy geoip configuration
 * @param {Object} options - Options
 * @param {string} options.mode - 'allowlist' or 'blocklist'
 * @param {string[]} options.countries - List of countries
 * @param {string} options.dbPath - Path to MaxMind database
 * @returns {string} Caddy configuration snippet
 */
export function generateCaddyGeoip(options) {
  const {
    mode,
    countries,
    dbPath = '/usr/share/GeoIP/GeoLite2-Country.mmdb',
  } = options;

  const lines = [
    '# GeoIP filtering with Caddy',
    '{',
    '    order maxmind_geolocation first',
    '}',
    '',
    'maxmind_geolocation {',
    `    db_path "${dbPath}"`,
    '}',
    '',
  ];

  if (mode === 'blocklist') {
    lines.push('@blocked_country {');
    lines.push(`    maxmind_geolocation country ${countries.join(' ')}`);
    lines.push('}');
    lines.push('');
    lines.push('handle @blocked_country {');
    lines.push('    abort');
    lines.push('}');
  } else {
    lines.push('@allowed_country {');
    lines.push(`    maxmind_geolocation country ${countries.join(' ')}`);
    lines.push('}');
    lines.push('');
    lines.push('handle @allowed_country {');
    lines.push('    # Allow request');
    lines.push('}');
  }

  return lines.join('\n');
}

/**
 * Generate Nginx geoip configuration
 * @param {Object} options - Options
 * @param {string} options.mode - 'allowlist' or 'blocklist'
 * @param {string[]} options.countries - List of countries
 * @param {string} options.dbPath - Path to MaxMind database
 * @param {boolean} options.blockUnknown - Block unknown countries
 * @returns {string} Nginx configuration snippet
 */
export function generateNginxGeoip(options) {
  const {
    mode,
    countries,
    dbPath = '/usr/share/GeoIP/GeoLite2-Country.mmdb',
    blockUnknown = false,
  } = options;

  const lines = [
    '# GeoIP filtering with Nginx',
    'geoip2 ' + dbPath + ' {',
    '    $geoip2_data_country_code country iso_code;',
    '}',
    '',
    'map $geoip2_data_country_code $allowed_country {',
  ];

  if (mode === 'allowlist') {
    lines.push(`    default ${blockUnknown ? '0' : '1'};`);
    for (const country of countries) {
      lines.push(`    ${country} 1;`);
    }
  } else {
    lines.push('    default 1;');
    for (const country of countries) {
      lines.push(`    ${country} 0;`);
    }
  }

  lines.push('}');
  lines.push('');

  if (mode === 'blocklist') {
    lines.push('# In server block:');
    lines.push('if ($allowed_country = 0) {');
    lines.push('    deny all;');
    lines.push('}');
  }

  return lines.join('\n');
}

/**
 * Create a GeoIP filter instance
 * @param {Object} options - Options
 * @param {string} options.mode - 'allowlist' or 'blocklist'
 * @param {string[]} options.countries - List of countries
 * @param {Object} options.db - MaxMind database reader
 * @param {boolean} options.bypassInternal - Bypass filtering for internal IPs
 * @returns {Object} GeoIP filter object
 */
export function createGeoipFilter(options) {
  const {
    mode,
    countries,
    db,
    bypassInternal = true,
  } = options;

  return {
    /**
     * Check if an IP is allowed
     */
    async check(ip) {
      // Bypass internal IPs if configured
      if (bypassInternal && isInternalIp(ip)) {
        return { allowed: true, bypassed: true };
      }

      // For internal IPs when bypass is disabled
      if (isInternalIp(ip)) {
        return { allowed: false, bypassed: false, country: null };
      }

      const country = await lookupCountry(ip, { db });
      const allowed = isAllowedCountry(country, { mode, countries });

      return { allowed, country };
    },

    /**
     * Look up country for an IP
     */
    async lookup(ip) {
      return lookupCountry(ip, { db });
    },

    /**
     * Generate Caddy configuration
     */
    generateCaddy(opts = {}) {
      return generateCaddyGeoip({ mode, countries, ...opts });
    },

    /**
     * Generate Nginx configuration
     */
    generateNginx(opts = {}) {
      return generateNginxGeoip({ mode, countries, ...opts });
    },
  };
}
