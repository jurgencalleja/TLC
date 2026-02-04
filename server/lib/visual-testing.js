/**
 * Visual Testing Module
 *
 * Automated visual regression testing
 */

const path = require('path');

/**
 * Create a visual tester
 * @param {Object} options - Tester options
 * @param {Object} options.visionClient - Vision client for diff analysis
 * @param {string} [options.baselineDir] - Directory for baseline images
 * @param {number} [options.threshold] - Similarity threshold (0-1)
 * @returns {Object} Tester instance
 */
function createVisualTester(options) {
  return {
    visionClient: options.visionClient,
    baselineDir: options.baselineDir || './baselines',
    threshold: options.threshold || 0.95,
    _capture: null,
    _saveFile: null,
    _readFile: null,
    _listFiles: null,
  };
}

/**
 * Capture a screenshot
 * @param {Object} tester - Tester instance
 * @param {Object} options - Capture options
 * @param {string} options.url - URL to capture
 * @param {Object} [options.viewport] - Viewport size
 * @param {string} [options.selector] - Element selector
 * @returns {Promise<Object>} Screenshot data
 */
async function captureScreenshot(tester, options) {
  const { url, viewport, selector } = options;

  if (tester._capture) {
    return tester._capture(url, { viewport, selector });
  }

  // Default mock implementation
  return {
    data: 'base64screenshotdata',
    width: viewport?.width || 1920,
    height: viewport?.height || 1080,
  };
}

/**
 * Compare two screenshots
 * @param {Object} tester - Tester instance
 * @param {Object} options - Comparison options
 * @param {string} options.baseline - Baseline image path/data
 * @param {string} options.current - Current image path/data
 * @returns {Promise<Object>} Comparison result
 */
async function compareScreenshots(tester, options) {
  const { baseline, current } = options;

  const prompt = `Compare these two screenshots and identify:
1. Any visual differences (position, color, size, content)
2. Overall similarity score (0.0 to 1.0)
3. Classification of differences (content, style, layout, noise)

Return as JSON with: differences (array of {x, y, width, height, description}), similarity (number).`;

  const result = await tester.visionClient._call(prompt, { baseline, current });

  const similarity = result.similarity !== undefined ? result.similarity : 1.0;
  const differences = result.differences || [];

  return {
    differences,
    similarity,
    pass: similarity >= tester.threshold && differences.length === 0,
  };
}

/**
 * Analyze visual differences with AI
 * @param {Object} tester - Tester instance
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeVisualDiff(tester, options) {
  const { baseline, current } = options;

  const prompt = `Analyze the visual differences between these screenshots. For each difference:
1. Classify as: content (text/image change), style (color/font), layout (position/size), noise (anti-aliasing/rendering)
2. Rate severity: high (breaking), medium (noticeable), low (minor), none (noise)
3. Describe what changed

Return as JSON with: analysis (array of {type, severity, description}), meaningfulChanges (count excluding noise).`;

  const result = await tester.visionClient._call(prompt, { baseline, current });

  return {
    analysis: result.analysis || [],
    meaningfulChanges: result.meaningfulChanges || 0,
  };
}

/**
 * Create a baseline
 * @param {Object} tester - Tester instance
 * @param {Object} options - Baseline options
 * @param {string} options.name - Baseline name
 * @param {string} options.url - URL to capture
 * @param {Object} [options.viewport] - Viewport size
 * @param {string} [options.selector] - Element selector
 * @returns {Promise<Object>} Baseline info
 */
