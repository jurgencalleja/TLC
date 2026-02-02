/**
 * TLC Self-Awareness Module
 *
 * Scans the TLC codebase and generates a manifest showing:
 * - All modules and their test coverage
 * - All API endpoints
 * - All dashboard panels and their API dependencies
 * - Detected mismatches/issues
 */

const fs = require('fs');
const path = require('path');

/**
 * Scan server/lib/*.js files and check for test coverage
 * @param {string} serverDir - Path to server directory
 * @returns {Promise<Array<{name: string, hasTests: boolean, testCount: number}>>}
 */
async function scanModules(serverDir) {
  const libDir = path.join(serverDir, 'lib');
  const modules = [];

  if (!fs.existsSync(libDir)) {
    return modules;
  }

  const files = fs.readdirSync(libDir);
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.endsWith('.test.js'));

  for (const file of jsFiles) {
    const name = file.replace('.js', '');
    const testFile = path.join(libDir, `${name}.test.js`);
    const hasTests = fs.existsSync(testFile);
    let testCount = 0;

    if (hasTests) {
      const testContent = fs.readFileSync(testFile, 'utf-8');
      // Count it() or test() calls
      const itMatches = testContent.match(/\bit\s*\(/g) || [];
      const testMatches = testContent.match(/\btest\s*\(/g) || [];
      testCount = itMatches.length + testMatches.length;
    }

    modules.push({
      name,
      hasTests,
      testCount,
    });
  }

  return modules.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scan server/index.js to extract API routes
 * @param {string} serverDir - Path to server directory
 * @returns {Promise<Array<{method: string, path: string, handler: string}>>}
 */
async function scanAPIs(serverDir) {
  const indexFile = path.join(serverDir, 'index.js');
  const apis = [];

  if (!fs.existsSync(indexFile)) {
    return apis;
  }

  const content = fs.readFileSync(indexFile, 'utf-8');

  // Match patterns like: app.get('/api/status', ...
  // app.post('/api/test', ...
  // app.patch('/api/agents/:id', ...
  // app.delete('/api/agents/:id', ...
  const routeRegex = /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];

    // Extract handler name if possible (function name or inline)
    // Look for the pattern after the path
    const afterPath = content.slice(match.index + match[0].length, match.index + match[0].length + 200);
    let handler = 'anonymous';

    // Try to find (req, res) => or function name
    const handlerMatch = afterPath.match(/,\s*(?:async\s+)?(\w+)\s*\)|,\s*\(?(?:async\s+)?\(?\s*(?:req|request)/);
    if (handlerMatch && handlerMatch[1] && handlerMatch[1] !== 'req' && handlerMatch[1] !== 'request') {
      handler = handlerMatch[1];
    } else if (afterPath.match(/,\s*\(?(?:async\s+)?\(?\s*(?:req|request)/)) {
      handler = 'inline';
    }

    apis.push({
      method,
      path: routePath,
      handler,
    });
  }

  return apis.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Scan dashboard/index.html to extract panels and their API calls
 * @param {string} serverDir - Path to server directory
 * @returns {Promise<Array<{panelId: string, apiCalls: string[]}>>}
 */
async function scanDashboard(serverDir) {
  const dashboardFile = path.join(serverDir, 'dashboard', 'index.html');
  const panels = [];

  if (!fs.existsSync(dashboardFile)) {
    return panels;
  }

  const content = fs.readFileSync(dashboardFile, 'utf-8');

  // Extract panel IDs from HTML (id="panel-xxx" or class="panel" id="xxx")
  const panelRegex = /id\s*=\s*["']panel-(\w+)["']/gi;
  const panelIds = new Set();
  let match;
  while ((match = panelRegex.exec(content)) !== null) {
    panelIds.add(match[1]);
  }

  // Extract all fetch() API calls
  const fetchRegex = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  const allApiCalls = new Set();
  while ((match = fetchRegex.exec(content)) !== null) {
    const url = match[1];
    // Only include /api/ paths
    if (url.startsWith('/api/')) {
      allApiCalls.add(url);
    }
  }

  // For simplicity, associate all API calls with a general "dashboard" panel
  // and also create entries for each detected panel
  const apiCallsArray = Array.from(allApiCalls).sort();

  // Add main dashboard panel with all calls
  if (apiCallsArray.length > 0) {
    panels.push({
      panelId: 'dashboard',
      apiCalls: apiCallsArray,
    });
  }

  // Try to associate specific API calls with panels based on context
  // Look for functions that call fetch within panel-related code
  const functionApiMap = extractFunctionApiCalls(content);

  // Map specific panels to their likely API calls
  const panelApiMap = {
    'projects': ['/api/status', '/api/progress'],
    'tasks': ['/api/tasks'],
    'agents': ['/api/agents', '/api/agents-stats'],
    'logs': ['/api/logs'],
    'github': ['/api/changelog'],
    'health': ['/api/health'],
    'router': ['/api/router/status'],
    'preview': [],
    'chat': [],
    'settings': [],
  };

  for (const panelId of panelIds) {
    const knownCalls = panelApiMap[panelId] || [];
    const actualCalls = knownCalls.filter(c => apiCallsArray.some(a => a.startsWith(c.replace(':id', ''))));

    panels.push({
      panelId,
      apiCalls: actualCalls,
    });
  }

  return panels.sort((a, b) => a.panelId.localeCompare(b.panelId));
}

/**
 * Helper to extract function names and their fetch calls
 */
function extractFunctionApiCalls(content) {
  const map = {};

  // Match async function name() { ... fetch('/api/xxx') ... }
  const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{([^}]+)\}/gi;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1];
    const funcBody = match[2];
    const fetchMatch = funcBody.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (fetchMatch && fetchMatch[1].startsWith('/api/')) {
      map[funcName] = fetchMatch[1];
    }
  }

  return map;
}

/**
 * Detect mismatches between modules, APIs, and dashboard
 * @param {Array} modules - Result from scanModules
 * @param {Array} apis - Result from scanAPIs
 * @param {Array} panels - Result from scanDashboard
 * @returns {string[]} Array of issue descriptions
 */
function detectMismatches(modules, apis, panels) {
  const issues = [];

  // 1. Modules without tests
  const untestedModules = modules.filter(m => !m.hasTests);
  for (const mod of untestedModules) {
    issues.push(`Module '${mod.name}' has no tests`);
  }

  // 2. Dashboard panels calling non-existent APIs
  const apiPaths = new Set(apis.map(a => a.path));

  // Normalize API path by removing :param patterns
  const normalizeApiPath = (path) => {
    return path.replace(/\/:[^/]+/g, '/:id');
  };

  const normalizedApiPaths = new Set(apis.map(a => normalizeApiPath(a.path)));

  for (const panel of panels) {
    for (const apiCall of panel.apiCalls) {
      const normalizedCall = normalizeApiPath(apiCall);
      // Check if the API exists (exact match or parameterized match)
      const exists = apiPaths.has(apiCall) || normalizedApiPaths.has(normalizedCall);
      if (!exists) {
        issues.push(`Panel '${panel.panelId}' calls missing API: ${apiCall}`);
      }
    }
  }

  return issues;
}

/**
 * Generate the manifest markdown content
 * @param {string} serverDir - Path to server directory
 * @returns {Promise<string>} Markdown content
 */
async function generateManifest(serverDir) {
  const modules = await scanModules(serverDir);
  const apis = await scanAPIs(serverDir);
  const panels = await scanDashboard(serverDir);
  const issues = detectMismatches(modules, apis, panels);

  const timestamp = new Date().toISOString();

  let markdown = `# TLC Manifest (auto-generated)
Generated: ${timestamp}

## Modules
| Module | Has Tests | Test Count |
|--------|-----------|------------|
`;

  for (const mod of modules) {
    markdown += `| ${mod.name} | ${mod.hasTests ? 'Yes' : 'No'} | ${mod.testCount} |\n`;
  }

  markdown += `
## API Endpoints
| Method | Path | Handler |
|--------|------|---------|
`;

  for (const api of apis) {
    markdown += `| ${api.method} | ${api.path} | ${api.handler} |\n`;
  }

  markdown += `
## Dashboard Panels
| Panel | API Calls |
|-------|-----------|
`;

  for (const panel of panels) {
    const calls = panel.apiCalls.length > 0 ? panel.apiCalls.join(', ') : 'None';
    markdown += `| ${panel.panelId} | ${calls} |\n`;
  }

  markdown += `
## Issues Detected
`;

  if (issues.length === 0) {
    markdown += '- No issues detected\n';
  } else {
    for (const issue of issues) {
      markdown += `- ${issue}\n`;
    }
  }

  return markdown;
}

// Export for CommonJS
module.exports = {
  scanModules,
  scanAPIs,
  scanDashboard,
  generateManifest,
  detectMismatches,
};
