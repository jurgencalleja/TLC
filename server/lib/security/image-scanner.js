/**
 * Image Scanner Module (Trivy Integration)
 */

export const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNKNOWN: 'UNKNOWN',
};

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };

export function parseTrixyOutput(jsonOutput) {
  const data = typeof jsonOutput === 'string' ? JSON.parse(jsonOutput) : jsonOutput;
  const vulnerabilities = [];
  const summary = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0, total: 0 };

  for (const result of data.Results || []) {
    for (const vuln of result.Vulnerabilities || []) {
      vulnerabilities.push({
        id: vuln.VulnerabilityID,
        severity: vuln.Severity,
        title: vuln.Title,
        description: vuln.Description,
        package: vuln.PkgName,
        installedVersion: vuln.InstalledVersion,
        fixedVersion: vuln.FixedVersion,
        target: result.Target,
      });
      const key = vuln.Severity?.toLowerCase() || 'unknown';
      if (summary[key] !== undefined) summary[key]++;
      summary.total++;
    }
  }

  return { vulnerabilities, summary, raw: data };
}

export function filterBySeverity(vulnerabilities, minSeverity) {
  const minOrder = SEVERITY_ORDER[minSeverity] ?? 4;
  return vulnerabilities.filter(v => (SEVERITY_ORDER[v.severity] ?? 4) <= minOrder);
}

export function shouldBlockBuild(parsed, options = {}) {
  const blockOn = options.blockOn || 'CRITICAL';
  const blockOrder = SEVERITY_ORDER[blockOn] ?? 0;

  return parsed.vulnerabilities.some(v => (SEVERITY_ORDER[v.severity] ?? 4) <= blockOrder);
}

export function createImageScanner(config = {}) {
  const { blockOn = 'CRITICAL', exec = null } = config;

  return {
    async scan(image) {
      if (!exec) throw new Error('exec function required for scanning');
      const output = await exec(`trivy image --format json ${image}`);
      const parsed = parseTrixyOutput(output);
      return {
        image,
        vulnerabilities: parsed.vulnerabilities,
        summary: parsed.summary,
        shouldBlock: shouldBlockBuild(parsed, { blockOn }),
      };
    },

    generateReport(parsed) {
      const blocked = shouldBlockBuild(parsed, { blockOn });
      return {
        passed: !blocked,
        summary: parsed.summary,
        vulnerabilities: parsed.vulnerabilities,
        blockingVulnerabilities: filterBySeverity(parsed.vulnerabilities, blockOn),
      };
    },

    parseOutput: parseTrixyOutput,
    filterBySeverity,
    shouldBlockBuild: (parsed) => shouldBlockBuild(parsed, { blockOn }),
  };
}
