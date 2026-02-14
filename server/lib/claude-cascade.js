/**
 * CLAUDE.md Cascade
 *
 * When working in a child project inside a workspace, this module injects
 * workspace-level CLAUDE.md content into the project's context. Only relevant
 * sections (coding standards, conventions, architecture, rules) are cascaded,
 * and a token budget (max 2000 chars) prevents context bloat.
 *
 * Workspace content is injected between TLC-WORKSPACE-START/END markers in
 * the project CLAUDE.md so that project-specific rules always take precedence.
 *
 * @module claude-cascade
 */

import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_MARKERS = {
  START: '<!-- TLC-WORKSPACE-START -->',
  END: '<!-- TLC-WORKSPACE-END -->',
};

/**
 * Section heading keywords that are considered relevant for cascading.
 * Matched case-insensitively against ## headings in the workspace CLAUDE.md.
 */
const RELEVANT_KEYWORDS = [
  'standards',
  'conventions',
  'architecture',
  'rules',
];

/**
 * Maximum character budget for workspace content injection.
 * Rough token estimate: 4 chars per token, so 2000 chars ~ 500 tokens.
 */
const MAX_WORKSPACE_CHARS = 2000;

/**
 * Read a file and return its content, or null if it doesn't exist.
 *
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string|null>}
 */
async function readFileOrNull(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Extract relevant sections from workspace CLAUDE.md content.
 *
 * A section starts with a `## Heading` line and ends just before the next
 * `## Heading` or end-of-file.  Only sections whose heading contains one
 * of the RELEVANT_KEYWORDS (case-insensitive) are included.
 *
 * @param {string} content - Full workspace CLAUDE.md content
 * @returns {string} Filtered content with only relevant sections
 */
function extractRelevantSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = null;
  let currentLines = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      // Save previous section if relevant
      if (currentSection !== null) {
        sections.push({ heading: currentSection, lines: [...currentLines] });
      }
      currentSection = headingMatch[1];
      currentLines = [line];
    } else if (currentSection !== null) {
      currentLines.push(line);
    }
  }

  // Save last section
  if (currentSection !== null) {
    sections.push({ heading: currentSection, lines: [...currentLines] });
  }

  // Filter to only relevant sections
  const relevant = sections.filter((section) => {
    const headingLower = section.heading.toLowerCase();
    return RELEVANT_KEYWORDS.some((kw) => headingLower.includes(kw));
  });

  return relevant.map((s) => s.lines.join('\n')).join('\n\n');
}

/**
 * Truncate content to the character budget, breaking at the last newline
 * before the limit to avoid cutting mid-line.
 *
 * @param {string} content - Content to truncate
 * @param {number} maxChars - Maximum character count
 * @returns {string} Truncated content
 */
function truncateTobudget(content, maxChars) {
  if (content.length <= maxChars) return content;

  const truncated = content.slice(0, maxChars);
  const lastNewline = truncated.lastIndexOf('\n');
  if (lastNewline > 0) {
    return truncated.slice(0, lastNewline);
  }
  return truncated;
}

/**
 * Build the merged content with workspace section injected between markers,
 * followed by the original project content (minus any existing markers).
 *
 * @param {string|null} workspaceContent - Filtered workspace content to inject
 * @param {string|null} projectContent - Original project CLAUDE.md content
 * @returns {string} Merged content
 */
function buildMergedContent(workspaceContent, projectContent) {
  if (!workspaceContent && !projectContent) return '';

  // If no workspace content, return project as-is (strip any old markers)
  if (!workspaceContent) {
    return stripWorkspaceMarkers(projectContent || '');
  }

  const truncated = truncateTobudget(workspaceContent, MAX_WORKSPACE_CHARS);

  const workspaceBlock = [
    WORKSPACE_MARKERS.START,
    truncated,
    WORKSPACE_MARKERS.END,
  ].join('\n');

  // If no project content, just return workspace block
  if (!projectContent) {
    return workspaceBlock + '\n';
  }

  // Strip existing workspace markers from project content
  const cleanedProject = stripWorkspaceMarkers(projectContent).trim();

  // Workspace first, then project (project takes precedence by being last)
  return workspaceBlock + '\n\n' + cleanedProject + '\n';
}

/**
 * Remove existing TLC-WORKSPACE markers and their content from a string.
 *
 * @param {string} content - Content to strip markers from
 * @returns {string} Content with markers removed
 */
function stripWorkspaceMarkers(content) {
  const startIdx = content.indexOf(WORKSPACE_MARKERS.START);
  const endIdx = content.indexOf(WORKSPACE_MARKERS.END);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return content;
  }

  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx + WORKSPACE_MARKERS.END.length);

  // Clean up extra blank lines at the junction
  return (before + after).replace(/\n{3,}/g, '\n\n');
}

/**
 * Create a CLAUDE.md cascade instance.
 *
 * @param {Object} options
 * @param {Object} options.workspaceDetector - A workspace detector instance
 *   with a `detectWorkspace(projectDir)` method.
 * @returns {{ getCascadedContext: Function, syncCascade: Function }}
 */
export function createClaudeCascade({ workspaceDetector }) {
  /**
   * Get merged context for a project directory.
   *
   * @param {string} projectDir - Absolute path to the project directory
   * @returns {Promise<{ workspaceContent: string|null, projectContent: string|null, merged: string }>}
   */
  async function getCascadedContext(projectDir) {
    const result = workspaceDetector.detectWorkspace(projectDir);
    const projectClaudeMd = path.join(projectDir, 'CLAUDE.md');
    const projectContent = await readFileOrNull(projectClaudeMd);

    // If not in a workspace, return project content only
    if (!result.isInWorkspace || !result.workspaceRoot) {
      return {
        workspaceContent: null,
        projectContent,
        merged: projectContent || '',
      };
    }

    // Read workspace CLAUDE.md
    const wsClaudeMd = path.join(result.workspaceRoot, 'CLAUDE.md');
    const rawWorkspaceContent = await readFileOrNull(wsClaudeMd);

    if (!rawWorkspaceContent) {
      return {
        workspaceContent: null,
        projectContent,
        merged: projectContent || '',
      };
    }

    // Extract only relevant sections
    const relevantContent = extractRelevantSections(rawWorkspaceContent);
    const workspaceContent = relevantContent || rawWorkspaceContent;

    const merged = buildMergedContent(relevantContent || null, projectContent);

    return {
      workspaceContent: rawWorkspaceContent,
      projectContent,
      merged,
    };
  }

  /**
   * Sync workspace content into the project's CLAUDE.md file on disk.
   *
   * Writes the merged content back to the project's CLAUDE.md, placing
   * workspace content between TLC-WORKSPACE markers and preserving all
   * project-specific content after the markers.
   *
   * @param {string} projectDir - Absolute path to the project directory
   * @returns {Promise<void>}
   */
  async function syncCascade(projectDir) {
    const context = await getCascadedContext(projectDir);
    const claudeMdPath = path.join(projectDir, 'CLAUDE.md');

    await fs.promises.writeFile(claudeMdPath, context.merged, 'utf-8');
  }

  return { getCascadedContext, syncCascade };
}
