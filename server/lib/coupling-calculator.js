/**
 * Coupling Calculator
 * Calculate coupling metrics for dependency graphs
 */

class CouplingCalculator {
  /**
   * Create a coupling calculator
   * @param {DependencyGraph} graph - The dependency graph instance
   */
  constructor(graph) {
    this.graph = graph;
  }

  /**
   * Get afferent coupling (Ca) - number of files that depend on this file
   * @param {string} filePath - Absolute path to the file
   * @returns {number} Number of incoming dependencies
   */
  getAfferentCoupling(filePath) {
    const importers = this.graph.getImporters(filePath);
    return importers.length;
  }

  /**
   * Get efferent coupling (Ce) - number of files this file depends on
   * @param {string} filePath - Absolute path to the file
   * @returns {number} Number of outgoing dependencies
   */
  getEfferentCoupling(filePath) {
    const imports = this.graph.getImports(filePath);
    return imports.length;
  }

  /**
   * Get instability ratio: Ce / (Ca + Ce)
   * 0 = maximally stable (only depended upon, doesn't depend)
   * 1 = maximally unstable (only depends, not depended upon)
   * @param {string} filePath - Absolute path to the file
   * @returns {number} Instability ratio between 0 and 1
   */
  getInstability(filePath) {
    const ca = this.getAfferentCoupling(filePath);
    const ce = this.getEfferentCoupling(filePath);

    if (ca + ce === 0) {
      return 0; // Isolated file has 0 instability
    }

    return ce / (ca + ce);
  }

  /**
   * Get hub files - files with high afferent coupling (many dependents)
   * @param {Object} options - Options
   * @param {number} options.threshold - Minimum afferent coupling to be considered a hub
   * @returns {Array<{file: string, afferentCoupling: number}>} Hub files sorted by coupling
   */
  getHubFiles(options = {}) {
    const { threshold = 3 } = options;
    const files = this.graph.getFiles();
    const hubs = [];

    for (const file of files) {
      const ca = this.getAfferentCoupling(file);
      if (ca >= threshold) {
        hubs.push({
          file,
          afferentCoupling: ca,
        });
      }
    }

    return hubs.sort((a, b) => b.afferentCoupling - a.afferentCoupling);
  }

  /**
   * Get dependent files - files with high efferent coupling (many dependencies)
   * @param {Object} options - Options
   * @param {number} options.threshold - Minimum efferent coupling to be considered dependent
   * @returns {Array<{file: string, efferentCoupling: number}>} Dependent files sorted by coupling
   */
  getDependentFiles(options = {}) {
    const { threshold = 3 } = options;
    const files = this.graph.getFiles();
    const dependent = [];

    for (const file of files) {
      const ce = this.getEfferentCoupling(file);
      if (ce >= threshold) {
        dependent.push({
          file,
          efferentCoupling: ce,
        });
      }
    }

    return dependent.sort((a, b) => b.efferentCoupling - a.efferentCoupling);
  }

  /**
   * Get isolated files - files with no coupling (neither imports nor is imported)
   * @returns {Array<string>} Array of isolated file paths
   */
  getIsolatedFiles() {
    const files = this.graph.getFiles();
    const isolated = [];

    for (const file of files) {
      const ca = this.getAfferentCoupling(file);
      const ce = this.getEfferentCoupling(file);
      if (ca === 0 && ce === 0) {
        isolated.push(file);
      }
    }

    return isolated;
  }

  /**
   * Get highly coupled modules - files with high total coupling (Ca + Ce)
   * @param {Object} options - Options
   * @param {number} options.threshold - Minimum total coupling to be considered highly coupled
   * @returns {Array<{file: string, afferentCoupling: number, efferentCoupling: number, totalCoupling: number}>}
   */
  getHighlyCoupledModules(options = {}) {
    const { threshold = 4 } = options;
    const files = this.graph.getFiles();
    const highlyCoupled = [];

    for (const file of files) {
      const ca = this.getAfferentCoupling(file);
      const ce = this.getEfferentCoupling(file);
      const total = ca + ce;

      if (total >= threshold) {
        highlyCoupled.push({
          file,
          afferentCoupling: ca,
          efferentCoupling: ce,
          totalCoupling: total,
        });
      }
    }

    return highlyCoupled.sort((a, b) => b.totalCoupling - a.totalCoupling);
  }

  /**
   * Get coupling metrics for all files in the graph
   * @returns {Array<{file: string, afferentCoupling: number, efferentCoupling: number, instability: number}>}
   */
  getAllMetrics() {
    const files = this.graph.getFiles();
    return files.map(file => ({
      file,
      afferentCoupling: this.getAfferentCoupling(file),
      efferentCoupling: this.getEfferentCoupling(file),
      instability: this.getInstability(file),
    }));
  }

  /**
   * Generate coupling matrix - shows which files depend on which
   * @returns {{files: Array<string>, matrix: Array<Array<number>>}} Matrix where matrix[i][j] = 1 if files[i] imports files[j]
   */
  getCouplingMatrix() {
    const files = this.graph.getFiles();
    const n = files.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      const imports = this.graph.getImports(files[i]);
      for (const imp of imports) {
        const j = files.indexOf(imp);
        if (j !== -1) {
          matrix[i][j] = 1;
        }
      }
    }

    return {
      files,
      matrix,
    };
  }
}

module.exports = { CouplingCalculator };
