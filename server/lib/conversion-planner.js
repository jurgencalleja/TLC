/**
 * Conversion Planner Module
 * Generates microservice conversion plans from monolith analysis
 */

/**
 * Build adjacency list from service dependencies
 * @param {Array} services - Array of service objects with name and dependencies
 * @returns {Map} Adjacency list map
 */
function buildDependencyGraph(services) {
  const graph = new Map();

  for (const service of services) {
    if (!graph.has(service.name)) {
      graph.set(service.name, new Set());
    }
    for (const dep of (service.dependencies || [])) {
      graph.get(service.name).add(dep);
    }
  }

  return graph;
}

/**
 * Detect circular dependencies in service graph
 * @param {Map} graph - Adjacency list of dependencies
 * @returns {Array} Array of cycles found (each cycle is an array of service names)
 */
function detectCircularDependencies(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  const path = [];

  function dfs(node) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const deps = graph.get(node) || new Set();
    for (const dep of deps) {
      if (!graph.has(dep)) continue; // External dependency

      if (!visited.has(dep)) {
        dfs(dep);
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart);
        cycles.push([...cycle, dep]);
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Topological sort of services - returns leaves first
 * A "leaf" is a service with no dependencies (nothing it depends on)
 * Services with no dependencies should be extracted first
 * @param {Array} services - Array of service objects
 * @returns {Array} Sorted service names (leaves first)
 */
function topologicalSort(services) {
  const graph = buildDependencyGraph(services);
  const serviceNames = new Set(services.map(s => s.name));

  // Calculate out-degree (number of internal dependencies each service has)
  const outDegree = new Map();
  for (const name of serviceNames) {
    const deps = graph.get(name) || new Set();
    // Only count dependencies that are in our service list (internal deps)
    const internalDeps = [...deps].filter(d => serviceNames.has(d));
    outDegree.set(name, internalDeps.length);
  }

  // Build reverse graph: for each service, track who depends on it
  const dependedOnBy = new Map();
  for (const name of serviceNames) {
    dependedOnBy.set(name, []);
  }
  for (const [service, deps] of graph) {
    for (const dep of deps) {
      if (serviceNames.has(dep)) {
        dependedOnBy.get(dep).push(service);
      }
    }
  }

  // Find services with no dependencies (leaves) - these get extracted first
  const queue = [];
  for (const [name, degree] of outDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  const result = [];
  const processed = new Set();

  while (queue.length > 0) {
    const service = queue.shift();
    result.push(service);
    processed.add(service);

    // For each service that depends on this one, decrement their out-degree
    for (const dependent of dependedOnBy.get(service)) {
      if (!processed.has(dependent)) {
        const newDegree = outDegree.get(dependent) - 1;
        outDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }
  }

  // Handle any remaining services (part of cycles)
  for (const name of serviceNames) {
    if (!processed.has(name)) {
      result.push(name);
    }
  }

  return result;
}

/**
 * Generate API contract stub for a service
 * @param {Object} service - Service object with name, endpoints, models
 * @returns {Object} API contract specification
 */
function generateApiContract(service) {
  const contract = {
    service: service.name,
    version: '1.0.0',
    endpoints: [],
    models: [],
    events: [],
  };

  // Generate endpoint contracts
  for (const endpoint of (service.endpoints || [])) {
    contract.endpoints.push({
      method: endpoint.method || 'GET',
      path: endpoint.path || `/${service.name}`,
      request: endpoint.requestSchema || null,
      response: endpoint.responseSchema || { type: 'object' },
      description: endpoint.description || `${endpoint.method || 'GET'} ${endpoint.path || '/' + service.name}`,
    });
  }

  // Generate model contracts
  for (const model of (service.models || [])) {
    contract.models.push({
      name: model.name || 'UnnamedModel',
      schema: model.schema || { type: 'object', properties: {} },
    });
  }

  // Generate event contracts for async communication
  for (const event of (service.events || [])) {
    contract.events.push({
      name: event.name || `${service.name}.event`,
      payload: event.payload || { type: 'object' },
      description: event.description || '',
    });
  }

  return contract;
}

/**
 * Generate migration test template for a service
 * @param {Object} service - Service object
 * @param {Object} contract - API contract for the service
 * @returns {string} Test template code
 */
function generateMigrationTest(service, contract) {
  const lines = [];

  lines.push(`// Migration tests for ${service.name} service`);
  lines.push(`// Generated by TLC Conversion Planner`);
  lines.push('');
  lines.push(`describe('${service.name} migration', () => {`);
  lines.push('');
  lines.push('  // Parity tests - ensure new service matches monolith behavior');

  for (const endpoint of contract.endpoints) {
    const testName = `${endpoint.method} ${endpoint.path}`;
    lines.push(`  describe('${testName}', () => {`);
    lines.push(`    it('returns same response as monolith', async () => {`);
    lines.push(`      const monolithResponse = await callMonolith('${endpoint.method}', '${endpoint.path}');`);
    lines.push(`      const serviceResponse = await callService('${service.name}', '${endpoint.method}', '${endpoint.path}');`);
    lines.push(`      expect(serviceResponse).toEqual(monolithResponse);`);
    lines.push('    });');
    lines.push('');
    lines.push(`    it('handles error cases consistently', async () => {`);
    lines.push(`      // TODO: Add error case testing`);
    lines.push('    });');
    lines.push('  });');
    lines.push('');
  }

  lines.push('  // Performance tests');
  lines.push(`  describe('performance', () => {`);
  lines.push(`    it('responds within acceptable latency', async () => {`);
  lines.push(`      const start = Date.now();`);
  lines.push(`      await callService('${service.name}', 'GET', '/${service.name}/health');`);
  lines.push(`      const duration = Date.now() - start;`);
  lines.push(`      expect(duration).toBeLessThan(100); // 100ms threshold`);
  lines.push('    });');
  lines.push('  });');
  lines.push('');

  lines.push('  // Data migration tests');
  lines.push(`  describe('data migration', () => {`);
  lines.push(`    it('migrates all records correctly', async () => {`);
  lines.push(`      // TODO: Verify data integrity after migration`);
  lines.push('    });');
  lines.push('  });');
  lines.push('});');
  lines.push('');

  return lines.join('\n');
}

/**
 * Estimate effort for extracting a service
 * @param {Object} service - Service object with files, dependencies info
 * @returns {Object} Effort estimation
 */
function estimateEffort(service) {
  const fileCount = service.files?.length || 0;
  const dependencyCount = service.dependencies?.length || 0;
  const endpointCount = service.endpoints?.length || 0;
  const modelCount = service.models?.length || 0;

  // Base effort: 1 day per file (simplified)
  let baseDays = fileCount;

  // Add complexity for dependencies (0.5 days per dependency)
  baseDays += dependencyCount * 0.5;

  // Add complexity for endpoints (0.25 days per endpoint)
  baseDays += endpointCount * 0.25;

  // Add complexity for models (0.25 days per model)
  baseDays += modelCount * 0.25;

  // Minimum 1 day
  baseDays = Math.max(1, Math.ceil(baseDays));

  // Calculate range
  const minDays = baseDays;
  const maxDays = Math.ceil(baseDays * 1.5);

  // Determine complexity
  let complexity = 'low';
  if (fileCount > 10 || dependencyCount > 5) complexity = 'high';
  else if (fileCount > 5 || dependencyCount > 2) complexity = 'medium';

  return {
    days: baseDays,
    range: { min: minDays, max: maxDays },
    complexity,
    breakdown: {
      files: fileCount,
      dependencies: dependencyCount,
      endpoints: endpointCount,
      models: modelCount,
    },
  };
}

/**
 * Generate phased extraction plan
 * @param {Array} services - Array of service objects
 * @returns {Object} Complete conversion plan
 */
function generateConversionPlan(services) {
  const graph = buildDependencyGraph(services);
  const cycles = detectCircularDependencies(graph);
  const sortedNames = topologicalSort(services);

  // Create lookup for quick access
  const serviceMap = new Map(services.map(s => [s.name, s]));

  // Generate phases by dependency level
  // Phase 1: services with no dependencies
  // Phase 2: services whose dependencies are all in phase 1
  // etc.
  const phases = [];
  const extracted = new Set();
  const remaining = new Set(services.map(s => s.name));

  while (remaining.size > 0) {
    const currentPhase = { phase: phases.length + 1, services: [], parallel: true };

    // Find all services whose dependencies are all extracted
    for (const name of remaining) {
      const service = serviceMap.get(name);
      if (!service) continue;

      const deps = (service.dependencies || []).filter(d => serviceMap.has(d));
      const depsExtracted = deps.every(d => extracted.has(d));

      if (depsExtracted) {
        currentPhase.services.push(name);
      }
    }

    // If no services can be added, we have a cycle - add remaining and break
    if (currentPhase.services.length === 0) {
      for (const name of remaining) {
        currentPhase.services.push(name);
      }
      phases.push(currentPhase);
      break;
    }

    // Mark services in this phase as extracted
    for (const name of currentPhase.services) {
      extracted.add(name);
      remaining.delete(name);
    }

    phases.push(currentPhase);
  }

  // Generate contracts and estimates for each service
  const contracts = {};
  const estimates = {};
  const migrationTests = {};

  for (const service of services) {
    const contract = generateApiContract(service);
    contracts[service.name] = contract;
    estimates[service.name] = estimateEffort(service);
    migrationTests[service.name] = generateMigrationTest(service, contract);
  }

  // Calculate total effort
  const totalDays = Object.values(estimates).reduce((sum, e) => sum + e.days, 0);

  // Build warnings for circular dependencies
  const warnings = [];
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      warnings.push({
        type: 'circular-dependency',
        services: cycle,
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
        recommendation: 'Consider introducing an event bus or shared module to break the cycle',
      });
    }
  }

  return {
    summary: {
      totalServices: services.length,
      totalPhases: phases.length,
      estimatedDays: totalDays,
      estimatedRange: {
        min: totalDays,
        max: Math.ceil(totalDays * 1.5),
      },
      hasCircularDependencies: cycles.length > 0,
    },
    phases,
    extractionOrder: sortedNames,
    contracts,
    estimates,
    migrationTests,
    warnings,
  };
}

/**
 * Format conversion plan as readable report
 * @param {Object} plan - Conversion plan object
 * @returns {string} Formatted report
 */
function formatConversionReport(plan) {
  const lines = [];

  lines.push('');
  lines.push('Microservice Conversion Plan');
  lines.push('════════════════════════════');
  lines.push('');

  // Summary
  lines.push('Summary');
  lines.push('-------');
  lines.push(`Total services: ${plan.summary.totalServices}`);
  lines.push(`Total phases: ${plan.summary.totalPhases}`);
  lines.push(`Estimated effort: ${plan.summary.estimatedDays} days (${plan.summary.estimatedRange.min}-${plan.summary.estimatedRange.max} days)`);
  lines.push('');

  // Warnings
  if (plan.warnings.length > 0) {
    lines.push('Warnings');
    lines.push('--------');
    for (const warning of plan.warnings) {
      lines.push(`  [${warning.type}] ${warning.message}`);
      lines.push(`    Recommendation: ${warning.recommendation}`);
    }
    lines.push('');
  }

  // Extraction order
  lines.push('Extraction Order (leaves first)');
  lines.push('-------------------------------');
  for (let i = 0; i < plan.extractionOrder.length; i++) {
    const name = plan.extractionOrder[i];
    const estimate = plan.estimates[name];
    lines.push(`  ${i + 1}. ${name} (~${estimate.days} days, ${estimate.complexity} complexity)`);
  }
  lines.push('');

  // Phases
  lines.push('Phases');
  lines.push('------');
  for (const phase of plan.phases) {
    const phaseEffort = phase.services.reduce((sum, s) => sum + plan.estimates[s].days, 0);
    lines.push(`  Phase ${phase.phase}: ${phase.services.join(', ')} (~${phaseEffort} days)`);
  }
  lines.push('');

  // Per-service details
  lines.push('Service Details');
  lines.push('---------------');
  for (const name of plan.extractionOrder) {
    const estimate = plan.estimates[name];
    const contract = plan.contracts[name];
    lines.push(`  ${name}:`);
    lines.push(`    Complexity: ${estimate.complexity}`);
    lines.push(`    Files: ${estimate.breakdown.files}`);
    lines.push(`    Dependencies: ${estimate.breakdown.dependencies}`);
    lines.push(`    Endpoints: ${contract.endpoints.length}`);
    lines.push(`    Effort: ${estimate.range.min}-${estimate.range.max} days`);
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  buildDependencyGraph,
  detectCircularDependencies,
  topologicalSort,
  generateApiContract,
  generateMigrationTest,
  estimateEffort,
  generateConversionPlan,
  formatConversionReport,
};
