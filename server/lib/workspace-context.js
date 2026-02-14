/**
 * Workspace Context Builder
 *
 * Combines workspace detection, memory inheritance, and CLAUDE.md cascade
 * into a unified context object that TLC commands can consume.
 *
 * Factory function `createWorkspaceContext` accepts three injected dependencies:
 *   - workspaceDetector  — detects if a project is in a workspace
 *   - memoryInheritance  — loads inherited decisions/gotchas from workspace
 *   - claudeCascade      — provides cascaded CLAUDE.md content
 *
 * The returned object exposes:
 *   - buildContext(projectDir) — builds the full workspace context
 *
 * @module workspace-context
 */

/**
 * Static token budget split between project and workspace context.
 * @type {{ project: number, workspace: number }}
 */
const TOKEN_BUDGET = { project: 0.6, workspace: 0.4 };

/**
 * Format an array of memory items into a markdown list.
 *
 * @param {string} heading - Section heading (e.g. "Decisions")
 * @param {Object[]} items - Memory items with topic and text properties
 * @returns {string} Formatted markdown section, or empty string if no items
 */
function formatMemorySection(heading, items) {
  if (!items || items.length === 0) return '';

  const lines = [`### ${heading}`, ''];
  for (const item of items) {
    const label = item.topic || 'unknown';
    const text = item.text || '';
    lines.push(`- **${label}**: ${text}`);
  }
  return lines.join('\n');
}

/**
 * Create a workspace context builder instance.
 *
 * @param {Object} deps
 * @param {Object} deps.workspaceDetector - Detector with detectWorkspace(dir)
 * @param {Object} deps.memoryInheritance - Engine with loadInheritedMemory(dir)
 * @param {Object} deps.claudeCascade - Cascade with getCascadedContext(dir)
 * @returns {{ buildContext: (projectDir: string) => Promise<WorkspaceContext> }}
 *
 * @typedef {Object} WorkspaceContext
 * @property {boolean} isInWorkspace - Whether the project is inside a workspace
 * @property {string|null} workspaceSection - Markdown section for workspace context
 * @property {Object[]} inheritedDecisions - Decisions inherited from workspace
 * @property {Object[]} inheritedGotchas - Gotchas inherited from workspace
 * @property {{ project: number, workspace: number }} tokenBudget - Token budget split
 */
export function createWorkspaceContext({ workspaceDetector, memoryInheritance, claudeCascade }) {
  /**
   * Build full workspace context for a project directory.
   *
   * Loads inherited memory, detects workspace status, and merges cascaded
   * CLAUDE.md content into a single context object.
   *
   * @param {string} projectDir - Absolute path to the project directory
   * @returns {Promise<WorkspaceContext>}
   */
  async function buildContext(projectDir) {
    // Detect workspace
    const wsResult = workspaceDetector.detectWorkspace(projectDir);
    const isInWorkspace = wsResult.isInWorkspace;

    // Load inherited memory
    const memory = await memoryInheritance.loadInheritedMemory(projectDir);

    const inheritedDecisions = memory.decisions || [];
    const inheritedGotchas = memory.gotchas || [];

    // For standalone projects, return minimal context
    if (!isInWorkspace) {
      return {
        isInWorkspace: false,
        workspaceSection: null,
        inheritedDecisions,
        inheritedGotchas,
        tokenBudget: TOKEN_BUDGET,
      };
    }

    // Get cascaded CLAUDE.md content
    const cascadeResult = await claudeCascade.getCascadedContext(projectDir);

    // Build workspace section as markdown
    const sectionParts = ['## Workspace Context', ''];

    // Include cascaded CLAUDE.md content
    if (cascadeResult.workspaceContent) {
      sectionParts.push(cascadeResult.workspaceContent.trim());
      sectionParts.push('');
    }

    // Include inherited decisions
    const decisionsSection = formatMemorySection('Inherited Decisions', inheritedDecisions);
    if (decisionsSection) {
      sectionParts.push(decisionsSection);
      sectionParts.push('');
    }

    // Include inherited gotchas
    const gotchasSection = formatMemorySection('Inherited Gotchas', inheritedGotchas);
    if (gotchasSection) {
      sectionParts.push(gotchasSection);
      sectionParts.push('');
    }

    const workspaceSection = sectionParts.join('\n').trimEnd();

    return {
      isInWorkspace: true,
      workspaceSection,
      inheritedDecisions,
      inheritedGotchas,
      tokenBudget: TOKEN_BUDGET,
    };
  }

  return { buildContext };
}
