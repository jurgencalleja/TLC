/**
 * Cohesion Analyzer
 * Analyze module cohesion based on dependency relationships
 */

const path = require('path');

class CohesionAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.basePath = options.basePath || process.cwd();
    this.lowCohesionThreshold = options.lowCohesionThreshold || 0.3;
  }

  /**
   * Analyze cohesion for a dependency graph
   * @param {Object} graph - DependencyGraph instance
   * @returns {Object} Cohesion analysis results
   */
  analyze(graph) {
    const graphData = graph.getGraph();
    const modules = this.groupByDirectory(graphData.nodes);
    const moduleAnalysis = {};

    for (const [modulePath, files] of Object.entries(modules)) {
      moduleAnalysis[modulePath] = this.analyzeModule(modulePath, files, graph);
    }

    const lowCohesion = this.identifyLowCohesion(moduleAnalysis);
    const suggestions = this.generateSuggestions(moduleAnalysis, graph);

    return {
      modules: moduleAnalysis,
      lowCohesion,
      suggestions,
      summary: {
        totalModules: Object.keys(moduleAnalysis).length,
        averageCohesion: this.calculateAverageCohesion(moduleAnalysis),
        lowCohesionCount: lowCohesion.length,
      },
    };
  }

  /**
   * Group files by their directory (module)
   */
  groupByDirectory(nodes) {
    const modules = {};

    for (const node of nodes) {
      const filePath = node.id;
      const relativePath = node.name;
      const dir = path.dirname(relativePath);

      // Normalize the directory path
      const modulePath = dir === '.' ? '(root)' : dir;

      if (!modules[modulePath]) {
        modules[modulePath] = [];
      }

      modules[modulePath].push({
        path: filePath,
        name: relativePath,
        basename: path.basename(relativePath),
      });
    }

    return modules;
  }

  /**
   * Analyze cohesion for a single module (directory)
   */
  analyzeModule(modulePath, files, graph) {
    if (files.length === 0) {
      return {
        path: modulePath,
        files: [],
        cohesion: 1,
        internalDeps: 0,
        externalDeps: 0,
        ratio: 1,
      };
    }

    if (files.length === 1) {
      // Single file module - check its dependencies
      const file = files[0];
      const imports = graph.getImports(file.path);
      const importers = graph.getImporters(file.path);

      // A single file with no internal deps is cohesive by definition
      return {
        path: modulePath,
        files: files.map(f => f.name),
        cohesion: 1,
        internalDeps: 0,
        externalDeps: imports.length + importers.length,
        ratio: 1,
        singleFile: true,
      };
    }

    const filePaths = new Set(files.map(f => f.path));
    let internalDeps = 0;
    let externalDeps = 0;

    for (const file of files) {
      const imports = graph.getImports(file.path);
      const importers = graph.getImporters(file.path);

      // Count internal vs external dependencies
      for (const imp of imports) {
        if (filePaths.has(imp)) {
          internalDeps++;
        } else {
          externalDeps++;
        }
      }

      for (const importer of importers) {
        if (!filePaths.has(importer)) {
          externalDeps++;
        }
        // Internal importers are counted when processing the importer file
      }
    }

    const totalDeps = internalDeps + externalDeps;
    const cohesion = totalDeps === 0 ? 1 : internalDeps / totalDeps;

    return {
      path: modulePath,
      files: files.map(f => f.name),
      cohesion: Math.round(cohesion * 1000) / 1000,
      internalDeps,
      externalDeps,
      ratio: totalDeps === 0 ? 1 : Math.round(cohesion * 1000) / 1000,
    };
  }

  /**
   * Identify modules with low cohesion
   */
  identifyLowCohesion(moduleAnalysis) {
    const lowCohesion = [];

    for (const [modulePath, analysis] of Object.entries(moduleAnalysis)) {
      if (analysis.cohesion < this.lowCohesionThreshold && !analysis.singleFile) {
        lowCohesion.push({
          module: modulePath,
          cohesion: analysis.cohesion,
          files: analysis.files,
          internalDeps: analysis.internalDeps,
          externalDeps: analysis.externalDeps,
        });
      }
    }

    return lowCohesion.sort((a, b) => a.cohesion - b.cohesion);
  }

  /**
   * Generate suggestions for improving cohesion
   */
  generateSuggestions(moduleAnalysis, graph) {
    const suggestions = [];

    for (const [modulePath, analysis] of Object.entries(moduleAnalysis)) {
      if (analysis.singleFile || analysis.files.length <= 1) {
        continue;
      }

      // Find files that might be better placed elsewhere
      const outliers = this.findOutliers(modulePath, analysis, graph);

      for (const outlier of outliers) {
        suggestions.push({
          type: 'move',
          file: outlier.file,
          from: modulePath,
          to: outlier.suggestedModule,
          reason: outlier.reason,
          impact: outlier.impact,
        });
      }
    }

    return suggestions;
  }

  /**
   * Find files that don't fit well in their current module
   */
  findOutliers(modulePath, analysis, graph) {
    const outliers = [];
    const filePaths = new Set();

    // Build a set of file paths in this module
    for (const fileName of analysis.files) {
      const fullPath = this.resolveFilePath(fileName, graph);
      if (fullPath) {
        filePaths.add(fullPath);
      }
    }

    for (const fileName of analysis.files) {
      const fullPath = this.resolveFilePath(fileName, graph);
      if (!fullPath) continue;

      const imports = graph.getImports(fullPath);
      const importers = graph.getImporters(fullPath);

      // Count dependencies by module
      const depsByModule = {};
      let internalDeps = 0;
      let externalDeps = 0;

      for (const imp of imports) {
        if (filePaths.has(imp)) {
          internalDeps++;
        } else {
          externalDeps++;
          const impModule = this.getModuleForFile(imp, graph);
          depsByModule[impModule] = (depsByModule[impModule] || 0) + 1;
        }
      }

      for (const importer of importers) {
        if (!filePaths.has(importer)) {
          const impModule = this.getModuleForFile(importer, graph);
          depsByModule[impModule] = (depsByModule[impModule] || 0) + 1;
        }
      }

      // Check if file has more dependencies with another module
      const totalDeps = internalDeps + externalDeps;
      if (totalDeps === 0) continue;

      const fileCohesion = internalDeps / totalDeps;

      // Find the module with most dependencies
      let maxModule = null;
      let maxDeps = 0;

      for (const [mod, count] of Object.entries(depsByModule)) {
        if (count > maxDeps) {
          maxDeps = count;
          maxModule = mod;
        }
      }

      // Suggest move if file has more dependencies with another module
      if (maxModule && maxDeps > internalDeps && fileCohesion < 0.5) {
        outliers.push({
          file: fileName,
          suggestedModule: maxModule,
          reason: `File has ${maxDeps} dependencies with ${maxModule} vs ${internalDeps} internal`,
          impact: Math.round((maxDeps / totalDeps) * 100) / 100,
        });
      }
    }

    return outliers;
  }

  /**
   * Resolve a file name to its full path
   */
  resolveFilePath(fileName, graph) {
    const graphData = graph.getGraph();
    for (const node of graphData.nodes) {
      if (node.name === fileName) {
        return node.id;
      }
    }
    return null;
  }

  /**
   * Get the module (directory) for a file path
   */
  getModuleForFile(filePath, graph) {
    const graphData = graph.getGraph();
    for (const node of graphData.nodes) {
      if (node.id === filePath) {
        const dir = path.dirname(node.name);
        return dir === '.' ? '(root)' : dir;
      }
    }
    // If not found in graph, derive from path
    const relativePath = path.relative(this.basePath, filePath);
    const dir = path.dirname(relativePath);
    return dir === '.' ? '(root)' : dir;
  }

  /**
   * Calculate average cohesion across all modules
   */
  calculateAverageCohesion(moduleAnalysis) {
    const modules = Object.values(moduleAnalysis);
    if (modules.length === 0) return 1;

    const total = modules.reduce((sum, m) => sum + m.cohesion, 0);
    return Math.round((total / modules.length) * 1000) / 1000;
  }
}

module.exports = { CohesionAnalyzer };
