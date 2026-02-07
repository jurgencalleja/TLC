/**
 * Design Parser Tests
 *
 * Extract components, layout, and design tokens from mockups
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createParser,
  parseMockup,
  extractLayout,
  extractColors,
  extractTypography,
  extractSpacing,
  extractComponents,
  generateDesignTokens,
} = require('./design-parser.js');

describe('Design Parser', () => {
  let parser;
  let mockVisionClient;

  beforeEach(() => {
    mockVisionClient = {
      _call: async () => ({
        layout: { type: 'column', children: [] },
        colors: ['#000000', '#ffffff'],
        components: [],
      }),
    };

    parser = createParser({
      visionClient: mockVisionClient,
    });
  });

  describe('createParser', () => {
    it('creates parser with vision client', () => {
      assert.ok(parser);
      assert.ok(parser.visionClient);
    });
  });

  describe('parseMockup', () => {
    it('extracts all design elements', async () => {
      mockVisionClient._call = async () => ({
        layout: { type: 'column', direction: 'vertical' },
        colors: ['#3B82F6', '#1F2937', '#F3F4F6'],
        typography: { heading: '24px bold', body: '16px regular' },
        spacing: { padding: 16, gap: 8 },
        components: [
          { type: 'button', label: 'Submit' },
          { type: 'input', placeholder: 'Email' },
        ],
      });

      const result = await parseMockup(parser, {
        imagePath: '/mockup.png',
      });

      assert.ok(result.layout);
      assert.ok(result.colors);
      assert.ok(result.components);
    });

    it('returns structured design data', async () => {
      mockVisionClient._call = async () => ({
        layout: { type: 'grid', columns: 2 },
        colors: ['#000'],
        components: [{ type: 'card' }],
      });

      const result = await parseMockup(parser, {
        imagePath: '/mockup.png',
      });

      assert.strictEqual(result.layout.type, 'grid');
      assert.ok(Array.isArray(result.colors));
    });
  });

  describe('extractLayout', () => {
    it('identifies layout type', async () => {
      mockVisionClient._call = async () => ({
        layout: {
          type: 'flex',
          direction: 'row',
          justify: 'space-between',
          align: 'center',
        },
      });

      const layout = await extractLayout(parser, { imagePath: '/mockup.png' });

      assert.strictEqual(layout.type, 'flex');
      assert.strictEqual(layout.direction, 'row');
    });

    it('extracts nested layout', async () => {
      mockVisionClient._call = async () => ({
        layout: {
          type: 'column',
          children: [
            { type: 'row', children: [] },
            { type: 'row', children: [] },
          ],
        },
      });

      const layout = await extractLayout(parser, { imagePath: '/mockup.png' });

      assert.ok(layout.children);
      assert.strictEqual(layout.children.length, 2);
    });
  });

  describe('extractColors', () => {
    it('returns color palette', async () => {
      mockVisionClient._call = async () => ({
        colors: [
          { hex: '#3B82F6', role: 'primary' },
          { hex: '#1F2937', role: 'text' },
          { hex: '#F3F4F6', role: 'background' },
        ],
      });

      const colors = await extractColors(parser, { imagePath: '/mockup.png' });

      assert.ok(Array.isArray(colors));
      assert.ok(colors.length > 0);
      assert.ok(colors[0].hex);
    });

    it('identifies color roles', async () => {
      mockVisionClient._call = async () => ({
        colors: [
          { hex: '#EF4444', role: 'error' },
          { hex: '#10B981', role: 'success' },
        ],
      });

      const colors = await extractColors(parser, { imagePath: '/mockup.png' });

      const errorColor = colors.find(c => c.role === 'error');
      assert.ok(errorColor);
    });
  });

  describe('extractTypography', () => {
    it('extracts font sizes', async () => {
      mockVisionClient._call = async () => ({
        typography: {
          heading1: { size: 32, weight: 'bold', family: 'Inter' },
          heading2: { size: 24, weight: 'semibold', family: 'Inter' },
          body: { size: 16, weight: 'regular', family: 'Inter' },
        },
      });

      const typography = await extractTypography(parser, { imagePath: '/mockup.png' });

      assert.ok(typography.heading1);
      assert.strictEqual(typography.heading1.size, 32);
    });

    it('extracts font weights', async () => {
      mockVisionClient._call = async () => ({
        typography: {
          heading: { size: 24, weight: 'bold' },
          body: { size: 16, weight: 'normal' },
        },
      });

      const typography = await extractTypography(parser, { imagePath: '/mockup.png' });

      assert.strictEqual(typography.heading.weight, 'bold');
    });
  });

  describe('extractSpacing', () => {
    it('extracts padding values', async () => {
      mockVisionClient._call = async () => ({
        spacing: {
          padding: { top: 16, right: 24, bottom: 16, left: 24 },
          gap: 8,
          margin: { top: 0, bottom: 16 },
        },
      });

      const spacing = await extractSpacing(parser, { imagePath: '/mockup.png' });

      assert.ok(spacing.padding);
      assert.strictEqual(spacing.gap, 8);
    });

    it('identifies spacing scale', async () => {
      mockVisionClient._call = async () => ({
        spacing: {
          scale: [4, 8, 12, 16, 24, 32, 48],
        },
      });

      const spacing = await extractSpacing(parser, { imagePath: '/mockup.png' });

      assert.ok(spacing.scale);
      assert.ok(Array.isArray(spacing.scale));
    });
  });

  describe('extractComponents', () => {
    it('identifies UI components', async () => {
      mockVisionClient._call = async () => ({
        components: [
          { type: 'button', variant: 'primary', label: 'Submit' },
          { type: 'input', variant: 'text', placeholder: 'Email' },
          { type: 'checkbox', label: 'Remember me' },
        ],
      });

      const components = await extractComponents(parser, { imagePath: '/mockup.png' });

      assert.ok(Array.isArray(components));
      assert.strictEqual(components.length, 3);
    });

    it('includes component bounds', async () => {
      mockVisionClient._call = async () => ({
        components: [
          { type: 'button', bounds: { x: 100, y: 200, width: 120, height: 40 } },
        ],
      });

      const components = await extractComponents(parser, { imagePath: '/mockup.png' });

      assert.ok(components[0].bounds);
      assert.ok(components[0].bounds.width);
    });
  });

  describe('generateDesignTokens', () => {
    it('creates token object', async () => {
      mockVisionClient._call = async () => ({
        colors: [{ hex: '#3B82F6', role: 'primary' }],
        typography: { body: { size: 16, weight: 'normal' } },
        spacing: { base: 8 },
      });

      const tokens = await generateDesignTokens(parser, { imagePath: '/mockup.png' });

      assert.ok(tokens);
      assert.ok(tokens.colors);
      assert.ok(tokens.typography);
      assert.ok(tokens.spacing);
    });

    it('exports as CSS variables', async () => {
      mockVisionClient._call = async () => ({
        colors: [{ hex: '#3B82F6', role: 'primary' }],
        typography: { body: { size: 16 } },
        spacing: { base: 8 },
      });

      const tokens = await generateDesignTokens(parser, {
        imagePath: '/mockup.png',
        format: 'css',
      });

      assert.ok(tokens.css);
      assert.ok(tokens.css.includes('--'));
    });

    it('exports as JSON', async () => {
      mockVisionClient._call = async () => ({
        colors: [{ hex: '#3B82F6', role: 'primary' }],
        typography: {},
        spacing: {},
      });

      const tokens = await generateDesignTokens(parser, {
        imagePath: '/mockup.png',
        format: 'json',
      });

      assert.ok(tokens.json);
      const parsed = JSON.parse(tokens.json);
      assert.ok(parsed.colors);
    });
  });
});
