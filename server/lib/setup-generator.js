/**
 * Setup Generator — produces setup.md and setup.sh for workspace rebuild
 *
 * Generates human-readable instructions (setup.md) and an automated bash
 * script (setup.sh) from the projects registry. Detects project types
 * (Node, Python, Go) and includes appropriate install commands, version
 * requirements, and TLC-specific setup steps.
 *
 * Factory function `createSetupGenerator` accepts dependencies:
 *   - registry — projects registry (listProjects)
 *
 * The returned object exposes:
 *   - generateSetupMd(workspaceRoot) — markdown instructions
 *   - generateSetupSh(workspaceRoot) — bash script
 *
 * @module setup-generator
 */

import fs from 'fs';
import path from 'path';

// -------------------------------------------------------------------------
// Project type detection helpers
// -------------------------------------------------------------------------

/**
 * Detect the project type from marker files in a directory.
 * @param {string} projectDir - Absolute path to project directory
 * @returns {'node'|'python'|'go'|'unknown'}
 */
function detectProjectType(projectDir) {
  try {
    if (fs.existsSync(path.join(projectDir, 'package.json'))) return 'node';
    if (fs.existsSync(path.join(projectDir, 'requirements.txt'))) return 'python';
    if (fs.existsSync(path.join(projectDir, 'pyproject.toml'))) return 'python';
    if (fs.existsSync(path.join(projectDir, 'setup.py'))) return 'python';
    if (fs.existsSync(path.join(projectDir, 'go.mod'))) return 'go';
  } catch {
    // Ignore FS errors
  }
  return 'unknown';
}

/**
 * Try to detect the Node.js version required by a project.
 * Checks .nvmrc first, then package.json engines.node.
 * @param {string} projectDir - Absolute path to project directory
 * @returns {string|null} Version string or null
 */