async function createBaseline(tester, options) {
  const { name, url, viewport, selector } = options;

  const screenshot = await captureScreenshot(tester, { url, viewport, selector });

  const imagePath = path.join(tester.baselineDir, `${name}.png`);
  const metadataPath = path.join(tester.baselineDir, `${name}.json`);

  const metadata = {
    name,
    url,
    viewport: viewport || { width: screenshot.width, height: screenshot.height },
    selector,
    created: new Date().toISOString(),
  };

  if (tester._saveFile) {
    await tester._saveFile(imagePath, screenshot.data);
    await tester._saveFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  return {
    name,
    imagePath,
    metadataPath,
    metadata,
  };
}

/**
 * Update an existing baseline
 * @param {Object} tester - Tester instance
 * @param {Object} options - Update options
 * @param {string} options.name - Baseline name
 * @returns {Promise<Object>} Updated baseline info
 */
async function updateBaseline(tester, options) {
  const { name } = options;

  const metadataPath = path.join(tester.baselineDir, `${name}.json`);
  const metadata = JSON.parse(await tester._readFile(metadataPath));

  const screenshot = await captureScreenshot(tester, {
    url: metadata.url,
    viewport: metadata.viewport,
    selector: metadata.selector,
  });

  const imagePath = path.join(tester.baselineDir, `${name}.png`);

  metadata.updated = new Date().toISOString();

  if (tester._saveFile) {
    await tester._saveFile(imagePath, screenshot.data);
    await tester._saveFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  return {
    name,
    imagePath,
    metadata,
  };
}

/**
 * Get baseline data
 * @param {Object} tester - Tester instance
 * @param {Object} options - Options
 * @param {string} options.name - Baseline name
 * @returns {Promise<Object|null>} Baseline data or null
 */
async function getBaseline(tester, options) {
  const { name } = options;

  try {
    const imagePath = path.join(tester.baselineDir, `${name}.png`);
    const metadataPath = path.join(tester.baselineDir, `${name}.json`);

    const imageData = await tester._readFile(imagePath);
    const metadataStr = await tester._readFile(metadataPath);
    const metadata = JSON.parse(metadataStr);

    return {
      name,
      imageData,
      metadata,
    };
  } catch {
    return null;
  }
}

/**
 * Run a visual test
 * @param {Object} tester - Tester instance
 * @param {Object} options - Test options
 * @param {string} options.name - Test/baseline name
 * @param {string} options.url - URL to test
 * @param {boolean} [options.createIfMissing] - Create baseline if not found
 * @returns {Promise<Object>} Test result
 */
async function runVisualTest(tester, options) {
  const { name, url, createIfMissing = false } = options;

  const startTime = Date.now();

  // Get baseline
  const baseline = await getBaseline(tester, { name });

  if (!baseline) {
    if (createIfMissing) {
      await createBaseline(tester, { name, url });
      return {
        name,
        pass: true,
        baselineCreated: true,
        duration: Date.now() - startTime,
      };
    }
    return {
      name,
      pass: false,
      error: 'Baseline not found',
      duration: Date.now() - startTime,
    };
  }

  // Capture current
  const current = await captureScreenshot(tester, {
    url,
    viewport: baseline.metadata.viewport,
    selector: baseline.metadata.selector,
  });

  // Compare
  const comparison = await compareScreenshots(tester, {
    baseline: baseline.imageData,
    current: current.data,
  });

  return {
    name,
    pass: comparison.pass,
    similarity: comparison.similarity,
    differences: comparison.differences,
    duration: Date.now() - startTime,
  };
}

/**
 * Format visual test report
 * @param {Array} results - Test results
 * @returns {string} Formatted report
 */
function formatVisualReport(results) {
  const lines = [
    'Visual Regression Report',
    '═'.repeat(40),
    '',
  ];

  const passed = results.filter(r => r.pass);
  const failed = results.filter(r => !r.pass);

  // Summary
  lines.push(`Total: ${results.length} | Pass: ${passed.length} | Fail: ${failed.length}`);
  lines.push('');

  // Results
  for (const result of results) {
    const icon = result.pass ? '✓' : '✗';
    const status = result.pass ? 'PASS' : 'FAIL';
    const similarity = result.similarity !== undefined
      ? ` (${Math.round(result.similarity * 100)}%)`
      : '';

    lines.push(`${icon} [${status}] ${result.name}${similarity}`);

    if (!result.pass && result.differences) {
      for (const diff of result.differences.slice(0, 3)) {
        lines.push(`    - ${diff.description || 'Visual difference'}`);
      }
    }
  }

  return lines.join('\n');
}

module.exports = {
  createVisualTester,
  captureScreenshot,
  compareScreenshots,
  analyzeVisualDiff,
  createBaseline,
  updateBaseline,
  getBaseline,
  runVisualTest,
  formatVisualReport,
};
