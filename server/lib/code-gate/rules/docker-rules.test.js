/**
 * Docker Rules Tests
 *
 * Detects dangerous Docker patterns: external volumes,
 * missing volume names, and destructive commands.
 */
import { describe, it, expect } from 'vitest';

const {
  checkExternalVolumes,
  checkMissingVolumeNames,
  checkDangerousDockerCommands,
} = require('./docker-rules.js');

describe('Docker Rules', () => {
  describe('checkExternalVolumes', () => {
    it('detects external: true in docker-compose', () => {
      const yaml = `
volumes:
  postgres_data:
    external: true
      `;
      const findings = checkExternalVolumes('docker-compose.yml', yaml);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('block');
      expect(findings[0].rule).toBe('no-external-volumes');
    });

    it('passes without external flag', () => {
      const yaml = `
volumes:
  postgres_data:
    name: myapp_postgres_data
      `;
      const findings = checkExternalVolumes('docker-compose.yml', yaml);
      expect(findings).toHaveLength(0);
    });

    it('only checks docker-compose files', () => {
      const yaml = 'external: true';
      const findings = checkExternalVolumes('src/config.yml', yaml);
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkMissingVolumeNames', () => {
    it('detects volumes without name property', () => {
      const yaml = `
volumes:
  postgres_data:
    driver: local
  redis_data:
      `;
      const findings = checkMissingVolumeNames('docker-compose.yml', yaml);
      expect(findings).toHaveLength(2); // both volumes lack name:
      expect(findings[0].severity).toBe('warn');
      expect(findings[0].rule).toBe('require-volume-names');
    });

    it('passes volume with explicit name', () => {
      const yaml = `
volumes:
  postgres_data:
    name: myapp_postgres_data
      `;
      const findings = checkMissingVolumeNames('docker-compose.yml', yaml);
      expect(findings).toHaveLength(0);
    });

    it('only checks docker-compose files', () => {
      const yaml = 'volumes:\n  data:\n    driver: local';
      const findings = checkMissingVolumeNames('src/config.ts', yaml);
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkDangerousDockerCommands', () => {
    it('detects docker compose down -v', () => {
      const script = '#!/bin/bash\ndocker compose down -v\necho "Done"';
      const findings = checkDangerousDockerCommands('scripts/reset.sh', script);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('block');
      expect(findings[0].rule).toBe('no-dangerous-docker');
    });

    it('detects docker volume rm', () => {
      const script = 'docker volume rm myapp_postgres_data';
      const findings = checkDangerousDockerCommands('scripts/cleanup.sh', script);
      expect(findings).toHaveLength(1);
    });

    it('allows docker compose down without -v', () => {
      const script = 'docker compose down\necho "Stopped"';
      const findings = checkDangerousDockerCommands('scripts/stop.sh', script);
      expect(findings).toHaveLength(0);
    });

    it('checks shell scripts and CI files', () => {
      const script = 'docker compose down -v';
      const findings = checkDangerousDockerCommands('.github/workflows/ci.yml', script);
      expect(findings).toHaveLength(1);
    });
  });
});
