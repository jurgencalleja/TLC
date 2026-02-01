/**
 * Architecture Command
 * Main orchestrator for /tlc:architecture skill
 * Analyzes codebase architecture: dependencies, boundaries, coupling, cohesion, cycles
 */

const path = require('path');
const { DependencyGraph } = require('./dependency-graph.js');
const { MermaidGenerator } = require('./mermaid-generator.js');
const { BoundaryDetector } = require('./boundary-detector.js');
const { CouplingCalculator } = require('./coupling-calculator.js');
const { CohesionAnalyzer } = require('./cohesion-analyzer.js');
const { CircularDetector } = require('./circular-detector.js');

class ArchitectureCommand {
  constructor(options = {}) {
    this.options = options;
    this.basePath = options.basePath || process.cwd();

    // Dependency injection for all modules
    this.dependencyGraph = options.dependencyGraph || new DependencyGraph({
      basePath: this.basePath,
      ...options.graphOptions,
    });
    this.mermaidGenerator = options.mermaidGenerator || new MermaidGenerator(options.mermaidOptions);
    this.boundaryDetector = options.boundaryDetector || new BoundaryDetector(options.boundaryOptions);
    this.couplingCalculator = options.couplingCalculator || null; // Created after graph built
    this.cohesionAnalyzer = options.cohesionAnalyzer || new CohesionAnalyzer({
      basePath: this.basePath,
      ...options.cohesionOptions,
    });
    this.circularDetector = options.circularDetector || new CircularDetector({
      basePath: this.basePath,
      ...options.circularOptions,
    });

    // Callbacks for progress reporting
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Run the architecture command
   * @param {Object} options - Command options
   * @returns {Object} Analysis results
   */
  async run(options = {}) {
    const {
      analyze = false,       // --analyze: full analysis
      boundaries = false,    // --boundaries: service boundaries
      diagram = false,       // --diagram: Mermaid output
      metrics = false,       // --metrics: coupling/cohesion scores
      circular = false,      // --circular: dependency cycles
      targetPath = null,     // Path targeting for specific modules
      format = 'text',       // Output format: 'text', 'json', 'markdown'
    } = options;

    const result = {
      success: true,
      targetPath,
      graph: null,
      analysis: null,
      boundaries: null,
      diagram: null,
      metrics: null,
      circular: null,
      report: null,
      error: null,
    };

    try {
      // Step 1: Build dependency graph
      this.onProgress({ phase: 'building-graph', message: 'Building dependency graph...' });

      const scanPath = targetPath
        ? path.resolve(this.basePath, targetPath)
        : this.basePath;

      await this.dependencyGraph.buildFromDirectory(scanPath);
      result.graph = this.dependencyGraph.getGraph();

      // Create coupling calculator now that graph is built
      if (!this.couplingCalculator) {
        this.couplingCalculator = new CouplingCalculator(this.dependencyGraph);
      }

      // Step 2: Run requested analyses
      if (analyze || (!boundaries && !diagram && !metrics && !circular)) {
        // Full analysis (default if no specific flags)
        result.analysis = await this.runFullAnalysis(result.graph);
      }

      if (boundaries || analyze) {
        this.onProgress({ phase: 'analyzing-boundaries', message: 'Detecting service boundaries...' });
        result.boundaries = this.analyzeBoundaries(result.graph);
      }

      if (diagram || analyze) {
        this.onProgress({ phase: 'generating-diagram', message: 'Generating Mermaid diagram...' });
        result.diagram = this.generateDiagram(result.graph, options);
      }

      if (metrics || analyze) {
        this.onProgress({ phase: 'calculating-metrics', message: 'Calculating coupling and cohesion metrics...' });
        result.metrics = this.calculateMetrics(result.graph);
      }

      if (circular || analyze) {
        this.onProgress({ phase: 'detecting-cycles', message: 'Detecting circular dependencies...' });
        result.circular = this.detectCircular(result.graph);
      }

      // Step 3: Generate report
      result.report = this.generateReport(result, format);

      this.onProgress({ phase: 'complete', message: 'Analysis complete' });

    } catch (error) {
      result.success = false;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Run full architecture analysis
   */
  async runFullAnalysis(graph) {
    const boundaries = this.analyzeBoundaries(graph);
    const metrics = this.calculateMetrics(graph);
    const circular = this.detectCircular(graph);

    return {
      summary: {
        totalFiles: graph.stats.totalFiles,
        totalDependencies: graph.stats.totalEdges,
        externalDependencies: graph.stats.externalDeps,
        suggestedServices: boundaries.services?.length || 0,
        cyclesFound: circular.cycleCount || 0,
        averageCohesion: metrics.cohesion?.summary?.averageCohesion || 0,
      },
      boundaries,
      metrics,
      circular,
    };
  }

  /**
   * Analyze service boundaries
   */
  analyzeBoundaries(graph) {
    const couplingData = {
      modules: this.couplingCalculator.getAllMetrics().map(m => ({
        name: path.dirname(path.relative(this.basePath, m.file)) || '(root)',
        afferent: m.afferentCoupling,
        efferent: m.efferentCoupling,
        instability: m.instability,
      })),
    };

    const cohesionData = this.cohesionAnalyzer.analyze(this.dependencyGraph);

    return this.boundaryDetector.detect(graph, couplingData, cohesionData);
  }

  /**
   * Generate Mermaid diagram
   */
  generateDiagram(graph, options = {}) {
    const { targetPath, diagramType = 'flowchart' } = options;

    // If targeting specific module, generate filtered diagram
    if (targetPath) {
      return this.mermaidGenerator.generateModuleDiagram(graph, targetPath, {
        direction: 'LR',
      });
    }

    // Check for cycles to highlight
    const circularResult = this.circularDetector.detect(this.dependencyGraph);
    const cycles = circularResult.hasCycles
      ? circularResult.cycles.map(c => c.pathNames)
      : [];

    return this.mermaidGenerator.generateFlowchart(graph, {
      cycles,
      highlightCycles: cycles.length > 0,
      groupByDirectory: true,
      maxNodes: options.maxNodes || 50,
    });
  }

  /**
   * Calculate coupling and cohesion metrics
   */
  calculateMetrics(graph) {
    // Coupling metrics
    const allCoupling = this.couplingCalculator.getAllMetrics();
    const hubFiles = this.couplingCalculator.getHubFiles({ threshold: 3 });
    const dependentFiles = this.couplingCalculator.getDependentFiles({ threshold: 3 });
    const isolatedFiles = this.couplingCalculator.getIsolatedFiles();
    const highlyCoupled = this.couplingCalculator.getHighlyCoupledModules({ threshold: 5 });

    // Cohesion metrics
    const cohesion = this.cohesionAnalyzer.analyze(this.dependencyGraph);

    return {
      coupling: {
        files: allCoupling.map(m => ({
          file: path.relative(this.basePath, m.file),
          afferentCoupling: m.afferentCoupling,
          efferentCoupling: m.efferentCoupling,
          instability: Math.round(m.instability * 100) / 100,
        })),
        hubs: hubFiles.map(h => ({
          file: path.relative(this.basePath, h.file),
          dependents: h.afferentCoupling,
        })),
        dependent: dependentFiles.map(d => ({
          file: path.relative(this.basePath, d.file),
          dependencies: d.efferentCoupling,
        })),
        isolated: isolatedFiles.map(f => path.relative(this.basePath, f)),
        highlyCoupled: highlyCoupled.map(h => ({
          file: path.relative(this.basePath, h.file),
          total: h.totalCoupling,
          afferent: h.afferentCoupling,
          efferent: h.efferentCoupling,
        })),
        summary: {
          totalFiles: allCoupling.length,
          hubCount: hubFiles.length,
          isolatedCount: isolatedFiles.length,
          highlyCoupledCount: highlyCoupled.length,
        },
      },
      cohesion,
    };
  }

  /**
   * Detect circular dependencies
   */
  detectCircular(graph) {
    return this.circularDetector.detect(this.dependencyGraph);
  }

  /**
   * Generate formatted report
   */
  generateReport(result, format) {
    switch (format) {
      case 'json':
        return this.generateJsonReport(result);
      case 'markdown':
        return this.generateMarkdownReport(result);
      case 'text':
      default:
        return this.generateTextReport(result);
    }
  }

  /**
   * Generate JSON report
   */
  generateJsonReport(result) {
    return JSON.stringify({
      success: result.success,
      targetPath: result.targetPath,
      stats: result.graph?.stats,
      analysis: result.analysis,
      boundaries: result.boundaries,
      metrics: result.metrics,
      circular: result.circular,
      diagram: result.diagram,
      error: result.error,
    }, null, 2);
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(result) {
    const lines = ['# Architecture Analysis Report\n'];

    // Summary
    if (result.analysis?.summary) {
      const s = result.analysis.summary;
      lines.push('## Summary\n');
      lines.push(`| Metric | Value |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Total Files | ${s.totalFiles} |`);
      lines.push(`| Total Dependencies | ${s.totalDependencies} |`);
      lines.push(`| External Dependencies | ${s.externalDependencies} |`);
      lines.push(`| Suggested Services | ${s.suggestedServices} |`);
      lines.push(`| Circular Dependencies | ${s.cyclesFound} |`);
      lines.push(`| Average Cohesion | ${(s.averageCohesion * 100).toFixed(1)}% |`);
      lines.push('');
    }

    // Boundaries
    if (result.boundaries?.services) {
      lines.push('## Service Boundaries\n');
      lines.push('### Detected Services\n');
      for (const service of result.boundaries.services.slice(0, 10)) {
        lines.push(`- **${service.name}** (${service.fileCount} files, quality: ${service.quality}/100)`);
        if (service.dependencies.length > 0) {
          lines.push(`  - Depends on: ${service.dependencies.join(', ')}`);
        }
      }
      lines.push('');

      if (result.boundaries.suggestions?.length > 0) {
        lines.push('### Suggestions\n');
        for (const suggestion of result.boundaries.suggestions.slice(0, 5)) {
          lines.push(`- ${suggestion.message}`);
        }
        lines.push('');
      }
    }

    // Metrics
    if (result.metrics) {
      lines.push('## Coupling Metrics\n');

      if (result.metrics.coupling.hubs.length > 0) {
        lines.push('### Hub Files (Most Depended Upon)\n');
        lines.push('| File | Dependents |');
        lines.push('|------|------------|');
        for (const hub of result.metrics.coupling.hubs.slice(0, 10)) {
          lines.push(`| ${hub.file} | ${hub.dependents} |`);
        }
        lines.push('');
      }

      if (result.metrics.coupling.highlyCoupled.length > 0) {
        lines.push('### Highly Coupled Files\n');
        lines.push('| File | Total | In | Out |');
        lines.push('|------|-------|-----|-----|');
        for (const file of result.metrics.coupling.highlyCoupled.slice(0, 10)) {
          lines.push(`| ${file.file} | ${file.total} | ${file.afferent} | ${file.efferent} |`);
        }
        lines.push('');
      }

      lines.push('## Cohesion Metrics\n');
      if (result.metrics.cohesion?.lowCohesion?.length > 0) {
        lines.push('### Low Cohesion Modules\n');
        lines.push('| Module | Cohesion | Internal | External |');
        lines.push('|--------|----------|----------|----------|');
        for (const mod of result.metrics.cohesion.lowCohesion.slice(0, 10)) {
          lines.push(`| ${mod.module} | ${(mod.cohesion * 100).toFixed(1)}% | ${mod.internalDeps} | ${mod.externalDeps} |`);
        }
        lines.push('');
      }
    }

    // Circular dependencies
    if (result.circular?.hasCycles) {
      lines.push('## Circular Dependencies\n');
      lines.push(`Found ${result.circular.cycleCount} cycle(s):\n`);
      for (let i = 0; i < Math.min(result.circular.cycles.length, 5); i++) {
        const cycle = result.circular.cycles[i];
        lines.push(`### Cycle ${i + 1}`);
        lines.push('```');
        lines.push(cycle.pathNames.join(' -> ') + ' -> ' + cycle.pathNames[0]);
        lines.push('```');
        if (result.circular.suggestions?.[i]) {
          lines.push(`**Suggestion:** ${result.circular.suggestions[i].reason}`);
        }
        lines.push('');
      }
    }

    // Diagram
    if (result.diagram) {
      lines.push('## Dependency Diagram\n');
      lines.push('```mermaid');
      lines.push(result.diagram);
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate plain text report
   */
  generateTextReport(result) {
    const lines = ['ARCHITECTURE ANALYSIS REPORT', '='.repeat(50), ''];

    // Summary
    if (result.analysis?.summary) {
      const s = result.analysis.summary;
      lines.push('SUMMARY');
      lines.push('-'.repeat(30));
      lines.push(`Total Files:           ${s.totalFiles}`);
      lines.push(`Total Dependencies:    ${s.totalDependencies}`);
      lines.push(`External Dependencies: ${s.externalDependencies}`);
      lines.push(`Suggested Services:    ${s.suggestedServices}`);
      lines.push(`Circular Dependencies: ${s.cyclesFound}`);
      lines.push(`Average Cohesion:      ${(s.averageCohesion * 100).toFixed(1)}%`);
      lines.push('');
    }

    // Boundaries
    if (result.boundaries?.services) {
      lines.push('SERVICE BOUNDARIES');
      lines.push('-'.repeat(30));
      for (const service of result.boundaries.services.slice(0, 10)) {
        lines.push(`  ${service.name} (${service.fileCount} files, quality: ${service.quality}/100)`);
      }
      lines.push('');
    }

    // Cycles
    if (result.circular?.hasCycles) {
      lines.push('CIRCULAR DEPENDENCIES');
      lines.push('-'.repeat(30));
      lines.push(`Found ${result.circular.cycleCount} cycle(s)`);
      for (const cycle of result.circular.cycles.slice(0, 5)) {
        lines.push(`  ${cycle.pathNames.join(' -> ')} -> ${cycle.pathNames[0]}`);
      }
      lines.push('');
    }

    // Metrics summary
    if (result.metrics?.coupling?.summary) {
      const s = result.metrics.coupling.summary;
      lines.push('COUPLING SUMMARY');
      lines.push('-'.repeat(30));
      lines.push(`Hub Files:          ${s.hubCount}`);
      lines.push(`Isolated Files:     ${s.isolatedCount}`);
      lines.push(`Highly Coupled:     ${s.highlyCoupledCount}`);
      lines.push('');
    }

    // Diagram placeholder
    if (result.diagram) {
      lines.push('MERMAID DIAGRAM');
      lines.push('-'.repeat(30));
      lines.push(result.diagram);
    }

    return lines.join('\n');
  }
}

module.exports = { ArchitectureCommand };
