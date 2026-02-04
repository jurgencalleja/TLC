/**
 * Output Encoder Tests
 *
 * Context-aware output encoding for XSS prevention
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  createOutputEncoder,
  encodeHtml,
  encodeJs,
  encodeUrl,
  encodeCss,
  encodeAttribute,
  generateCspHeader,
  generateSriHash,
  generateEncodingCode,
} = require('./output-encoder.js');

describe('Output Encoder', () => {
  let encoder;

  beforeEach(() => {
    encoder = createOutputEncoder();
  });

  describe('createOutputEncoder', () => {
    it('creates encoder with default config', () => {
      assert.ok(encoder);
      assert.ok(encoder.contexts);
    });

    it('supports custom contexts', () => {
      const custom = createOutputEncoder({
        contexts: ['html', 'js'],
      });

      assert.ok(custom.contexts.includes('html'));
    });
  });

  describe('encodeHtml', () => {
    it('encodes less than sign', () => {
      const result = encodeHtml('<script>');

      assert.ok(result.includes('&lt;'));
    });

    it('encodes greater than sign', () => {
      const result = encodeHtml('<div>');

      assert.ok(result.includes('&gt;'));
    });

    it('encodes ampersand', () => {
      const result = encodeHtml('a & b');

      assert.ok(result.includes('&amp;'));
    });

    it('encodes quotes', () => {
      const result = encodeHtml('"test"');

      assert.ok(result.includes('&quot;'));
    });

    it('encodes single quotes', () => {
      const result = encodeHtml("'test'");

      assert.ok(result.includes('&#x27;') || result.includes('&#39;'));
    });

    it('handles null input', () => {
      const result = encodeHtml(null);

      assert.strictEqual(result, '');
    });
  });

  describe('encodeJs', () => {
    it('escapes backslash', () => {
      const result = encodeJs('path\\to\\file');

      assert.ok(result.includes('\\\\'));
    });

    it('escapes single quote', () => {
      const result = encodeJs("it's");

      assert.ok(result.includes("\\'"));
    });

    it('escapes double quote', () => {
      const result = encodeJs('say "hello"');

      assert.ok(result.includes('\\"'));
    });

    it('escapes newlines', () => {
      const result = encodeJs('line1\nline2');

      assert.ok(result.includes('\\n'));
    });

    it('escapes script closing tag', () => {
      const result = encodeJs('</script>');

      assert.ok(!result.includes('</script>'));
    });

    it('handles unicode escaping', () => {
      const result = encodeJs('こんにちは', { unicodeEscape: true });

      assert.ok(result.includes('\\u'));
    });
  });

  describe('encodeUrl', () => {
    it('encodes spaces', () => {
      const result = encodeUrl('hello world');

      assert.ok(result.includes('%20') || result.includes('+'));
    });

    it('encodes special characters', () => {
      const result = encodeUrl('a=b&c=d');

      assert.ok(result.includes('%26'));
    });

    it('preserves safe characters', () => {
      const result = encodeUrl('hello-world_test');

      assert.ok(result.includes('hello'));
      assert.ok(result.includes('world'));
    });

    it('handles unicode', () => {
      const result = encodeUrl('café');

      assert.ok(result.includes('%'));
    });
  });

  describe('encodeCss', () => {
    it('escapes backslash', () => {
      const result = encodeCss('value\\other');

      assert.ok(result.includes('\\\\'));
    });

    it('escapes angle brackets', () => {
      const result = encodeCss('<style>');

      assert.ok(!result.includes('<'));
    });

    it('escapes expression', () => {
      const result = encodeCss('expression(alert(1))');

      assert.ok(!result.includes('expression'));
    });

    it('encodes url function', () => {
      const result = encodeCss('url(javascript:alert(1))');

      assert.ok(!result.includes('javascript:'));
    });
  });

  describe('encodeAttribute', () => {
    it('encodes for unquoted attributes', () => {
      const result = encodeAttribute('value onclick=alert(1)', { quoted: false });

      assert.ok(!result.includes('onclick'));
    });

    it('encodes for single-quoted attributes', () => {
      const result = encodeAttribute("it's", { quoteChar: "'" });

      assert.ok(!result.includes("'") || result.includes('&#'));
    });

    it('encodes for double-quoted attributes', () => {
      const result = encodeAttribute('"test"', { quoteChar: '"' });

      assert.ok(!result.includes('"') || result.includes('&quot;'));
    });

    it('prevents attribute breakout', () => {
      const result = encodeAttribute('" onmouseover="alert(1)"');

      assert.ok(!result.includes('onmouseover'));
    });
  });

  describe('generateCspHeader', () => {
    it('generates default-src self', () => {
      const csp = generateCspHeader({});

      assert.ok(csp.includes("default-src 'self'"));
    });

    it('adds script-src directive', () => {
      const csp = generateCspHeader({
        scriptSrc: ["'self'", 'https://cdn.example.com'],
      });

      assert.ok(csp.includes('script-src'));
      assert.ok(csp.includes('cdn.example.com'));
    });

    it('adds style-src directive', () => {
      const csp = generateCspHeader({
        styleSrc: ["'self'", "'unsafe-inline'"],
      });

      assert.ok(csp.includes('style-src'));
    });

    it('adds nonce support', () => {
      const csp = generateCspHeader({
        useNonce: true,
        nonce: 'abc123',
      });

      assert.ok(csp.includes("'nonce-abc123'"));
    });

    it('adds report-uri', () => {
      const csp = generateCspHeader({
        reportUri: 'https://example.com/csp-report',
      });

      assert.ok(csp.includes('report-uri'));
    });

    it('generates report-only mode', () => {
      const csp = generateCspHeader({
        reportOnly: true,
      });

      assert.ok(csp.headerName === 'Content-Security-Policy-Report-Only' || csp.includes('Report-Only'));
    });
  });

  describe('generateSriHash', () => {
    it('generates sha384 hash', () => {
      const hash = generateSriHash('alert(1)', { algorithm: 'sha384' });

      assert.ok(hash.startsWith('sha384-'));
    });

    it('generates sha256 hash', () => {
      const hash = generateSriHash('alert(1)', { algorithm: 'sha256' });

      assert.ok(hash.startsWith('sha256-'));
    });

    it('generates sha512 hash', () => {
      const hash = generateSriHash('alert(1)', { algorithm: 'sha512' });

      assert.ok(hash.startsWith('sha512-'));
    });

    it('returns consistent hash for same content', () => {
      const hash1 = generateSriHash('content');
      const hash2 = generateSriHash('content');

      assert.strictEqual(hash1, hash2);
    });
  });

  describe('generateEncodingCode', () => {
    it('generates JavaScript encoder function', () => {
      const code = generateEncodingCode({
        context: 'html',
        language: 'javascript',
      });

      assert.ok(code.includes('function'));
      assert.ok(code.includes('&lt;') || code.includes('replace'));
    });

    it('generates TypeScript encoder function', () => {
      const code = generateEncodingCode({
        context: 'html',
        language: 'typescript',
      });

      assert.ok(code.includes('string'));
    });

    it('generates Python encoder function', () => {
      const code = generateEncodingCode({
        context: 'html',
        language: 'python',
      });

      assert.ok(code.includes('def'));
    });

    it('generates context-specific code', () => {
      const htmlCode = generateEncodingCode({ context: 'html', language: 'javascript' });
      const jsCode = generateEncodingCode({ context: 'js', language: 'javascript' });

      assert.notStrictEqual(htmlCode, jsCode);
    });
  });
});
