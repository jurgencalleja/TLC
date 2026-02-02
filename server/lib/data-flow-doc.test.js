/**
 * Data Flow Documenter Tests
 *
 * Tests for documenting data flows through the system including:
 * - Data source identification (user input, APIs, databases)
 * - Data transformation tracking
 * - Data destination documentation
 * - Sensitivity classification
 * - Mermaid flow diagram generation
 * - Retention policy documentation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  DataFlowDocumenter,
  identifyDataSources,
  trackDataFlow,
  classifyData,
  generateFlowDiagram,
  documentRetention,
  getDataInventory,
  getDataLineage,
  exportDataFlowReport,
} from './data-flow-doc.js';

describe('DataFlowDocumenter', () => {
  let documenter;

  beforeEach(() => {
    documenter = new DataFlowDocumenter();
  });

  describe('identifyDataSources', () => {
    it('finds input points', () => {
      const code = `
        function handleSubmit(event) {
          const formData = new FormData(event.target);
          const email = document.getElementById('email').value;
          const password = document.querySelector('#password').value;
          const name = event.target.elements.name.value;
        }
      `;

      const sources = identifyDataSources(code);

      expect(sources).toBeInstanceOf(Array);
      expect(sources.some(s => s.type === 'user_input')).toBe(true);
      expect(sources.some(s => s.name.includes('form') || s.name.includes('FormData'))).toBe(true);
    });

    it('finds API endpoints', () => {
      const code = `
        app.get('/api/users', (req, res) => {});
        app.post('/api/login', (req, res) => {});
        router.put('/api/profile/:id', updateProfile);
        fetch('/api/data').then(res => res.json());
        axios.get('https://api.example.com/users');
      `;

      const sources = identifyDataSources(code);

      expect(sources).toBeInstanceOf(Array);
      expect(sources.some(s => s.type === 'api')).toBe(true);
      expect(sources.filter(s => s.type === 'api').length).toBeGreaterThanOrEqual(2);
    });

    it('finds database connections', () => {
      const code = `
        const db = new Database('./data.db');
        const pool = mysql.createPool({ host: 'localhost', database: 'mydb' });
        mongoose.connect('mongodb://localhost/myapp');
        const client = new Pool({ connectionString: process.env.DATABASE_URL });
        SELECT * FROM users WHERE id = ?;
        INSERT INTO orders (user_id, total) VALUES ($1, $2);
      `;

      const sources = identifyDataSources(code);

      expect(sources).toBeInstanceOf(Array);
      expect(sources.some(s => s.type === 'database')).toBe(true);
    });
  });

  describe('trackDataFlow', () => {
    it('documents transformations', () => {
      const flowDefinition = {
        id: 'flow-001',
        name: 'User Registration',
        source: { type: 'user_input', name: 'Registration Form' },
        steps: [
          { step: 'validation', description: 'Email format check' },
          { step: 'encryption', description: 'Password hashing' },
          { step: 'sanitization', description: 'Input sanitization' },
        ],
        destination: { type: 'database', name: 'users table' },
      };

      const flow = trackDataFlow(flowDefinition);

      expect(flow).toBeDefined();
      expect(flow.transformations).toBeInstanceOf(Array);
      expect(flow.transformations.length).toBe(3);
      expect(flow.transformations[0].step).toBe('validation');
      expect(flow.transformations[1].step).toBe('encryption');
      expect(flow.transformations[2].step).toBe('sanitization');
    });

    it('includes source and destination', () => {
      const flowDefinition = {
        id: 'flow-002',
        name: 'Order Processing',
        source: { type: 'api', name: '/api/orders' },
        steps: [
          { step: 'validation', description: 'Validate order data' },
        ],
        destination: { type: 'database', name: 'orders table' },
      };

      const flow = trackDataFlow(flowDefinition);

      expect(flow.source).toEqual({ type: 'api', name: '/api/orders' });
      expect(flow.destination).toEqual({ type: 'database', name: 'orders table' });
    });

    it('generates unique flow ID if not provided', () => {
      const flowDefinition = {
        name: 'Password Reset',
        source: { type: 'user_input', name: 'Reset Form' },
        steps: [],
        destination: { type: 'api', name: 'email service' },
      };

      const flow = trackDataFlow(flowDefinition);

      expect(flow.id).toBeDefined();
      expect(typeof flow.id).toBe('string');
      expect(flow.id.length).toBeGreaterThan(0);
    });
  });

  describe('classifyData', () => {
    it('assigns sensitivity levels', () => {
      const dataTypes = [
        { name: 'email', value: 'user@example.com' },
        { name: 'password', value: 'hashed_password' },
        { name: 'name', value: 'John Doe' },
        { name: 'ssn', value: '123-45-6789' },
        { name: 'credit_card', value: '4111111111111111' },
        { name: 'phone', value: '555-1234' },
        { name: 'address', value: '123 Main St' },
        { name: 'ip_address', value: '192.168.1.1' },
      ];

      const classifications = classifyData(dataTypes);

      expect(classifications).toBeInstanceOf(Array);
      expect(classifications.length).toBe(dataTypes.length);

      // Check sensitivity levels
      const passwordClassification = classifications.find(c => c.name === 'password');
      expect(passwordClassification.sensitivity).toBe('critical');

      const ssnClassification = classifications.find(c => c.name === 'ssn');
      expect(ssnClassification.sensitivity).toBe('critical');

      const creditCardClassification = classifications.find(c => c.name === 'credit_card');
      expect(creditCardClassification.sensitivity).toBe('critical');

      const emailClassification = classifications.find(c => c.name === 'email');
      expect(['high', 'pii']).toContain(emailClassification.sensitivity);

      const nameClassification = classifications.find(c => c.name === 'name');
      expect(['medium', 'pii']).toContain(nameClassification.sensitivity);
    });

    it('assigns low sensitivity to non-sensitive data', () => {
      const dataTypes = [
        { name: 'page_number', value: 1 },
        { name: 'sort_order', value: 'asc' },
        { name: 'timestamp', value: '2026-01-15' },
      ];

      const classifications = classifyData(dataTypes);

      expect(classifications.every(c => c.sensitivity === 'low' || c.sensitivity === 'public')).toBe(true);
    });

    it('includes classification reason', () => {
      const dataTypes = [
        { name: 'password', value: 'secret123' },
      ];

      const classifications = classifyData(dataTypes);

      expect(classifications[0].reason).toBeDefined();
      expect(typeof classifications[0].reason).toBe('string');
    });
  });

  describe('generateFlowDiagram', () => {
    it('creates Mermaid diagram', () => {
      const flow = {
        id: 'flow-001',
        name: 'User Registration',
        source: { type: 'user_input', name: 'Registration Form' },
        transformations: [
          { step: 'validation', description: 'Email format check' },
          { step: 'encryption', description: 'Password hashing' },
        ],
        destination: { type: 'database', name: 'users table' },
      };

      const diagram = generateFlowDiagram(flow);

      expect(diagram).toContain('flowchart');
      expect(diagram).toContain('Registration Form');
      expect(diagram).toContain('validation');
      expect(diagram).toContain('encryption');
      expect(diagram).toContain('users table');
    });

    it('uses correct node shapes for different types', () => {
      const flow = {
        id: 'flow-002',
        name: 'API Flow',
        source: { type: 'api', name: 'REST API' },
        transformations: [
          { step: 'parse', description: 'Parse JSON' },
        ],
        destination: { type: 'database', name: 'data store' },
      };

      const diagram = generateFlowDiagram(flow);

      // Database should use cylinder notation [( )] or similar
      expect(diagram).toMatch(/\[\(.*data store.*\)\]|\(\(.*data store.*\)\)|\[\[.*data store.*\]\]/i);
    });

    it('includes arrows between steps', () => {
      const flow = {
        id: 'flow-003',
        name: 'Simple Flow',
        source: { type: 'user_input', name: 'Form' },
        transformations: [
          { step: 'process', description: 'Process data' },
        ],
        destination: { type: 'api', name: 'External API' },
      };

      const diagram = generateFlowDiagram(flow);

      expect(diagram).toMatch(/-->/);
    });

    it('handles empty transformations', () => {
      const flow = {
        id: 'flow-004',
        name: 'Direct Flow',
        source: { type: 'user_input', name: 'Input' },
        transformations: [],
        destination: { type: 'database', name: 'Storage' },
      };

      const diagram = generateFlowDiagram(flow);

      expect(diagram).toContain('flowchart');
      expect(diagram).toContain('Input');
      expect(diagram).toContain('Storage');
      expect(diagram).toMatch(/-->/);
    });
  });

  describe('documentRetention', () => {
    it('includes retention policies', () => {
      const dataFlow = {
        id: 'flow-001',
        name: 'User Data',
        dataTypes: ['email', 'password', 'name'],
        sensitivity: 'high',
      };

      const retentionPolicy = {
        default: '3 years',
        byType: {
          password: 'Until account deletion',
          email: '7 years',
        },
        legal: 'GDPR requires deletion upon request',
      };

      const documented = documentRetention(dataFlow, retentionPolicy);

      expect(documented).toBeDefined();
      expect(documented.retention).toBeDefined();
      expect(documented.retention.default).toBe('3 years');
      expect(documented.retention.byType.password).toBe('Until account deletion');
      expect(documented.retention.legal).toContain('GDPR');
    });

    it('uses default retention when no specific policy', () => {
      const dataFlow = {
        id: 'flow-002',
        name: 'Generic Data',
        dataTypes: ['timestamp', 'page_views'],
        sensitivity: 'low',
      };

      const documented = documentRetention(dataFlow);

      expect(documented.retention).toBeDefined();
      expect(documented.retention.default).toBeDefined();
    });

    it('includes deletion procedures', () => {
      const dataFlow = {
        id: 'flow-003',
        name: 'PII Data',
        dataTypes: ['ssn', 'address'],
        sensitivity: 'critical',
      };

      const retentionPolicy = {
        default: '5 years',
        deletionProcedure: 'Secure wipe with audit trail',
      };

      const documented = documentRetention(dataFlow, retentionPolicy);

      expect(documented.retention.deletionProcedure).toBeDefined();
    });
  });

  describe('getDataInventory', () => {
    it('returns all data types', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'User Registration',
        source: { type: 'user_input', name: 'Registration Form' },
        transformations: [],
        destination: { type: 'database', name: 'users' },
        dataTypes: ['email', 'password', 'name'],
        sensitivity: 'high',
      });

      documenter.addDataFlow({
        id: 'flow-002',
        name: 'Order Processing',
        source: { type: 'api', name: '/api/orders' },
        transformations: [],
        destination: { type: 'database', name: 'orders' },
        dataTypes: ['order_id', 'product_id', 'quantity', 'total'],
        sensitivity: 'medium',
      });

      const inventory = getDataInventory(documenter);

      expect(inventory).toBeInstanceOf(Array);
      expect(inventory.length).toBeGreaterThanOrEqual(7);
      expect(inventory.some(d => d.name === 'email')).toBe(true);
      expect(inventory.some(d => d.name === 'password')).toBe(true);
      expect(inventory.some(d => d.name === 'order_id')).toBe(true);
    });

    it('includes data type metadata', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'User Data',
        source: { type: 'user_input', name: 'Form' },
        transformations: [],
        destination: { type: 'database', name: 'users' },
        dataTypes: ['email'],
        sensitivity: 'high',
      });

      const inventory = getDataInventory(documenter);
      const emailEntry = inventory.find(d => d.name === 'email');

      expect(emailEntry).toBeDefined();
      expect(emailEntry.usedInFlows).toBeDefined();
      expect(emailEntry.usedInFlows).toContain('flow-001');
    });

    it('de-duplicates data types across flows', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'Flow 1',
        source: { type: 'user_input', name: 'Form 1' },
        transformations: [],
        destination: { type: 'database', name: 'db1' },
        dataTypes: ['email', 'name'],
        sensitivity: 'high',
      });

      documenter.addDataFlow({
        id: 'flow-002',
        name: 'Flow 2',
        source: { type: 'user_input', name: 'Form 2' },
        transformations: [],
        destination: { type: 'database', name: 'db2' },
        dataTypes: ['email', 'phone'],
        sensitivity: 'medium',
      });

      const inventory = getDataInventory(documenter);
      const emailEntries = inventory.filter(d => d.name === 'email');

      expect(emailEntries.length).toBe(1);
      expect(emailEntries[0].usedInFlows).toContain('flow-001');
      expect(emailEntries[0].usedInFlows).toContain('flow-002');
    });
  });

  describe('getDataLineage', () => {
    it('traces data through system', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'User Registration',
        source: { type: 'user_input', name: 'Registration Form' },
        transformations: [
          { step: 'validation', description: 'Validate email' },
          { step: 'encryption', description: 'Hash password' },
        ],
        destination: { type: 'database', name: 'users table' },
        dataTypes: ['email', 'password'],
        sensitivity: 'high',
      });

      documenter.addDataFlow({
        id: 'flow-002',
        name: 'Email Notification',
        source: { type: 'database', name: 'users table' },
        transformations: [
          { step: 'template', description: 'Apply email template' },
        ],
        destination: { type: 'api', name: 'email service' },
        dataTypes: ['email'],
        sensitivity: 'medium',
      });

      const lineage = getDataLineage(documenter, 'email');

      expect(lineage).toBeDefined();
      expect(lineage.dataType).toBe('email');
      expect(lineage.flows).toBeInstanceOf(Array);
      expect(lineage.flows.length).toBe(2);
      expect(lineage.flows.some(f => f.id === 'flow-001')).toBe(true);
      expect(lineage.flows.some(f => f.id === 'flow-002')).toBe(true);
    });

    it('shows data path from source to destination', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'User Data Flow',
        source: { type: 'user_input', name: 'Form' },
        transformations: [
          { step: 'process', description: 'Process data' },
        ],
        destination: { type: 'database', name: 'storage' },
        dataTypes: ['user_id'],
        sensitivity: 'medium',
      });

      const lineage = getDataLineage(documenter, 'user_id');

      expect(lineage.path).toBeDefined();
      expect(lineage.path).toContain('Form');
      expect(lineage.path).toContain('storage');
    });

    it('returns empty lineage for unknown data type', () => {
      const lineage = getDataLineage(documenter, 'unknown_field');

      expect(lineage).toBeDefined();
      expect(lineage.dataType).toBe('unknown_field');
      expect(lineage.flows).toEqual([]);
    });
  });

  describe('exportDataFlowReport', () => {
    it('generates compliance format', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'User Registration',
        source: { type: 'user_input', name: 'Registration Form' },
        transformations: [
          { step: 'validation', description: 'Email format check' },
          { step: 'encryption', description: 'Password hashing' },
        ],
        destination: { type: 'database', name: 'users table' },
        dataTypes: ['email', 'password', 'name'],
        sensitivity: 'high',
        retention: '7 years',
      });

      const report = exportDataFlowReport(documenter, { format: 'compliance' });

      expect(report).toBeDefined();
      expect(report.title).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.flows).toBeInstanceOf(Array);
      expect(report.dataInventory).toBeDefined();
      expect(report.sensitivitySummary).toBeDefined();
    });

    it('includes Mermaid diagrams in report', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'Test Flow',
        source: { type: 'user_input', name: 'Input' },
        transformations: [],
        destination: { type: 'database', name: 'Storage' },
        dataTypes: ['data'],
        sensitivity: 'low',
      });

      const report = exportDataFlowReport(documenter, { includeDiagrams: true });

      expect(report.diagrams).toBeDefined();
      expect(report.diagrams['flow-001']).toContain('flowchart');
    });

    it('exports in markdown format', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'Test Flow',
        source: { type: 'user_input', name: 'Input' },
        transformations: [],
        destination: { type: 'database', name: 'Storage' },
        dataTypes: ['data'],
        sensitivity: 'low',
      });

      const report = exportDataFlowReport(documenter, { format: 'markdown' });

      expect(typeof report).toBe('string');
      expect(report).toContain('# Data Flow Report');
      expect(report).toContain('## Flows');
      expect(report).toContain('Test Flow');
    });

    it('exports in JSON format', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'Test Flow',
        source: { type: 'user_input', name: 'Input' },
        transformations: [],
        destination: { type: 'database', name: 'Storage' },
        dataTypes: ['data'],
        sensitivity: 'low',
      });

      const report = exportDataFlowReport(documenter, { format: 'json' });

      expect(typeof report).toBe('object');
      expect(report.flows).toBeDefined();
      expect(report.flows[0].id).toBe('flow-001');
    });

    it('includes retention policies in report', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'User Data Flow',
        source: { type: 'user_input', name: 'Form' },
        transformations: [],
        destination: { type: 'database', name: 'users' },
        dataTypes: ['email', 'password'],
        sensitivity: 'high',
        retention: '7 years',
      });

      const report = exportDataFlowReport(documenter, { format: 'compliance' });

      expect(report.flows[0].retention).toBe('7 years');
    });
  });

  describe('DataFlowDocumenter class', () => {
    it('addDataFlow stores flow correctly', () => {
      const flow = {
        id: 'flow-001',
        name: 'Test Flow',
        source: { type: 'user_input', name: 'Form' },
        transformations: [],
        destination: { type: 'database', name: 'Storage' },
        dataTypes: ['data'],
        sensitivity: 'low',
      };

      documenter.addDataFlow(flow);

      expect(documenter.getFlows()).toHaveLength(1);
      expect(documenter.getFlows()[0].id).toBe('flow-001');
    });

    it('getFlowById retrieves specific flow', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'Flow 1',
        source: { type: 'user_input', name: 'Form 1' },
        transformations: [],
        destination: { type: 'database', name: 'db1' },
        dataTypes: ['data1'],
        sensitivity: 'low',
      });

      documenter.addDataFlow({
        id: 'flow-002',
        name: 'Flow 2',
        source: { type: 'api', name: 'API' },
        transformations: [],
        destination: { type: 'database', name: 'db2' },
        dataTypes: ['data2'],
        sensitivity: 'medium',
      });

      const flow = documenter.getFlowById('flow-002');

      expect(flow).toBeDefined();
      expect(flow.name).toBe('Flow 2');
    });

    it('removeDataFlow removes flow', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'Test Flow',
        source: { type: 'user_input', name: 'Form' },
        transformations: [],
        destination: { type: 'database', name: 'Storage' },
        dataTypes: ['data'],
        sensitivity: 'low',
      });

      expect(documenter.getFlows()).toHaveLength(1);

      documenter.removeDataFlow('flow-001');

      expect(documenter.getFlows()).toHaveLength(0);
    });

    it('updateDataFlow updates existing flow', () => {
      documenter.addDataFlow({
        id: 'flow-001',
        name: 'Original Name',
        source: { type: 'user_input', name: 'Form' },
        transformations: [],
        destination: { type: 'database', name: 'Storage' },
        dataTypes: ['data'],
        sensitivity: 'low',
      });

      documenter.updateDataFlow('flow-001', { name: 'Updated Name', sensitivity: 'high' });

      const flow = documenter.getFlowById('flow-001');
      expect(flow.name).toBe('Updated Name');
      expect(flow.sensitivity).toBe('high');
    });
  });
});
