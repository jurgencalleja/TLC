/**
 * Deploy Script Generator Tests
 */
import { describe, it, expect } from 'vitest';
import { generateBlueGreenScript, generateRollingScript, addHealthVerification, addRollbackSupport, generateHooks, createDeployScriptGenerator } from './deploy-script.js';

describe('deploy-script', () => {
  describe('generateBlueGreenScript', () => {
    it('generates blue-green deploy script', () => {
      const script = generateBlueGreenScript({ service: 'app' });
      expect(script).toContain('blue');
      expect(script).toContain('green');
    });
  });

  describe('generateRollingScript', () => {
    it('generates rolling update script', () => {
      const script = generateRollingScript({ service: 'app', replicas: 3 });
      expect(script).toContain('rolling');
    });
  });

  describe('addHealthVerification', () => {
    it('includes health check', () => {
      const script = addHealthVerification({ endpoint: '/health' });
      expect(script).toContain('health');
      expect(script).toContain('curl');
    });
  });

  describe('addRollbackSupport', () => {
    it('supports rollback on failure', () => {
      const script = addRollbackSupport({});
      expect(script).toContain('rollback');
    });
  });

  describe('generateHooks', () => {
    it('generates pre/post hooks', () => {
      const hooks = generateHooks({ pre: 'npm run migrate', post: 'npm run notify' });
      expect(hooks.pre).toContain('migrate');
      expect(hooks.post).toContain('notify');
    });
  });

  describe('createDeployScriptGenerator', () => {
    it('creates generator', () => {
      const generator = createDeployScriptGenerator();
      expect(generator.blueGreen).toBeDefined();
      expect(generator.rolling).toBeDefined();
    });
  });
});
