/**
 * Mermaid Diagram Generator
 * Generate Mermaid diagrams from dependency data
 */

const path = require('path');

class MermaidGenerator {
  constructor(options = {}) {
    this.options = {
      direction: options.direction || 'TD', // TB, BT, LR, RL
      maxNodes: options.maxNodes || 100,
      showExternal: options.showExternal !== false,
      groupByDirectory: options.groupByDirectory !== false,
      highlightCycles: options.highlightCycles !== false,
      highlightHubs: options.highlightHubs || false,
      hubThreshold: options.hubThreshold || 5,
      ...options,
    };
  }

  /**
   * Generate flowchart from dependency graph
   * @param {Object} graph - Graph from DependencyGraph.getGraph()
   * @param {Object} options - Generation options
   * @returns {string} Mermaid diagram code
   */
  generateFlowchart(graph, options = {}) {
    const opts = { ...this.options, ...options };
    const { nodes, edges, external } = graph;

    // Truncate if too large
    const displayNodes = nodes.slice(0, opts.maxNodes);
    const nodeIds = new Set(displayNodes.map(n => n.id));
    const displayEdges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

    let mermaid = `flowchart ${opts.direction}\n`;

    // Add styling
    mermaid += this.generateStyles(opts);

    // Group by directory if enabled
    if (opts.groupByDirectory) {
      mermaid += this.generateSubgraphs(displayNodes, displayEdges, opts);
    } else {
      mermaid += this.generateFlatNodes(displayNodes, opts);
      mermaid += this.generateEdges(displayEdges, opts);
    }

    // Highlight cycles if provided
    if (opts.cycles && opts.cycles.length > 0 && opts.highlightCycles) {
      mermaid += this.generateCycleHighlights(opts.cycles);
    }

    // Show external deps if enabled
    if (opts.showExternal && external && external.length > 0) {
      mermaid += this.generateExternalSubgraph(external.slice(0, 20));
    }

    // Truncation notice
    if (nodes.length > opts.maxNodes) {
      mermaid += `\n    %% Showing ${opts.maxNodes} of ${nodes.length} files\n`;
    }

    return mermaid;
  }

  /**
   * Generate styles section
   */
  generateStyles(opts) {
    let styles = '';

    if (opts.highlightCycles) {
      styles += '    classDef cycle fill:#f96,stroke:#f00,stroke-width:2px\n';
    }

    if (opts.highlightHubs) {
      styles += '    classDef hub fill:#9f6,stroke:#090,stroke-width:2px\n';
    }

    styles += '    classDef external fill:#ddd,stroke:#999\n';

    return styles;
  }

  /**
   * Generate subgraphs for directories
   */
  generateSubgraphs(nodes, edges, opts) {
    let mermaid = '';
    const directories = this.groupByDirectory(nodes);
    const nodeIdMap = new Map();

    // Generate subgraphs
    for (const [dir, dirNodes] of directories.entries()) {
      const safeDirId = this.sanitizeId(dir || 'root');
      const dirLabel = dir || 'Root';

      mermaid += `    subgraph ${safeDirId}[${this.escapeLabel(dirLabel)}]\n`;

      for (const node of dirNodes) {
        const nodeId = this.sanitizeId(node.name);
        nodeIdMap.set(node.id, nodeId);
        const label = path.basename(node.name);
        mermaid += `        ${nodeId}[${this.escapeLabel(label)}]\n`;
      }

      mermaid += '    end\n';
    }

    // Generate edges
    for (const edge of edges) {
      const fromId = nodeIdMap.get(edge.from);
      const toId = nodeIdMap.get(edge.to);
      if (fromId && toId) {
        mermaid += `    ${fromId} --> ${toId}\n`;
      }
    }

    return mermaid;
  }

  /**
   * Generate flat node list (no subgraphs)
   */
  generateFlatNodes(nodes, opts) {
    let mermaid = '';

    for (const node of nodes) {
      const nodeId = this.sanitizeId(node.name);
      const label = node.name;
      mermaid += `    ${nodeId}[${this.escapeLabel(label)}]\n`;

      // Mark hubs
      if (opts.highlightHubs && node.importedBy >= opts.hubThreshold) {
        mermaid += `    class ${nodeId} hub\n`;
      }
    }

    return mermaid;
  }

  /**
   * Generate edges
   */
  generateEdges(edges, opts) {
    let mermaid = '';

    for (const edge of edges) {
      const fromId = this.sanitizeId(edge.fromName);
      const toId = this.sanitizeId(edge.toName);
      mermaid += `    ${fromId} --> ${toId}\n`;
    }

    return mermaid;
  }

  /**
   * Highlight cycle nodes
   */
  generateCycleHighlights(cycles) {
    let mermaid = '\n    %% Circular dependencies\n';
    const cycleNodes = new Set();

    for (const cycle of cycles) {
      for (const node of cycle.path || cycle) {
        cycleNodes.add(this.sanitizeId(node));
      }
    }

    for (const nodeId of cycleNodes) {
      mermaid += `    class ${nodeId} cycle\n`;
    }

    return mermaid;
  }

