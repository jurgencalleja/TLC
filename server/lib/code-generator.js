/**
 * Code Generator Module
 *
 * Generate code from parsed design data
 */

// Component library mappings
const LIBRARY_MAPPINGS = {
  shadcn: {
    button: 'Button',
    input: 'Input',
    select: 'Select',
    checkbox: 'Checkbox',
    radio: 'RadioGroup',
    card: 'Card',
    modal: 'Dialog',
    nav: 'NavigationMenu',
  },
  mui: {
    button: 'MuiButton',
    input: 'TextField',
    select: 'Select',
    checkbox: 'Checkbox',
    radio: 'RadioGroup',
    card: 'Card',
    modal: 'Modal',
    nav: 'AppBar',
  },
  chakra: {
    button: 'Button',
    input: 'Input',
    select: 'Select',
    checkbox: 'Checkbox',
    radio: 'Radio',
    card: 'Box',
    modal: 'Modal',
    nav: 'Flex',
  },
};

/**
 * Create a code generator
 * @param {Object} options - Generator options
 * @param {Object} options.llmClient - LLM client for code generation
 * @param {string} [options.framework] - Default framework
 * @returns {Object} Generator instance
 */
function createGenerator(options) {
  return {
    llmClient: options.llmClient,
    framework: options.framework || 'react',
  };
}

/**
 * Generate React component code
 * @param {Object} generator - Generator instance
 * @param {Object} options - Generation options
 * @param {Object} options.design - Parsed design data
 * @param {boolean} [options.typescript] - Use TypeScript
 * @returns {Promise<Object>} Generated code
 */
async function generateReact(generator, options) {
  const { design, typescript = false } = options;

  const prompt = `Generate a React ${typescript ? 'TypeScript' : 'JavaScript'} component based on this design:

Layout: ${JSON.stringify(design.layout || {})}
Components: ${JSON.stringify(design.components || [])}
Colors: ${JSON.stringify(design.colors || [])}

Requirements:
- Use functional components with hooks
- Include proper imports
- Use className for styling
- Make it responsive
${typescript ? '- Include TypeScript types/interfaces' : ''}

Return as JSON with: code (string), imports (array of package names).`;

  const result = await generator.llmClient._call(prompt);

  return {
    code: result.code || '// No code generated',
    imports: result.imports || [],
    framework: 'react',
    typescript,
  };
}

/**
 * Generate Vue SFC code
 * @param {Object} generator - Generator instance
 * @param {Object} options - Generation options
 * @param {Object} options.design - Parsed design data
 * @param {boolean} [options.composition] - Use Composition API
 * @returns {Promise<Object>} Generated code
 */
async function generateVue(generator, options) {
  const { design, composition = true } = options;

  const prompt = `Generate a Vue 3 Single File Component based on this design:

Layout: ${JSON.stringify(design.layout || {})}
Components: ${JSON.stringify(design.components || [])}

Requirements:
- Use ${composition ? 'Composition API with <script setup>' : 'Options API'}
- Include <template>, <script>, and <style> sections
- Use scoped styles
- Make it responsive

Return as JSON with: code (string).`;

  const result = await generator.llmClient._call(prompt);

  return {
    code: result.code || '<!-- No code generated -->',
    framework: 'vue',
    composition,
  };
}

/**
 * Generate plain HTML code
 * @param {Object} generator - Generator instance
 * @param {Object} options - Generation options
 * @param {Object} options.design - Parsed design data
 * @param {boolean} [options.includeCSS] - Include CSS
 * @returns {Promise<Object>} Generated code
 */
async function generateHTML(generator, options) {
  const { design, includeCSS = false } = options;

  const prompt = `Generate HTML${includeCSS ? ' with CSS' : ''} based on this design:

Layout: ${JSON.stringify(design.layout || {})}
Components: ${JSON.stringify(design.components || [])}

Requirements:
- Use semantic HTML5 elements
- Use BEM or simple class naming
- Make it accessible (ARIA labels)
${includeCSS ? '- Include inline <style> or return separate CSS' : ''}

Return as JSON with: code (string)${includeCSS ? ', css (string)' : ''}.`;

  const result = await generator.llmClient._call(prompt);

  return {
    code: result.code || '<!-- No code generated -->',
    css: result.css,
    framework: 'html',
  };
}

