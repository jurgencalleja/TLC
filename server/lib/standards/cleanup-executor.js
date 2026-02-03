/**
 * Cleanup Executor - Execute code cleanup operations
 */

/**
 * Generate environment variable name from URL or value
 * @param {string} value - The value to convert
 * @param {string} type - Type of config (url, port)
 * @returns {string} Environment variable name
 */
function generateEnvVarName(value, type) {
  if (type === 'port') {
    return 'PORT';
  }

  // Extract hostname for URL-based env var names
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    if (hostname === 'LOCALHOST') {
      return 'API_URL';
    }
    return `${hostname}_URL`;
  } catch {
    return 'API_URL';
  }
}

/**
 * Replace hardcoded URL/port with environment variable
 * @param {string} code - Source code
 * @param {Object} issue - Issue describing the hardcoded value
 * @returns {Promise<Object>} Result with code and envVar
 */
async function extractHardcodedConfig(code, issue) {
  const { type, value } = issue;
  const envVar = generateEnvVarName(value, type);

  let newCode = code;

  if (type === 'port') {
    // Replace port assignments like: const port = 3000;
    const portPattern = new RegExp(`(const|let|var)\\s+(\\w+)\\s*=\\s*${value}\\s*;`, 'g');
    newCode = newCode.replace(portPattern, (match, keyword, varName) => {
      return `${keyword} ${varName} = process.env.${envVar} || ${value};`;
    });

    // Also replace direct port usage
    if (newCode === code) {
      newCode = newCode.replace(
        new RegExp(`\\b${value}\\b`, 'g'),
        `(process.env.${envVar} || ${value})`
      );
    }
  } else if (type === 'url') {
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if URL is used in a function call (fetch, axios, etc.) with a path appended
    const urlWithPathPattern = new RegExp(`(['"])${escapedValue}(/[^'"]+)\\1`, 'g');
    const hasPath = urlWithPathPattern.test(code);

    if (hasPath) {
      // Replace URL with env var, keeping the path separate
      newCode = code.replace(urlWithPathPattern, (match, q1, path) => {
        return `process.env.${envVar} + '${path}'`;
      });
    } else {
      // Check if it's a simple assignment (const x = 'url';)
      const assignmentPattern = new RegExp(`(const|let|var)\\s+(\\w+)\\s*=\\s*(['"])${escapedValue}\\3\\s*;`, 'g');
      const isAssignment = assignmentPattern.test(code);

      if (isAssignment) {
        // For assignments, use fallback pattern
        newCode = code.replace(
          new RegExp(`(const|let|var)\\s+(\\w+)\\s*=\\s*(['"])${escapedValue}\\3\\s*;`, 'g'),
          (match, keyword, varName, q) => {
            return `${keyword} ${varName} = process.env.${envVar} || ${q}${value}${q};`;
          }
        );
      } else {
        // For inline usage without path, just use env var
        newCode = code.replace(
          new RegExp(`(['"])${escapedValue}\\1`, 'g'),
          `process.env.${envVar}`
        );
      }
    }
  }

  return {
    code: newCode,
    envVar
  };
}

/**
 * Migrate file from flat folder (services/) to entity folder
 * @param {Object} options - Migration options
 * @param {Object} deps - Injected dependencies
 * @returns {Promise<Object>} Result with newPath and updatedImports count
 */
