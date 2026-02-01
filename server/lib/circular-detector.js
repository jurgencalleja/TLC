/**
 * Circular Dependency Detector
 * Detects and reports circular dependencies in dependency graphs
 */

const path = require('path');

class CircularDetector {
  constructor(options = {}) {
    this.options = options;
    this.basePath = options.basePath || process.cwd();
  }

  /**
   * Detect all circular dependencies in a dependency graph
   * @param {Object} graphOrInstance - Either a DependencyGraph instance or graph data { nodes, edges }
   * @returns {Object} Detection results with cycles, suggestions, and visualization
   */
  detect(graphOrInstance) {
    // Support both DependencyGraph instance and raw graph data
    const graphData = graphOrInstance.getGraph
      ? graphOrInstance.getGraph()
      : graphOrInstance;

    const { nodes, edges } = graphData;

    // Build adjacency list for cycle detection
    const adjacency = this.buildAdjacencyList(nodes, edges);

    // Find all cycles using Tarjan's algorithm variant
    const cycles = this.findAllCycles(adjacency);

    // Generate suggestions for breaking cycles
    const suggestions = this.generateSuggestions(cycles, adjacency);

    // Create visualization
    const visualization = this.visualize(cycles);

    return {
      hasCycles: cycles.length > 0,
      cycleCount: cycles.length,
      cycles: cycles.map(cycle => ({
        path: cycle,
        pathNames: cycle.map(f => this.relativePath(f)),
        length: cycle.length,
      })),
      suggestions,
      visualization,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodesInCycles: new Set(cycles.flat()).size,
      },
    };
  }

  /**
   * Build adjacency list from nodes and edges
   */
  buildAdjacencyList(nodes, edges) {
    const adjacency = new Map();

    // Initialize all nodes
    for (const node of nodes) {
      adjacency.set(node.id, { imports: [], importedBy: [] });
    }

    // Add edges
    for (const edge of edges) {
      if (adjacency.has(edge.from)) {
        adjacency.get(edge.from).imports.push(edge.to);
      }
      if (adjacency.has(edge.to)) {
        adjacency.get(edge.to).importedBy.push(edge.from);
      }
    }

    return adjacency;
  }

  /**
   * Find all cycles using Johnson's algorithm variant
   * Returns unique cycles (no duplicates, no rotations)
   */
  findAllCycles(adjacency) {
    const cycles = [];
    const nodes = Array.from(adjacency.keys());

    for (const startNode of nodes) {
      const visited = new Set();
      const stack = [];

      this.dfs(startNode, startNode, adjacency, visited, stack, cycles);
    }

    // Remove duplicate cycles (same cycle starting from different nodes)
    return this.deduplicateCycles(cycles);
  }

  /**
   * DFS to find cycles starting from a specific node
   */
  dfs(node, startNode, adjacency, visited, stack, cycles) {
    if (stack.includes(node)) {
      // Found a cycle
      const cycleStart = stack.indexOf(node);
      const cycle = stack.slice(cycleStart);
      cycles.push([...cycle, node]); // Include the starting node at end to show cycle
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    stack.push(node);

    const nodeData = adjacency.get(node);
    if (nodeData) {
      for (const imp of nodeData.imports) {
        // Only look for cycles that include the start node
        // to avoid finding the same cycle from multiple starting points
        if (adjacency.has(imp)) {
          this.dfs(imp, startNode, adjacency, visited, stack, cycles);
        }
      }
    }

    stack.pop();
  }

  /**
   * Remove duplicate cycles (rotations of the same cycle)
   */
  deduplicateCycles(cycles) {
    const seen = new Set();
    const unique = [];

    for (const cycle of cycles) {
      // Normalize: find minimum rotation
      const normalized = this.normalizeCycle(cycle);
      const key = normalized.join('|');

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(normalized);
      }
    }

    return unique;
  }

  /**
   * Normalize a cycle to its canonical form (minimum rotation)
   */
  normalizeCycle(cycle) {
    // Remove the duplicate end node if present (A -> B -> A becomes [A, B])
    const cleanCycle = cycle.slice(0, -1);
    if (cleanCycle.length === 0) return cycle;

    // Find minimum rotation
    let min = cleanCycle;
    for (let i = 1; i < cleanCycle.length; i++) {
      const rotated = [...cleanCycle.slice(i), ...cleanCycle.slice(0, i)];
      if (rotated.join('|') < min.join('|')) {
        min = rotated;
      }
    }

    return min;
  }

  /**
   * Generate suggestions for breaking cycles
   */
  generateSuggestions(cycles, adjacency) {
    const suggestions = [];

    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      const suggestion = this.suggestBreakPoint(cycle, adjacency);
      suggestions.push({
        cycleIndex: i,
        ...suggestion,
      });
    }

    return suggestions;
  }

  /**
   * Suggest the best point to break a cycle
   * Prefers breaking at the node with:
   * 1. Fewest importers (less impact)
   * 2. Most imports (likely a "leaf" that should not be importing its parents)
   */
  suggestBreakPoint(cycle, adjacency) {
    let bestNode = cycle[0];
    let bestScore = Infinity;
    let bestEdge = null;

    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i];
      const to = cycle[(i + 1) % cycle.length];
      const fromData = adjacency.get(from);

      if (!fromData) continue;

      // Score: number of importers (lower is better to break)
      // We want to break edges where the "from" node has few importers
      const score = fromData.importedBy.length;

      if (score < bestScore) {
        bestScore = score;
        bestNode = from;
        bestEdge = { from, to };
      }
    }

    return {
      breakAt: bestNode,
      breakAtName: this.relativePath(bestNode),
      removeImport: bestEdge ? {
        from: bestEdge.from,
        fromName: this.relativePath(bestEdge.from),
        to: bestEdge.to,
        toName: this.relativePath(bestEdge.to),
      } : null,
      reason: `${this.relativePath(bestNode)} has fewest dependents (${bestScore}), making it safer to refactor`,
    };
  }

  /**
   * Create ASCII visualization of cycles
   */
  visualize(cycles) {
    if (cycles.length === 0) {
      return 'No circular dependencies detected.';
    }

    const lines = [
      '='.repeat(50),
      'CIRCULAR DEPENDENCIES DETECTED',
      '='.repeat(50),
      '',
    ];

    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      lines.push(`Cycle ${i + 1}:`);
      lines.push(this.visualizeCycle(cycle));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Visualize a single cycle
   */
  visualizeCycle(cycle) {
    const names = cycle.map(f => this.relativePath(f));
    const lines = [];

    // Show chain: A -> B -> C -> A
    const chain = [...names, names[0]].join(' -> ');
    lines.push(`  ${chain}`);

    // ASCII box visualization
    lines.push('');
    const maxLen = Math.max(...names.map(n => n.length));

    for (let i = 0; i < names.length; i++) {
      const name = names[i].padEnd(maxLen);
      const arrow = i < names.length - 1 ? '|' : '|';
      const connector = i < names.length - 1 ? 'v' : '^-- (back to start)';

      lines.push(`  +${'-'.repeat(maxLen + 2)}+`);
      lines.push(`  | ${name} |`);
      lines.push(`  +${'-'.repeat(maxLen + 2)}+`);

      if (i < names.length - 1) {
        lines.push(`       ${arrow}`);
        lines.push(`       ${connector}`);
      } else {
        lines.push(`       ${arrow}`);
        lines.push(`       ^-- (back to ${names[0]})`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get relative path for display
   */
  relativePath(filePath) {
    if (!filePath) return '';
    return path.isAbsolute(filePath)
      ? path.relative(this.basePath, filePath)
      : filePath;
  }

  /**
   * Quick check if graph has any cycles (fast boolean check)
   * @param {Object} graphOrInstance - DependencyGraph instance or graph data
   * @returns {boolean}
   */
  hasCycles(graphOrInstance) {
    // If it's a DependencyGraph instance with hasCircular method, use it
    if (graphOrInstance.hasCircular) {
      return graphOrInstance.hasCircular();
    }

    // Otherwise do our own detection
    const result = this.detect(graphOrInstance);
    return result.hasCycles;
  }

  /**
   * Get just the cycle paths without suggestions (lightweight)
   * @param {Object} graphOrInstance - DependencyGraph instance or graph data
   * @returns {Array} Array of cycle paths
   */
  getCycles(graphOrInstance) {
    const graphData = graphOrInstance.getGraph
      ? graphOrInstance.getGraph()
      : graphOrInstance;

    const { nodes, edges } = graphData;
    const adjacency = this.buildAdjacencyList(nodes, edges);
    return this.findAllCycles(adjacency);
  }
}

module.exports = { CircularDetector };
