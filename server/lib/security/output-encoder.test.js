/**
 * Output Encoder Tests
 *
 * Tests for context-aware output encoding to prevent XSS.
 */

import { describe, it, expect } from 'vitest';
import {
  encodeHtml,
  encodeHtmlAttribute,
  encodeJavaScript,
  encodeUrl,
  encodeCss,
  encodeForContext,
  createEncoder,
} from './output-encoder.js';

describe('output-encoder', () => {
  describe('encodeHtml', () => {
    it('encodes less than sign', () => {
      const result = encodeHtml('<script>');
      expect(result).toBe('&lt;script&gt;');
    });

    it('encodes greater than sign', () => {
      const result = encodeHtml('a > b');
      expect(result).toBe('a &gt; b');
    });

    it('encodes ampersand', () => {
      const result = encodeHtml('a & b');
      expect(result).toBe('a &amp; b');
    });

    it('encodes double quotes', () => {
      const result = encodeHtml('say "hello"');
      expect(result).toBe('say &quot;hello&quot;');
    });

    it('encodes single quotes', () => {
      const result = encodeHtml("it's fine");
      expect(result).toBe('it&#x27;s fine');
    });

    it('does not double-encode already encoded content', () => {
      const result = encodeHtml('&lt;script&gt;', { skipEncoded: true });
      expect(result).toBe('&lt;script&gt;');
    });

    it('handles null input', () => {
      const result = encodeHtml(null);
      expect(result).toBe('');
    });

    it('handles undefined input', () => {
      const result = encodeHtml(undefined);
      expect(result).toBe('');
    });

    it('converts numbers to string', () => {
      const result = encodeHtml(123);
      expect(result).toBe('123');
    });

    it('strips null bytes', () => {
      const result = encodeHtml('hello\x00world');
      expect(result).not.toContain('\x00');
    });
  });

  describe('encodeHtmlAttribute', () => {
    it('encodes for use in attributes', () => {
      const result = encodeHtmlAttribute('value with "quotes"');
      expect(result).toBe('value with &quot;quotes&quot;');
    });

    it('encodes single quotes for single-quoted attributes', () => {
      const result = encodeHtmlAttribute("it's a value");
      expect(result).toContain('&#x27;');
    });

    it('encodes equals sign', () => {
      const result = encodeHtmlAttribute('a=b');
      expect(result).toBe('a&#x3D;b');
    });

    it('encodes backticks', () => {
      const result = encodeHtmlAttribute('`code`');
      expect(result).toBe('&#x60;code&#x60;');
    });

    it('handles event handler context', () => {
      const result = encodeHtmlAttribute('alert(1)', { context: 'event' });
      expect(result).not.toContain('(');
    });
  });

  describe('encodeJavaScript', () => {
    it('escapes backslashes', () => {
      const result = encodeJavaScript('path\\to\\file');
      expect(result).toBe('path\\\\to\\\\file');
    });

    it('escapes single quotes', () => {
      const result = encodeJavaScript("it's");
      expect(result).toBe("it\\'s");
    });

    it('escapes double quotes', () => {
      const result = encodeJavaScript('say "hi"');
      expect(result).toBe('say \\"hi\\"');
    });

    it('escapes newlines', () => {
      const result = encodeJavaScript('line1\nline2');
      expect(result).toBe('line1\\nline2');
    });

    it('escapes carriage returns', () => {
      const result = encodeJavaScript('line1\rline2');
      expect(result).toBe('line1\\rline2');
    });

    it('escapes forward slashes to prevent </script> breaking', () => {
      const result = encodeJavaScript('</script>');
      expect(result).toBe('<\\/script>');
    });

    it('escapes unicode line separators', () => {
      const result = encodeJavaScript('text\u2028more');
      expect(result).toBe('text\\u2028more');
    });

    it('escapes unicode paragraph separators', () => {
      const result = encodeJavaScript('text\u2029more');
      expect(result).toBe('text\\u2029more');
    });
  });

  describe('encodeUrl', () => {
    it('encodes spaces', () => {
      const result = encodeUrl('hello world');
      expect(result).toBe('hello%20world');
    });

    it('encodes special characters', () => {
      const result = encodeUrl('a=b&c=d');
      expect(result).toBe('a%3Db%26c%3Dd');
    });

    it('preserves alphanumeric characters', () => {
      const result = encodeUrl('abc123');
      expect(result).toBe('abc123');
    });

    it('preserves safe URL characters when configured', () => {
      const result = encodeUrl('path/to/file', { preservePath: true });
      expect(result).toBe('path/to/file');
    });

    it('encodes unicode characters', () => {
      const result = encodeUrl('café');
      expect(result).toBe('caf%C3%A9');
    });

    it('handles empty string', () => {
      const result = encodeUrl('');
      expect(result).toBe('');
    });
  });

  describe('encodeCss', () => {
    it('escapes backslashes', () => {
      const result = encodeCss('url(\\path)');
      expect(result).toContain('\\\\');
    });

    it('escapes quotes', () => {
      const result = encodeCss('font-family: "Arial"');
      expect(result).not.toContain('"');
    });

    it('escapes semicolons', () => {
      const result = encodeCss('value; other-property');
      expect(result).not.toContain(';');
    });

    it('escapes curly braces', () => {
      const result = encodeCss('value { injection }');
      expect(result).not.toContain('{');
    });

    it('blocks url() injection', () => {
      const result = encodeCss('url(javascript:alert(1))');
      expect(result).not.toContain('javascript:');
    });

    it('blocks expression() for IE', () => {
      const result = encodeCss('expression(alert(1))');
      expect(result).not.toContain('expression');
    });
  });

  describe('encodeForContext', () => {
    it('auto-detects HTML context', () => {
      const result = encodeForContext('<script>', 'html');
      expect(result).toBe('&lt;script&gt;');
    });

    it('auto-detects JavaScript context', () => {
      const result = encodeForContext("it's", 'javascript');
      expect(result).toBe("it\\'s");
    });

    it('auto-detects URL context', () => {
      const result = encodeForContext('hello world', 'url');
      expect(result).toBe('hello%20world');
    });

    it('auto-detects CSS context', () => {
      const result = encodeForContext('value;', 'css');
      expect(result).not.toContain(';');
    });

    it('auto-detects attribute context', () => {
      const result = encodeForContext('value"', 'attribute');
      expect(result).toContain('&quot;');
    });

    it('throws for unknown context', () => {
      expect(() => encodeForContext('test', 'unknown')).toThrow();
    });
  });

  describe('createEncoder', () => {
    it('creates encoder with default context', () => {
      const encoder = createEncoder({ defaultContext: 'html' });
      const result = encoder.encode('<script>');
      expect(result).toBe('&lt;script&gt;');
    });

    it('allows context override', () => {
      const encoder = createEncoder({ defaultContext: 'html' });
      const result = encoder.encode('hello world', 'url');
      expect(result).toBe('hello%20world');
    });

    it('chains encoding operations', () => {
      const encoder = createEncoder();
      const result = encoder
        .encode('<script>', 'html')
        .then((v) => v.toUpperCase())
        .value();
      expect(result).toBe('&LT;SCRIPT&GT;');
    });
  });

  describe('unicode handling', () => {
    it('preserves valid unicode in HTML', () => {
      const result = encodeHtml('Hello 世界 🌍');
      expect(result).toContain('世界');
      expect(result).toContain('🌍');
    });

    it('preserves valid unicode in JavaScript', () => {
      const result = encodeJavaScript('Hello 世界');
      expect(result).toContain('世界');
    });

    it('handles surrogate pairs correctly', () => {
      const emoji = '😀';
      const result = encodeHtml(emoji);
      expect(result).toBe('😀');
    });
  });
});