/**
 * Generate Tailwind CSS code
 * @param {Object} generator - Generator instance
 * @param {Object} options - Generation options
 * @param {Object} options.design - Parsed design data
 * @returns {Promise<Object>} Generated code
 */
async function generateTailwind(generator, options) {
  const { design } = options;

  const prompt = `Generate HTML with Tailwind CSS classes based on this design:

Layout: ${JSON.stringify(design.layout || {})}
Components: ${JSON.stringify(design.components || [])}
Colors: ${JSON.stringify(design.colors || [])}

Requirements:
- Use Tailwind utility classes only
- Map colors to closest Tailwind colors
- Use responsive prefixes where needed (sm:, md:, lg:)
- Use flex/grid utilities for layout

Return as JSON with: code (string), tailwindConfig (object for custom colors if needed).`;

  const result = await generator.llmClient._call(prompt);

  return {
    code: result.code || '<!-- No code generated -->',
    tailwindConfig: result.tailwindConfig,
    framework: 'tailwind',
  };
}

/**
 * Map design components to UI library components
 * @param {Object} generator - Generator instance
 * @param {Object} options - Mapping options
 * @param {Array} options.components - Design components
 * @param {string} options.library - Target library (shadcn, mui, chakra)
 * @returns {Promise<Array>} Mapped components
 */
async function mapToLibrary(generator, options) {
  const { components, library } = options;

  const mapping = LIBRARY_MAPPINGS[library] || LIBRARY_MAPPINGS.shadcn;

  return components.map(comp => ({
    original: comp,
    mapped: mapping[comp.type] || comp.type,
    library,
    import: `import { ${mapping[comp.type] || comp.type} } from '@${library}/${comp.type}'`,
  }));
}

/**
 * Add design reference comment to code
 * @param {string} code - Generated code
 * @param {Object} options - Reference options
 * @param {string} [options.mockupPath] - Path to mockup file
 * @param {string} [options.figmaUrl] - Figma design URL
 * @returns {string} Code with reference comment
 */
function addDesignReference(code, options) {
  const { mockupPath, figmaUrl } = options;

  const lines = ['/**', ' * Generated from design'];

  if (mockupPath) {
    lines.push(` * Mockup: ${mockupPath}`);
  }

  if (figmaUrl) {
    lines.push(` * Figma: ${figmaUrl}`);
  }

  lines.push(` * Generated: ${new Date().toISOString()}`, ' */');

  return lines.join('\n') + '\n\n' + code;
}

/**
 * Format generated code
 * @param {string} code - Code to format
 * @param {Object} options - Format options
 * @param {string} options.language - Language (javascript, typescript, html)
 * @returns {Promise<string>} Formatted code
 */
async function formatCode(code, options) {
  const { language = 'javascript' } = options;

  // Simple formatting - in production you'd use prettier
  try {
    let formatted = code;

    // Basic indentation fix
    const lines = formatted.split('\n');
    let indent = 0;
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();

      // Decrease indent for closing brackets
      if (trimmed.startsWith('}') || trimmed.startsWith(')') || trimmed.startsWith(']') ||
          trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }

      const result = '  '.repeat(indent) + trimmed;

      // Increase indent for opening brackets
      if (trimmed.endsWith('{') || trimmed.endsWith('(') || trimmed.endsWith('[') ||
          (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>'))) {
        indent++;
      }

      return result;
    });

    return formattedLines.join('\n');
  } catch {
    // Return original if formatting fails
    return code;
  }
}

module.exports = {
  createGenerator,
  generateReact,
  generateVue,
  generateHTML,
  generateTailwind,
  mapToLibrary,
  addDesignReference,
  formatCode,
  LIBRARY_MAPPINGS,
};
