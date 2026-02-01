/**
 * ADR Generator Tests
 *
 * Tests for Architecture Decision Records (ADR) generation and management.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  ADR_TEMPLATE,
  ADR_STATUSES,
  getNextAdrNumber,
  createAdr,
  updateAdrStatus,
  generateAdrIndex,
  extractDecisionsFromMemory,
  loadAdr,
  listAdrs,
  ADR_DIR,
} from './adr-generator.js';

describe('adr-generator', () => {
  let testDir;
  let adrDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-adr-test-'));
    adrDir = path.join(testDir, '.planning', 'adr');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('ADR_DIR', () => {
    it('exports correct path constant', () => {
      expect(ADR_DIR).toBe('.planning/adr');
    });
  });

  describe('ADR_STATUSES', () => {
    it('includes standard status values', () => {
      expect(ADR_STATUSES).toContain('proposed');
      expect(ADR_STATUSES).toContain('accepted');
      expect(ADR_STATUSES).toContain('deprecated');
      expect(ADR_STATUSES).toContain('superseded');
    });
  });

  describe('ADR_TEMPLATE', () => {
    it('includes standard sections', () => {
      expect(ADR_TEMPLATE).toContain('# ADR');
      expect(ADR_TEMPLATE).toContain('## Context');
      expect(ADR_TEMPLATE).toContain('## Decision');
      expect(ADR_TEMPLATE).toContain('## Consequences');
    });

    it('includes status placeholder', () => {
      expect(ADR_TEMPLATE).toContain('{{STATUS}}');
    });

    it('includes date placeholder', () => {
      expect(ADR_TEMPLATE).toContain('{{DATE}}');
    });

    it('includes title placeholder', () => {
      expect(ADR_TEMPLATE).toContain('{{TITLE}}');
    });

    it('includes number placeholder', () => {
      expect(ADR_TEMPLATE).toContain('{{NUMBER}}');
    });
  });

  describe('getNextAdrNumber', () => {
    it('returns 0001 for empty directory', async () => {
      const num = await getNextAdrNumber(testDir);
      expect(num).toBe('0001');
    });

    it('returns 0001 for non-existent directory', async () => {
      const num = await getNextAdrNumber('/nonexistent/path');
      expect(num).toBe('0001');
    });

    it('returns next sequential number', async () => {
      fs.mkdirSync(adrDir, { recursive: true });
      fs.writeFileSync(path.join(adrDir, '0001-initial-decision.md'), '# ADR 0001');
      fs.writeFileSync(path.join(adrDir, '0002-second-decision.md'), '# ADR 0002');

      const num = await getNextAdrNumber(testDir);
      expect(num).toBe('0003');
    });

    it('ignores non-ADR files', async () => {
      fs.mkdirSync(adrDir, { recursive: true });
      fs.writeFileSync(path.join(adrDir, '0001-decision.md'), '# ADR 0001');
      fs.writeFileSync(path.join(adrDir, 'README.md'), '# README');
      fs.writeFileSync(path.join(adrDir, 'index.md'), '# Index');

      const num = await getNextAdrNumber(testDir);
      expect(num).toBe('0002');
    });

    it('handles gaps in numbering', async () => {
      fs.mkdirSync(adrDir, { recursive: true });
      fs.writeFileSync(path.join(adrDir, '0001-decision.md'), '# ADR 0001');
      fs.writeFileSync(path.join(adrDir, '0005-decision.md'), '# ADR 0005');

      const num = await getNextAdrNumber(testDir);
      expect(num).toBe('0006');
    });
  });

  describe('createAdr', () => {
    it('creates ADR with standard template', async () => {
      const result = await createAdr(testDir, {
        title: 'Use PostgreSQL for Data Storage',
        context: 'We need a reliable database for production data.',
        decision: 'We will use PostgreSQL as our primary database.',
        consequences: 'Requires PostgreSQL expertise. Good scaling options.',
      });

      expect(result.path).toContain('.planning/adr/0001');
      expect(fs.existsSync(result.path)).toBe(true);

      const content = fs.readFileSync(result.path, 'utf8');
      expect(content).toContain('# ADR 0001:');
      expect(content).toContain('Use PostgreSQL for Data Storage');
      expect(content).toContain('## Context');
      expect(content).toContain('We need a reliable database');
      expect(content).toContain('## Decision');
      expect(content).toContain('We will use PostgreSQL');
      expect(content).toContain('## Consequences');
      expect(content).toContain('PostgreSQL expertise');
    });

    it('auto-numbers ADRs sequentially', async () => {
      await createAdr(testDir, {
        title: 'First Decision',
        context: 'Context 1',
        decision: 'Decision 1',
        consequences: 'Consequences 1',
      });

      await createAdr(testDir, {
        title: 'Second Decision',
        context: 'Context 2',
        decision: 'Decision 2',
        consequences: 'Consequences 2',
      });

      const result = await createAdr(testDir, {
        title: 'Third Decision',
        context: 'Context 3',
        decision: 'Decision 3',
        consequences: 'Consequences 3',
      });

      expect(result.number).toBe('0003');
      expect(result.path).toContain('0003-third-decision.md');
    });

    it('uses proposed status by default', async () => {
      const result = await createAdr(testDir, {
        title: 'New Decision',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      });

      const content = fs.readFileSync(result.path, 'utf8');
      expect(content).toContain('**Status:** proposed');
    });

    it('accepts custom status', async () => {
      const result = await createAdr(testDir, {
        title: 'Accepted Decision',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
        status: 'accepted',
      });

      const content = fs.readFileSync(result.path, 'utf8');
      expect(content).toContain('**Status:** accepted');
    });

    it('includes current date', async () => {
      const result = await createAdr(testDir, {
        title: 'Dated Decision',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      });

      const content = fs.readFileSync(result.path, 'utf8');
      const today = new Date().toISOString().split('T')[0];
      expect(content).toContain(`**Date:** ${today}`);
    });

    it('creates adr directory if not exists', async () => {
      expect(fs.existsSync(adrDir)).toBe(false);

      await createAdr(testDir, {
        title: 'First Decision',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      });

      expect(fs.existsSync(adrDir)).toBe(true);
    });

    it('stores ADRs in .planning/adr/ directory', async () => {
      const result = await createAdr(testDir, {
        title: 'Test Decision',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      });

      expect(result.path).toContain('.planning/adr/');
      expect(result.path).toMatch(/\.planning\/adr\/\d{4}-.*\.md$/);
    });

    it('generates slug from title', async () => {
      const result = await createAdr(testDir, {
        title: 'Use React for Frontend Development',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      });

      expect(result.path).toContain('use-react-for-frontend-development.md');
    });

    it('returns ADR metadata', async () => {
      const result = await createAdr(testDir, {
        title: 'Test Decision',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
      });

      expect(result.number).toBe('0001');
      expect(result.title).toBe('Test Decision');
      expect(result.status).toBe('proposed');
      expect(result.date).toBe(new Date().toISOString().split('T')[0]);
      expect(result.path).toBeDefined();
    });
  });

  describe('updateAdrStatus', () => {
    it('updates ADR status', async () => {
      const created = await createAdr(testDir, {
        title: 'Pending Decision',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      });

      await updateAdrStatus(testDir, '0001', 'accepted');

      const content = fs.readFileSync(created.path, 'utf8');
      expect(content).toContain('**Status:** accepted');
      expect(content).not.toContain('**Status:** proposed');
    });

    it('handles deprecated status', async () => {
      await createAdr(testDir, {
        title: 'Old Decision',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      });

      await updateAdrStatus(testDir, '0001', 'deprecated');

      const files = fs.readdirSync(adrDir);
      const adrFile = files.find(f => f.startsWith('0001'));
      const content = fs.readFileSync(path.join(adrDir, adrFile), 'utf8');
      expect(content).toContain('**Status:** deprecated');
    });

    it('handles superseded status with reference', async () => {
      await createAdr(testDir, {
        title: 'Old Decision',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      });

      await updateAdrStatus(testDir, '0001', 'superseded', { supersededBy: '0002' });

      const files = fs.readdirSync(adrDir);
      const adrFile = files.find(f => f.startsWith('0001'));
      const content = fs.readFileSync(path.join(adrDir, adrFile), 'utf8');
      expect(content).toContain('**Status:** superseded');
      expect(content).toContain('Superseded by ADR 0002');
    });

    it('throws error for non-existent ADR', async () => {
      await expect(updateAdrStatus(testDir, '9999', 'accepted'))
        .rejects.toThrow(/not found/i);
    });

    it('throws error for invalid status', async () => {
      await createAdr(testDir, {
        title: 'Test Decision',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      });

      await expect(updateAdrStatus(testDir, '0001', 'invalid-status'))
        .rejects.toThrow(/invalid status/i);
    });
  });

  describe('loadAdr', () => {
    it('loads ADR by number', async () => {
      await createAdr(testDir, {
        title: 'Test Decision',
        context: 'Test context here',
        decision: 'Test decision here',
        consequences: 'Test consequences here',
      });

      const adr = await loadAdr(testDir, '0001');

      expect(adr.number).toBe('0001');
      expect(adr.title).toBe('Test Decision');
      expect(adr.context).toContain('Test context here');
      expect(adr.decision).toContain('Test decision here');
      expect(adr.consequences).toContain('Test consequences here');
      expect(adr.status).toBe('proposed');
    });

    it('returns null for non-existent ADR', async () => {
      const adr = await loadAdr(testDir, '9999');
      expect(adr).toBeNull();
    });
  });

  describe('listAdrs', () => {
    it('returns empty array for no ADRs', async () => {
      const adrs = await listAdrs(testDir);
      expect(adrs).toEqual([]);
    });

    it('lists all ADRs with metadata', async () => {
      await createAdr(testDir, {
        title: 'First Decision',
        context: 'C1',
        decision: 'D1',
        consequences: 'Co1',
      });

      await createAdr(testDir, {
        title: 'Second Decision',
        context: 'C2',
        decision: 'D2',
        consequences: 'Co2',
      });

      const adrs = await listAdrs(testDir);

      expect(adrs).toHaveLength(2);
      expect(adrs[0].number).toBe('0001');
      expect(adrs[0].title).toBe('First Decision');
      expect(adrs[1].number).toBe('0002');
      expect(adrs[1].title).toBe('Second Decision');
    });

    it('returns ADRs sorted by number', async () => {
      fs.mkdirSync(adrDir, { recursive: true });
      fs.writeFileSync(
        path.join(adrDir, '0003-third.md'),
        '# ADR 0003: Third\n\n**Date:** 2024-01-03\n**Status:** proposed'
      );
      fs.writeFileSync(
        path.join(adrDir, '0001-first.md'),
        '# ADR 0001: First\n\n**Date:** 2024-01-01\n**Status:** accepted'
      );
      fs.writeFileSync(
        path.join(adrDir, '0002-second.md'),
        '# ADR 0002: Second\n\n**Date:** 2024-01-02\n**Status:** deprecated'
      );

      const adrs = await listAdrs(testDir);

      expect(adrs[0].number).toBe('0001');
      expect(adrs[1].number).toBe('0002');
      expect(adrs[2].number).toBe('0003');
    });
  });

  describe('generateAdrIndex', () => {
    it('generates ADR index (list of all ADRs)', async () => {
      await createAdr(testDir, {
        title: 'Use PostgreSQL',
        context: 'C1',
        decision: 'D1',
        consequences: 'Co1',
        status: 'accepted',
      });

      await createAdr(testDir, {
        title: 'Use React',
        context: 'C2',
        decision: 'D2',
        consequences: 'Co2',
        status: 'proposed',
      });

      const index = await generateAdrIndex(testDir);

      expect(index).toContain('# Architecture Decision Records');
      expect(index).toContain('0001');
      expect(index).toContain('Use PostgreSQL');
      expect(index).toContain('accepted');
      expect(index).toContain('0002');
      expect(index).toContain('Use React');
      expect(index).toContain('proposed');
    });

    it('generates empty index message for no ADRs', async () => {
      const index = await generateAdrIndex(testDir);

      expect(index).toContain('# Architecture Decision Records');
      expect(index).toContain('No ADRs found');
    });

    it('links to ADR files', async () => {
      await createAdr(testDir, {
        title: 'Test Decision',
        context: 'C',
        decision: 'D',
        consequences: 'Co',
      });

      const index = await generateAdrIndex(testDir);

      expect(index).toMatch(/\[.*0001.*\]\(.*0001.*\.md\)/);
    });

    it('shows status in index', async () => {
      await createAdr(testDir, {
        title: 'Accepted One',
        context: 'C',
        decision: 'D',
        consequences: 'Co',
        status: 'accepted',
      });

      await createAdr(testDir, {
        title: 'Deprecated One',
        context: 'C',
        decision: 'D',
        consequences: 'Co',
        status: 'deprecated',
      });

      const index = await generateAdrIndex(testDir);

      expect(index).toContain('accepted');
      expect(index).toContain('deprecated');
    });
  });

  describe('extractDecisionsFromMemory', () => {
    it('extracts architectural decisions from memory', async () => {
      // Create memory structure
      const decisionsDir = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
      fs.mkdirSync(decisionsDir, { recursive: true });

      fs.writeFileSync(
        path.join(decisionsDir, '001-use-typescript.md'),
        `# Decision: Use TypeScript

**Date:** 2024-01-15
**Status:** Active
**Context:** Code quality

## Decision

Use TypeScript for all new code.

## Reasoning

Type safety reduces bugs and improves developer experience.
`
      );

      const decisions = await extractDecisionsFromMemory(testDir);

      expect(decisions).toHaveLength(1);
      expect(decisions[0].title).toContain('TypeScript');
      expect(decisions[0].context).toBeDefined();
    });

    it('returns empty array for no memory decisions', async () => {
      const decisions = await extractDecisionsFromMemory(testDir);
      expect(decisions).toEqual([]);
    });

    it('converts memory decisions to ADR format', async () => {
      const decisionsDir = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
      fs.mkdirSync(decisionsDir, { recursive: true });

      fs.writeFileSync(
        path.join(decisionsDir, '001-database-choice.md'),
        `# Decision: Use PostgreSQL

**Date:** 2024-01-15
**Status:** Active
**Context:** Database selection

## Decision

Use PostgreSQL as primary database.

## Reasoning

PostgreSQL offers good performance and features.

## Alternatives Considered

- MySQL
- MongoDB
`
      );

      const decisions = await extractDecisionsFromMemory(testDir);

      expect(decisions[0].title).toBe('Use PostgreSQL');
      expect(decisions[0].context).toContain('Database selection');
      expect(decisions[0].decision).toContain('Use PostgreSQL as primary database');
      expect(decisions[0].reasoning).toContain('good performance');
    });

    it('filters architectural decisions only', async () => {
      const decisionsDir = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
      fs.mkdirSync(decisionsDir, { recursive: true });

      // Architectural decision
      fs.writeFileSync(
        path.join(decisionsDir, '001-microservices.md'),
        `# Decision: Use Microservices Architecture

**Date:** 2024-01-15
**Status:** Active
**Context:** System architecture

## Reasoning

Better scalability and team autonomy.
`
      );

      // Non-architectural decision (code style)
      fs.writeFileSync(
        path.join(decisionsDir, '002-semicolons.md'),
        `# Decision: No Semicolons

**Date:** 2024-01-15
**Status:** Active
**Context:** Code style

## Reasoning

Prettier defaults.
`
      );

      const decisions = await extractDecisionsFromMemory(testDir, { architecturalOnly: true });

      // Should include architecture-related decisions
      expect(decisions.some(d => d.title.includes('Microservices'))).toBe(true);
    });
  });
});
