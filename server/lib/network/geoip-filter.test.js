/**
 * GeoIP Filter Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  lookupCountry,
  isAllowedCountry,
  isBlockedCountry,
  isInternalIp,
  generateCaddyGeoip,
  generateNginxGeoip,
  GEOIP_MODES,
  createGeoipFilter,
} from './geoip-filter.js';

describe('geoip-filter', () => {
  describe('GEOIP_MODES', () => {
    it('defines mode constants', () => {
      expect(GEOIP_MODES.ALLOWLIST).toBe('allowlist');
      expect(GEOIP_MODES.BLOCKLIST).toBe('blocklist');
    });
  });

  describe('isInternalIp', () => {
    it('detects private IPv4 addresses', () => {
      expect(isInternalIp('192.168.1.1')).toBe(true);
      expect(isInternalIp('10.0.0.1')).toBe(true);
      expect(isInternalIp('172.16.0.1')).toBe(true);
    });

    it('detects localhost', () => {
      expect(isInternalIp('127.0.0.1')).toBe(true);
      expect(isInternalIp('::1')).toBe(true);
    });

    it('returns false for public IPs', () => {
      expect(isInternalIp('8.8.8.8')).toBe(false);
      expect(isInternalIp('1.1.1.1')).toBe(false);
    });

    it('handles IPv6 private ranges', () => {
      expect(isInternalIp('fc00::1')).toBe(true);
      expect(isInternalIp('fe80::1')).toBe(true);
    });
  });

  describe('lookupCountry', () => {
    it('returns country code for IP', async () => {
      const mockDb = {
        get: vi.fn().mockReturnValue({ country: { iso_code: 'US' } }),
      };

      const result = await lookupCountry('8.8.8.8', { db: mockDb });

      expect(result).toBe('US');
      expect(mockDb.get).toHaveBeenCalledWith('8.8.8.8');
    });

    it('returns null for internal IPs', async () => {
      const result = await lookupCountry('192.168.1.1', {});

      expect(result).toBe(null);
    });

    it('handles lookup errors gracefully', async () => {
      const mockDb = {
        get: vi.fn().mockImplementation(() => { throw new Error('Not found'); }),
      };

      const result = await lookupCountry('8.8.8.8', { db: mockDb });

      expect(result).toBe(null);
    });
  });

  describe('isAllowedCountry', () => {
    it('allows countries in allowlist', () => {
      const result = isAllowedCountry('US', {
        mode: 'allowlist',
        countries: ['US', 'CA', 'GB'],
      });

      expect(result).toBe(true);
    });

    it('blocks countries not in allowlist', () => {
      const result = isAllowedCountry('RU', {
        mode: 'allowlist',
        countries: ['US', 'CA', 'GB'],
      });

      expect(result).toBe(false);
    });

    it('handles null country code', () => {
      const result = isAllowedCountry(null, {
        mode: 'allowlist',
        countries: ['US'],
        allowUnknown: false,
      });

      expect(result).toBe(false);
    });

    it('can allow unknown countries', () => {
      const result = isAllowedCountry(null, {
        mode: 'allowlist',
        countries: ['US'],
        allowUnknown: true,
      });

      expect(result).toBe(true);
    });
  });

  describe('isBlockedCountry', () => {
    it('blocks countries in blocklist', () => {
      const result = isBlockedCountry('CN', {
        mode: 'blocklist',
        countries: ['CN', 'RU', 'KP'],
      });

      expect(result).toBe(true);
    });

    it('allows countries not in blocklist', () => {
      const result = isBlockedCountry('US', {
        mode: 'blocklist',
        countries: ['CN', 'RU', 'KP'],
      });

      expect(result).toBe(false);
    });
  });

  describe('generateCaddyGeoip', () => {
    it('generates Caddy geoip config', () => {
      const config = generateCaddyGeoip({
        mode: 'allowlist',
        countries: ['US', 'CA'],
        dbPath: '/usr/share/GeoIP/GeoLite2-Country.mmdb',
      });

      expect(config).toContain('maxmind_geolocation');
      expect(config).toContain('GeoLite2-Country.mmdb');
    });

    it('includes country matching', () => {
      const config = generateCaddyGeoip({
        mode: 'allowlist',
        countries: ['US', 'CA'],
      });

      expect(config).toContain('US');
      expect(config).toContain('CA');
    });

    it('configures blocklist mode', () => {
      const config = generateCaddyGeoip({
        mode: 'blocklist',
        countries: ['CN', 'RU'],
      });

      expect(config).toContain('CN');
      expect(config).toContain('RU');
      expect(config).toContain('abort');
    });
  });

  describe('generateNginxGeoip', () => {
    it('generates Nginx geoip config', () => {
      const config = generateNginxGeoip({
        mode: 'allowlist',
        countries: ['US', 'CA'],
        dbPath: '/usr/share/GeoIP/GeoLite2-Country.mmdb',
      });

      expect(config).toContain('geoip2');
      expect(config).toContain('GeoLite2-Country.mmdb');
    });

    it('generates geo map', () => {
      const config = generateNginxGeoip({
        mode: 'allowlist',
        countries: ['US', 'CA'],
      });

      expect(config).toContain('map');
      expect(config).toContain('$allowed_country');
    });

    it('includes deny rules for blocklist', () => {
      const config = generateNginxGeoip({
        mode: 'blocklist',
        countries: ['CN'],
      });

      expect(config).toContain('deny');
    });

    it('handles fallback for unknown countries', () => {
      const config = generateNginxGeoip({
        mode: 'allowlist',
        countries: ['US'],
        blockUnknown: true,
      });

      expect(config).toContain('default');
    });
  });

  describe('createGeoipFilter', () => {
    it('creates filter with methods', () => {
      const filter = createGeoipFilter({
        mode: 'allowlist',
        countries: ['US', 'CA'],
      });

      expect(filter.check).toBeDefined();
      expect(filter.lookup).toBeDefined();
      expect(filter.generateCaddy).toBeDefined();
      expect(filter.generateNginx).toBeDefined();
    });

    it('checks IP against filter', async () => {
      const mockDb = {
        get: vi.fn().mockReturnValue({ country: { iso_code: 'US' } }),
      };

      const filter = createGeoipFilter({
        mode: 'allowlist',
        countries: ['US', 'CA'],
        db: mockDb,
      });

      const result = await filter.check('8.8.8.8');
      expect(result.allowed).toBe(true);
      expect(result.country).toBe('US');
    });

    it('bypasses internal IPs', async () => {
      const filter = createGeoipFilter({
        mode: 'allowlist',
        countries: ['US'],
        bypassInternal: true,
      });

      const result = await filter.check('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.bypassed).toBe(true);
    });

    it('blocks internal IPs when configured', async () => {
      const filter = createGeoipFilter({
        mode: 'allowlist',
        countries: ['US'],
        bypassInternal: false,
      });

      const result = await filter.check('192.168.1.1');
      expect(result.allowed).toBe(false);
    });
  });
});
