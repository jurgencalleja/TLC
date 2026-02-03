/**
 * Audit Checker Module
 *
 * Checks project structure and code for TLC standards compliance.
 * @module audit-checker
 */

const path = require('path');
const fs = require('fs').promises;

// Try to load glob, but make it optional (tests use mocks)
let defaultGlob;
try {
  defaultGlob = require('glob').glob;
} catch {
  defaultGlob = null;
}

/**
 * Check that CLAUDE.md and CODING-STANDARDS.md exist
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Options with injectable dependencies
 * @param {Object} options.fs - File system module (for testing)
 * @returns {Promise<{passed: boolean, issues: Array<{file: string, type: string}>}>}
 */
async function checkStandardsFiles(projectPath, options = {}) {
  const fsModule = options.fs || fs;
  const issues = [];
  const requiredFiles = ['CLAUDE.md', 'CODING-STANDARDS.md'];

  for (const file of requiredFiles) {
    const filePath = path.join(projectPath, file);
    try {
      await fsModule.access(filePath);
    } catch {
      issues.push({ file, type: 'missing' });
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Detect flat services/, interfaces/, controllers/ folders
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Options with injectable dependencies
 * @param {Function} options.glob - Glob function (for testing)
 * @returns {Promise<{passed: boolean, issues: Array<{type: string, folder: string}>}>}
 */
async function checkFlatFolders(projectPath, options = {}) {
  const globFn = options.glob || defaultGlob;
  const issues = [];
  const flatFolders = ['services', 'interfaces', 'controllers'];

  for (const folder of flatFolders) {
    const pattern = `src/${folder}/*.*`;
    const files = await globFn(pattern, { cwd: projectPath });
    if (files.length > 0) {
      issues.push({ type: 'flat-folder', folder });
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Detect inline interfaces in service files
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Options with injectable dependencies
 * @param {Function} options.glob - Glob function (for testing)
 * @param {Function} options.readFile - File read function (for testing)
 * @returns {Promise<{passed: boolean, issues: Array<{type: string, file: string}>}>}
 */
async function checkInlineInterfaces(projectPath, options = {}) {
  const globFn = options.glob || defaultGlob;
  const readFileFn = options.readFile || (async (p) => fs.readFile(p, 'utf-8'));
  const issues = [];

  const pattern = '**/*.service.ts';
  const files = await globFn(pattern, { cwd: projectPath });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await readFileFn(filePath);

    // Look for interface declarations (interface X {)
    const interfacePattern = /\binterface\s+\w+\s*\{/;
    if (interfacePattern.test(content)) {
      issues.push({ type: 'inline-interface', file });
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Detect hardcoded URLs and ports in code
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Options with injectable dependencies
 * @param {Function} options.glob - Glob function (for testing)
 * @param {Function} options.readFile - File read function (for testing)
 * @returns {Promise<{passed: boolean, issues: Array<{type: string, file: string, value?: string}>}>}
 */
async function checkHardcodedUrls(projectPath, options = {}) {
  const globFn = options.glob || defaultGlob;
  const readFileFn = options.readFile || (async (p) => fs.readFile(p, 'utf-8'));
  const issues = [];

  const pattern = 'src/**/*.{js,ts,jsx,tsx}';
  const files = await globFn(pattern, { cwd: projectPath });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await readFileFn(filePath);

    // Check for hardcoded URLs (http:// or https://)
    const urlPattern = /['"`](https?:\/\/[^'"`]+)['"`]/g;
    let urlMatch;
    while ((urlMatch = urlPattern.exec(content)) !== null) {
      issues.push({
        type: 'hardcoded-url',
        file,
        value: urlMatch[1]
      });
    }

    // Check for hardcoded port assignments (const port = 3000)
    const portPattern = /\b(const|let|var)\s+port\s*=\s*(\d+)/g;
    let portMatch;
    while ((portMatch = portPattern.exec(content)) !== null) {
      issues.push({
        type: 'hardcoded-port',
        file,
        value: portMatch[2]
      });
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Detect magic strings (string comparisons like === 'active')
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Options with injectable dependencies
 * @param {Function} options.glob - Glob function (for testing)
 * @param {Function} options.readFile - File read function (for testing)
 * @returns {Promise<{passed: boolean, issues: Array<{type: string, file: string, value: string}>}>}
 */
async function checkMagicStrings(projectPath, options = {}) {
  const globFn = options.glob || defaultGlob;
  const readFileFn = options.readFile || (async (p) => fs.readFile(p, 'utf-8'));
  const issues = [];

  // Common exceptions that are acceptable
  const exceptions = [
    'utf-8', 'utf8', 'utf-16', 'ascii', 'base64', 'hex', 'binary',
    'application/json', 'text/html', 'text/plain',
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH',
    'true', 'false', 'null', 'undefined',
    'development', 'production', 'test'
  ];

  const pattern = 'src/**/*.{js,ts,jsx,tsx}';
  const files = await globFn(pattern, { cwd: projectPath });

  for (const file of files) {
    // Skip test files
    if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
      continue;
    }

    const filePath = path.join(projectPath, file);
    const content = await readFileFn(filePath);

    // Skip import/require statements
    const lines = content.split('\n');
    for (const line of lines) {
      // Skip import/require lines
      if (line.trim().startsWith('import') || line.includes('require(')) {
        continue;
      }

      // Look for string comparisons: === 'value' or == 'value'
      const magicPattern = /===?\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = magicPattern.exec(line)) !== null) {
        const value = match[1];
        // Skip exceptions
        if (!exceptions.includes(value.toLowerCase())) {
          issues.push({
            type: 'magic-string',
            file,
            value
          });
        }
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Check seed files are organized per-entity (not in flat src/seeds/)
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Options with injectable dependencies
 * @param {Function} options.glob - Glob function (for testing)
 * @returns {Promise<{passed: boolean, issues: Array<{type: string}>}>}
 */
async function checkSeedOrganization(projectPath, options = {}) {
  const globFn = options.glob || defaultGlob;
  const issues = [];

  // Check for flat seeds/ folder at src/seeds/
  // Pattern matches direct files in src/seeds/ (not nested in entity folders)
  const flatSeedsPattern = 'src/seeds/*.*';
  const files = await globFn(flatSeedsPattern, { cwd: projectPath });

  // Filter to only files actually in src/seeds/ (not entity/seeds/)
  const flatSeeds = files.filter(file => {
    // Normalize path separators
    const normalized = file.replace(/\\/g, '/');
    // Check if file is directly in src/seeds/ (e.g., src/seeds/userSeed.ts)
    // Not in src/{entity}/seeds/ (e.g., src/user/seeds/user.seed.ts)
    return normalized.match(/^src\/seeds\/[^/]+$/);
  });

  if (flatSeeds.length > 0) {
    issues.push({ type: 'flat-seeds' });
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Check exported functions have JSDoc comments
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Options with injectable dependencies
 * @param {Function} options.glob - Glob function (for testing)
 * @param {Function} options.readFile - File read function (for testing)
 * @returns {Promise<{passed: boolean, issues: Array<{type: string, file: string, function: string}>}>}
 */
async function checkJsDocCoverage(projectPath, options = {}) {
  const globFn = options.glob || defaultGlob;
  const readFileFn = options.readFile || (async (p) => fs.readFile(p, 'utf-8'));
  const issues = [];

  const pattern = 'src/**/*.{js,ts}';
  const files = await globFn(pattern, { cwd: projectPath });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await readFileFn(filePath);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for export function declarations
      const exportFuncMatch = line.match(/export\s+function\s+(\w+)/);
      if (exportFuncMatch) {
        const funcName = exportFuncMatch[1];

        // Check if previous non-empty line ends a JSDoc comment
        let hasJsDoc = false;
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim();
          if (prevLine === '') continue;
          if (prevLine.endsWith('*/')) {
            // Check if this is a JSDoc (starts with /**)
            for (let k = j; k >= 0; k--) {
              if (lines[k].includes('/**')) {
                hasJsDoc = true;
                break;
              }
              if (lines[k].includes('/*') && !lines[k].includes('/**')) {
                break;
              }
            }
          }
          break;
        }

        if (!hasJsDoc) {
          issues.push({
            type: 'missing-jsdoc',
            file,
            function: funcName
          });
        }
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Check for deep relative imports (3+ levels: ../../../)
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Options with injectable dependencies
 * @param {Function} options.glob - Glob function (for testing)
 * @param {Function} options.readFile - File read function (for testing)
 * @returns {Promise<{passed: boolean, issues: Array<{type: string, file: string}>}>}
 */
async function checkImportStyle(projectPath, options = {}) {
  const globFn = options.glob || defaultGlob;
  const readFileFn = options.readFile || (async (p) => fs.readFile(p, 'utf-8'));
  const issues = [];

  const pattern = 'src/**/*.{js,ts,jsx,tsx}';
  const files = await globFn(pattern, { cwd: projectPath });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await readFileFn(filePath);

    // Look for deep relative imports (3+ levels)
    // Matches: from '../../../' or from "../../../" or require('../../../')
    const deepImportPattern = /(?:from\s+['"]|require\s*\(\s*['"])(?:\.\.\/){3,}/;
    if (deepImportPattern.test(content)) {
      issues.push({
        type: 'deep-import',
        file
      });
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Run all audit checks on a project
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Options with injectable dependencies
 * @returns {Promise<Object>} Audit results with summary
 */
async function auditProject(projectPath, options = {}) {
  const [
    standardsFiles,
    flatFolders,
    inlineInterfaces,
    hardcodedUrls,
    magicStrings,
    seedOrganization,
    jsDocCoverage,
    importStyle
  ] = await Promise.all([
    checkStandardsFiles(projectPath, options),
    checkFlatFolders(projectPath, options),
    checkInlineInterfaces(projectPath, options),
    checkHardcodedUrls(projectPath, options),
    checkMagicStrings(projectPath, options),
    checkSeedOrganization(projectPath, options),
    checkJsDocCoverage(projectPath, options),
    checkImportStyle(projectPath, options)
  ]);

  const allResults = [
    standardsFiles,
    flatFolders,
    inlineInterfaces,
    hardcodedUrls,
    magicStrings,
    seedOrganization,
    jsDocCoverage,
    importStyle
  ];

  const totalIssues = allResults.reduce((sum, r) => sum + r.issues.length, 0);
  const passed = allResults.every(r => r.passed);

  return {
    standardsFiles,
    flatFolders,
    inlineInterfaces,
    hardcodedUrls,
    magicStrings,
    seedOrganization,
    jsDocCoverage,
    importStyle,
    summary: {
      totalIssues,
      passed
    }
  };
}

/**
 * Generate markdown audit report
 * @param {Object} auditResults - Results from auditProject
 * @returns {string} Markdown report content
 */
function generateReport(auditResults) {
  const { summary } = auditResults;
  const status = summary.passed ? 'PASSED' : 'FAILED';
  const statusIcon = summary.passed ? '[+]' : '[-]';

  let report = `# Audit Report\n\n`;
  report += `**Status:** ${statusIcon} ${status}\n`;
  report += `**Total Issues:** ${summary.totalIssues}\n\n`;

  // Standards Files
  if (auditResults.standardsFiles) {
    report += `## Standards Files\n\n`;
    if (auditResults.standardsFiles.passed) {
      report += `[+] All required files present\n\n`;
    } else {
      for (const issue of auditResults.standardsFiles.issues) {
        report += `- ${issue.type}: ${issue.file}\n`;
      }
      report += '\n';
    }
  }

  // Flat Folders
  if (auditResults.flatFolders) {
    report += `## Folder Organization\n\n`;
    if (auditResults.flatFolders.passed) {
      report += `[+] No flat folders detected\n\n`;
    } else {
      for (const issue of auditResults.flatFolders.issues) {
        report += `- ${issue.type}: ${issue.folder}\n`;
      }
      report += '\n';
    }
  }

  // Inline Interfaces
  if (auditResults.inlineInterfaces) {
    report += `## Inline Interfaces\n\n`;
    if (auditResults.inlineInterfaces.passed) {
      report += `[+] No inline interfaces in services\n\n`;
    } else {
      for (const issue of auditResults.inlineInterfaces.issues) {
        report += `- ${issue.type}: ${issue.file}\n`;
      }
      report += '\n';
    }
  }

  // Hardcoded URLs
  if (auditResults.hardcodedUrls) {
    report += `## Hardcoded URLs/Ports\n\n`;
    if (auditResults.hardcodedUrls.passed) {
      report += `[+] No hardcoded URLs or ports\n\n`;
    } else {
      for (const issue of auditResults.hardcodedUrls.issues) {
        report += `- ${issue.type}: ${issue.file}${issue.value ? ` (${issue.value})` : ''}\n`;
      }
      report += '\n';
    }
  }

  // Magic Strings
  if (auditResults.magicStrings) {
    report += `## Magic Strings\n\n`;
    if (auditResults.magicStrings.passed) {
      report += `[+] No magic strings detected\n\n`;
    } else {
      for (const issue of auditResults.magicStrings.issues) {
        report += `- ${issue.type}: ${issue.file} (${issue.value})\n`;
      }
      report += '\n';
    }
  }

  // Seed Organization
  if (auditResults.seedOrganization) {
    report += `## Seed Organization\n\n`;
    if (auditResults.seedOrganization.passed) {
      report += `[+] Seeds properly organized per-entity\n\n`;
    } else {
      for (const issue of auditResults.seedOrganization.issues) {
        report += `- ${issue.type}: Use per-entity seed folders instead of flat src/seeds/\n`;
      }
      report += '\n';
    }
  }

  // JSDoc Coverage
  if (auditResults.jsDocCoverage) {
    report += `## JSDoc Coverage\n\n`;
    if (auditResults.jsDocCoverage.passed) {
      report += `[+] All exported functions have JSDoc\n\n`;
    } else {
      for (const issue of auditResults.jsDocCoverage.issues) {
        report += `- ${issue.type}: ${issue.file} (${issue.function})\n`;
      }
      report += '\n';
    }
  }

  // Import Style
  if (auditResults.importStyle) {
    report += `## Import Style\n\n`;
    if (auditResults.importStyle.passed) {
      report += `[+] No deep relative imports\n\n`;
    } else {
      for (const issue of auditResults.importStyle.issues) {
        report += `- ${issue.type}: ${issue.file}\n`;
      }
      report += '\n';
    }
  }

  return report;
}

module.exports = {
  checkStandardsFiles,
  checkFlatFolders,
  checkInlineInterfaces,
  checkHardcodedUrls,
  checkMagicStrings,
  checkSeedOrganization,
  checkJsDocCoverage,
  checkImportStyle,
  auditProject,
  generateReport
};
