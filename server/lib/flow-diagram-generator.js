/**
 * Flow Diagram Generator
 * Generate Mermaid diagrams showing data flow between repos
 */

const path = require('path');

/**
 * FlowDiagramGenerator class for analyzing cross-repo data flows
 * and generating Mermaid flowchart diagrams
 */
class FlowDiagramGenerator {
  /**
   * Create a FlowDiagramGenerator instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      direction: options.direction || 'LR',
      groupByRepo: options.groupByRepo !== false,
      showLegend: options.showLegend !== false,
      ...options,
    };
  }

  /**
   * Analyze files for cross-repo communication patterns
   * @param {Object} files - Map of file paths to content
   * @returns {Object} Analysis result with detected patterns
   */
  analyzeFiles(files) {
    const result = {
      crossRepoImports: [],
      httpCalls: [],
      messageQueue: [],
      databaseAccess: [],
    };

    for (const [filePath, content] of Object.entries(files)) {
      try {
        const repoName = this.extractRepoName(filePath);

        // Detect workspace imports
        const imports = this.detectWorkspaceImports(content, repoName);
        result.crossRepoImports.push(...imports);

        // Detect HTTP calls
        const http = this.detectHttpCalls(content, repoName);
        result.httpCalls.push(...http);

        // Detect message queue patterns
        const mq = this.detectMessageQueuePatterns(content, repoName);
        result.messageQueue.push(...mq);

        // Detect database access
        const db = this.detectDatabaseAccess(content, repoName);
        result.databaseAccess.push(...db);
      } catch (error) {
        // Handle files with syntax errors gracefully - continue processing
        if (this.options.verbose) {
          console.warn(`Error analyzing ${filePath}: ${error.message}`);
        }
      }
    }

    return result;
  }

  /**
   * Extract repo name from file path
   * @param {string} filePath - Full file path
   * @returns {string} Repo name
   */
  extractRepoName(filePath) {
    // Assumes structure like /workspace/{repo-name}/...
    const parts = filePath.split('/');
    const workspaceIndex = parts.findIndex(p => p === 'workspace');
    if (workspaceIndex !== -1 && parts[workspaceIndex + 1]) {
      return parts[workspaceIndex + 1];
    }
    // Fallback: use the first significant directory
    return parts.find(p => p && p !== '') || 'unknown';
  }

