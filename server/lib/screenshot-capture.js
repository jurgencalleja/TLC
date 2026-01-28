/**
 * Screenshot Capture Module
 * Handles capturing screenshots from running services for bug reports
 */

/**
 * Screenshot request options
 */
const DEFAULT_OPTIONS = {
  width: 1280,
  height: 720,
  fullPage: false,
  format: 'png',
  quality: 90,
  timeout: 30000,
};

/**
 * Build puppeteer viewport options
 * @param {Object} options - Capture options
 * @returns {Object} Viewport config
 */
function buildViewportOptions(options = {}) {
  const {
    width = DEFAULT_OPTIONS.width,
    height = DEFAULT_OPTIONS.height,
    deviceScaleFactor = 1,
    isMobile = false,
    hasTouch = false,
  } = options;

  return {
    width,
    height,
    deviceScaleFactor,
    isMobile,
    hasTouch,
  };
}

/**
 * Build screenshot options for puppeteer
 * @param {Object} options - Capture options
 * @returns {Object} Screenshot config
 */
function buildScreenshotOptions(options = {}) {
  const {
    fullPage = DEFAULT_OPTIONS.fullPage,
    format = DEFAULT_OPTIONS.format,
    quality = DEFAULT_OPTIONS.quality,
    omitBackground = false,
    clip,
  } = options;

  const screenshotOpts = {
    type: format,
    fullPage,
    omitBackground,
  };

  // Quality only applies to jpeg
  if (format === 'jpeg') {
    screenshotOpts.quality = quality;
  }

  // Clip region
  if (clip) {
    screenshotOpts.clip = {
      x: clip.x || 0,
      y: clip.y || 0,
      width: clip.width,
      height: clip.height,
    };
  }

  return screenshotOpts;
}

/**
 * Generate filename for screenshot
 * @param {Object} options - Naming options
 * @returns {string} Filename
 */
function generateFilename(options = {}) {
  const {
    service = 'app',
    prefix = 'screenshot',
    timestamp = Date.now(),
    format = 'png',
  } = options;

  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');

  return `${prefix}-${service}-${dateStr}-${timeStr}.${format}`;
}

/**
 * Parse screenshot path to extract metadata
 * @param {string} filename - Screenshot filename
 * @returns {Object|null} Parsed metadata or null
 */
function parseFilename(filename) {
  const pattern = /^(\w+)-(\w+)-(\d{4}-\d{2}-\d{2})-(\d{2}-\d{2}-\d{2})\.(\w+)$/;
  const match = filename.match(pattern);

  if (!match) return null;

  const [, prefix, service, date, time, format] = match;

  return {
    prefix,
    service,
    date,
    time: time.replace(/-/g, ':'),
    format,
    timestamp: new Date(`${date}T${time.replace(/-/g, ':')}Z`).getTime(),
  };
}

/**
 * Validate capture request
 * @param {Object} request - Capture request
 * @returns {Object} Validation result
 */
function validateCaptureRequest(request) {
  const errors = [];

  if (!request.url) {
    errors.push('URL is required');
  } else if (!isValidUrl(request.url)) {
    errors.push('Invalid URL format');
  }

  if (request.width && (request.width < 100 || request.width > 4096)) {
    errors.push('Width must be between 100 and 4096');
  }

  if (request.height && (request.height < 100 || request.height > 4096)) {
    errors.push('Height must be between 100 and 4096');
  }

  if (request.format && !['png', 'jpeg', 'webp'].includes(request.format)) {
    errors.push('Format must be png, jpeg, or webp');
  }

  if (request.quality && (request.quality < 1 || request.quality > 100)) {
    errors.push('Quality must be between 1 and 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if string is valid URL
 * @param {string} str - String to check
 * @returns {boolean}
 */
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Create capture request from bug report
 * @param {Object} bug - Bug report
 * @param {Object} services - Available services
 * @returns {Object} Capture request
 */
function createCaptureRequest(bug, services = {}) {
  const { serviceName, url, viewport } = bug;

  // Find service URL
  let targetUrl = url;
  if (!targetUrl && serviceName && services[serviceName]) {
    const service = services[serviceName];
    targetUrl = `http://localhost:${service.port}`;
  }

  return {
    url: targetUrl,
    service: serviceName || 'unknown',
    width: viewport?.width || DEFAULT_OPTIONS.width,
    height: viewport?.height || DEFAULT_OPTIONS.height,
    fullPage: bug.fullPage || false,
    timestamp: Date.now(),
  };
}

/**
 * Format screenshot metadata for storage
 * @param {Object} capture - Capture info
 * @returns {Object} Formatted metadata
 */
function formatMetadata(capture) {
  return {
    id: capture.id || `cap_${Date.now()}`,
    filename: capture.filename,
    url: capture.url,
    service: capture.service,
    dimensions: {
      width: capture.width,
      height: capture.height,
    },
    format: capture.format || 'png',
    size: capture.size || 0,
    capturedAt: capture.timestamp || Date.now(),
    bugId: capture.bugId || null,
  };
}

/**
 * Calculate storage path for screenshot
 * @param {Object} options - Path options
 * @returns {string} Storage path
 */
function getStoragePath(options = {}) {
  const {
    baseDir = '.tlc/screenshots',
    service = 'app',
    filename,
  } = options;

  return `${baseDir}/${service}/${filename}`;
}

/**
 * Get thumbnail dimensions
 * @param {number} width - Original width
 * @param {number} height - Original height
 * @param {number} maxSize - Max dimension
 * @returns {Object} Thumbnail dimensions
 */
function getThumbnailSize(width, height, maxSize = 200) {
  const ratio = Math.min(maxSize / width, maxSize / height);

  if (ratio >= 1) {
    return { width, height };
  }

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Device presets for responsive testing
 */
const DevicePresets = {
  desktop: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  laptop: { width: 1366, height: 768, deviceScaleFactor: 1 },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  mobile: { width: 375, height: 812, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

/**
 * Get device preset by name
 * @param {string} name - Preset name
 * @returns {Object|null} Device preset
 */
function getDevicePreset(name) {
  return DevicePresets[name] || null;
}

module.exports = {
  DEFAULT_OPTIONS,
  buildViewportOptions,
  buildScreenshotOptions,
  generateFilename,
  parseFilename,
  validateCaptureRequest,
  isValidUrl,
  createCaptureRequest,
  formatMetadata,
  getStoragePath,
  getThumbnailSize,
  DevicePresets,
  getDevicePreset,
};
