/**
 * Evidence Collector Tests
 * TDD: RED phase - Write failing tests first
 *
 * Tests for collecting and organizing compliance evidence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Mock the dependency modules
vi.mock('./security-policy-generator.js', () => ({
  generateAccessControlPolicy: vi.fn(() => ({
    title: 'Access Control Policy',
    version: '1.0',
    sections: [{ heading: 'Purpose', content: 'Test content' }],
  })),
  generateDataProtectionPolicy: vi.fn(() => ({
    title: 'Data Protection Policy',
    version: '1.0',
    sections: [{ heading: 'Purpose', content: 'Test content' }],
  })),
  generateIncidentResponsePolicy: vi.fn(() => ({
    title: 'Incident Response Policy',
    version: '1.0',
    sections: [{ heading: 'Purpose', content: 'Test content' }],
  })),
  generateAuthPolicy: vi.fn(() => ({
    title: 'Auth Policy',
    version: '1.0',
    sections: [{ heading: 'Purpose', content: 'Test content' }],
  })),
  generateAcceptableUsePolicy: vi.fn(() => ({
    title: 'Acceptable Use Policy',
    version: '1.0',
    sections: [{ heading: 'Purpose', content: 'Test content' }],
  })),
}));

vi.mock('./access-control-doc.js', () => ({
  exportAsEvidence: vi.fn(() => ({
    version: '1.0',
    exportDate: new Date().toISOString(),
    users: [
      { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
    ],
    roles: { admin: { permissions: ['*'] } },
    accessMatrix: {},
  })),
  listUsers: vi.fn(() => [
    { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
  ]),
  listRoles: vi.fn(() => ({
    admin: { permissions: ['*'], description: 'Admin role' },
  })),
}));

vi.mock('./data-flow-doc.js', () => ({
  DataFlowDocumenter: vi.fn().mockImplementation(() => ({
    getFlows: vi.fn(() => [
      {
        id: 'flow-1',
        name: 'User Registration',
        source: { type: 'user_input', name: 'Registration Form' },
        destination: { type: 'database', name: 'users' },
        sensitivity: 'high',
      },
    ]),
  })),
  exportDataFlowReport: vi.fn(() => ({
    title: 'Data Flow Report',
    flows: [],
    dataInventory: [],
  })),
}));

import {
  createEvidenceCollector,
  collectAuditLogs,
  collectAccessSnapshot,
  collectPolicyDocuments,
  collectConfigSnapshot,
  timestampEvidence,
  hashEvidence,
  verifyEvidence,
  packageEvidence,
  getEvidenceInventory,
  linkEvidenceToControl,
  SOC2_CONTROLS,
} from './evidence-collector.js';

describe('evidence-collector', () => {
  let testDir;
  let tlcJsonPath;
  let auditLogPath;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tlc-evidence-test-'));
    tlcJsonPath = path.join(testDir, '.tlc.json');
    auditLogPath = path.join(testDir, 'audit.log');

    // Create test .tlc.json
    const tlcConfig = {
      project: 'TestProject',
      version: '1.0.0',
      security: {
        audit: { enabled: true },
        policies: { organization: 'Test Org' },
      },
    };
    await fs.writeFile(tlcJsonPath, JSON.stringify(tlcConfig, null, 2));

    // Create test audit log
    const auditEntries = [
      { timestamp: '2026-01-15T10:00:00Z', action: 'login', userId: 'user1', success: true },
      { timestamp: '2026-01-15T11:00:00Z', action: 'task.claim', userId: 'user2', taskId: 'task-1' },
      { timestamp: '2026-01-20T09:00:00Z', action: 'deploy', userId: 'user1', environment: 'staging' },
    ];
    await fs.writeFile(auditLogPath, auditEntries.map(e => JSON.stringify(e)).join('\n'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('collectAuditLogs', () => {
    it('gathers audit entries from log file', async () => {
      const result = await collectAuditLogs(auditLogPath);

      expect(result).toHaveProperty('type', 'audit_log');
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveProperty('entries');
      expect(result.content.entries).toHaveLength(3);
    });

    it('filters by date range', async () => {
      const result = await collectAuditLogs(auditLogPath, {
        from: '2026-01-10',
        to: '2026-01-16',
      });

      expect(result.content.entries).toHaveLength(2);
      expect(result.metadata.period.start).toBe('2026-01-10');
      expect(result.metadata.period.end).toBe('2026-01-16');
    });

    it('filters by action type', async () => {
      const result = await collectAuditLogs(auditLogPath, {
        actions: ['login'],
      });

      expect(result.content.entries).toHaveLength(1);
      expect(result.content.entries[0].action).toBe('login');
    });

    it('filters by user', async () => {
      const result = await collectAuditLogs(auditLogPath, {
        userId: 'user1',
      });

      expect(result.content.entries).toHaveLength(2);
      expect(result.content.entries.every(e => e.userId === 'user1')).toBe(true);
    });

    it('returns empty entries when no log file exists', async () => {
      const result = await collectAuditLogs('/nonexistent/path/audit.log');

      expect(result.content.entries).toEqual([]);
      expect(result.content.error).toBe('Audit log not found');
    });

    it('includes metadata about collection', async () => {
      const result = await collectAuditLogs(auditLogPath);

      expect(result).toHaveProperty('collectedAt');
      expect(result).toHaveProperty('collectedBy', 'system');
      expect(result.metadata).toHaveProperty('source', auditLogPath);
      expect(result.metadata).toHaveProperty('totalEntries', 3);
    });
  });

  describe('collectAccessSnapshot', () => {
    it('captures current access state', async () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
        { id: '2', email: 'bob@example.com', name: 'Bob', role: 'engineer' },
      ];

      const result = await collectAccessSnapshot(users);

      expect(result).toHaveProperty('type', 'access_snapshot');
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveProperty('users');
      expect(result.content).toHaveProperty('roles');
    });

    it('includes permission matrix', async () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
      ];

      const result = await collectAccessSnapshot(users);

      expect(result.content).toHaveProperty('accessMatrix');
    });

    it('snapshots at specific point in time', async () => {
      const users = [];
      const result = await collectAccessSnapshot(users);

      expect(result).toHaveProperty('collectedAt');
      expect(new Date(result.collectedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('includes SSO mappings when config provided', async () => {
      const users = [];
      const config = {
        sso: {
          roleMappings: [{ pattern: '^admin$', role: 'admin', priority: 1 }],
        },
      };

      const result = await collectAccessSnapshot(users, { config });

      expect(result.content).toHaveProperty('ssoMappings');
    });
  });

  describe('collectPolicyDocuments', () => {
    it('gathers all policy documents', async () => {
      const result = await collectPolicyDocuments();

      expect(result).toHaveProperty('type', 'policy');
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveProperty('policies');
      expect(result.content.policies.length).toBeGreaterThan(0);
    });

    it('includes specific policy types', async () => {
      const result = await collectPolicyDocuments({
        types: ['accessControl', 'dataProtection'],
      });

      expect(result.content.policies).toHaveLength(2);
      expect(result.content.policies.map(p => p.type)).toContain('accessControl');
      expect(result.content.policies.map(p => p.type)).toContain('dataProtection');
    });

    it('includes policy metadata', async () => {
      const result = await collectPolicyDocuments();

      expect(result.content.policies[0]).toHaveProperty('type');
      expect(result.content.policies[0]).toHaveProperty('document');
      expect(result.content.policies[0].document).toHaveProperty('title');
      expect(result.content.policies[0].document).toHaveProperty('version');
    });

    it('customizes policies with organization', async () => {
      const result = await collectPolicyDocuments({
        organization: 'Acme Corp',
      });

      expect(result.metadata).toHaveProperty('organization', 'Acme Corp');
    });
  });

  describe('collectConfigSnapshot', () => {
    it('captures .tlc.json configuration', async () => {
      const result = await collectConfigSnapshot(testDir);

      expect(result).toHaveProperty('type', 'config');
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveProperty('project', 'TestProject');
    });

    it('includes security configuration', async () => {
      const result = await collectConfigSnapshot(testDir);

      expect(result.content).toHaveProperty('security');
      expect(result.content.security).toHaveProperty('audit');
    });

    it('sanitizes sensitive values', async () => {
      // Add sensitive data to config
      const configWithSecrets = {
        project: 'TestProject',
        apiKey: 'secret-key-123',
        database: {
          password: 'db-password',
        },
      };
      await fs.writeFile(tlcJsonPath, JSON.stringify(configWithSecrets, null, 2));

      const result = await collectConfigSnapshot(testDir);

      expect(result.content.apiKey).toBe('[REDACTED]');
      expect(result.content.database.password).toBe('[REDACTED]');
    });

    it('handles missing config file', async () => {
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tlc-empty-'));

      const result = await collectConfigSnapshot(emptyDir);

      expect(result.content).toHaveProperty('error', 'Configuration not found');

      await fs.rm(emptyDir, { recursive: true, force: true });
    });

    it('includes file metadata', async () => {
      const result = await collectConfigSnapshot(testDir);

      expect(result.metadata).toHaveProperty('path');
      expect(result.metadata).toHaveProperty('lastModified');
    });
  });

  describe('timestampEvidence', () => {
    it('adds collection timestamp', () => {
      const evidence = { type: 'audit_log', content: {} };

      const result = timestampEvidence(evidence);

      expect(result).toHaveProperty('collectedAt');
      expect(new Date(result.collectedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('uses ISO 8601 format', () => {
      const evidence = { type: 'audit_log', content: {} };

      const result = timestampEvidence(evidence);

      // ISO 8601 format check
      expect(result.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('adds collector identifier', () => {
      const evidence = { type: 'audit_log', content: {} };

      const result = timestampEvidence(evidence, { collectedBy: 'admin@example.com' });

      expect(result).toHaveProperty('collectedBy', 'admin@example.com');
    });

    it('defaults collector to system', () => {
      const evidence = { type: 'audit_log', content: {} };

      const result = timestampEvidence(evidence);

      expect(result).toHaveProperty('collectedBy', 'system');
    });

    it('preserves existing evidence properties', () => {
      const evidence = {
        type: 'audit_log',
        content: { data: 'test' },
        metadata: { source: 'test' },
      };

      const result = timestampEvidence(evidence);

      expect(result.type).toBe('audit_log');
      expect(result.content.data).toBe('test');
      expect(result.metadata.source).toBe('test');
    });
  });

  describe('hashEvidence', () => {
    it('generates SHA-256 hash of content', () => {
      const evidence = {
        type: 'audit_log',
        content: { entries: [{ action: 'login' }] },
      };

      const result = hashEvidence(evidence);

      expect(result).toHaveProperty('hash');
      expect(result.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('produces consistent hashes for same content', () => {
      const evidence = {
        type: 'audit_log',
        content: { entries: [{ action: 'login' }] },
      };

      const result1 = hashEvidence(evidence);
      const result2 = hashEvidence(evidence);

      expect(result1.hash).toBe(result2.hash);
    });

    it('produces different hashes for different content', () => {
      const evidence1 = {
        type: 'audit_log',
        content: { entries: [{ action: 'login' }] },
      };
      const evidence2 = {
        type: 'audit_log',
        content: { entries: [{ action: 'logout' }] },
      };

      const result1 = hashEvidence(evidence1);
      const result2 = hashEvidence(evidence2);

      expect(result1.hash).not.toBe(result2.hash);
    });

    it('includes hash algorithm in prefix', () => {
      const evidence = { type: 'audit_log', content: {} };

      const result = hashEvidence(evidence);

      expect(result.hash.startsWith('sha256:')).toBe(true);
    });

    it('preserves existing evidence properties', () => {
      const evidence = {
        type: 'audit_log',
        content: { data: 'test' },
        collectedAt: '2026-02-02T10:00:00Z',
      };

      const result = hashEvidence(evidence);

      expect(result.type).toBe('audit_log');
      expect(result.content.data).toBe('test');
      expect(result.collectedAt).toBe('2026-02-02T10:00:00Z');
    });
  });

  describe('verifyEvidence', () => {
    it('validates hash integrity', () => {
      const evidence = {
        type: 'audit_log',
        content: { entries: [{ action: 'login' }] },
      };
      const hashed = hashEvidence(evidence);

      const result = verifyEvidence(hashed);

      expect(result).toHaveProperty('valid', true);
    });

    it('detects tampered content', () => {
      const evidence = {
        type: 'audit_log',
        content: { entries: [{ action: 'login' }] },
      };
      const hashed = hashEvidence(evidence);

      // Tamper with content
      hashed.content.entries[0].action = 'logout';

      const result = verifyEvidence(hashed);

      expect(result).toHaveProperty('valid', false);
      expect(result).toHaveProperty('reason', 'Hash mismatch');
    });

    it('returns false for missing hash', () => {
      const evidence = {
        type: 'audit_log',
        content: { entries: [] },
      };

      const result = verifyEvidence(evidence);

      expect(result).toHaveProperty('valid', false);
      expect(result).toHaveProperty('reason', 'No hash present');
    });

    it('includes computed and stored hashes on mismatch', () => {
      const evidence = {
        type: 'audit_log',
        content: { entries: [{ action: 'login' }] },
        hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      };

      const result = verifyEvidence(evidence);

      expect(result).toHaveProperty('storedHash');
      expect(result).toHaveProperty('computedHash');
      expect(result.storedHash).not.toBe(result.computedHash);
    });
  });

  describe('packageEvidence', () => {
    it('creates ZIP archive of evidence items', async () => {
      const items = [
        {
          id: 'evidence-001',
          type: 'audit_log',
          title: 'Audit Log',
          content: { entries: [] },
          collectedAt: '2026-02-02T10:00:00Z',
          hash: 'sha256:abc123',
        },
      ];

      const result = await packageEvidence(items, { outputDir: testDir });

      expect(result).toHaveProperty('path');
      expect(result.path).toMatch(/\.zip$/);
    });

    it('includes manifest file in package', async () => {
      const items = [
        {
          id: 'evidence-001',
          type: 'audit_log',
          title: 'Audit Log',
          content: { entries: [] },
          collectedAt: '2026-02-02T10:00:00Z',
          hash: 'sha256:abc123',
        },
      ];

      const result = await packageEvidence(items, { outputDir: testDir });

      expect(result).toHaveProperty('manifest');
      expect(result.manifest).toHaveProperty('items');
      expect(result.manifest.items).toHaveLength(1);
    });

    it('generates unique package filename', async () => {
      const items = [];

      const result1 = await packageEvidence(items, { outputDir: testDir });
      const result2 = await packageEvidence(items, { outputDir: testDir });

      expect(result1.path).not.toBe(result2.path);
    });

    it('includes package hash', async () => {
      const items = [];

      const result = await packageEvidence(items, { outputDir: testDir });

      expect(result).toHaveProperty('hash');
      expect(result.hash).toMatch(/^sha256:/);
    });

    it('supports custom package name', async () => {
      const items = [];

      const result = await packageEvidence(items, {
        outputDir: testDir,
        name: 'q4-2025-evidence',
      });

      expect(result.path).toContain('q4-2025-evidence');
    });
  });

  describe('getEvidenceInventory', () => {
    it('lists all collected evidence items', () => {
      const collector = createEvidenceCollector();

      collector.add({
        id: 'evidence-001',
        type: 'audit_log',
        title: 'Audit Log Q1',
        collectedAt: '2026-02-02T10:00:00Z',
      });
      collector.add({
        id: 'evidence-002',
        type: 'access_snapshot',
        title: 'Access Snapshot',
        collectedAt: '2026-02-02T11:00:00Z',
      });

      const inventory = getEvidenceInventory(collector);

      expect(inventory).toHaveLength(2);
      expect(inventory[0]).toHaveProperty('id', 'evidence-001');
      expect(inventory[1]).toHaveProperty('id', 'evidence-002');
    });

    it('includes evidence metadata', () => {
      const collector = createEvidenceCollector();

      collector.add({
        id: 'evidence-001',
        type: 'audit_log',
        title: 'Audit Log',
        collectedAt: '2026-02-02T10:00:00Z',
        hash: 'sha256:abc123',
        controls: ['CC6.1'],
      });

      const inventory = getEvidenceInventory(collector);

      expect(inventory[0]).toHaveProperty('type', 'audit_log');
      expect(inventory[0]).toHaveProperty('title', 'Audit Log');
      expect(inventory[0]).toHaveProperty('collectedAt');
      expect(inventory[0]).toHaveProperty('hash');
      expect(inventory[0]).toHaveProperty('controls');
    });

    it('filters by type', () => {
      const collector = createEvidenceCollector();

      collector.add({ id: 'e1', type: 'audit_log', title: 'Audit 1' });
      collector.add({ id: 'e2', type: 'access_snapshot', title: 'Access 1' });
      collector.add({ id: 'e3', type: 'audit_log', title: 'Audit 2' });

      const inventory = getEvidenceInventory(collector, { type: 'audit_log' });

      expect(inventory).toHaveLength(2);
      expect(inventory.every(e => e.type === 'audit_log')).toBe(true);
    });

    it('filters by control', () => {
      const collector = createEvidenceCollector();

      collector.add({ id: 'e1', type: 'audit_log', title: 'Audit 1', controls: ['CC6.1', 'CC6.2'] });
      collector.add({ id: 'e2', type: 'access_snapshot', title: 'Access 1', controls: ['CC6.3'] });

      const inventory = getEvidenceInventory(collector, { control: 'CC6.1' });

      expect(inventory).toHaveLength(1);
      expect(inventory[0].id).toBe('e1');
    });

    it('returns empty array when no evidence', () => {
      const collector = createEvidenceCollector();

      const inventory = getEvidenceInventory(collector);

      expect(inventory).toEqual([]);
    });
  });

  describe('linkEvidenceToControl', () => {
    it('maps evidence to SOC 2 control', () => {
      const evidence = {
        id: 'evidence-001',
        type: 'audit_log',
        title: 'Audit Log',
        content: {},
      };

      const result = linkEvidenceToControl(evidence, 'CC6.1');

      expect(result).toHaveProperty('controls');
      expect(result.controls).toContain('CC6.1');
    });

    it('adds multiple controls', () => {
      const evidence = {
        id: 'evidence-001',
        type: 'audit_log',
        title: 'Audit Log',
        content: {},
        controls: ['CC6.1'],
      };

      const result = linkEvidenceToControl(evidence, 'CC6.2');

      expect(result.controls).toContain('CC6.1');
      expect(result.controls).toContain('CC6.2');
    });

    it('prevents duplicate control links', () => {
      const evidence = {
        id: 'evidence-001',
        type: 'audit_log',
        title: 'Audit Log',
        content: {},
        controls: ['CC6.1'],
      };

      const result = linkEvidenceToControl(evidence, 'CC6.1');

      expect(result.controls.filter(c => c === 'CC6.1')).toHaveLength(1);
    });

    it('validates control identifier', () => {
      const evidence = {
        id: 'evidence-001',
        type: 'audit_log',
        content: {},
      };

      expect(() => linkEvidenceToControl(evidence, 'INVALID')).toThrow('Invalid SOC 2 control');
    });

    it('supports multiple controls at once', () => {
      const evidence = {
        id: 'evidence-001',
        type: 'audit_log',
        content: {},
      };

      const result = linkEvidenceToControl(evidence, ['CC6.1', 'CC6.2', 'CC6.3']);

      expect(result.controls).toHaveLength(3);
    });
  });

  describe('SOC2_CONTROLS', () => {
    it('exports SOC 2 control definitions', () => {
      expect(SOC2_CONTROLS).toBeDefined();
      expect(typeof SOC2_CONTROLS).toBe('object');
    });

    it('includes common criteria controls', () => {
      expect(SOC2_CONTROLS).toHaveProperty('CC6.1');
      expect(SOC2_CONTROLS).toHaveProperty('CC6.2');
      expect(SOC2_CONTROLS).toHaveProperty('CC6.3');
    });

    it('includes control descriptions', () => {
      expect(SOC2_CONTROLS['CC6.1']).toHaveProperty('description');
      expect(SOC2_CONTROLS['CC6.1']).toHaveProperty('category');
    });
  });

  describe('createEvidenceCollector', () => {
    it('creates collector instance', () => {
      const collector = createEvidenceCollector();

      expect(collector).toHaveProperty('add');
      expect(collector).toHaveProperty('get');
      expect(collector).toHaveProperty('getAll');
      expect(collector).toHaveProperty('remove');
      expect(collector).toHaveProperty('clear');
    });

    it('adds evidence items', () => {
      const collector = createEvidenceCollector();

      collector.add({
        id: 'evidence-001',
        type: 'audit_log',
        title: 'Audit Log',
        content: {},
      });

      expect(collector.getAll()).toHaveLength(1);
    });

    it('retrieves evidence by id', () => {
      const collector = createEvidenceCollector();

      collector.add({
        id: 'evidence-001',
        type: 'audit_log',
        title: 'Audit Log',
        content: {},
      });

      const evidence = collector.get('evidence-001');

      expect(evidence).not.toBeNull();
      expect(evidence.id).toBe('evidence-001');
    });

    it('removes evidence by id', () => {
      const collector = createEvidenceCollector();

      collector.add({
        id: 'evidence-001',
        type: 'audit_log',
        title: 'Audit Log',
        content: {},
      });

      collector.remove('evidence-001');

      expect(collector.getAll()).toHaveLength(0);
    });

    it('clears all evidence', () => {
      const collector = createEvidenceCollector();

      collector.add({ id: 'e1', type: 'audit_log', content: {} });
      collector.add({ id: 'e2', type: 'policy', content: {} });

      collector.clear();

      expect(collector.getAll()).toHaveLength(0);
    });

    it('auto-generates ID when not provided', () => {
      const collector = createEvidenceCollector();

      const evidence = collector.add({
        type: 'audit_log',
        title: 'Audit Log',
        content: {},
      });

      expect(evidence.id).toBeDefined();
      expect(evidence.id).toMatch(/^evidence-/);
    });

    it('auto-timestamps evidence', () => {
      const collector = createEvidenceCollector();

      const evidence = collector.add({
        type: 'audit_log',
        title: 'Audit Log',
        content: {},
      });

      expect(evidence.collectedAt).toBeDefined();
    });

    it('auto-hashes evidence', () => {
      const collector = createEvidenceCollector();

      const evidence = collector.add({
        type: 'audit_log',
        title: 'Audit Log',
        content: { data: 'test' },
      });

      expect(evidence.hash).toBeDefined();
      expect(evidence.hash).toMatch(/^sha256:/);
    });
  });

  describe('evidence item structure', () => {
    it('matches expected structure', async () => {
      const collector = createEvidenceCollector();

      const evidence = collector.add({
        type: 'audit_log',
        title: 'Audit Log - January 2026',
        content: { entries: [] },
        controls: ['CC6.1', 'CC6.2'],
        metadata: {
          period: { start: '2026-01-01', end: '2026-01-31' },
          source: 'audit-storage',
        },
      });

      expect(evidence).toMatchObject({
        id: expect.stringMatching(/^evidence-/),
        type: 'audit_log',
        title: 'Audit Log - January 2026',
        collectedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        collectedBy: 'system',
        hash: expect.stringMatching(/^sha256:/),
        content: { entries: [] },
        controls: ['CC6.1', 'CC6.2'],
        metadata: {
          period: { start: '2026-01-01', end: '2026-01-31' },
          source: 'audit-storage',
        },
      });
    });
  });

  describe('integration', () => {
    it('collects and packages complete evidence set', async () => {
      const collector = createEvidenceCollector();

      // Collect audit logs
      const auditEvidence = await collectAuditLogs(auditLogPath);
      collector.add({
        ...auditEvidence,
        title: 'Audit Log Q1 2026',
        controls: ['CC6.1', 'CC7.2'],
      });

      // Collect access snapshot
      const accessEvidence = await collectAccessSnapshot([
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
      ]);
      collector.add({
        ...accessEvidence,
        title: 'Access Control Snapshot',
        controls: ['CC6.1', 'CC6.3'],
      });

      // Collect policies
      const policyEvidence = await collectPolicyDocuments();
      collector.add({
        ...policyEvidence,
        title: 'Security Policies',
        controls: ['CC1.1', 'CC5.1'],
      });

      // Get inventory
      const inventory = getEvidenceInventory(collector);
      expect(inventory).toHaveLength(3);

      // Package evidence
      const pkg = await packageEvidence(collector.getAll(), { outputDir: testDir });
      expect(pkg.path).toBeDefined();
      expect(pkg.manifest.items).toHaveLength(3);
    });
  });
});
