/**
 * Database Configuration Tests
 */
import { describe, it, expect } from 'vitest';
import { generatePostgresConfig, generatePgHba, generateRedisConfig, createDatabaseConfig } from './database-config.js';

describe('database-config', () => {
  describe('generatePostgresConfig', () => {
    it('enables SSL', () => {
      const config = generatePostgresConfig({ ssl: true });
      expect(config).toContain('ssl = on');
    });

    it('configures connection pooling', () => {
      const config = generatePostgresConfig({ maxConnections: 100 });
      expect(config).toContain('max_connections = 100');
    });
  });

  describe('generatePgHba', () => {
    it('configures authentication rules', () => {
      const config = generatePgHba({ rules: [{ type: 'host', database: 'all', user: 'all', address: '0.0.0.0/0', method: 'md5' }] });
      expect(config).toContain('host');
      expect(config).toContain('md5');
    });
  });

  describe('generateRedisConfig', () => {
    it('enables auth', () => {
      const config = generateRedisConfig({ requirepass: 'secret' });
      expect(config).toContain('requirepass');
    });

    it('enables TLS', () => {
      const config = generateRedisConfig({ tls: true });
      expect(config).toContain('tls-port');
    });
  });

  describe('createDatabaseConfig', () => {
    it('creates config manager', () => {
      const manager = createDatabaseConfig();
      expect(manager.generatePostgres).toBeDefined();
      expect(manager.generateRedis).toBeDefined();
    });
  });
});
