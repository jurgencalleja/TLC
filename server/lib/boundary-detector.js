/**
 * Service Boundary Detector
 * Identify natural service boundaries using clustering
 */

const path = require('path');

class BoundaryDetector {
  constructor(options = {}) {
    this.options = {
      minServiceSize: options.minServiceSize || 3,
      maxSharedRatio: options.maxSharedRatio || 0.3,
      clusterThreshold: options.clusterThreshold || 0.5,
      ...options,
    };
  }

  /**
   * Detect service boundaries from graph and coupling data
   * @param {Object} graph - From DependencyGraph
   * @param {Object} couplingData - From CouplingCalculator
   * @param {Object} cohesionData - From CohesionAnalyzer
   * @returns {Object} Detected boundaries
   */
  detect(graph, couplingData = {}, cohesionData = {}) {
    const { nodes, edges } = graph;

    // Step 1: Group files by top-level directory
    const directories = this.groupByTopDirectory(nodes);

    // Step 2: Identify potential services based on directory structure
    const potentialServices = this.identifyPotentialServices(directories, nodes);

    // Step 3: Analyze dependencies between potential services
    const serviceDependencies = this.analyzeServiceDependencies(potentialServices, edges);

    // Step 4: Identify shared kernel (files used by many services)
    const shared = this.identifySharedKernel(nodes, edges, potentialServices);

    // Step 5: Score boundary quality
    const services = this.scoreBoundaries(potentialServices, serviceDependencies, couplingData);

    // Step 6: Generate suggestions
    const suggestions = this.generateSuggestions(services, shared, cohesionData);

    return {
      services,
      shared,
      suggestions,
      stats: {
        totalServices: services.length,
        totalShared: shared.length,
        averageCoupling: this.calculateAverageCoupling(serviceDependencies),
      },
    };
  }

  /**
   * Group files by top-level directory
   */
  groupByTopDirectory(nodes) {
    const directories = new Map();

    for (const node of nodes) {
      const parts = node.name.split('/').filter(Boolean);
      const topDir = parts.length > 1 ? parts[0] : 'root';

      if (!directories.has(topDir)) {
        directories.set(topDir, []);
      }
      directories.get(topDir).push(node);
    }

    return directories;
  }

  /**
   * Identify potential services based on common patterns
   */
  identifyPotentialServices(directories, nodes) {
    const services = [];
    this.smallDirectories = []; // Track small directories for merge suggestions

    // Common service patterns
    const servicePatterns = [
      'auth', 'user', 'users', 'account', 'accounts',
      'api', 'routes', 'handlers',
      'db', 'database', 'models', 'entities',
      'utils', 'helpers', 'common', 'shared', 'lib',
      'services', 'controllers', 'middleware',
      'billing', 'payment', 'payments',
      'notification', 'notifications', 'email',
      'admin', 'dashboard',
      'config', 'settings',
    ];

    for (const [dir, files] of directories.entries()) {
      // Check if directory matches service pattern
      const lowerDir = dir.toLowerCase();
      const isServicePattern = servicePatterns.some(p => lowerDir.includes(p));

      // Detect bounded context
      const context = this.detectBoundedContext(dir, files);

      const serviceInfo = {
        name: dir,
        files: files.map(f => f.name),
        fileCount: files.length,
        isServicePattern,
        context,
        dependencies: [],
        quality: 0,
      };

      if (files.length < this.options.minServiceSize) {
        this.smallDirectories.push(serviceInfo);
        continue;
      }

      services.push(serviceInfo);
    }

    return services;
  }

  /**
   * Detect bounded context from directory and files
   */
  detectBoundedContext(dir, files) {
    const contexts = {
      auth: ['login', 'logout', 'session', 'token', 'jwt', 'password', 'auth'],
      users: ['user', 'profile', 'account', 'member'],
      billing: ['payment', 'invoice', 'subscription', 'billing', 'charge'],
      notification: ['email', 'sms', 'notification', 'alert', 'message'],
      data: ['model', 'entity', 'schema', 'repository', 'dao'],
      api: ['route', 'handler', 'controller', 'endpoint'],
      core: ['utils', 'helper', 'common', 'shared', 'lib'],
    };

    const dirLower = dir.toLowerCase();
    const fileNames = files.map(f => path.basename(f.name).toLowerCase()).join(' ');
    const combined = `${dirLower} ${fileNames}`;

    for (const [context, keywords] of Object.entries(contexts)) {
      const matches = keywords.filter(k => combined.includes(k));
      if (matches.length >= 2 || dirLower.includes(context)) {
        return context;
      }
    }

    return 'unknown';
  }

  /**
   * Analyze dependencies between potential services
   */
  analyzeServiceDependencies(services, edges) {
    const dependencies = new Map();

    // Create file -> service mapping
    const fileToService = new Map();
    for (const service of services) {
      for (const file of service.files) {
        fileToService.set(file, service.name);
      }
    }

    // Count dependencies between services
    for (const edge of edges) {
      const fromService = fileToService.get(edge.fromName);
      const toService = fileToService.get(edge.toName);

      if (fromService && toService && fromService !== toService) {
        const key = `${fromService}:${toService}`;
        dependencies.set(key, (dependencies.get(key) || 0) + 1);
      }
    }

    // Update service dependencies
    for (const service of services) {
      const serviceDeps = new Set();
      for (const [key, count] of dependencies.entries()) {
        const [from, to] = key.split(':');
        if (from === service.name) {
          serviceDeps.add(to);
        }
      }
      service.dependencies = Array.from(serviceDeps);
    }

    return dependencies;
  }

