/**
 * Service Interaction Diagram Generator
 * Generate detailed service interaction diagrams (sequence, component, deployment, ER)
 */

/**
 * Simple YAML parser for docker-compose files
 * Handles the subset of YAML needed for docker-compose parsing
 * @param {string} yamlContent - YAML content to parse
 * @returns {Object} Parsed object
 */
function parseSimpleYaml(yamlContent) {
  if (!yamlContent || yamlContent.trim() === '') {
    return null;
  }

  const result = {};
  const lines = yamlContent.split('\n');

  // Stack stores the context at each indentation level
  // { container, key, indent } where container[key] is the current object/array
  const stack = [{ container: { root: result }, key: 'root', indent: -2 }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Calculate indentation
    const indent = line.search(/\S/);
    if (indent === -1) continue;

    // Pop stack until we find the parent at the right level
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];
    const parent = current.container[current.key];

    // Handle array items (- value)
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim();

      // Convert parent to array if it's currently an empty object
      if (typeof parent === 'object' && !Array.isArray(parent) && Object.keys(parent).length === 0) {
        current.container[current.key] = [];
      }

      const arr = current.container[current.key];
      if (Array.isArray(arr)) {
        // Handle "key: value" inside array item (but not port mappings like "80:80")
        if (value.includes(':') && !value.match(/^["']?[\d.]+:[\d.]+["']?$/)) {
          const colonIdx = value.indexOf(':');
          const objKey = value.slice(0, colonIdx).trim();
          const objVal = value.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
          const obj = {};
          obj[objKey] = objVal;
          arr.push(obj);
        } else {
          arr.push(value.replace(/^["']|["']$/g, ''));
        }
      }
      continue;
    }

    // Handle key-value pairs
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    if (value === '' || value === '|' || value === '>') {
      // Nested object (or array, we'll convert if we see '-')
      parent[key] = {};
      stack.push({ container: parent, key: key, indent: indent });
    } else if (value.startsWith('[') && value.endsWith(']')) {
      // Inline array
      const arrayContent = value.slice(1, -1);
      if (arrayContent.trim() === '') {
        parent[key] = [];
      } else {
        parent[key] = arrayContent.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      }
    } else {
      // Simple value
      value = value.replace(/^["']|["']$/g, '');
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (/^\d+$/.test(value)) value = parseInt(value, 10);
      parent[key] = value;
    }
  }

  return result;
}

/**
 * ServiceInteractionDiagram class for generating various Mermaid diagrams
 */
class ServiceInteractionDiagram {
  /**
   * Create a ServiceInteractionDiagram instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      direction: options.direction || 'TB',
      groupByLayer: options.groupByLayer || false,
      showPorts: options.showPorts !== false,
      ...options,
    };
  }

  /**
   * Generate a sequence diagram from API flow
   * @param {Object} apiFlow - API flow definition
   * @returns {string} Mermaid sequence diagram
   */
  generateSequenceDiagram(apiFlow) {
    if (!apiFlow.steps || apiFlow.steps.length === 0) {
      return 'sequenceDiagram\n    Note over Client: No interactions defined';
    }

    let mermaid = 'sequenceDiagram\n';

    // Add title if provided
    if (apiFlow.name) {
      mermaid += `    title ${this.escapeLabel(apiFlow.name)}\n`;
    }

    // Collect all participants
    const participants = new Set();
    for (const step of apiFlow.steps) {
      participants.add(step.from);
      participants.add(step.to);
    }

    // Declare participants
    for (const participant of participants) {
      const sanitized = this.escapeLabel(participant);
      mermaid += `    participant ${this.sanitizeId(participant)} as ${sanitized}\n`;
    }

    mermaid += '\n';

    // Generate steps
    for (const step of apiFlow.steps) {
      const fromId = this.sanitizeId(step.from);
      const toId = this.sanitizeId(step.to);
      const action = this.escapeLabel(step.action);

      let arrow;
      switch (step.type) {
        case 'response':
          arrow = '-->>';
          break;
        case 'async':
        case 'event':
          arrow = '-)'
          break;
        case 'query':
        case 'call':
        case 'request':
        default:
          arrow = '->>';
          break;
      }

      mermaid += `    ${fromId}${arrow}${toId}: ${action}\n`;

      // Add note if provided
      if (step.note) {
        mermaid += `    Note right of ${toId}: ${this.escapeLabel(step.note)}\n`;
      }
    }

    return mermaid;
  }

  /**
   * Generate a component diagram showing service boundaries
   * @param {Object} services - Services configuration
   * @returns {string} Mermaid flowchart diagram
   */
  generateComponentDiagram(services) {
    let mermaid = `flowchart ${this.options.direction}\n`;

    if (!services.components || services.components.length === 0) {
      mermaid += '    empty[No components defined]\n';
      return mermaid;
    }

    // Add styles
    mermaid += this.generateComponentStyles();

    // Group by layer if enabled
    if (this.options.groupByLayer) {
      const layers = this.groupByLayer(services.components);
      for (const [layerName, components] of Object.entries(layers)) {
        mermaid += `\n    subgraph ${layerName}["${this.capitalizeFirst(layerName)} Layer"]\n`;
        for (const component of components) {
          mermaid += this.generateComponentNode(component, '        ');
        }
        mermaid += '    end\n';
      }
    } else {
      // Flat list of components
      mermaid += '\n    %% Components\n';
      for (const component of services.components) {
        mermaid += this.generateComponentNode(component, '    ');
      }
    }

    // Generate connections
    if (services.connections && services.connections.length > 0) {
      mermaid += '\n    %% Connections\n';
      for (const conn of services.connections) {
        const fromId = this.sanitizeId(conn.from);
        const toId = this.sanitizeId(conn.to);
        const label = conn.protocol || conn.type || '';
        mermaid += `    ${fromId} -->|${label}| ${toId}\n`;
      }
    }

    return mermaid;
  }

  /**
   * Generate a component node with appropriate shape
   * @param {Object} component - Component definition
   * @param {string} indent - Indentation
   * @returns {string} Mermaid node definition
   */
  generateComponentNode(component, indent = '    ') {
    const id = this.sanitizeId(component.name);
    const label = this.sanitizeLabel(component.name);
    let shape;

    switch (component.type) {
      case 'gateway':
        shape = `{{${label}}}`;
        break;
      case 'database':
        shape = `[(${label})]`;
        break;
      case 'cache':
        shape = `([${label}])`;
        break;
      case 'queue':
        shape = `>/${label}/]`;
        break;
      case 'service':
      default:
        shape = `[${label}]`;
        break;
    }

    let node = `${indent}${id}${shape}`;

    // Add class for styling
    if (component.type) {
      node += `:::${component.type}`;
    }
    node += '\n';

    return node;
  }

  /**
   * Group components by layer
   * @param {Array} components - Components array
   * @returns {Object} Grouped components
   */
  groupByLayer(components) {
    const layers = {};
    for (const component of components) {
      const layer = component.layer || 'default';
      if (!layers[layer]) {
        layers[layer] = [];
      }
      layers[layer].push(component);
    }
    return layers;
  }

  /**
   * Generate deployment diagram from docker-compose YAML
   * @param {string} dockerCompose - Docker-compose YAML content
   * @returns {string} Mermaid flowchart diagram
   */
  generateDeploymentDiagram(dockerCompose) {
    let mermaid = `flowchart ${this.options.direction}\n`;

    if (!dockerCompose || dockerCompose.trim() === '') {
      mermaid += '    empty[No infrastructure configuration found]\n';
      return mermaid;
    }

    let config;
    try {
      config = parseSimpleYaml(dockerCompose);
    } catch (e) {
      // Invalid YAML, return minimal diagram
      mermaid += '    error[Invalid infrastructure configuration]\n';
      return mermaid;
    }

    if (!config || !config.services) {
      mermaid += '    empty[No infrastructure configuration found]\n';
      return mermaid;
    }

    // Add styles
    mermaid += this.generateDeploymentStyles();

    // Parse services
    const services = config.services || {};
    const volumes = config.volumes || {};
    const networks = config.networks || {};

    // Generate network subgraphs
    if (Object.keys(networks).length > 0) {
      for (const [networkName, _networkConfig] of Object.entries(networks)) {
        const servicesInNetwork = [];
        for (const [serviceName, serviceConfig] of Object.entries(services)) {
          if (serviceConfig.networks && serviceConfig.networks.includes(networkName)) {
            servicesInNetwork.push(serviceName);
          }
        }
        if (servicesInNetwork.length > 0) {
          mermaid += `\n    subgraph ${this.sanitizeId(networkName)}["Network: ${networkName}"]\n`;
          for (const svc of servicesInNetwork) {
            mermaid += `        ${this.sanitizeId(svc)}_net[${svc}]\n`;
          }
          mermaid += '    end\n';
        }
      }
    }

    // Generate service nodes
    mermaid += '\n    %% Services\n';
    for (const [name, serviceConfig] of Object.entries(services)) {
      const id = this.sanitizeId(name);
      const image = serviceConfig.image || 'custom';
      let label = `${name}`;

      // Add port info
      if (serviceConfig.ports && serviceConfig.ports.length > 0) {
        const ports = serviceConfig.ports.map(p => {
          if (typeof p === 'string') {
            return p.split(':')[0];
          }
          return p.published || p;
        });
        label += `<br/>Ports: ${ports.join(', ')}`;
      }

      mermaid += `    ${id}["${label}"]:::service\n`;
    }

    // Generate volume nodes
    if (Object.keys(volumes).length > 0) {
      mermaid += '\n    %% Volumes\n';
      for (const volumeName of Object.keys(volumes)) {
        const id = this.sanitizeId(`vol_${volumeName}`);
        mermaid += `    ${id}[("${volumeName}")]:::volume\n`;
      }
    }

    // Generate dependencies (depends_on)
    mermaid += '\n    %% Dependencies\n';
    for (const [name, serviceConfig] of Object.entries(services)) {
      const id = this.sanitizeId(name);
      if (serviceConfig.depends_on) {
        const deps = Array.isArray(serviceConfig.depends_on)
          ? serviceConfig.depends_on
          : Object.keys(serviceConfig.depends_on);
        for (const dep of deps) {
          const depId = this.sanitizeId(dep);
          mermaid += `    ${id} -->|depends_on| ${depId}\n`;
        }
      }
    }

    // Generate volume mounts
    for (const [name, serviceConfig] of Object.entries(services)) {
      const id = this.sanitizeId(name);
      if (serviceConfig.volumes) {
        for (const vol of serviceConfig.volumes) {
          const volName = typeof vol === 'string' ? vol.split(':')[0] : vol.source;
          if (volumes[volName]) {
            const volId = this.sanitizeId(`vol_${volName}`);
            mermaid += `    ${id} -.->|mounts| ${volId}\n`;
          }
        }
      }
    }

    return mermaid;
  }

  /**
   * Generate ER diagram from schema definitions
   * @param {Array} schemas - Array of parsed schema models
   * @returns {string} Mermaid ER diagram
   */
  generateERDiagram(schemas) {
    if (!schemas || schemas.length === 0) {
      return 'erDiagram\n    EMPTY["No entities defined"]';
    }

    let mermaid = 'erDiagram\n';

    // Build table name lookup for relationship inference
    const tableNames = new Set(schemas.map(s => s.tableName));

    // Track relationships to avoid duplicates
    const relationships = new Set();

    // Generate entities
    for (const schema of schemas) {
      const tableName = this.sanitizeId(schema.tableName);
      mermaid += `    ${tableName} {\n`;

      for (const column of schema.columns) {
        const type = column.type || 'unknown';
        let markers = '';

        if (column.primary) {
          markers = 'PK';
        } else if (column.foreignKey) {
          markers = 'FK';
        } else if (column.unique) {
          markers = 'UK';
        }

        const markerStr = markers ? ` "${markers}"` : '';
        mermaid += `        ${type} ${column.name}${markerStr}\n`;

        // Track explicit foreign keys
        if (column.foreignKey) {
          const refTable = this.sanitizeId(column.foreignKey.table);
          const rel = `${refTable} ||--o{ ${tableName}`;
          if (!relationships.has(rel)) {
            relationships.add(rel);
          }
        }

        // Infer relationships from naming conventions (e.g., user_id -> users)
        if (!column.foreignKey && column.name.endsWith('_id')) {
          const inferredTable = column.name.slice(0, -3) + 's'; // user_id -> users
          if (tableNames.has(inferredTable)) {
            const refTable = this.sanitizeId(inferredTable);
            const rel = `${refTable} ||--o{ ${tableName}`;
            if (!relationships.has(rel)) {
              relationships.add(rel);
            }
          }
        }
      }

      mermaid += '    }\n';
    }

    // Add relationships
    if (relationships.size > 0) {
      mermaid += '\n';
      for (const rel of relationships) {
        mermaid += `    ${rel} : has\n`;
      }
    }

    return mermaid;
  }

  /**
   * Extract API flow from route handler code
   * @param {string} handlerName - Name of the handler
   * @param {string} code - Handler code
   * @returns {Object} Extracted API flow
   */
  extractAPIFlow(handlerName, code) {
    const flow = {
      name: handlerName,
      steps: [],
    };

    // Find await calls to extract service interactions
    const awaitPattern = /await\s+(\w+)\.(\w+)\s*\([^)]*\)/g;
    let match;
    let stepOrder = 0;

    while ((match = awaitPattern.exec(code)) !== null) {
      const [fullMatch, service, method] = match;
      stepOrder++;

      flow.steps.push({
        from: handlerName,
        to: service,
        action: `${service}.${method}()`,
        type: this.inferStepType(service, method),
        order: stepOrder,
      });
    }

    // Detect response patterns
    const responsePattern = /return\s+res\.status\((\d+)\)\.json/;
    const responseMatch = code.match(responsePattern);
    if (responseMatch) {
      flow.steps.push({
        from: handlerName,
        to: 'Client',
        action: `${responseMatch[1]} Response`,
        type: 'response',
        order: stepOrder + 1,
      });
    }

    return flow;
  }

  /**
   * Infer step type from service and method names
   * @param {string} service - Service name
   * @param {string} method - Method name
   * @returns {string} Step type
   */
  inferStepType(service, method) {
    const serviceLower = service.toLowerCase();
    const methodLower = method.toLowerCase();

    if (serviceLower.includes('repository') || serviceLower.includes('db') ||
        methodLower.includes('find') || methodLower.includes('create') ||
        methodLower.includes('update') || methodLower.includes('delete')) {
      return 'query';
    }

    if (serviceLower.includes('event') || serviceLower.includes('bus') ||
        methodLower.includes('publish') || methodLower.includes('emit')) {
      return 'event';
    }

    if (serviceLower.includes('cache') || serviceLower.includes('redis')) {
      return 'cache';
    }

    return 'call';
  }

  /**
   * Generate a combined workspace diagram
   * @param {Object} workspace - Workspace configuration
   * @returns {string} Mermaid flowchart diagram
   */
  generateWorkspaceDiagram(workspace) {
    let mermaid = `flowchart ${this.options.direction}\n`;

    // Add styles
    mermaid += this.generateWorkspaceStyles();

    // Generate service nodes
    if (workspace.services && workspace.services.length > 0) {
      mermaid += '\n    %% Services\n';
      for (const service of workspace.services) {
        const id = this.sanitizeId(service.name);
        const shape = service.type === 'gateway' ? `{{${service.name}}}` : `[${service.name}]`;
        mermaid += `    ${id}${shape}:::service\n`;
      }
    }

    // Generate database nodes
    if (workspace.databases && workspace.databases.length > 0) {
      mermaid += '\n    %% Databases\n';
      for (const db of workspace.databases) {
        const id = this.sanitizeId(db.name);
        mermaid += `    ${id}[(${db.name})]:::database\n`;
      }
    }

    // Generate queue nodes
    if (workspace.queues && workspace.queues.length > 0) {
      mermaid += '\n    %% Message Queues\n';
      for (const queue of workspace.queues) {
        const id = this.sanitizeId(queue.name);
        mermaid += `    ${id}([${queue.name}]):::queue\n`;
      }
    }

    // Generate connections
    if (workspace.connections && workspace.connections.length > 0) {
      mermaid += '\n    %% Connections\n';
      for (const conn of workspace.connections) {
        const fromId = this.sanitizeId(conn.from);
        const toId = this.sanitizeId(conn.to);
        const label = conn.type || '';
        mermaid += `    ${fromId} -->|${label}| ${toId}\n`;
      }
    }

    return mermaid;
  }

  /**
   * Generate component diagram styles
   * @returns {string} Style definitions
   */
  generateComponentStyles() {
    return `    %% Styles
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef database fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef cache fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef queue fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
\n`;
  }

  /**
   * Generate deployment diagram styles
   * @returns {string} Style definitions
   */
  generateDeploymentStyles() {
    return `    %% Styles
    classDef service fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef volume fill:#f5f5f5,stroke:#616161,stroke-width:2px,stroke-dasharray: 5 5
\n`;
  }

  /**
   * Generate workspace diagram styles
   * @returns {string} Style definitions
   */
  generateWorkspaceStyles() {
    return `    %% Styles
    classDef service fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef database fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef queue fill:#fff3e0,stroke:#e65100,stroke-width:2px
\n`;
  }

  /**
   * Sanitize string for use as Mermaid ID
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized ID
   */
  sanitizeId(str) {
    return str
      .replace(/@/g, '')
      .replace(/\//g, '_')
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
      .replace(/\}/g, ')');
  }

  /**
   * Escape and sanitize label for component names (more aggressive than escapeLabel)
   * @param {string} str - String to escape
   * @returns {string} Escaped label
   */
  sanitizeLabel(str) {
    return this.escapeLabel(str)
      .replace(/@/g, '')
      .replace(/\//g, '_')
      .replace(/-/g, '_')
      .replace(/\./g, '_');
  }

  /**
   * Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = { ServiceInteractionDiagram };
