/**
 * Network Policy Generator Tests
 */
import { describe, it, expect } from 'vitest';
import { generateDefaultDeny, createIngressRule, createEgressRule, validatePolicy, createNetworkPolicyGenerator } from './network-policy.js';

describe('network-policy', () => {
  describe('generateDefaultDeny', () => {
    it('generates default deny all policy', () => {
      const policy = generateDefaultDeny({ namespace: 'default' });
      expect(policy.kind).toBe('NetworkPolicy');
      expect(policy.spec.policyTypes).toContain('Ingress');
      expect(policy.spec.policyTypes).toContain('Egress');
    });
  });

  describe('createIngressRule', () => {
    it('creates ingress allow rule', () => {
      const rule = createIngressRule({ from: [{ podSelector: { matchLabels: { app: 'frontend' } } }], port: 80 });
      expect(rule.from).toBeDefined();
      expect(rule.ports[0].port).toBe(80);
    });
  });

  describe('createEgressRule', () => {
    it('creates egress allow rule', () => {
      const rule = createEgressRule({ to: [{ ipBlock: { cidr: '10.0.0.0/8' } }], port: 443 });
      expect(rule.to).toBeDefined();
    });

    it('filters to specific CIDRs', () => {
      const rule = createEgressRule({ to: [{ ipBlock: { cidr: '0.0.0.0/0', except: ['10.0.0.0/8'] } }] });
      expect(rule.to[0].ipBlock.except).toContain('10.0.0.0/8');
    });
  });

  describe('validatePolicy', () => {
    it('validates policy syntax', () => {
      const policy = { apiVersion: 'networking.k8s.io/v1', kind: 'NetworkPolicy', metadata: { name: 'test' }, spec: { podSelector: {} } };
      const result = validatePolicy(policy);
      expect(result.valid).toBe(true);
    });
  });

  describe('createNetworkPolicyGenerator', () => {
    it('creates generator', () => {
      const generator = createNetworkPolicyGenerator();
      expect(generator.defaultDeny).toBeDefined();
      expect(generator.allowIngress).toBeDefined();
      expect(generator.allowEgress).toBeDefined();
    });
  });
});
