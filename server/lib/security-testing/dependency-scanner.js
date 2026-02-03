/**
 * Dependency Scanner - npm audit and Trivy scanning
 */

/**
 * Run npm audit
 * @param {Object} options - Scan options
 * @param {Function} options.exec - Exec function for running commands
 * @returns {Promise<Object>} Audit results
 */
export async function runNpmAudit({ exec }) {
  const command = 'npm audit --json';
  const { stdout } = await exec(command);
  return JSON.parse(stdout);
}

/**
 * Run Trivy scan
 * @param {Object} options - Scan options
 * @param {string} options.path - Path to scan
 * @param {Function} options.exec - Exec function for running commands
 * @returns {Promise<Object>} Scan results
 */
export async function runTrivyScan({ path, exec }) {
  const command = `trivy fs --format json ${path}`;
  const { stdout } = await exec(command);
  return JSON.parse(stdout);
}

/**
 * Parse vulnerability results into normalized format
 * @param {Object} results - Raw audit results
 * @returns {Array} Normalized vulnerabilities
 */
export function parseVulnerabilities(results) {
  const vulnerabilities = [];

  if (results.vulnerabilities) {
    for (const [pkg, vuln] of Object.entries(results.vulnerabilities)) {
      const title = vuln.via?.[0]?.title || vuln.via?.[0] || 'Unknown vulnerability';
      vulnerabilities.push({
        package: pkg,
        severity: vuln.severity,
        title: typeof title === 'string' ? title : title.title || 'Unknown',
        fixAvailable: vuln.fixAvailable || false
      });
    }
  }

  return vulnerabilities;
}

/**
 * Check license compliance
 * @param {Array} deps - List of dependencies with licenses
 * @param {Object} options - License policy options
 * @param {Array} options.allowed - List of allowed licenses
 * @returns {Object} Compliance result
 */
export function checkLicenses(deps, options = {}) {
  const { allowed = [] } = options;
  const violations = [];

  for (const dep of deps) {
    if (!allowed.includes(dep.license)) {
      violations.push({
        package: dep.name,
        license: dep.license
      });
    }
  }

  return {
    compliant: violations.length === 0,
    violations
  };
}

/**
 * Generate Software Bill of Materials (SBOM)
 * @param {Array} deps - List of dependencies
 * @param {Object} options - SBOM options
 * @param {string} options.format - Output format (cyclonedx, spdx)
 * @returns {string} SBOM in specified format
 */
export function generateSbom(deps, options = {}) {
  const { format = 'cyclonedx' } = options;

  if (format === 'cyclonedx') {
    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      version: 1,
      components: deps.map(dep => ({
        type: 'library',
        name: dep.name,
        version: dep.version
      }))
    };
    return JSON.stringify(sbom, null, 2);
  }

  // SPDX format
  const sbom = {
    spdxVersion: 'SPDX-2.3',
    packages: deps.map(dep => ({
      name: dep.name,
      version: dep.version
    }))
  };
  return JSON.stringify(sbom, null, 2);
}

/**
 * Create a dependency scanner instance
 * @param {Object} options - Scanner options
 * @returns {Object} Dependency scanner instance
 */
export function createDependencyScanner(options = {}) {
  return {
    /**
     * Run dependency scan
     * @param {Object} scanOptions - Scan options
     * @returns {Promise<Array>} Vulnerability results
     */
    async scan(scanOptions) {
      const { severity, mockResults, exec } = scanOptions;

      let results;
      if (mockResults !== undefined) {
        results = mockResults;
      } else if (exec) {
        const auditResults = await runNpmAudit({ exec });
        results = parseVulnerabilities(auditResults);
      } else {
        results = [];
      }

      // Filter by severity if specified
      if (severity) {
        const severityOrder = ['low', 'moderate', 'high', 'critical'];
        const minIndex = severityOrder.indexOf(severity.toLowerCase());
        results = results.filter(r => {
          const rIndex = severityOrder.indexOf(r.severity?.toLowerCase());
          return rIndex >= minIndex;
        });
      }

      return results;
    },

    /**
     * Check license compliance
     * @param {Array} deps - Dependencies to check
     * @param {Object} policy - License policy
     * @returns {Object} Compliance result
     */
    checkLicenses(deps, policy) {
      return checkLicenses(deps, policy);
    },

    /**
     * Generate SBOM
     * @param {Array} deps - Dependencies
     * @param {Object} sbomOptions - SBOM options
     * @returns {string} SBOM output
     */
    generateSbom(deps, sbomOptions) {
      return generateSbom(deps, sbomOptions);
    }
  };
}