  /**
   * Detect workspace:* imports
   * @param {string} content - File content
   * @param {string} repoName - Source repo name
   * @returns {Array} Detected imports
   */
  detectWorkspaceImports(content, repoName) {
    const imports = [];

    // Match workspace:package imports
    // Pattern: import ... from 'workspace:package-name'
    const importRegex = /import\s+(?:(?:[\w*{}\s,]+)\s+from\s+)?['"]workspace:([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        from: repoName,
        to: match[1],
        type: 'import',
        raw: match[0],
      });
    }

    // Also check require statements
    const requireRegex = /require\s*\(\s*['"]workspace:([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({
        from: repoName,
        to: match[1],
        type: 'import',
        raw: match[0],
      });
    }

    return imports;
  }

  /**
   * Detect HTTP calls to other services
   * @param {string} content - File content
   * @param {string} repoName - Source repo name
   * @returns {Array} Detected HTTP calls
   */
  detectHttpCalls(content, repoName) {
    const calls = [];

    // Detect fetch calls: fetch('http://service-name:port/...')
    const fetchRegex = /fetch\s*\(\s*['"`]https?:\/\/([^:/'"]+)(?::\d+)?[^'"]*['"`]/g;
    let match;

    while ((match = fetchRegex.exec(content)) !== null) {
      calls.push({
        from: repoName,
        to: match[1],
        type: 'http',
        method: 'GET', // Default
        raw: match[0],
      });
    }

    // Detect fetch with template literals
    const fetchTemplateRegex = /fetch\s*\(\s*`[^`]*\$\{[^}]*\}[^`]*`/g;
    while ((match = fetchTemplateRegex.exec(content)) !== null) {
      // Extract service name if possible from variable names
      const serviceMatch = match[0].match(/(\w+_SERVICE|SERVICE_\w+)/i);
      if (serviceMatch) {
        const serviceName = serviceMatch[1].toLowerCase().replace(/_url$/i, '').replace(/_/g, '-');
        calls.push({
          from: repoName,
          to: serviceName,
          type: 'http',
          raw: match[0],
        });
      }
    }

    // Detect axios calls: axios.get('http://service/...')
    const axiosRegex = /axios\.(?:get|post|put|delete|patch)\s*\(\s*['"`]https?:\/\/([^:/'"]+)/gi;
    while ((match = axiosRegex.exec(content)) !== null) {
      const methodMatch = match[0].match(/axios\.(\w+)/i);
      calls.push({
        from: repoName,
        to: match[1],
        type: 'http',
        method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
        raw: match[0],
      });
    }

    // Detect http.request with hostname
    const httpRequestRegex = /https?\.(?:request|get)\s*\(\s*\{[^}]*hostname\s*:\s*['"]([^'"]+)['"]/g;
    while ((match = httpRequestRegex.exec(content)) !== null) {
      calls.push({
        from: repoName,
        to: match[1],
        type: 'http',
        raw: match[0],
      });
    }

    // Detect https.get with URL
    const httpsGetRegex = /https?\.get\s*\(\s*['"]https?:\/\/([^:/'"]+)/g;
    while ((match = httpsGetRegex.exec(content)) !== null) {
      calls.push({
        from: repoName,
        to: match[1],
        type: 'http',
        raw: match[0],
      });
    }

    return calls;
  }

  /**
   * Detect message queue producer/consumer patterns
   * @param {string} content - File content
   * @param {string} repoName - Source repo name
   * @returns {Array} Detected message queue patterns
   */
  detectMessageQueuePatterns(content, repoName) {
    const patterns = [];

    // Producer patterns: publish, emit, sendToQueue
    const producerRegex = /(?:eventBus|queue|channel|emitter|broker|rabbit|kafka)\.(?:publish|emit|send|sendToQueue|produce)\s*\(\s*['"]([^'"]+)['"]/gi;
    let match;

    while ((match = producerRegex.exec(content)) !== null) {
      patterns.push({
        from: repoName,
        event: match[1],
        type: 'producer',
        raw: match[0],
      });
    }

    // Consumer patterns: subscribe, on, consume
    const consumerRegex = /(?:eventBus|queue|channel|emitter|broker|rabbit|kafka)\.(?:subscribe|on|consume|listen)\s*\(\s*['"]([^'"]+)['"]/gi;
    while ((match = consumerRegex.exec(content)) !== null) {
      patterns.push({
        from: repoName,
        event: match[1],
        type: 'consumer',
        raw: match[0],
      });
    }

    return patterns;
  }

  /**
   * Detect database access patterns
   * @param {string} content - File content
   * @param {string} repoName - Source repo name
   * @returns {Array} Detected database access patterns
   */
  detectDatabaseAccess(content, repoName) {
    const access = [];

    // MongoDB: db.collection('name')
    const mongoRegex = /(?:db|mongo|mongoose)\.collection\s*\(\s*['"]([^'"]+)['"]/gi;
    let match;

    while ((match = mongoRegex.exec(content)) !== null) {
      access.push({
        from: repoName,
        resource: match[1],
        type: 'database',
        raw: match[0],
      });
    }

    // Prisma: prisma.modelName.findMany(), etc.
    const prismaRegex = /prisma\.(\w+)\.(?:find|create|update|delete|upsert)/gi;
    while ((match = prismaRegex.exec(content)) !== null) {
      access.push({
        from: repoName,
        resource: match[1],
        type: 'database',
        raw: match[0],
      });
    }

    // Sequelize: sequelize.query('SELECT * FROM table')
    const sequelizeRegex = /sequelize\.query\s*\(\s*['"][^'"]*FROM\s+(\w+)/gi;
    while ((match = sequelizeRegex.exec(content)) !== null) {
      access.push({
        from: repoName,
        resource: match[1].toLowerCase(),
        type: 'database',
        raw: match[0],
      });
    }

    // Redis: redis.get('key:namespace')
    const redisRegex = /redis\.(?:get|set|hget|hset|lpush|rpush|sadd)\s*\(\s*['"]([^:'"]+)/gi;
    while ((match = redisRegex.exec(content)) !== null) {
      access.push({
        from: repoName,
        resource: match[1],
        type: 'cache',
        raw: match[0],
      });
    }

    return access;
  }

  /**
   * Generate Mermaid flowchart diagram
   * @param {Object} analysisResult - Result from analyzeFiles()
   * @returns {string} Mermaid diagram code
   */
  generateMermaid(analysisResult) {
    const { crossRepoImports, httpCalls, messageQueue, databaseAccess } = analysisResult;

    // Check if there's any cross-repo communication
    const hasComm =
      crossRepoImports.length > 0 ||
      httpCalls.length > 0 ||
      messageQueue.length > 0 ||
      databaseAccess.length > 0;

    if (!hasComm) {
      return `flowchart ${this.options.direction}\n    empty[No cross-repo communication detected]\n`;
    }

    let mermaid = `flowchart ${this.options.direction}\n`;

    // Add styles
    mermaid += this.generateStyles();

    // Collect all unique repos and resources
    const repos = new Set();
    const events = new Set();
    const databases = new Set();

    // Process imports
    for (const imp of crossRepoImports) {
      repos.add(imp.from);
      repos.add(imp.to);
    }

    // Process HTTP calls
    for (const call of httpCalls) {
      repos.add(call.from);
      repos.add(call.to);
    }

    // Process message queue
    for (const mq of messageQueue) {
      repos.add(mq.from);
      events.add(mq.event);
    }

    // Process database access
    for (const db of databaseAccess) {
      repos.add(db.from);
      databases.add(`${db.type}:${db.resource}`);
    }

    // Generate repo nodes
    mermaid += '\n    %% Repositories/Services\n';
    for (const repo of repos) {
      const nodeId = this.sanitizeId(repo);
      mermaid += `    ${nodeId}[${this.escapeLabel(repo)}]:::repo\n`;
    }

    // Generate event nodes
    if (events.size > 0) {
      mermaid += '\n    %% Message Queue Events\n';
      for (const event of events) {
        const nodeId = this.sanitizeId(`event_${event}`);
        mermaid += `    ${nodeId}{{${this.escapeLabel(event)}}}:::event\n`;
      }
    }

    // Generate database nodes
    if (databases.size > 0) {
      mermaid += '\n    %% Data Stores\n';
      for (const db of databases) {
        const [type, resource] = db.split(':');
        const nodeId = this.sanitizeId(`db_${resource}`);
        const shape = type === 'cache' ? '([' : '[(';
        const shapeEnd = type === 'cache' ? '])' : ')]';
        mermaid += `    ${nodeId}${shape}${this.escapeLabel(resource)}${shapeEnd}:::${type}\n`;
      }
    }

    // Generate edges for imports
    if (crossRepoImports.length > 0) {
      mermaid += '\n    %% Import Dependencies\n';
      for (const imp of crossRepoImports) {
        const fromId = this.sanitizeId(imp.from);
        const toId = this.sanitizeId(imp.to);
        mermaid += `    ${fromId} -->|imports| ${toId}\n`;
      }
    }

    // Generate edges for HTTP calls
    if (httpCalls.length > 0) {
      mermaid += '\n    %% HTTP Calls\n';
      for (const call of httpCalls) {
        const fromId = this.sanitizeId(call.from);
        const toId = this.sanitizeId(call.to);
        const label = call.method || 'HTTP';
        mermaid += `    ${fromId} -.->|${label}| ${toId}\n`;
      }
    }

    // Generate edges for message queue
    if (messageQueue.length > 0) {
      mermaid += '\n    %% Message Queue\n';
      const producers = messageQueue.filter(m => m.type === 'producer');
      const consumers = messageQueue.filter(m => m.type === 'consumer');

      for (const prod of producers) {
        const fromId = this.sanitizeId(prod.from);
        const eventId = this.sanitizeId(`event_${prod.event}`);
        mermaid += `    ${fromId} ==>|publish| ${eventId}\n`;
      }

      for (const cons of consumers) {
        const eventId = this.sanitizeId(`event_${cons.event}`);
        const toId = this.sanitizeId(cons.from);
        mermaid += `    ${eventId} ==>|subscribe| ${toId}\n`;
      }
    }

    // Generate edges for database access
    if (databaseAccess.length > 0) {
      mermaid += '\n    %% Database Access\n';
      for (const db of databaseAccess) {
        const fromId = this.sanitizeId(db.from);
        const dbId = this.sanitizeId(`db_${db.resource}`);
        mermaid += `    ${fromId} <-->|${db.type}| ${dbId}\n`;
      }
    }

    return mermaid;
  }

  /**
   * Generate Mermaid style definitions
   * @returns {string} Style definitions
   */
  generateStyles() {
    return `    %% Styles
    classDef repo fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef event fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef database fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef cache fill:#fce4ec,stroke:#880e4f,stroke-width:2px
\n`;
  }

  /**
   * Sanitize string for use as Mermaid ID
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized ID
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
   * @param {string} str - String to escape
   * @returns {string} Escaped label
   */
  escapeLabel(str) {
    return str
      .replace(/"/g, "'")
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .replace(/>/g, ')')
      .replace(/</g, '(')
      .replace(/\{/g, '(')
      .replace(/\}/g, ')')
      .replace(/@/g, '')
      .replace(/\//g, '-')
      .replace(/-/g, '_')
      .replace(/\./g, '_');
  }
}

module.exports = { FlowDiagramGenerator };
