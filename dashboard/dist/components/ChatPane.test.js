import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ChatPane } from './ChatPane.js';
describe('ChatPane', () => {
    describe('initial render', () => {
        it('shows welcome message', () => {
            const { lastFrame } = render(_jsx(ChatPane, { isActive: false }));
            const output = lastFrame();
            expect(output).toContain('TDD Dashboard ready');
        });
        it('shows input prompt', () => {
            const { lastFrame } = render(_jsx(ChatPane, { isActive: false }));
            const output = lastFrame();
            expect(output).toContain('>');
        });
    });
    describe('active state', () => {
        it('renders without error when active', () => {
            const { lastFrame } = render(_jsx(ChatPane, { isActive: true }));
            expect(lastFrame()).toBeDefined();
        });
        it('renders without error when inactive', () => {
            const { lastFrame } = render(_jsx(ChatPane, { isActive: false }));
            expect(lastFrame()).toBeDefined();
        });
    });
    describe('message display', () => {
        it('shows system messages with # prefix', () => {
            const { lastFrame } = render(_jsx(ChatPane, { isActive: false }));
            const output = lastFrame();
            // System message has # prefix
            expect(output).toContain('#');
        });
    });
});
