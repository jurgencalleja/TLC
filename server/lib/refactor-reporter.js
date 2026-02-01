/**
 * Refactor Reporter
 * Generate multi-audience refactoring reports
 */

class RefactorReporter {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Generate a complete report
   * @param {Array} changes - Applied changes
   * @param {string} format - Output format (markdown, json, html)
   * @returns {string} Formatted report
   */
  generate(changes, format = 'markdown') {
    switch (format.toLowerCase()) {
      case 'json':
        return this.toJson(changes);
      case 'html':
        return this.toHtml(changes);
      case 'markdown':
      default:
        return this.toMarkdown(changes);
    }
  }

  /**
   * Generate plain English summary for non-developers
   */
  generateSummary(changes) {
    return changes.map(change => this.describeChange(change)).join('\n');
  }

  /**
   * Describe a single change in plain English
   */
  describeChange(change) {
    switch (change.type) {
      case 'extract':
        return `Extracted "${change.name}" from "${change.source}" (${change.lines || 'several'} lines)`;
      case 'rename':
        return `Renamed "${change.oldName}" to "${change.newName}" in ${change.filesAffected || 1} file(s)`;
      case 'split':
        return `Split "${change.source}" into ${change.targets?.length || 2} separate files`;
      case 'inline':
        return `Inlined "${change.name}" into "${change.target}"`;
      case 'remove':
        return `Removed unused "${change.name}"`;
      default:
        return `Applied ${change.type} refactoring`;
    }
  }

  /**
   * Generate unified diff format
   */
  generateDiff(change) {
    if (!change.before || !change.after) {
      return '';
    }

    const beforeLines = change.before.split('\n');
    const afterLines = change.after.split('\n');

    let diff = `--- a/${change.file}\n+++ b/${change.file}\n`;

    // Simple diff - show removed and added lines
    diff += `@@ -1,${beforeLines.length} +1,${afterLines.length} @@\n`;

    for (const line of beforeLines) {
      diff += `-${line}\n`;
    }
    for (const line of afterLines) {
      diff += `+${line}\n`;
    }

    return diff;
  }

  /**
   * Generate Mermaid diagram for function relationships
   */
  generateMermaidDiagram(changes) {
    const nodes = new Set();
    const edges = [];

    for (const change of changes) {
      if (change.type === 'extract') {
        nodes.add(change.source);
        nodes.add(change.name);
        edges.push(`${change.source} --> ${change.name}`);
      }
      if (change.type === 'split') {
        nodes.add(change.source);
        for (const target of change.targets || []) {
          nodes.add(target.name || target);
          edges.push(`${change.source} --> ${target.name || target}`);
        }
      }
    }

    if (edges.length === 0) {
      return '';
    }

    let diagram = 'graph TD\n';
    for (const edge of edges) {
      diagram += `    ${edge}\n`;
    }

    return diagram;
  }

  /**
   * Generate before/after code comparison
   */
  generateComparison(change) {
    return {
      before: change.before || '',
      after: change.after || '',
      file: change.file,
      type: change.type,
    };
  }

  /**
   * Convert to Markdown format
   */
  toMarkdown(changes) {
    let md = '# Refactoring Report\n\n';

    // Summary section
    md += '## Summary\n\n';
    md += this.generateSummary(changes);
    md += '\n\n';

    // Diagram if applicable
    const diagram = this.generateMermaidDiagram(changes);
    if (diagram) {
      md += '## Diagram\n\n```mermaid\n';
      md += diagram;
      md += '```\n\n';
    }

    // Detailed changes
    md += '## Changes\n\n';
    for (const change of changes) {
      md += `### ${this.describeChange(change)}\n\n`;

      if (change.before && change.after) {
        md += '<details>\n<summary>View Diff</summary>\n\n';
        md += '```diff\n';
        md += this.generateDiff(change);
        md += '```\n\n';
        md += '</details>\n\n';
      }
    }

    return md;
  }

  /**
   * Convert to JSON format
   */
  toJson(changes) {
    return JSON.stringify({
      summary: changes.map(c => this.describeChange(c)),
      changes: changes.map(c => ({
        ...c,
        description: this.describeChange(c),
        diff: this.generateDiff(c),
      })),
      diagram: this.generateMermaidDiagram(changes),
      generatedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Convert to HTML format
   */
  toHtml(changes) {
    const summary = changes.map(c => `<li>${this.describeChange(c)}</li>`).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <title>Refactoring Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
    .change { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
    .diff { background: #1e1e1e; color: #d4d4d4; padding: 10px; overflow-x: auto; }
    .diff .add { color: #4ec9b0; }
    .diff .remove { color: #f14c4c; }
    details { margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Refactoring Report</h1>

  <section class="summary">
    <h2>Summary</h2>
    <ul>${summary}</ul>
  </section>

  <section>
    <h2>Changes</h2>
    ${changes.map(c => `
    <div class="change">
      <h3>${this.describeChange(c)}</h3>
      ${c.before && c.after ? `
      <details>
        <summary>View Diff</summary>
        <pre class="diff">${this.escapeHtml(this.generateDiff(c))}</pre>
      </details>` : ''}
    </div>`).join('\n')}
  </section>
</body>
</html>`;
  }

  /**
   * Escape HTML entities
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

module.exports = { RefactorReporter };