  /**
   * Identify shared kernel (files used by multiple services)
   */
  identifySharedKernel(nodes, edges, services) {
    const usageCount = new Map();

    // Create file -> service mapping
    const fileToService = new Map();
    for (const service of services) {
      for (const file of service.files) {
        fileToService.set(file, service.name);
      }
    }

    // Count how many services use each file
    for (const edge of edges) {
      const toFile = edge.toName;
      const fromService = fileToService.get(edge.fromName);
      const toService = fileToService.get(toFile);

      if (fromService && toService && fromService !== toService) {
        if (!usageCount.has(toFile)) {
          usageCount.set(toFile, new Set());
        }
        usageCount.get(toFile).add(fromService);
      }
    }

    // Files used by more than one service
    const shared = [];
    const serviceCount = services.length;
    const threshold = Math.max(2, Math.floor(serviceCount * this.options.maxSharedRatio));

    for (const [file, users] of usageCount.entries()) {
      if (users.size >= 2) {
        shared.push({
          file,
          usedBy: Array.from(users),
          usageCount: users.size,
        });
      }
    }

    // Sort by usage count
    shared.sort((a, b) => b.usageCount - a.usageCount);

    return shared.map(s => s.file);
  }

  /**
   * Score boundary quality
   */
  scoreBoundaries(services, dependencies, couplingData) {
    return services.map(service => {
      let score = 0;

      // Base score from file count (larger services = more likely real services)
      if (service.fileCount >= 5) score += 20;
      else if (service.fileCount >= 3) score += 10;

      // Bonus for matching service patterns
      if (service.isServicePattern) score += 15;

      // Bonus for identified bounded context
      if (service.context !== 'unknown') score += 15;

      // Penalty for too many dependencies
      const depCount = service.dependencies.length;
      if (depCount === 0) score += 20;
      else if (depCount <= 2) score += 10;
      else if (depCount <= 4) score += 0;
      else score -= 10;

      // Use coupling data if available
      if (couplingData.modules) {
        const moduleData = couplingData.modules.find(m => m.name === service.name);
        if (moduleData) {
          // Low instability is good for stable services
          if (moduleData.instability < 0.3) score += 10;
          else if (moduleData.instability > 0.7) score -= 5;
        }
      }

      return {
        ...service,
        quality: Math.max(0, Math.min(100, score)),
      };
    }).sort((a, b) => b.quality - a.quality);
  }

  /**
   * Generate suggestions for improving boundaries
   */
  generateSuggestions(services, shared, cohesionData) {
    const suggestions = [];

    // Suggest extracting shared kernel
    if (shared.length > 5) {
      suggestions.push({
        type: 'extract-shared',
        message: `Consider creating a shared kernel with ${shared.length} commonly used files`,
        files: shared.slice(0, 5),
      });
    }

    // Suggest splitting large services
    for (const service of services) {
      if (service.fileCount > 20) {
        suggestions.push({
          type: 'split-service',
          message: `Service "${service.name}" has ${service.fileCount} files - consider splitting`,
          service: service.name,
        });
      }
    }

    // Suggest merging small directories
    const smallDirs = this.smallDirectories || [];
    if (smallDirs.length >= 2) {
      suggestions.push({
        type: 'merge-services',
        message: `Consider merging small directories: ${smallDirs.map(s => s.name).join(', ')}`,
        services: smallDirs.map(s => s.name),
      });
    }

    // Suggest improving low-quality boundaries
    for (const service of services) {
      if (service.quality < 30 && service.fileCount >= 3) {
        suggestions.push({
          type: 'improve-boundary',
          message: `Service "${service.name}" has low boundary quality (${service.quality}/100)`,
          service: service.name,
          dependencies: service.dependencies,
        });
      }
    }

    return suggestions;
  }

  /**
   * Calculate average coupling between services
   */
  calculateAverageCoupling(dependencies) {
    if (dependencies.size === 0) return 0;

    let total = 0;
    for (const count of dependencies.values()) {
      total += count;
    }

    return Math.round(total / dependencies.size);
  }

  /**
   * Suggest service splits for a specific service
   */
  suggestSplit(service, graph) {
    const { nodes, edges } = graph;
    const serviceFiles = new Set(service.files);

    // Find clusters within the service
    const clusters = this.clusterFiles(
      nodes.filter(n => serviceFiles.has(n.name)),
      edges.filter(e => serviceFiles.has(e.fromName) && serviceFiles.has(e.toName))
    );

    if (clusters.length <= 1) {
      return null;
    }

    return {
      service: service.name,
      suggestedSplit: clusters.map((cluster, i) => ({
        name: `${service.name}_${i + 1}`,
        files: cluster,
      })),
    };
  }

  /**
   * Simple clustering based on connectivity
   */
  clusterFiles(nodes, edges) {
    if (nodes.length === 0) return [];

    // Build adjacency list
    const adjacency = new Map();
    for (const node of nodes) {
      adjacency.set(node.name, new Set());
    }

    for (const edge of edges) {
      if (adjacency.has(edge.fromName) && adjacency.has(edge.toName)) {
        adjacency.get(edge.fromName).add(edge.toName);
        adjacency.get(edge.toName).add(edge.fromName);
      }
    }

    // Find connected components
    const visited = new Set();
    const clusters = [];

    for (const node of nodes) {
      if (visited.has(node.name)) continue;

      const cluster = [];
      const queue = [node.name];

      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;

        visited.add(current);
        cluster.push(current);

        for (const neighbor of adjacency.get(current) || []) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }

      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }
}

module.exports = { BoundaryDetector };
