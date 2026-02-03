/**
 * Standards Injector Module
 *
 * Injects TLC coding standards into project CLAUDE.md and CODING-STANDARDS.md files.
 */
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Path to templates directory */
const TEMPLATES_DIR = join(__dirname, '..', '..', 'templates');

/**
 * Load a template file from the templates directory.
 * @param {string} name - Template filename (e.g., 'CLAUDE.md', 'CODING-STANDARDS.md')
 * @returns {Promise<string>} Template content
 * @throws {Error} If template file not found
 */
export async function loadTemplate(name) {
  const templatePath = join(TEMPLATES_DIR, name);
  return fs.readFile(templatePath, 'utf-8');
}

/**
 * Check if content has a TLC standards section.
 * Looks for various markers indicating TLC standards are already present.
 * @param {string} content - File content to check
 * @returns {boolean} True if TLC section exists
 */
export function hasClaudeSection(content) {
  const markers = [
    '<!-- TLC-STANDARDS -->',
    '## TLC Standards',
    '## TLC Coding Standards',
    '## Code Quality (TLC)',
  ];

  return markers.some(marker => content.includes(marker));
}

/**
 * Append TLC standards section to existing CLAUDE.md content.
 * @param {string} existing - Existing file content
 * @returns {string} Content with TLC section appended
 */
export function appendClaudeSection(existing) {
  const tlcSection = `

---

<!-- TLC-STANDARDS -->

## Code Quality (TLC)

This project follows TLC (Test-Led Coding) standards. See [CODING-STANDARDS.md](./CODING-STANDARDS.md) for detailed guidelines.

### Quick Reference

**Module Structure:** Organize by entity, not by type.

**Key Rules:**
1. No inline interfaces in services - All types in separate files
2. No hardcoded URLs or config - Use environment variables
3. No magic strings - Define constants in \`constants/\` folder
4. JSDoc required on all public members

See [CODING-STANDARDS.md](./CODING-STANDARDS.md) for complete standards.
`;

  return existing.trimEnd() + tlcSection;
}

/**
 * Inject TLC standards into a project.
 * Creates or updates CLAUDE.md and CODING-STANDARDS.md files.
 *
 * @param {string} projectPath - Path to the project root
 * @param {Object} options - Options object
 * @param {Object} options.fs - File system module (for testing)
 * @returns {Promise<Object>} Results object with actions taken
 */
export async function injectStandards(projectPath, options = {}) {
  const fsModule = options.fs || fs;
  const claudeMdPath = join(projectPath, 'CLAUDE.md');
  const codingStandardsPath = join(projectPath, 'CODING-STANDARDS.md');

  const results = {
    claudeMd: 'skipped',
    codingStandards: 'skipped',
    projectPath,
  };

  try {
    // Handle CLAUDE.md
    let claudeMdExists = false;
    let claudeMdContent = '';

    try {
      claudeMdContent = await fsModule.readFile(claudeMdPath, 'utf-8');
      claudeMdExists = true;
    } catch {
      claudeMdExists = false;
    }

    if (claudeMdExists) {
      if (hasClaudeSection(claudeMdContent)) {
        results.claudeMd = 'skipped';
      } else {
        const newContent = appendClaudeSection(claudeMdContent);
        await fsModule.writeFile(claudeMdPath, newContent, 'utf-8');
        results.claudeMd = 'appended';
      }
    } else {
      const template = await loadTemplate('CLAUDE.md');
      await fsModule.writeFile(claudeMdPath, template, 'utf-8');
      results.claudeMd = 'created';
    }

    // Handle CODING-STANDARDS.md
    let codingStandardsExists = false;

    try {
      await fsModule.readFile(codingStandardsPath, 'utf-8');
      codingStandardsExists = true;
    } catch {
      codingStandardsExists = false;
    }

    if (codingStandardsExists) {
      results.codingStandards = 'skipped';
    } else {
      const template = await loadTemplate('CODING-STANDARDS.md');
      await fsModule.writeFile(codingStandardsPath, template, 'utf-8');
      results.codingStandards = 'created';
    }

    return results;
  } catch (error) {
    return {
      ...results,
      error: error.message,
    };
  }
}

/**
 * Report injection results to console.
 * @param {Object} results - Results from injectStandards
 * @param {Object} options - Options object
 * @param {Object} options.logger - Logger object (default: console)
 */
export function reportResults(results, options = {}) {
  const logger = options.logger || console;

  if (results.error) {
    const errorFn = logger.error || logger.warn;
    errorFn.call(logger, `Error: ${results.error}`);
    return;
  }

  logger.log(`Standards injection for: ${results.projectPath}`);
  logger.log(`  CLAUDE.md: ${results.claudeMd}`);
  logger.log(`  CODING-STANDARDS.md: ${results.codingStandards}`);
}
