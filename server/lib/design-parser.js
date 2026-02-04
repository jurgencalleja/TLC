/**
 * Design Parser Module
 *
 * Extract components, layout, and design tokens from mockups
 */

const { analyzeImage } = require('./gemini-vision.js');

/**
 * Create a design parser
 * @param {Object} options - Parser options
 * @param {Object} options.visionClient - Vision client for image analysis
 * @returns {Object} Parser instance
 */
function createParser(options) {
  return {
    visionClient: options.visionClient,
  };
}

/**
 * Parse a mockup image
 * @param {Object} parser - Parser instance
 * @param {Object} options - Parse options
 * @param {string} options.imagePath - Path to mockup image
 * @returns {Promise<Object>} Parsed design data
 */
async function parseMockup(parser, options) {
  const { imagePath } = options;

  const prompt = `Analyze this UI mockup/design and extract:
1. Layout structure (flex/grid, direction, alignment)
2. Color palette (hex values with roles like primary, secondary, text, background)
3. Typography (font sizes, weights for headings, body, etc.)
4. Spacing patterns (padding, margins, gaps)
5. UI components (buttons, inputs, cards, etc. with their properties)

Return as JSON with: layout (object), colors (array), typography (object), spacing (object), components (array).`;

  const result = await parser.visionClient._call(prompt, { data: imagePath });

  return {
    layout: result.layout || { type: 'column' },
    colors: result.colors || [],
    typography: result.typography || {},
    spacing: result.spacing || {},
    components: result.components || [],
  };
}

/**
 * Extract layout from mockup
 * @param {Object} parser - Parser instance
 * @param {Object} options - Options
 * @returns {Promise<Object>} Layout data
 */
async function extractLayout(parser, options) {
  const { imagePath } = options;

  const prompt = `Analyze the layout structure of this UI. Identify:
- Layout type (flex, grid, absolute)
- Direction (row, column)
- Alignment (start, center, end, space-between)
- Nested layouts

Return as JSON with: type, direction, justify, align, children (array of nested layouts).`;

  const result = await parser.visionClient._call(prompt, { data: imagePath });

  return result.layout || {
    type: 'column',
    direction: 'vertical',
  };
}

/**
 * Extract colors from mockup
 * @param {Object} parser - Parser instance
 * @param {Object} options - Options
 * @returns {Promise<Array>} Color palette
 */
async function extractColors(parser, options) {
  const { imagePath } = options;

  const prompt = `Extract the color palette from this UI design. For each color identify:
- Hex value
- Role (primary, secondary, accent, text, background, border, error, success, warning)
- Usage (where it appears)

Return as JSON with: colors (array of {hex, role, usage}).`;

  const result = await parser.visionClient._call(prompt, { data: imagePath });

  return result.colors || [];
}

/**
 * Extract typography from mockup
 * @param {Object} parser - Parser instance
 * @param {Object} options - Options
 * @returns {Promise<Object>} Typography data
 */
async function extractTypography(parser, options) {
  const { imagePath } = options;

  const prompt = `Extract typography styles from this UI design. Identify:
- Font sizes for headings (h1-h6), body, captions
- Font weights (regular, medium, semibold, bold)
- Font families if identifiable
- Line heights

Return as JSON with keys for each text style (heading1, heading2, body, caption, etc.), each with {size, weight, family, lineHeight}.`;

  const result = await parser.visionClient._call(prompt, { data: imagePath });

  return result.typography || {};
}

/**
 * Extract spacing from mockup
 * @param {Object} parser - Parser instance
 * @param {Object} options - Options
 * @returns {Promise<Object>} Spacing data
 */
async function extractSpacing(parser, options) {
  const { imagePath } = options;

  const prompt = `Extract spacing patterns from this UI design. Identify:
- Base spacing unit
- Padding values used
- Margin values used
- Gap values between elements
- Spacing scale if consistent

Return as JSON with: base (number), padding (object), margin (object), gap (number), scale (array of numbers).`;

  const result = await parser.visionClient._call(prompt, { data: imagePath });

  return result.spacing || { base: 8 };
}

/**
 * Extract components from mockup
 * @param {Object} parser - Parser instance
 * @param {Object} options - Options
 * @returns {Promise<Array>} Components list
 */
async function extractComponents(parser, options) {
  const { imagePath } = options;

  const prompt = `Extract UI components from this design mockup. For each component identify:
- Type (button, input, select, checkbox, radio, card, modal, nav, header, footer, list, table)
- Variant (primary, secondary, outline, ghost for buttons; text, password, email for inputs)
- Label or placeholder text
- Bounds (x, y, width, height as percentages of viewport)
- State (default, hover, active, disabled if shown)

Return as JSON with: components (array of {type, variant, label, placeholder, bounds, state}).`;

  const result = await parser.visionClient._call(prompt, { data: imagePath });

  return result.components || [];
}

/**
 * Generate design tokens from mockup
 * @param {Object} parser - Parser instance
 * @param {Object} options - Options
 * @param {string} options.imagePath - Path to mockup
 * @param {string} [options.format] - Output format: 'json' or 'css'
 * @returns {Promise<Object>} Design tokens
 */
async function generateDesignTokens(parser, options) {
  const { imagePath, format = 'object' } = options;

  // Extract all design elements
  const colors = await extractColors(parser, { imagePath });
  const typography = await extractTypography(parser, { imagePath });
  const spacing = await extractSpacing(parser, { imagePath });

  const tokens = {
    colors,
    typography,
    spacing,
  };

  if (format === 'css') {
    const cssLines = [':root {'];

    // Colors
    for (const color of colors) {
      const varName = color.role ? `--color-${color.role}` : `--color-${colors.indexOf(color)}`;
      cssLines.push(`  ${varName}: ${color.hex};`);
    }

    // Typography
    for (const [name, style] of Object.entries(typography)) {
      if (style.size) {
        cssLines.push(`  --font-size-${name}: ${style.size}px;`);
      }
      if (style.weight) {
        cssLines.push(`  --font-weight-${name}: ${style.weight};`);
      }
    }

    // Spacing
    if (spacing.base) {
      cssLines.push(`  --spacing-base: ${spacing.base}px;`);
    }
    if (spacing.scale) {
      spacing.scale.forEach((val, i) => {
        cssLines.push(`  --spacing-${i + 1}: ${val}px;`);
      });
    }

    cssLines.push('}');

    tokens.css = cssLines.join('\n');
  }

  if (format === 'json') {
    tokens.json = JSON.stringify(tokens, null, 2);
  }

  return tokens;
}

module.exports = {
  createParser,
  parseMockup,
  extractLayout,
  extractColors,
  extractTypography,
  extractSpacing,
  extractComponents,
  generateDesignTokens,
};
