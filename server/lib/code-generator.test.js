/**
 * Code Generator Tests
 *
 * Generate code from parsed design data
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createGenerator,
  generateReact,
  generateVue,
  generateHTML,
  generateTailwind,
  mapToLibrary,
  addDesignReference,
  formatCode,
} = require('./code-generator.js');

describe('Code Generator', () => {
  let generator;
  let mockLLMClient;

  beforeEach(() => {
    mockLLMClient = {
      _call: async () => ({
        code: '<div>Generated code</div>',
      }),
    };

    generator = createGenerator({
      llmClient: mockLLMClient,
    });
  });

  describe('createGenerator', () => {
    it('creates generator with LLM client', () => {
      assert.ok(generator);
      assert.ok(generator.llmClient);
    });

    it('accepts framework option', () => {
      const reactGenerator = createGenerator({
        llmClient: mockLLMClient,
        framework: 'react',
      });

      assert.strictEqual(reactGenerator.framework, 'react');
    });
  });

  describe('generateReact', () => {
    it('generates React component', async () => {
      mockLLMClient._call = async () => ({
        code: `function LoginForm() {
  return (
    <div className="p-4">
      <input type="email" placeholder="Email" />
      <button>Submit</button>
    </div>
  );
}`,
      });

      const design = {
        components: [
          { type: 'input', placeholder: 'Email' },
          { type: 'button', label: 'Submit' },
        ],
        layout: { type: 'column' },
      };

      const result = await generateReact(generator, { design });

      assert.ok(result.code);
      assert.ok(result.code.includes('function') || result.code.includes('const'));
    });

    it('uses TypeScript when specified', async () => {
      mockLLMClient._call = async () => ({
        code: `interface Props { onSubmit: () => void; }
export const Form: React.FC<Props> = ({ onSubmit }) => { return <form />; }`,
      });

      const result = await generateReact(generator, {
        design: { components: [] },
        typescript: true,
      });

      assert.ok(result.code.includes('interface') || result.code.includes(':'));
    });

    it('includes imports', async () => {
      mockLLMClient._call = async () => ({
        code: `import React from 'react';

export function Component() { return <div />; }`,
        imports: ['react'],
      });

      const result = await generateReact(generator, {
        design: { components: [] },
      });

      assert.ok(result.code.includes('import'));
    });
  });

  describe('generateVue', () => {
    it('generates Vue SFC', async () => {
      mockLLMClient._call = async () => ({
        code: `<template>
  <div class="container">
    <input v-model="email" placeholder="Email" />
    <button @click="submit">Submit</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const email = ref('');
</script>`,
      });

      const result = await generateVue(generator, {
        design: { components: [{ type: 'input' }, { type: 'button' }] },
      });

      assert.ok(result.code);
      assert.ok(result.code.includes('<template>'));
    });

    it('supports composition API', async () => {
      mockLLMClient._call = async () => ({
        code: `<script setup>
import { ref } from 'vue';
</script>`,
      });

      const result = await generateVue(generator, {
        design: { components: [] },
        composition: true,
      });

      assert.ok(result.code.includes('setup'));
    });
  });

  describe('generateHTML', () => {
    it('generates plain HTML', async () => {
      mockLLMClient._call = async () => ({
        code: `<div class="form">
  <input type="email" placeholder="Email">
  <button type="submit">Submit</button>
</div>`,
      });

      const result = await generateHTML(generator, {
        design: { components: [{ type: 'input' }, { type: 'button' }] },
      });

      assert.ok(result.code);
      assert.ok(result.code.includes('<div'));
    });

    it('includes CSS when requested', async () => {
      mockLLMClient._call = async () => ({
        code: `<div class="form"></div>`,
        css: `.form { padding: 1rem; }`,
      });

      const result = await generateHTML(generator, {
        design: { components: [] },
        includeCSS: true,
      });

      assert.ok(result.css || result.code.includes('style'));
    });
  });

  describe('generateTailwind', () => {
    it('generates Tailwind classes', async () => {
      mockLLMClient._call = async () => ({
        code: `<div class="flex flex-col gap-4 p-6">
  <input class="border rounded px-4 py-2" placeholder="Email" />
  <button class="bg-blue-500 text-white px-4 py-2 rounded">Submit</button>
</div>`,
      });

      const result = await generateTailwind(generator, {
        design: { components: [], colors: [{ hex: '#3B82F6' }] },
      });

      assert.ok(result.code);
      assert.ok(result.code.includes('class="'));
    });

    it('maps colors to Tailwind', async () => {
      mockLLMClient._call = async () => ({
        code: `<button class="bg-blue-500">Button</button>`,
      });

      const result = await generateTailwind(generator, {
        design: { colors: [{ hex: '#3B82F6', role: 'primary' }] },
      });

      assert.ok(result.code.includes('blue') || result.code.includes('primary'));
    });
  });

  describe('mapToLibrary', () => {
    it('maps to shadcn/ui components', async () => {
      const components = [
        { type: 'button', variant: 'primary' },
        { type: 'input', variant: 'text' },
      ];

      const mapped = await mapToLibrary(generator, {
        components,
        library: 'shadcn',
      });

      assert.ok(mapped);
      assert.ok(Array.isArray(mapped));
      mapped.forEach(m => {
        assert.ok(m.original);
        assert.ok(m.mapped);
      });
    });

    it('maps to MUI components', async () => {
      const components = [
        { type: 'button', label: 'Click' },
      ];

      const mapped = await mapToLibrary(generator, {
        components,
        library: 'mui',
      });

      assert.ok(mapped[0].mapped.includes('Button') || mapped[0].mapped.includes('Mui'));
    });

    it('maps to Chakra components', async () => {
      const components = [
        { type: 'input', placeholder: 'Enter text' },
      ];

      const mapped = await mapToLibrary(generator, {
        components,
        library: 'chakra',
      });

      assert.ok(mapped[0].mapped);
    });
  });

  describe('addDesignReference', () => {
    it('adds source comment', () => {
      const code = `function Component() { return <div />; }`;
      const mockupPath = '/designs/login.png';

      const result = addDesignReference(code, { mockupPath });

      assert.ok(result.includes('login.png') || result.includes('design'));
    });

    it('adds figma link', () => {
      const code = `function Component() { return <div />; }`;
      const figmaUrl = 'https://figma.com/file/abc123';

      const result = addDesignReference(code, { figmaUrl });

      assert.ok(result.includes('figma.com'));
    });
  });

  describe('formatCode', () => {
    it('formats JavaScript', async () => {
      const code = `function Component(){return <div className="test"></div>}`;

      const formatted = await formatCode(code, { language: 'javascript' });

      // Should have some formatting applied
      assert.ok(formatted);
      assert.ok(typeof formatted === 'string');
    });

    it('formats TypeScript', async () => {
      const code = `const x:string="hello"`;

      const formatted = await formatCode(code, { language: 'typescript' });

      assert.ok(formatted);
    });

    it('preserves code if formatting fails', async () => {
      const invalidCode = `function ( { return }`;

      const formatted = await formatCode(invalidCode, { language: 'javascript' });

      // Should return original or close to it if parsing fails
      assert.ok(formatted);
    });
  });
});