function detectNodeVersion(projectDir) {
  // Check .nvmrc
  try {
    const nvmrc = path.join(projectDir, '.nvmrc');
    if (fs.existsSync(nvmrc)) {
      const version = fs.readFileSync(nvmrc, 'utf-8').trim();
      if (version) return version;
    }
  } catch {
    // Ignore
  }

  // Check package.json engines.node
  try {
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.engines && pkg.engines.node) {
        return pkg.engines.node;
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Build an enriched project list with detected types and versions.
 * @param {string} workspaceRoot - Absolute path to workspace
 * @param {Array} projects - Project entries from registry
 * @returns {Array} Projects enriched with type and nodeVersion fields
 */
function enrichProjects(workspaceRoot, projects) {
  return projects.map((project) => {
    const dir = path.join(workspaceRoot, project.localPath);
    const type = detectProjectType(dir);
    const nodeVersion = type === 'node' ? detectNodeVersion(dir) : null;
    return { ...project, type, nodeVersion };
  });
}

/**
 * Collect unique prerequisite tool names from project types.
 * @param {Array} enriched - Enriched project entries
 * @returns {Set<string>} Set of prerequisite names
 */
function collectPrerequisites(enriched) {
  const prereqs = new Set();
  prereqs.add('Git');
  prereqs.add('Ollama');

  for (const p of enriched) {
    if (p.type === 'node') prereqs.add('Node.js');
    if (p.type === 'python') prereqs.add('Python');
    if (p.type === 'go') prereqs.add('Go');
  }

  return prereqs;
}

// -------------------------------------------------------------------------
// Factory
// -------------------------------------------------------------------------

/**
 * Creates a setup generator instance.
 *
 * @param {object} deps
 * @param {object} deps.registry - Projects registry with listProjects()
 * @returns {{ generateSetupMd: Function, generateSetupSh: Function }}
 */
export function createSetupGenerator({ registry } = {}) {
  if (!registry) {
    throw new Error('registry dependency is required');
  }

  /**
   * Generate a setup.md with human-readable workspace setup instructions.
   * @param {string} workspaceRoot - Absolute path to workspace root
   * @returns {Promise<string>} Markdown content
   */
  async function generateSetupMd(workspaceRoot) {
    const projects = await registry.listProjects();
    const enriched = enrichProjects(workspaceRoot, projects);
    const prereqs = collectPrerequisites(enriched);

    const lines = [];

    // Title
    lines.push('# Workspace Setup');
    lines.push('');
    lines.push('Follow these instructions to set up the workspace on a new machine.');
    lines.push('This document can be read by humans and by Claude (paste into a new session).');
    lines.push('');

    // Prerequisites
    lines.push('## Prerequisites');
    lines.push('');
    lines.push('Ensure the following tools are installed before proceeding:');
    lines.push('');

    for (const prereq of prereqs) {
      if (prereq === 'Node.js') {
        // Include detected versions if available
        const nodeVersions = enriched
          .filter((p) => p.type === 'node' && p.nodeVersion)
          .map((p) => p.nodeVersion);
        if (nodeVersions.length > 0) {
          const unique = [...new Set(nodeVersions)];
          lines.push(`- **Node.js** (${unique.join(', ')})`);
        } else {
          lines.push('- **Node.js**');
        }
      } else if (prereq === 'Python') {
        lines.push('- **Python** (3.x recommended)');
      } else if (prereq === 'Go') {
        lines.push('- **Go** (1.21+ recommended)');
      } else if (prereq === 'Ollama') {
        lines.push('- **Ollama** (for semantic memory embeddings)');
      } else {
        lines.push(`- **${prereq}**`);
      }
    }
    lines.push('');

    // Clone & install steps
    lines.push('## Clone Projects');
    lines.push('');

    for (const project of enriched) {
      lines.push(`### ${project.name}`);
      lines.push('');
      if (project.description) {
        lines.push(project.description);
        lines.push('');
      }
      lines.push('```bash');
      lines.push(`git clone ${project.gitUrl} ${project.localPath}`);
      lines.push(`cd ${project.localPath}`);
      lines.push(`git checkout ${project.defaultBranch || 'main'}`);

      if (project.type === 'node') {
        lines.push('npm install');
      } else if (project.type === 'python') {
        lines.push('pip install -r requirements.txt');
      }

      lines.push('cd ..');
      lines.push('```');
      lines.push('');
    }

    // TLC-specific setup
    lines.push('## TLC Setup');
    lines.push('');
    lines.push('### Pull Ollama embedding model');
    lines.push('');
    lines.push('```bash');
    lines.push('ollama pull mxbai-embed-large');
    lines.push('```');
    lines.push('');
    lines.push('### Rebuild vector index');
    lines.push('');
    lines.push('```bash');
    lines.push('npx tlc-server rebuild-vectors');
    lines.push('```');
    lines.push('');
    lines.push('### Start TLC dashboard');
    lines.push('');
    lines.push('```bash');
    lines.push('npx tlc-server start');
    lines.push('```');
    lines.push('');
    lines.push('The TLC dashboard will be available at http://localhost:5174');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate a setup.sh bash script for automated workspace rebuild.
   * @param {string} workspaceRoot - Absolute path to workspace root
   * @returns {Promise<string>} Bash script content
   */
  async function generateSetupSh(workspaceRoot) {
    const projects = await registry.listProjects();
    const enriched = enrichProjects(workspaceRoot, projects);

    const lines = [];

    // Shebang and header
    lines.push('#!/bin/bash');
    lines.push('# Workspace setup script — generated by TLC');
    lines.push('# Safe to run multiple times (idempotent)');
    lines.push('set -e');
    lines.push('');

    // Determine workspace root dir (script location)
    lines.push('SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"');
    lines.push('cd "$SCRIPT_DIR"');
    lines.push('');
    lines.push('echo "=== TLC Workspace Setup ==="');
    lines.push('echo ""');
    lines.push('');

    // Clone each project with idempotency guard
    for (const project of enriched) {
      lines.push(`# --- ${project.name} ---`);
      lines.push(`if [ ! -d "${project.localPath}/.git" ]; then`);
      lines.push(`  echo "Cloning ${project.name}..."`);
      lines.push(`  git clone ${project.gitUrl} ${project.localPath}`);
      lines.push(`  cd ${project.localPath}`);
      lines.push(`  git checkout ${project.defaultBranch || 'main'}`);
      lines.push('  cd "$SCRIPT_DIR"');
      lines.push('else');
      lines.push(`  echo "${project.name} already cloned, skipping."`);
      lines.push('fi');
      lines.push('');

      // Install dependencies based on project type
      if (project.type === 'node') {
        lines.push(`# Install Node dependencies for ${project.name}`);
        lines.push(`if [ -f "${project.localPath}/package.json" ]; then`);
        lines.push(`  echo "Running npm install for ${project.name}..."`);
        lines.push(`  cd ${project.localPath} && npm install && cd "$SCRIPT_DIR"`);
        lines.push('fi');
        lines.push('');
      } else if (project.type === 'python') {
        lines.push(`# Install Python dependencies for ${project.name}`);
        lines.push(`if [ -f "${project.localPath}/requirements.txt" ]; then`);
        lines.push(`  echo "Running pip install for ${project.name}..."`);
        lines.push(`  pip install -r ${project.localPath}/requirements.txt`);
        lines.push(`elif [ -f "${project.localPath}/pyproject.toml" ]; then`);
        lines.push(`  echo "Running pip install for ${project.name}..."`);
        lines.push(`  pip install -e ${project.localPath}`);
        lines.push('fi');
        lines.push('');
      }
    }

    // Ollama model pull
    lines.push('# --- Ollama embedding model ---');
    lines.push('echo ""');
    lines.push('echo "Pulling Ollama embedding model..."');
    lines.push('ollama pull mxbai-embed-large');
    lines.push('');

    // Vector rebuild
    lines.push('# --- Rebuild vector index ---');
    lines.push('echo ""');
    lines.push('echo "Rebuilding vector index..."');
    lines.push('npx tlc-server rebuild-vectors');
    lines.push('');

    // Done
    lines.push('echo ""');
    lines.push('echo "=== Setup complete ==="');
    lines.push('');

    return lines.join('\n');
  }

  return { generateSetupMd, generateSetupSh };
}
