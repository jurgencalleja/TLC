/**
 * CLAUDE.md Injector - Inject memory context into CLAUDE.md
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Markers for the auto-generated memory section
 */
const MEMORY_SECTION_MARKERS = {
  START: '<!-- TLC-MEMORY-START -->',
  END: '<!-- TLC-MEMORY-END -->',
};

/**
 * Extract memory section content from CLAUDE.md
 * @param {string} content - CLAUDE.md content
 * @returns {string|null} Extracted memory content or null if not found
 */
function extractMemorySection(content) {
  if (!content) return null;

  const startIdx = content.indexOf(MEMORY_SECTION_MARKERS.START);
  const endIdx = content.indexOf(MEMORY_SECTION_MARKERS.END);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return null;
  }

  const start = startIdx + MEMORY_SECTION_MARKERS.START.length;
  return content.slice(start, endIdx).trim();
}

/**
 * Inject memory context into CLAUDE.md
 * @param {string} projectRoot - Project root directory
 * @param {string} memoryContext - Memory context to inject
 * @returns {Promise<void>}
 */
async function injectMemoryContext(projectRoot, memoryContext) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');

  let existingContent = '';
  try {
    existingContent = await fs.readFile(claudeMdPath, 'utf-8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    // File doesn't exist, will create new
  }

  // Build the new memory section
  const memorySection = `${MEMORY_SECTION_MARKERS.START}
${memoryContext}
${MEMORY_SECTION_MARKERS.END}`;

  let newContent;

  // Check if memory section already exists
  const startIdx = existingContent.indexOf(MEMORY_SECTION_MARKERS.START);
  const endIdx = existingContent.indexOf(MEMORY_SECTION_MARKERS.END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Replace existing section
    const before = existingContent.slice(0, startIdx);
    const after = existingContent.slice(endIdx + MEMORY_SECTION_MARKERS.END.length);
    newContent = before + memorySection + after;
  } else {
    // Append new section
    const trimmed = existingContent.trim();
    if (trimmed) {
      newContent = trimmed + '\n\n' + memorySection + '\n';
    } else {
      newContent = memorySection + '\n';
    }
  }

  await fs.writeFile(claudeMdPath, newContent, 'utf-8');
}

module.exports = {
  injectMemoryContext,
  extractMemorySection,
  MEMORY_SECTION_MARKERS,
};
