import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { PhasesPane, parseRoadmap } from './PhasesPane.js';
import { vol } from 'memfs';
// Mock fs modules
vi.mock('fs', async () => {
    const memfs = await import('memfs');
    return memfs.fs;
});
vi.mock('fs/promises', async () => {
    const memfs = await import('memfs');
    return memfs.fs.promises;
});
describe('PhasesPane', () => {
    beforeEach(() => {
        vol.reset();
    });
    describe('parseRoadmap', () => {
        it('parses "## Phase N: Name" format', () => {
            const content = `# Roadmap

## Phase 1: Setup
Initial setup

## Phase 2: Core Features
Build the main stuff`;
            const phases = parseRoadmap(content);
            expect(phases).toHaveLength(2);
            expect(phases[0]).toEqual({ number: 1, name: 'Setup', status: 'pending' });
            expect(phases[1]).toEqual({ number: 2, name: 'Core Features', status: 'pending' });
        });
        it('parses "### N. Name" format', () => {
            const content = `# Roadmap

### 1. Auth System
### 2. User Dashboard
### 3. Reports`;
            const phases = parseRoadmap(content);
            expect(phases).toHaveLength(3);
            expect(phases[0].name).toBe('Auth System');
            expect(phases[2].number).toBe(3);
        });
        it('detects completed status from [x]', () => {
            const content = `## Phase 1: Setup [x]
## Phase 2: Build`;
            const phases = parseRoadmap(content);
            expect(phases[0].status).toBe('completed');
            expect(phases[1].status).toBe('pending');
        });
        it('detects completed status from [completed]', () => {
            const content = `## Phase 1: Setup [completed]`;
            const phases = parseRoadmap(content);
            expect(phases[0].status).toBe('completed');
        });
        it('detects in_progress status from [>]', () => {
            const content = `## Phase 1: Setup [x]
## Phase 2: Build [>]
## Phase 3: Deploy`;
            const phases = parseRoadmap(content);
            expect(phases[0].status).toBe('completed');
            expect(phases[1].status).toBe('in_progress');
            expect(phases[2].status).toBe('pending');
        });
        it('detects in_progress from [in progress]', () => {
            const content = `## Phase 1: Build [in progress]`;
            const phases = parseRoadmap(content);
            expect(phases[0].status).toBe('in_progress');
        });
        it('detects in_progress from [current]', () => {
            const content = `## Phase 1: Build [current]`;
            const phases = parseRoadmap(content);
            expect(phases[0].status).toBe('in_progress');
        });
        it('returns empty array for content with no phases', () => {
            const content = `# Just a readme

Some text without phases.`;
            const phases = parseRoadmap(content);
            expect(phases).toEqual([]);
        });
        it('strips status markers from name', () => {
            const content = `## Phase 1: Setup [completed]`;
            const phases = parseRoadmap(content);
            expect(phases[0].name).toBe('Setup');
        });
    });
    describe('component rendering', () => {
        it('shows loading initially', () => {
            const { lastFrame } = render(_jsx(PhasesPane, {}));
            expect(lastFrame()).toContain('Loading...');
        });
        it('shows no roadmap message when file missing', async () => {
            const { lastFrame } = render(_jsx(PhasesPane, {}));
            await new Promise(resolve => setTimeout(resolve, 100));
            const output = lastFrame();
            expect(output).toContain('No roadmap found');
            expect(output).toContain('/tdd:new-project');
        });
        it('renders phases from roadmap file', async () => {
            // Create mock roadmap file
            vol.fromJSON({
                [process.cwd() + '/.planning/ROADMAP.md']: `# Roadmap

## Phase 1: Auth [x]
## Phase 2: Dashboard [>]
## Phase 3: Reports`
            });
            const { lastFrame } = render(_jsx(PhasesPane, {}));
            await new Promise(resolve => setTimeout(resolve, 100));
            const output = lastFrame();
            expect(output).toContain('1. Auth');
            expect(output).toContain('2. Dashboard');
            expect(output).toContain('3. Reports');
            expect(output).toContain('[x]');
            expect(output).toContain('[>]');
        });
    });
});
