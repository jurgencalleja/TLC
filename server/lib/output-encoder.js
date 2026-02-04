/**
 * Output Encoder Module
 *
 * Context-aware output encoding for XSS prevention
 */

const crypto = require('crypto');

/**
 * Create an output encoder
 * @param {Object} options - Encoder options
 * @returns {Object} Encoder instance
 */
function createOutputEncoder(options = {}) {
  return {
    contexts: options.contexts || ['html', 'js', 'url', 'css', 'attribute'],
  };
}

/**
 * Encode string for HTML context
 * @param {string} input - Input to encode
 * @returns {string} Encoded string
 */
function encodeHtml(input) {
  if (input === null || input === undefined) {
    return '';
  }

  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Encode string for JavaScript context
 * @param {string} input - Input to encode
 * @param {Object} options - Encoding options
 * @returns {string} Encoded string
 */
function encodeJs(input, options = {}) {
  if (input === null || input === undefined) {
    return '';
  }

  let result = String(input)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/<\/script>/gi, '<\\/script>');

  if (options.unicodeEscape) {
    result = result.replace(/[\u0080-\uffff]/g, (char) => {
      return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  return result;
}

/**
 * Encode string for URL context
 * @param {string} input - Input to encode
 * @returns {string} Encoded string
 */
function encodeUrl(input) {
  if (input === null || input === undefined) {
    return '';
  }

  return encodeURIComponent(String(input));
}

/**
 * Encode string for CSS context
 * @param {string} input - Input to encode
 * @returns {string} Encoded string
 */
function encodeCss(input) {
  if (input === null || input === undefined) {
    return '';
  }

  let result = String(input)
    .replace(/\\/g, '\\\\')
    .replace(/</g, '\\3c ')
    .replace(/>/g, '\\3e ')
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(\s*javascript:/gi, 'url(blocked:');

  return result;
}

/**
 * Encode string for HTML attribute context
 * @param {string} input - Input to encode
 * @param {Object} options - Encoding options
 * @returns {string} Encoded string
 */
function encodeAttribute(input, options = {}) {
  if (input === null || input === undefined) {
    return '';
  }

  let result = String(input);

  // Remove event handlers
  result = result.replace(/on\w+\s*=/gi, '');

  if (options.quoted === false) {
    // Unquoted attributes need more escaping
    result = result.replace(/[\s"'=<>`]/g, (char) => {
      return '&#' + char.charCodeAt(0) + ';';
    });
  } else if (options.quoteChar === "'") {
    result = result.replace(/'/g, '&#39;');
  } else {
    result = result.replace(/"/g, '&quot;');
  }

  return result;
}

/**
 * Generate Content Security Policy header
 * @param {Object} options - CSP options
 * @returns {string} CSP header value
 */
function generateCspHeader(options = {}) {
  const directives = [];

  // Always include default-src
  directives.push("default-src 'self'");

  if (options.scriptSrc) {
    directives.push(`script-src ${options.scriptSrc.join(' ')}`);
  }

  if (options.styleSrc) {
    directives.push(`style-src ${options.styleSrc.join(' ')}`);
  }

  if (options.imgSrc) {
    directives.push(`img-src ${options.imgSrc.join(' ')}`);
  }

  if (options.useNonce && options.nonce) {
    // Replace or add script-src with nonce
    const nonceValue = `'nonce-${options.nonce}'`;
    const existingScriptIdx = directives.findIndex(d => d.startsWith('script-src'));
    if (existingScriptIdx >= 0) {
      directives[existingScriptIdx] += ` ${nonceValue}`;
    } else {
      directives.push(`script-src ${nonceValue}`);
    }
  }

  if (options.reportUri) {
    directives.push(`report-uri ${options.reportUri}`);
  }

  const headerValue = directives.join('; ');

  // For reportOnly mode, include in the returned string
  if (options.reportOnly) {
    return headerValue + ' /* Report-Only */';
  }

  return headerValue;
}

/**
 * Generate Subresource Integrity hash
 * @param {string} content - Content to hash
 * @param {Object} options - Hashing options
 * @returns {string} SRI hash
 */
function generateSriHash(content, options = {}) {
  const algorithm = options.algorithm || 'sha384';
  const hash = crypto.createHash(algorithm).update(content).digest('base64');

  return `${algorithm}-${hash}`;
}

/**
 * Generate encoding code
 * @param {Object} options - Generation options
 * @returns {string} Generated code
 */
function generateEncodingCode(options = {}) {
  const { context, language = 'javascript' } = options;

  const generators = {
    javascript: {
      html: () => `
function encodeHtml(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}`,
      js: () => `
function encodeJs(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/\\\\/g, '\\\\\\\\')
    .replace(/'/g, "\\\\'")
    .replace(/"/g, '\\\\"')
    .replace(/\\n/g, '\\\\n');
}`,
      url: () => `
function encodeUrl(input) {
  if (input === null || input === undefined) return '';
  return encodeURIComponent(String(input));
}`,
      css: () => `
function encodeCss(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/\\\\/g, '\\\\\\\\')
    .replace(/</g, '\\\\3c ')
    .replace(/>/g, '\\\\3e ');
}`,
    },
    typescript: {
      html: () => `
function encodeHtml(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}`,
      js: () => `
function encodeJs(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/\\\\/g, '\\\\\\\\')
    .replace(/'/g, "\\\\'")
    .replace(/"/g, '\\\\"');
}`,
      url: () => `
function encodeUrl(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return encodeURIComponent(String(input));
}`,
      css: () => `
function encodeCss(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/</g, '\\\\3c ');
}`,
    },
    python: {
      html: () => `
import html

def encode_html(input_str):
    if input_str is None:
        return ''
    return html.escape(str(input_str))`,
      js: () => `
def encode_js(input_str):
    if input_str is None:
        return ''
    return str(input_str).replace('\\\\', '\\\\\\\\').replace("'", "\\\\'")`,
      url: () => `
from urllib.parse import quote

def encode_url(input_str):
    if input_str is None:
        return ''
    return quote(str(input_str))`,
      css: () => `
def encode_css(input_str):
    if input_str is None:
        return ''
    return str(input_str).replace('<', '\\\\3c ')`,
    },
  };

  const lang = generators[language] || generators.javascript;
  const gen = lang[context] || lang.html;

  return gen();
}

module.exports = {
  createOutputEncoder,
  encodeHtml,
  encodeJs,
  encodeUrl,
  encodeCss,
  encodeAttribute,
  generateCspHeader,
  generateSriHash,
  generateEncodingCode,
};