async function migrateFlatFolder(options, deps = {}) {
  const { sourcePath, entity, projectPath } = options;
  const { fs, glob } = deps;

  // Calculate new path
  const fileName = sourcePath.split('/').pop();
  const newPath = `src/${entity}/${fileName}`;
  const fullNewPath = `${projectPath}/${newPath}`;
  const fullSourcePath = `${projectPath}/${sourcePath}`;

  // Create entity directory
  await fs.mkdir(`${projectPath}/src/${entity}`, { recursive: true });

  // Read source file
  const content = await fs.readFile(fullSourcePath);

  // Move file (rename)
  await fs.rename(fullSourcePath, fullNewPath);

  // Update imports in other files
  let updatedImports = 0;

  if (glob) {
    const files = await glob(`${projectPath}/src/**/*.{ts,js,tsx,jsx}`);

    for (const file of files) {
      if (file === fullNewPath) continue;

      try {
        const fileContent = await fs.readFile(file);

        // Extract the folder structure from source path (e.g., services/user.service)
        const pathParts = sourcePath.replace(/^src\//, '').replace(/\.(ts|js|tsx|jsx)$/, '');
        const newImportBase = `${entity}/${fileName.replace(/\.(ts|js|tsx|jsx)$/, '')}`;

        // Match various import patterns:
        // - './services/user.service'
        // - '../services/user.service'
        // - 'src/services/user.service'
        const importPatterns = [
          // Relative import: ./services/user.service or ../services/user.service
          new RegExp(`(['"])\\.{1,2}/${pathParts.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g'),
          // Absolute-style import: src/services/user.service
          new RegExp(`(['"])${sourcePath.replace(/\.(ts|js|tsx|jsx)$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g')
        ];

        let updatedContent = fileContent;
        let fileUpdated = false;

        for (const pattern of importPatterns) {
          if (pattern.test(updatedContent)) {
            updatedContent = updatedContent.replace(pattern, (match, quote) => {
              // Determine the prefix (relative or absolute)
              const hasRelative = match.includes('./');
              const prefix = hasRelative ? './' : '';
              return `${quote}${prefix}${newImportBase}${quote}`;
            });
            fileUpdated = true;
          }
        }

        if (fileUpdated) {
          await fs.writeFile(file, updatedContent);
          updatedImports++;
        }
      } catch (err) {
        // Skip files that can't be read
      }
    }
  }

  return {
    newPath,
    updatedImports
  };
}

/**
 * Extract inline interface to separate types file
 * @param {string} code - Source code with inline interface
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Result with serviceCode, typesCode, typesPath
 */
async function extractInlineInterface(code, options) {
  const { interfaceName, entity } = options;

  // Match the interface definition
  const interfacePattern = new RegExp(
    `(interface\\s+${interfaceName}\\s*\\{[^}]*\\})`,
    's'
  );
  const match = code.match(interfacePattern);

  if (!match) {
    throw new Error(`Interface ${interfaceName} not found in code`);
  }

  const interfaceCode = match[1];

  // Remove interface from service code
  let serviceCode = code.replace(interfacePattern, '').trim();

  // Add import statement at the top
  const importStatement = `import { ${interfaceName} } from './types/${entity}.types';`;

  // Insert import after any existing imports or at the beginning
  const lastImportMatch = serviceCode.match(/^(import .+;\n)+/m);
  if (lastImportMatch) {
    serviceCode = serviceCode.replace(
      lastImportMatch[0],
      lastImportMatch[0] + importStatement + '\n'
    );
  } else {
    serviceCode = importStatement + '\n\n' + serviceCode;
  }

  // Create types file content
  const typesCode = `export ${interfaceCode}`;
  const typesPath = `src/${entity}/types/${entity}.types.ts`;

  return {
    serviceCode,
    typesCode,
    typesPath
  };
}

/**
 * Replace magic strings with named constants
 * @param {string} code - Source code
 * @param {Object} options - Replacement options
 * @returns {Promise<Object>} Result with code, constants, constantsFile, constantsPath
 */
async function replaceMagicStrings(code, options) {
  const { strings, entity } = options;
  const constants = [];
  let newCode = code;

  for (const { value, suggestedName } of strings) {
    const name = suggestedName || `CONST_${value.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

    // Replace occurrences of the string literal
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(['"])${escapedValue}\\1`, 'g');
    newCode = newCode.replace(pattern, name);

    constants.push({ name, value });
  }

  // Generate constants file content
  const constantsFile = constants
    .map(c => `export const ${c.name} = '${c.value}';`)
    .join('\n');

  const constantsPath = entity
    ? `src/${entity}/constants/${entity}.constants.ts`
    : 'src/constants/index.ts';

  return {
    code: newCode,
    constants,
    constantsFile,
    constantsPath
  };
}

/**
 * Parse function signature from code
 * @param {string} funcStr - Function string
 * @returns {Object} Parsed function info
 */
function parseFunctionSignature(funcStr) {
  // Match function name and parameters
  const funcMatch = funcStr.match(
    /(?:async\s+)?(?:function\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/
  );

  if (!funcMatch) return null;

  const [, name, paramsStr, returnType] = funcMatch;

  // Parse parameters
  const params = paramsStr
    .split(',')
    .map(p => p.trim())
    .filter(p => p)
    .map(p => {
      const [paramName, paramType] = p.split(':').map(s => s.trim());
      return { name: paramName, type: paramType || 'any' };
    });

  return { name, params, returnType: returnType || 'any' };
}

/**
 * Generate JSDoc comment for a function
 * @param {Object} funcInfo - Function info from parsing
 * @returns {string} JSDoc comment
 */
function generateJsDoc(funcInfo) {
  const { params, returnType } = funcInfo;

  let jsdoc = '/**\n';
  jsdoc += ` * TODO: Add description\n`;

  for (const param of params) {
    jsdoc += ` * @param {${param.type}} ${param.name}\n`;
  }

  if (returnType && returnType !== 'void') {
    jsdoc += ` * @returns {${returnType}}\n`;
  }

  jsdoc += ' */\n';

  return jsdoc;
}

/**
 * Add JSDoc comments to exported functions missing them
 * @param {string} code - Source code
 * @returns {Promise<Object>} Result with updated code
 */
async function addMissingJsDoc(code) {
  const lines = code.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is an exported function or public method
    const isExportedFunc = /^\s*export\s+(?:async\s+)?function\s+\w+/.test(line);
    const isPublicMethod = /^\s*(?:public\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)/.test(line)
      && !line.includes('private')
      && !line.includes('//');

    if (isExportedFunc || (isPublicMethod && line.includes('class') === false)) {
      // Check if previous line(s) have JSDoc
      let hasJsDoc = false;
      let j = i - 1;

      // Skip empty lines
      while (j >= 0 && lines[j].trim() === '') {
        j--;
      }

      // Check for JSDoc end
      if (j >= 0 && lines[j].trim() === '*/') {
        // Find JSDoc start
        while (j >= 0 && !lines[j].includes('/**')) {
          j--;
        }
        if (j >= 0 && lines[j].includes('/**')) {
          hasJsDoc = true;
        }
      }

      if (!hasJsDoc && (isExportedFunc || isPublicMethod)) {
        // Parse function signature
        const funcInfo = parseFunctionSignature(line);

        if (funcInfo && funcInfo.params.length > 0) {
          // Add JSDoc
          const jsDoc = generateJsDoc(funcInfo);
          result.push(jsDoc.trim());
        }
      }
    }

    result.push(line);
  }

  return { code: result.join('\n') };
}

/**
 * Create a git commit for cleanup changes
 * @param {Object} options - Commit options
 * @param {Object} deps - Injected dependencies
 * @returns {Promise<void>}
 */
async function commitChanges(options, deps = {}) {
  const { type, entity, description, files } = options;
  const { exec } = deps;

  // Stage files
  const filesToAdd = files || ['.'];
  for (const file of Array.isArray(filesToAdd) ? filesToAdd : [filesToAdd]) {
    await exec(`git add ${file}`);
  }

  // Create commit message in conventional commit format
  const commitType = type === 'migrate' ? 'refactor' : type;
  const scope = entity || 'cleanup';
  const message = `${commitType}(${scope}): ${description}`;

  await exec(`git commit -m "${message}"`);
}

/**
 * Run full cleanup on a project
 * @param {string} projectPath - Path to project
 * @param {Object} options - Cleanup options and dependencies
 * @returns {Promise<Object>} Cleanup results
 */
async function runCleanup(projectPath, options = {}) {
  const { injectStandards, auditProject } = options;

  const result = {
    standardsInjected: null,
    issuesFixed: 0,
    commits: []
  };

  // Step 1: Ensure standards files exist
  if (injectStandards) {
    result.standardsInjected = await injectStandards(projectPath);
  }

  // Step 2: Run audit
  if (auditProject) {
    const auditResults = await auditProject(projectPath);

    // Count total issues that could be fixed
    const issueCategories = [
      'flatFolders',
      'hardcodedUrls',
      'magicStrings',
      'inlineInterfaces',
      'jsDocCoverage'
    ];

    for (const category of issueCategories) {
      if (auditResults[category]?.issues) {
        result.issuesFixed += auditResults[category].issues.length;
      }
    }
  }

  return result;
}

module.exports = {
  extractHardcodedConfig,
  migrateFlatFolder,
  extractInlineInterface,
  replaceMagicStrings,
  addMissingJsDoc,
  commitChanges,
  runCleanup
};