  /**
   * Generate external dependencies subgraph
   */
  generateExternalSubgraph(external) {
    let mermaid = '\n    subgraph external[External Dependencies]\n';

    for (const dep of external) {
      const nodeId = this.sanitizeId(`ext_${dep}`);
      mermaid += `        ${nodeId}[${this.escapeLabel(dep)}]:::external\n`;
    }

    mermaid += '    end\n';
    return mermaid;
  }

  /**
   * Group nodes by directory
   */
  groupByDirectory(nodes) {
    const directories = new Map();

    for (const node of nodes) {
      const dir = path.dirname(node.name);
      if (!directories.has(dir)) {
        directories.set(dir, []);
      }
      directories.get(dir).push(node);
    }

    return directories;
  }

  /**
   * Generate module-filtered diagram
   * @param {Object} graph - Full graph
   * @param {string} modulePath - Module path to filter to
   * @returns {string} Mermaid diagram
   */
  generateModuleDiagram(graph, modulePath, options = {}) {
    const { nodes, edges } = graph;

    // Filter to nodes in or related to module
    const moduleNodes = nodes.filter(n =>
      n.name.startsWith(modulePath) ||
      n.name.includes(`/${modulePath}/`)
    );

    const moduleNodeIds = new Set(moduleNodes.map(n => n.id));

    // Include nodes that import or are imported by module nodes
    const relatedEdges = edges.filter(e =>
      moduleNodeIds.has(e.from) || moduleNodeIds.has(e.to)
    );

    const relatedNodeIds = new Set();
    for (const edge of relatedEdges) {
      relatedNodeIds.add(edge.from);
      relatedNodeIds.add(edge.to);
    }

    const filteredNodes = nodes.filter(n => relatedNodeIds.has(n.id));
    const filteredEdges = edges.filter(e =>
      relatedNodeIds.has(e.from) && relatedNodeIds.has(e.to)
    );

    return this.generateFlowchart(
      { nodes: filteredNodes, edges: filteredEdges, external: [] },
      { ...options, groupByDirectory: false }
    );
  }

  /**
   * Generate coupling matrix diagram
   * @param {Object} couplingData - From CouplingCalculator
   * @returns {string} Mermaid diagram
   */
  generateCouplingMatrix(couplingData) {
    const { matrix, modules } = couplingData;

    if (!matrix || modules.length === 0) {
      return 'flowchart TD\n    empty[No coupling data]\n';
    }

    let mermaid = 'flowchart LR\n';

    // Create nodes for each module
    for (const mod of modules) {
      const nodeId = this.sanitizeId(mod.name);
      const label = `${mod.name}\\nCa:${mod.afferent} Ce:${mod.efferent}`;
      mermaid += `    ${nodeId}[${this.escapeLabel(label)}]\n`;
    }

    // Create edges from matrix
    for (let i = 0; i < modules.length; i++) {
      for (let j = 0; j < modules.length; j++) {
        if (matrix[i][j] > 0) {
          const fromId = this.sanitizeId(modules[i].name);
          const toId = this.sanitizeId(modules[j].name);
          mermaid += `    ${fromId} -->|${matrix[i][j]}| ${toId}\n`;
        }
      }
    }

    return mermaid;
  }

  /**
   * Generate service boundary diagram
   * @param {Object} boundaryData - From BoundaryDetector
   * @returns {string} Mermaid diagram
   */
  generateBoundaryDiagram(boundaryData) {
    const { services, shared } = boundaryData;

    if (!services || services.length === 0) {
      return 'flowchart TD\n    empty[No services detected]\n';
    }

    let mermaid = 'flowchart TB\n';

    // Shared kernel
    if (shared && shared.length > 0) {
      mermaid += '    subgraph shared[Shared Kernel]\n';
      for (const file of shared.slice(0, 10)) {
        const nodeId = this.sanitizeId(`shared_${file}`);
        mermaid += `        ${nodeId}[${this.escapeLabel(path.basename(file))}]\n`;
      }
      mermaid += '    end\n\n';
    }

    // Services
    for (const service of services) {
      const serviceId = this.sanitizeId(`svc_${service.name}`);
      mermaid += `    subgraph ${serviceId}[${this.escapeLabel(service.name)}]\n`;

      for (const file of (service.files || []).slice(0, 10)) {
        const nodeId = this.sanitizeId(file);
        mermaid += `        ${nodeId}[${this.escapeLabel(path.basename(file))}]\n`;
      }

      mermaid += '    end\n';
    }

    // Service dependencies
    for (const service of services) {
      const fromId = this.sanitizeId(`svc_${service.name}`);
      for (const dep of service.dependencies || []) {
        const toId = this.sanitizeId(`svc_${dep}`);
        mermaid += `    ${fromId} --> ${toId}\n`;
      }
    }

    return mermaid;
  }

  /**
   * Sanitize string for use as Mermaid ID
   */
  sanitizeId(str) {
    return str
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      || 'node';
  }

  /**
   * Escape label for Mermaid
   */
  escapeLabel(str) {
    return str
      .replace(/"/g, "'")
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .replace(/>/g, ')')
      .replace(/</g, '(');
  }
}

module.exports = { MermaidGenerator };
