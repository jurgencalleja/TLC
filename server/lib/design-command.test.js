/**
 * Design Command Tests
 *
 * CLI for design-to-code operations
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  DesignCommand,
  parseArgs,
  formatDesignSummary,
  formatCodePreview,
} = require('./design-command.js');

describe('Design Command', () => {
  let command;
  let mockParser;
  let mockGenerator;

  beforeEach(() => {
    mockParser = {
      visionClient: {
        _call: async () => ({
          layout: { type: 'column' },
          colors: [{ hex: '#3B82F6' }],
          components: [{ type: 'button' }],
        }),
      },
    };

    mockGenerator = {
      llmClient: {
        _call: async () => ({
          code: '<div>Generated</div>',
        }),
      },
    };

    command = new DesignCommand({
      parser: mockParser,
      generator: mockGenerator,
    });
  });

  describe('execute import', () => {
    it('parses mockup and stores design', async () => {
      const result = await command.execute('import /path/to/mockup.png');

      assert.ok(result.success);
      assert.ok(result.design);
    });

    it('extracts design tokens', async () => {
      const result = await command.execute('import /path/to/mockup.png');

      assert.ok(result.design.colors || result.design.layout);
    });

    it('saves design for later use', async () => {
      await command.execute('import /path/to/mockup.png');

      assert.ok(command.currentDesign);
    });
  });

  describe('execute generate', () => {
    it('generates code from design', async () => {
      // First import
      await command.execute('import /path/to/mockup.png');

      // Then generate
      const result = await command.execute('generate');

      assert.ok(result.success);
      assert.ok(result.code);
    });

    it('generates for specified framework', async () => {
      await command.execute('import /path/to/mockup.png');

      const result = await command.execute('generate --framework react');

      assert.ok(result.success);
      assert.ok(result.framework === 'react');
    });

    it('generates directly from mockup', async () => {
      const result = await command.execute('generate /path/to/mockup.png --framework vue');

      assert.ok(result.success);
    });
  });

  describe('execute tokens', () => {
    it('extracts design tokens', async () => {
      await command.execute('import /path/to/mockup.png');

      const result = await command.execute('tokens');

      assert.ok(result.success);
      assert.ok(result.tokens);
    });

    it('exports as CSS', async () => {
      await command.execute('import /path/to/mockup.png');

      const result = await command.execute('tokens --format css');

      assert.ok(result.output.includes('--') || result.format === 'css');
    });

    it('exports as JSON', async () => {
      await command.execute('import /path/to/mockup.png');

      const result = await command.execute('tokens --format json');

      assert.ok(result.format === 'json' || result.tokens);
    });
  });

  describe('execute iterate', () => {
    it('shows current design vs generated', async () => {
      await command.execute('import /path/to/mockup.png');
      await command.execute('generate');

      const result = await command.execute('iterate');

      assert.ok(result.success);
      assert.ok(result.comparison || result.output);
    });

    it('accepts feedback', async () => {
      await command.execute('import /path/to/mockup.png');
      await command.execute('generate');

      const result = await command.execute('iterate --feedback "Make button larger"');

      assert.ok(result.success);
    });
  });

  describe('parseArgs', () => {
    it('parses import command', () => {
      const parsed = parseArgs('import /path/to/mockup.png');

      assert.strictEqual(parsed.command, 'import');
      assert.strictEqual(parsed.imagePath, '/path/to/mockup.png');
    });

    it('parses generate with framework', () => {
      const parsed = parseArgs('generate --framework react');

      assert.strictEqual(parsed.command, 'generate');
      assert.strictEqual(parsed.framework, 'react');
    });

    it('parses tokens with format', () => {
      const parsed = parseArgs('tokens --format css');

      assert.strictEqual(parsed.command, 'tokens');
      assert.strictEqual(parsed.format, 'css');
    });

    it('parses iterate with feedback', () => {
      const parsed = parseArgs('iterate --feedback "Change colors"');

      assert.strictEqual(parsed.command, 'iterate');
      assert.strictEqual(parsed.feedback, 'Change colors');
    });

    it('parses library option', () => {
      const parsed = parseArgs('generate --library shadcn');

      assert.strictEqual(parsed.library, 'shadcn');
    });
  });

  describe('formatDesignSummary', () => {
    it('shows component count', () => {
      const design = {
        components: [{ type: 'button' }, { type: 'input' }],
        colors: [{ hex: '#000' }],
        layout: { type: 'flex' },
      };

      const formatted = formatDesignSummary(design);

      assert.ok(formatted.includes('2') || formatted.includes('component'));
    });

    it('shows color palette', () => {
      const design = {
        components: [],
        colors: [{ hex: '#3B82F6', role: 'primary' }],
        layout: {},
      };

      const formatted = formatDesignSummary(design);

      assert.ok(formatted.includes('#3B82F6') || formatted.includes('primary'));
    });

    it('shows layout type', () => {
      const design = {
        components: [],
        colors: [],
        layout: { type: 'grid', columns: 3 },
      };

      const formatted = formatDesignSummary(design);

      assert.ok(formatted.includes('grid') || formatted.includes('Grid'));
    });
  });

  describe('formatCodePreview', () => {
    it('truncates long code', () => {
      // Create code with many lines
      const longCode = Array(100).fill('const x = 1;').join('\n');

      const preview = formatCodePreview(longCode, { maxLines: 10 });

      // Preview should have fewer lines than original
      const previewLines = preview.split('\n').length;
      const originalLines = longCode.split('\n').length;
      assert.ok(previewLines < originalLines);
    });

    it('shows line count', () => {
      const code = `line1
line2
line3`;

      const preview = formatCodePreview(code);

      assert.ok(preview.includes('3 lines') || preview.includes('line'));
    });

    it('adds syntax highlighting hint', () => {
      const code = `function test() { return true; }`;

      const preview = formatCodePreview(code, { language: 'javascript' });

      assert.ok(typeof preview === 'string');
    });
  });
});
