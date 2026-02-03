/**
 * Output Encoder Module
 *
 * Context-aware output encoding to prevent XSS.
 * Addresses OWASP A03: Cross-Site Scripting (XSS)
 */

/**
 * HTML entity map
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Additional attribute encoding entities
 */
const ATTRIBUTE_ENTITIES = {
  ...HTML_ENTITIES,
  '=': '&#x3D;',
  '`': '&#x60;',
  '(': '&#x28;',
  ')': '&#x29;',
};

/**
 * Encode a string for HTML content context
 * @param {any} input - The input to encode
 * @param {Object} options - Encoding options
 * @returns {string} Encoded string
 */
export function encodeHtml(input, options = {}) {
  const { skipEncoded = false } = options;

  // Handle null/undefined
  if (input === null || input === undefined) {
    return '';
  }

  // Convert to string
  let str = String(input);

  // Strip null bytes
  str = str.replace(/\x00/g, '');

  // Skip if already encoded and option is set
  if (skipEncoded && /&[a-z]+;|&#x?[0-9a-f]+;/i.test(str)) {
    return str;
  }

  // Encode HTML entities
  return str.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Encode a string for HTML attribute context
 * @param {string} input - The input to encode
 * @param {Object} options - Encoding options
 * @returns {string} Encoded string
 */
export function encodeHtmlAttribute(input, options = {}) {
  const { context = 'default' } = options;

  if (input === null || input === undefined) {
    return '';
  }

  let str = String(input);

  // Strip null bytes
  str = str.replace(/\x00/g, '');

  // For event handler context, be more restrictive
  if (context === 'event') {
    str = str.replace(/[&<>"'\/=`()]/g, (char) => ATTRIBUTE_ENTITIES[char] || '');
  } else {
    str = str.replace(/[&<>"'\/=`]/g, (char) => ATTRIBUTE_ENTITIES[char]);
  }

  return str;
}

/**
 * Encode a string for JavaScript string context
 * @param {string} input - The input to encode
 * @returns {string} Encoded string
 */
export function encodeJavaScript(input) {
  if (input === null || input === undefined) {
    return '';
  }

  let str = String(input);

  // Strip null bytes
  str = str.replace(/\x00/g, '');

  // Escape backslashes first
  str = str.replace(/\\/g, '\\\\');

  // Escape quotes
  str = str.replace(/'/g, "\\'");
  str = str.replace(/"/g, '\\"');

  // Escape newlines
  str = str.replace(/\n/g, '\\n');
  str = str.replace(/\r/g, '\\r');

  // Escape forward slashes (prevents </script> breaking out)
  str = str.replace(/\//g, '\\/');

  // Escape unicode line/paragraph separators
  str = str.replace(/\u2028/g, '\\u2028');
  str = str.replace(/\u2029/g, '\\u2029');

  return str;
}

/**
 * Encode a string for URL parameter context
 * @param {string} input - The input to encode
 * @param {Object} options - Encoding options
 * @returns {string} Encoded string
 */
export function encodeUrl(input, options = {}) {
  const { preservePath = false } = options;

  if (input === null || input === undefined) {
    return '';
  }

  const str = String(input);

  if (preservePath) {
    // Encode but preserve path separators
    return str.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  }

  return encodeURIComponent(str);
}

/**
 * Encode a string for CSS context
 * @param {string} input - The input to encode
 * @returns {string} Encoded string
 */
export function encodeCss(input) {
  if (input === null || input === undefined) {
    return '';
  }

  let str = String(input);

  // Strip null bytes
  str = str.replace(/\x00/g, '');

  // Block javascript: and expression()
  if (/javascript\s*:/i.test(str) || /expression\s*\(/i.test(str)) {
    str = str.replace(/javascript\s*:/gi, '');
    str = str.replace(/expression\s*\(/gi, '');
  }

  // Block url() with dangerous protocols
  str = str.replace(/url\s*\(\s*["']?\s*javascript:/gi, 'url(');
  str = str.replace(/url\s*\(\s*["']?\s*data:/gi, 'url(');

  // Escape CSS special characters
  str = str.replace(/\\/g, '\\\\');
  str = str.replace(/"/g, '\\"');
  str = str.replace(/'/g, "\\'");
  str = str.replace(/;/g, '\\;');
  str = str.replace(/\{/g, '\\{');
  str = str.replace(/\}/g, '\\}');

  return str;
}

/**
 * Encode for a specific context
 * @param {string} input - The input to encode
 * @param {string} context - The context (html, javascript, url, css, attribute)
 * @returns {string} Encoded string
 */
export function encodeForContext(input, context) {
  switch (context.toLowerCase()) {
    case 'html':
      return encodeHtml(input);
    case 'javascript':
    case 'js':
      return encodeJavaScript(input);
    case 'url':
      return encodeUrl(input);
    case 'css':
      return encodeCss(input);
    case 'attribute':
    case 'attr':
      return encodeHtmlAttribute(input);
    default:
      throw new Error(`Unknown encoding context: ${context}`);
  }
}

/**
 * Create a chainable encoder
 * @param {Object} options - Encoder options
 * @returns {Object} Encoder instance
 */
export function createEncoder(options = {}) {
  const { defaultContext = 'html' } = options;

  return {
    _value: null,
    _context: defaultContext,

    encode(input, context) {
      const ctx = context || this._context;
      this._value = encodeForContext(input, ctx);
      return this;
    },

    then(fn) {
      if (this._value !== null) {
        this._value = fn(this._value);
      }
      return this;
    },

    value() {
      return this._value;
    },
  };
}
