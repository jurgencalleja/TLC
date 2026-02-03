/**
 * Pod Security Tests
 */
import { describe, it, expect } from 'vitest';
import { generateSecurityContext, enforceRestricted, blockPrivileged, setSeccomp, createPodSecurity } from './pod-security.js';

describe('pod-security', () => {
  describe('generateSecurityContext', () => {
    it('generates restricted security context', () => {
      const ctx = generateSecurityContext({ level: 'restricted' });
      expect(ctx.runAsNonRoot).toBe(true);
      expect(ctx.readOnlyRootFilesystem).toBe(true);
    });

    it('drops all capabilities', () => {
      const ctx = generateSecurityContext({ level: 'restricted' });
      expect(ctx.capabilities.drop).toContain('ALL');
    });
  });

  describe('enforceRestricted', () => {
    it('enforces Pod Security Standards', () => {
      const labels = enforceRestricted({ namespace: 'default' });
      expect(labels['pod-security.kubernetes.io/enforce']).toBe('restricted');
    });
  });

  describe('blockPrivileged', () => {
    it('blocks privileged containers', () => {
      const ctx = blockPrivileged({});
      expect(ctx.privileged).toBe(false);
    });

    it('blocks host namespaces', () => {
      const spec = blockPrivileged({ includeHostSettings: true });
      expect(spec.hostNetwork).toBe(false);
      expect(spec.hostPID).toBe(false);
    });
  });

  describe('setSeccomp', () => {
    it('sets RuntimeDefault seccomp', () => {
      const profile = setSeccomp({ type: 'RuntimeDefault' });
      expect(profile.type).toBe('RuntimeDefault');
    });
  });

  describe('createPodSecurity', () => {
    it('creates security manager', () => {
      const manager = createPodSecurity();
      expect(manager.generate).toBeDefined();
      expect(manager.validate).toBeDefined();
    });
  });
});
