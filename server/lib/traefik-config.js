/**
 * Traefik API Gateway Configuration Generator
 * Generates Traefik configuration files for microservice routing
 */

class TraefikConfig {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Generate main traefik.yml static configuration
   * @param {Object} config - Configuration options
   * @param {string[]} config.services - List of service names
   * @param {string} config.domain - Domain for routing
   * @param {boolean} config.tls - Enable TLS/HTTPS
   * @returns {string} YAML configuration
   */
  generateTraefikYml(config) {
    const { services = [], domain = 'localhost', tls = false } = config;

    const traefikConfig = {
      entryPoints: {
        web: {
          address: ':80',
        },
      },
      api: {
        dashboard: true,
        insecure: true,
      },
      providers: {
        docker: {
          exposedByDefault: false,
          network: 'traefik-net',
        },
        file: {
          directory: '/etc/traefik/dynamic',
          watch: true,
        },
      },
    };

    // Add websecure entrypoint if TLS enabled
    if (tls) {
      traefikConfig.entryPoints.websecure = {
        address: ':443',
      };
    }

    return this.toYaml(traefikConfig);
  }

  /**
   * Generate dynamic routing configuration
   * @param {Object} config - Configuration options
   * @param {string[]} config.services - List of service names
   * @param {string} config.domain - Domain for routing
   * @param {boolean} config.tls - Enable TLS/HTTPS
   * @returns {string} YAML configuration
   */
  generateDynamicConfig(config) {
    const { services = [], domain = 'localhost', tls = false } = config;

    const dynamicConfig = {
      http: {
        routers: {},
        services: {},
        middlewares: {},
      },
    };

    // Generate routers and services for each service
    for (const service of services) {
      const serviceName = service.toLowerCase();
      const defaultPort = 3000;

      // Router
      dynamicConfig.http.routers[`${serviceName}-router`] = {
        rule: `PathPrefix(\`/api/${serviceName}\`)`,
        service: `${serviceName}-service`,
        entryPoints: ['web'],
        middlewares: [`strip-${serviceName}`, 'rate-limit'],
      };

      // Service
      dynamicConfig.http.services[`${serviceName}-service`] = {
        loadBalancer: {
          servers: [
            { url: `http://${serviceName}-service:${defaultPort}` },
          ],
          healthCheck: {
            path: '/health',
            interval: '10s',
            timeout: '3s',
          },
        },
      };

      // Strip prefix middleware for this service
      dynamicConfig.http.middlewares[`strip-${serviceName}`] = {
        stripPrefix: {
          prefixes: [`/api/${serviceName}`],
        },
      };
    }

    // Add common middlewares
    dynamicConfig.http.middlewares['rate-limit'] = {
      rateLimit: {
        average: 100,
        burst: 50,
      },
    };

    dynamicConfig.http.middlewares['secure-headers'] = {
      headers: {
        customResponseHeaders: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
        },
      },
    };

    return this.toYaml(dynamicConfig);
  }

  /**
   * Generate router configuration for a single service
   * @param {string} serviceName - Service name
   * @param {number} port - Service port
   * @returns {string} YAML configuration
   */
  generateServiceRouter(serviceName, port) {
    const name = serviceName.toLowerCase();

    const routerConfig = {
      http: {
        routers: {
          [`${name}-router`]: {
            rule: `PathPrefix(\`/api/${name}\`)`,
            service: `${name}-service`,
            entryPoints: ['web'],
            middlewares: [`strip-${name}`],
          },
        },
        services: {
          [`${name}-service`]: {
            loadBalancer: {
              servers: [
                { url: `http://${name}-service:${port}` },
              ],
            },
          },
        },
        middlewares: {
          [`strip-${name}`]: {
            stripPrefix: {
              prefixes: [`/api/${name}`],
            },
          },
        },
      },
    };

    return this.toYaml(routerConfig);
  }

  /**
   * Generate common middlewares configuration
   * @returns {string} YAML configuration
   */
  generateMiddlewares() {
    const middlewaresConfig = {
      http: {
        middlewares: {
          'rate-limit': {
            rateLimit: {
              average: 100,
              burst: 50,
            },
          },
          'strip-api': {
            stripPrefix: {
              prefixes: ['/api'],
            },
          },
          'secure-headers': {
            headers: {
              customResponseHeaders: {
                'X-Frame-Options': 'DENY',
                'X-Content-Type-Options': 'nosniff',
                'X-XSS-Protection': '1; mode=block',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
              },
            },
          },
        },
      },
    };

    return this.toYaml(middlewaresConfig);
  }

  /**
   * Generate TLS configuration with Let's Encrypt
   * @param {string} domain - Domain for certificate
   * @returns {string} YAML configuration
   */
  generateTlsConfig(domain) {
    const tlsConfig = {
      certificatesResolvers: {
        letsencrypt: {
          acme: {
            email: `admin@${domain}`,
            storage: '/etc/traefik/acme.json',
            httpChallenge: {
              entryPoint: 'web',
            },
          },
        },
      },
      tls: {
        options: {
          default: {
            minVersion: 'VersionTLS12',
            sniStrict: true,
          },
        },
        certificates: [
          {
            certFile: `/etc/traefik/certs/${domain}.crt`,
            keyFile: `/etc/traefik/certs/${domain}.key`,
          },
        ],
      },
    };

    return this.toYaml(tlsConfig);
  }

  /**
   * Simple YAML serializer
   * @param {Object} obj - Object to serialize
   * @param {number} indent - Current indentation level
   * @returns {string} YAML string
   */
  toYaml(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            // For array of objects, use dash notation
            const itemYaml = this.toYaml(item, 0).trim().split('\n');
            yaml += `${spaces}  - ${itemYaml[0]}\n`;
            for (let i = 1; i < itemYaml.length; i++) {
              yaml += `${spaces}    ${itemYaml[i]}\n`;
            }
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.toYaml(value, indent + 1);
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }
}

module.exports = { TraefikConfig };
