/**
 * Gemini Vision Tests
 *
 * Visual understanding with Gemini 2.0 Flash
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  createVisionClient,
  analyzeImage,
  compareImages,
  extractComponents,
  auditAccessibility,
  describeUI,
  findIssues,
} = require('./gemini-vision.js');

describe('Gemini Vision', () => {
  let client;

  beforeEach(() => {
    client = createVisionClient({
      apiKey: 'test-key',
    });

    // Mock the API call
    client._call = async (prompt, image) => ({
      text: 'Mock analysis response',
      components: [],
      issues: [],
    });
  });

  describe('createVisionClient', () => {
    it('creates client with API key', () => {
      assert.ok(client);
      assert.ok(client.apiKey);
    });

    it('has default model', () => {
      assert.ok(client.model);
      assert.ok(client.model.includes('gemini'));
    });
  });

  describe('analyzeImage', () => {
    it('returns analysis object', async () => {
      client._call = async () => ({
        text: 'This is a login form with email and password fields.',
        elements: ['input:email', 'input:password', 'button:submit'],
      });

      const result = await analyzeImage(client, {
        imagePath: '/path/to/screenshot.png',
      });

      assert.ok(result);
      assert.ok(result.text || result.description);
    });

    it('accepts base64 image', async () => {
      let receivedImage;
      client._call = async (prompt, image) => {
        receivedImage = image;
        return { text: 'Analysis' };
      };

      await analyzeImage(client, {
        imageBase64: 'iVBORw0KGgo...',
      });

      assert.ok(receivedImage);
    });

    it('supports custom prompt', async () => {
      let receivedPrompt;
      client._call = async (prompt) => {
        receivedPrompt = prompt;
        return { text: 'Analysis' };
      };

      await analyzeImage(client, {
        imagePath: '/path/to/image.png',
        prompt: 'List all buttons in this UI',
      });

      assert.ok(receivedPrompt.includes('buttons'));
    });
  });

  describe('compareImages', () => {
    it('identifies differences', async () => {
      client._call = async () => ({
        differences: [
          { type: 'added', element: 'button', description: 'New submit button' },
          { type: 'changed', element: 'header', description: 'Color changed from blue to green' },
        ],
        similarity: 0.85,
      });

      const result = await compareImages(client, {
        beforeImage: '/path/to/before.png',
        afterImage: '/path/to/after.png',
      });

      assert.ok(result.differences);
      assert.ok(Array.isArray(result.differences));
      assert.ok(result.similarity !== undefined);
    });

    it('reports no differences when identical', async () => {
      client._call = async () => ({
        differences: [],
        similarity: 1.0,
      });

      const result = await compareImages(client, {
        beforeImage: '/path/to/image.png',
        afterImage: '/path/to/image.png',
      });

      assert.strictEqual(result.differences.length, 0);
      assert.strictEqual(result.similarity, 1.0);
    });
  });

  describe('extractComponents', () => {
    it('identifies UI components', async () => {
      client._call = async () => ({
        components: [
          { type: 'button', label: 'Submit', bounds: { x: 100, y: 200, width: 80, height: 40 } },
          { type: 'input', placeholder: 'Email', bounds: { x: 100, y: 100, width: 200, height: 40 } },
          { type: 'text', content: 'Welcome', bounds: { x: 100, y: 50, width: 100, height: 20 } },
        ],
      });

      const result = await extractComponents(client, {
        imagePath: '/path/to/mockup.png',
      });

      assert.ok(result.components);
      assert.ok(result.components.length > 0);
      assert.ok(result.components[0].type);
    });

    it('filters by component type', async () => {
      client._call = async (prompt) => ({
        components: [
          { type: 'button', label: 'Submit' },
          { type: 'button', label: 'Cancel' },
        ],
      });

      const result = await extractComponents(client, {
        imagePath: '/path/to/mockup.png',
        types: ['button'],
      });

      result.components.forEach(c => {
        assert.strictEqual(c.type, 'button');
      });
    });
  });

  describe('auditAccessibility', () => {
    it('finds contrast issues', async () => {
      client._call = async () => ({
        issues: [
          { type: 'contrast', severity: 'high', description: 'Text has insufficient contrast ratio (2.1:1)' },
        ],
        score: 65,
      });

      const result = await auditAccessibility(client, {
        imagePath: '/path/to/ui.png',
      });

      assert.ok(result.issues);
      const contrastIssues = result.issues.filter(i => i.type === 'contrast');
      assert.ok(contrastIssues.length > 0);
    });

    it('finds touch target issues', async () => {
      client._call = async () => ({
        issues: [
          { type: 'touch-target', severity: 'medium', description: 'Button too small (24x24, needs 44x44)' },
        ],
        score: 80,
      });

      const result = await auditAccessibility(client, {
        imagePath: '/path/to/ui.png',
      });

      const touchIssues = result.issues.filter(i => i.type === 'touch-target');
      assert.ok(touchIssues.length > 0);
    });

    it('returns score', async () => {
      client._call = async () => ({
        issues: [],
        score: 95,
      });

      const result = await auditAccessibility(client, {
        imagePath: '/path/to/ui.png',
      });

      assert.ok(result.score >= 0 && result.score <= 100);
    });
  });

  describe('describeUI', () => {
    it('provides natural language description', async () => {
      client._call = async () => ({
        description: 'A login form with a centered card containing email and password inputs, a "Remember me" checkbox, and a blue "Sign In" button.',
      });

      const result = await describeUI(client, {
        imagePath: '/path/to/ui.png',
      });

      assert.ok(result.description);
      assert.ok(typeof result.description === 'string');
      assert.ok(result.description.length > 20);
    });

    it('can focus on specific area', async () => {
      let receivedPrompt;
      client._call = async (prompt) => {
        receivedPrompt = prompt;
        return { description: 'The header contains a logo and navigation.' };
      };

      await describeUI(client, {
        imagePath: '/path/to/ui.png',
        focus: 'header',
      });

      assert.ok(receivedPrompt.includes('header'));
    });
  });

  describe('findIssues', () => {
    it('identifies UI problems', async () => {
      client._call = async () => ({
        issues: [
          { type: 'alignment', description: 'Button misaligned with input field' },
          { type: 'spacing', description: 'Inconsistent padding between elements' },
          { type: 'typography', description: 'Font size too small for body text' },
        ],
      });

      const result = await findIssues(client, {
        imagePath: '/path/to/ui.png',
      });

      assert.ok(result.issues);
      assert.ok(result.issues.length > 0);
    });

    it('categorizes issues', async () => {
      client._call = async () => ({
        issues: [
          { type: 'alignment', description: 'Issue 1', severity: 'low' },
          { type: 'contrast', description: 'Issue 2', severity: 'high' },
        ],
      });

      const result = await findIssues(client, {
        imagePath: '/path/to/ui.png',
      });

      result.issues.forEach(issue => {
        assert.ok(issue.type);
        assert.ok(issue.description);
      });
    });
  });
});
