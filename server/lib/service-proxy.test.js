import { describe, it, expect } from 'vitest';
import {
  createProxyConfig,
  buildProxyMap,
  getEmbedUrl,
  parsePortMapping,
  extractServicesFromContainers,
  generateNginxConfig,
} from './service-proxy.js';

describe('service-proxy', () => {
  describe('createProxyConfig', () => {
    it('creates proxy config with target URL', () => {
      const service = { name: 'api', port: 3000 };

      const config = createProxyConfig(service);

      expect(config.target).toBe('http://localhost:3000');
      expect(config.changeOrigin).toBe(true);
      expect(config.ws).toBe(true);
    });

    it('uses custom host when provided', () => {
      const service = { name: 'api', port: 3000, host: '192.168.1.100' };

      const config = createProxyConfig(service);

      expect(config.target).toBe('http://192.168.1.100:3000');
    });

    it('includes path rewrite for service name', () => {
      const service = { name: 'web', port: 8080 };

      const config = createProxyConfig(service);

      expect(config.pathRewrite['^/proxy/web']).toBe('');
    });

    it('includes onError handler', () => {
      const service = { name: 'api', port: 3000 };

      const config = createProxyConfig(service);

      expect(typeof config.onError).toBe('function');
    });
  });

  describe('buildProxyMap', () => {
    it('builds proxy map for multiple services', () => {
      const services = [
        { name: 'api', port: 3001 },
        { name: 'web', port: 3002 },
      ];

      const proxyMap = buildProxyMap(services);

      expect(proxyMap['/proxy/api']).toBeDefined();
      expect(proxyMap['/proxy/web']).toBeDefined();
      expect(proxyMap['/proxy/api'].target).toBe('http://localhost:3001');
      expect(proxyMap['/proxy/web'].target).toBe('http://localhost:3002');
    });

    it('returns empty map for no services', () => {
      const proxyMap = buildProxyMap([]);

      expect(Object.keys(proxyMap)).toHaveLength(0);
    });
  });

  describe('getEmbedUrl', () => {
    it('generates embed URL for service', () => {
      const service = { name: 'app', port: 3000 };

      const url = getEmbedUrl(service);

      expect(url).toBe('http://localhost:3147/proxy/app');
    });

    it('uses custom dashboard host and port', () => {
      const service = { name: 'api', port: 3000 };
      const options = { dashboardHost: '192.168.1.100', dashboardPort: 8080 };

      const url = getEmbedUrl(service, options);

      expect(url).toBe('http://192.168.1.100:8080/proxy/api');
    });
  });

  describe('parsePortMapping', () => {
    it('parses simple port number', () => {
      const result = parsePortMapping('3000');

      expect(result.hostPort).toBe(3000);
      expect(result.containerPort).toBe(3000);
    });

    it('parses host:container format', () => {
      const result = parsePortMapping('8080:3000');

      expect(result.hostPort).toBe(8080);
      expect(result.containerPort).toBe(3000);
    });

    it('parses ip:host:container format', () => {
      const result = parsePortMapping('127.0.0.1:8080:3000');

      expect(result.ip).toBe('127.0.0.1');
      expect(result.hostPort).toBe(8080);
      expect(result.containerPort).toBe(3000);
    });
  });

  describe('extractServicesFromContainers', () => {
    it('extracts services from running containers', () => {
      const containers = [
        {
          name: 'myapp-api-1',
          state: 'running',
          ports: '0.0.0.0:3001->3000/tcp',
          status: 'Up 5 minutes',
        },
        {
          name: 'myapp-web-1',
          state: 'running',
          ports: '0.0.0.0:3002->3000/tcp',
          status: 'Up 5 minutes',
        },
      ];

      const services = extractServicesFromContainers(containers);

      expect(services).toHaveLength(2);
      expect(services[0].name).toBe('myapp-api');
      expect(services[0].port).toBe(3001);
      expect(services[1].name).toBe('myapp-web');
      expect(services[1].port).toBe(3002);
    });

    it('filters out stopped containers', () => {
      const containers = [
        { name: 'api-1', state: 'running', ports: '3000->3000', status: 'Up' },
        { name: 'db-1', state: 'exited', ports: '', status: 'Exited' },
      ];

      const services = extractServicesFromContainers(containers);

      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('api');
    });

    it('handles containers without ports', () => {
      const containers = [
        { name: 'worker-1', state: 'running', ports: '', status: 'Up' },
      ];

      const services = extractServicesFromContainers(containers);

      expect(services).toHaveLength(0);
    });
  });

  describe('generateNginxConfig', () => {
    it('generates nginx config with service locations', () => {
      const services = [
        { name: 'api', port: 3001 },
        { name: 'web', port: 3002 },
      ];

      const config = generateNginxConfig(services);

      expect(config).toContain('listen 3147');
      expect(config).toContain('location /proxy/api/');
      expect(config).toContain('proxy_pass http://localhost:3001');
      expect(config).toContain('location /proxy/web/');
      expect(config).toContain('proxy_pass http://localhost:3002');
    });

    it('uses custom server name and port', () => {
      const services = [{ name: 'app', port: 3000 }];
      const options = { serverName: 'myapp.local', dashboardPort: 8080 };

      const config = generateNginxConfig(services, options);

      expect(config).toContain('listen 8080');
      expect(config).toContain('server_name myapp.local');
    });

    it('includes WebSocket upgrade headers', () => {
      const services = [{ name: 'api', port: 3000 }];

      const config = generateNginxConfig(services);

      expect(config).toContain('proxy_http_version 1.1');
      expect(config).toContain('Upgrade $http_upgrade');
      expect(config).toContain('Connection "upgrade"');
    });
  });
});
