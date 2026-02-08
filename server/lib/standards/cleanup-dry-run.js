/**
 * Cleanup Dry-Run Mode
 *
 * Preview what /tlc:cleanup would change without making
 * any modifications. Returns a structured report of planned changes.
 *
 * @module standards/cleanup-dry-run
 */

const path = require('path');

/** Flat folders that should be reorganized */
const FLAT_FOLDERS = ['services', 'interfaces', 'controllers'];

/**
 * List files that would be moved from flat folders to entity structure
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Injectable dependencies
 * @param {Function} options.glob - Glob function
 * @returns {Promise<Array>} Files with source, destination, reason
 */
async function listFilesToMove(projectPath, options = {}) {
  const { glob } = options;
  const results = [];

  for (const folder of FLAT_FOLDERS) {
    const pattern = `src/${folder}/*.*`;
    const files = await glob(pattern, { cwd: projectPath });

    for (const file of files) {
      const fileName = path.basename(file);
      // Derive entity name from file (e.g., userService.js → user)
      const entity = fileName
        .replace(/\.(js|ts|jsx|tsx)$/, '')
        .replace(/(Service|Controller|Interface)$/i, '')
        .toLowerCase();

      results.push({
        source: file,
        destination: `src/${entity}/${fileName}`,
        reason: `Move from flat ${folder}/ to entity-based structure`,
      });
    }
  }

  return results;
}

/**
 * List hardcoded URLs/ports that would be extracted to env vars
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Injectable dependencies
 * @param {Function} options.glob - Glob function
 * @param {Function} options.readFile - File reader
 * @returns {Promise<Array>} Hardcoded values with suggested env vars
 */
async function listHardcodedUrls(projectPath, options = {}) {
  const { glob, readFile } = options;
  const results = [];

  const pattern = 'src/**/*.{js,ts,jsx,tsx}';
  const files = await glob(pattern, { cwd: projectPath });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await readFile(filePath);

    // Check URLs
    const urlPattern = /['"`](https?:\/\/[^'"`]+)['"`]/g;
    let match;
    while ((match = urlPattern.exec(content)) !== null) {
      results.push({
        file,
        value: match[1],
        type: 'url',
        suggestedEnvVar: generateEnvVarName(match[1], 'url'),
      });
    }

    // Check ports
    const portPattern = /\b(?:const|let|var)\s+port\s*=\s*(\d+)/g;
    while ((match = portPattern.exec(content)) !== null) {
      results.push({
        file,
        value: match[1],
        type: 'port',
        suggestedEnvVar: 'PORT',
      });
    }
  }

  return results;
}

/**
 * Generate env var name from a value
 * @param {string} value - The value
 * @param {string} type - Type (url, port)
 * @returns {string} Suggested env var name
 */
function generateEnvVarName(value, type) {
  if (type === 'port') return 'PORT';
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return host === 'LOCALHOST' ? 'API_URL' : `${host}_URL`;
  } catch {
    return 'API_URL';
  }
}

/**
 * List inline interfaces that would be extracted
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Injectable dependencies
 * @param {Function} options.glob - Glob function
 * @param {Function} options.readFile - File reader
 * @returns {Promise<Array>} Interfaces with file, name, target path
 */
async function listInterfacesToExtract(projectPath, options = {}) {
  const { glob, readFile } = options;
  const results = [];

  const pattern = '**/*.service.ts';
  const files = await glob(pattern, { cwd: projectPath });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await readFile(filePath);

    const interfacePattern = /\binterface\s+(\w+)\s*\{/g;
    let match;
    while ((match = interfacePattern.exec(content)) !== null) {
      const entity = path.basename(file, '.service.ts');
      results.push({
        file,
        interfaceName: match[1],
        targetPath: `src/${entity}/types/${entity}.types.ts`,
      });
    }
  }

  return results;
}

/**
 * List exported functions missing JSDoc
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Injectable dependencies
 * @param {Function} options.glob - Glob function
 * @param {Function} options.readFile - File reader
 * @returns {Promise<Array>} Functions needing JSDoc
 */
async function listFunctionsNeedingJsDoc(projectPath, options = {}) {
  const { glob, readFile } = options;
  const results = [];

  const pattern = 'src/**/*.{js,ts}';
  const files = await glob(pattern, { cwd: projectPath });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await readFile(filePath);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const exportMatch = lines[i].match(/export\s+function\s+(\w+)/);
      if (!exportMatch) continue;

      // Check if previous non-empty line is end of JSDoc
      let hasJsDoc = false;
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j].trim();
        if (prev === '') continue;
        if (prev.endsWith('*/')) {
          hasJsDoc = true;
        }
        break;
      }

      if (!hasJsDoc) {
        results.push({
          file,
          functionName: exportMatch[1],
          line: i + 1,
        });
      }
    }
  }

  return results;
}

/**
 * Generate planned commit messages based on planned changes
 * @param {Object} plan - Cleanup plan
 * @returns {string[]} Commit messages
 */
function planCommitMessages(plan) {
  const commits = [];

  if (plan.filesToMove.length > 0) {
    commits.push(`refactor(cleanup): migrate ${plan.filesToMove.length} files from flat folders to entity structure`);
  }
  if (plan.hardcodedUrls.length > 0) {
    commits.push(`refactor(cleanup): extract ${plan.hardcodedUrls.length} hardcoded URLs/ports to environment variables`);
  }
  if (plan.interfacesToExtract.length > 0) {
    commits.push(`refactor(cleanup): extract ${plan.interfacesToExtract.length} inline interfaces to type files`);
  }
  if (plan.functionsNeedingJsDoc.length > 0) {
    commits.push(`docs(cleanup): add JSDoc to ${plan.functionsNeedingJsDoc.length} exported functions`);
  }

  return commits;
}

/**
 * Plan cleanup without executing — dry-run mode
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Injectable dependencies (no writeFile, no exec)
 * @param {Function} options.glob - Glob function
 * @param {Function} options.readFile - File reader
 * @returns {Promise<Object>} Structured cleanup plan
 */
async function planCleanup(projectPath, options = {}) {
  const { glob, readFile } = options;

  const filesToMove = await listFilesToMove(projectPath, { glob });
  const hardcodedUrls = await listHardcodedUrls(projectPath, { glob, readFile });
  const interfacesToExtract = await listInterfacesToExtract(projectPath, { glob, readFile });
  const functionsNeedingJsDoc = await listFunctionsNeedingJsDoc(projectPath, { glob, readFile });

  const plan = {
    filesToMove,
    hardcodedUrls,
    interfacesToExtract,
    functionsNeedingJsDoc,
    plannedCommits: [],
  };

  plan.plannedCommits = planCommitMessages(plan);

  return plan;
}

module.exports = {
  planCleanup,
  listFilesToMove,
  listHardcodedUrls,
  listInterfacesToExtract,
  listFunctionsNeedingJsDoc,
  planCommitMessages,
};
