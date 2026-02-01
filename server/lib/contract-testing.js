/**
 * Contract Testing Module
 * Generates Pact-style contract tests for microservice communication
 */

/**
 * Default contract testing options
 */
const DEFAULT_OPTIONS = {
  broker: 'local',
  contractsDir: 'contracts/',
  pactVersion: '4',
};

/**
 * ContractTesting class for generating contract test infrastructure
 */
class ContractTesting {
  /**
   * Create a ContractTesting instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate complete contract testing setup
   * @param {Object} config - Generation config
   * @param {string[]} config.services - List of service names
   * @param {string} config.broker - Broker mode ('local' or 'pactflow')
   * @param {Object[]} config.relations - Consumer-provider relationships
   * @returns {Object} Generated files
   */
  generate(config) {
    const { services = [], broker = this.options.broker, relations } = config;
    const files = [];

    if (services.length === 0) {
      return { files };
    }

    // Generate relations if not provided
    const serviceRelations = relations || this._inferRelations(services);

    // Generate consumer tests for each relation
    for (const relation of serviceRelations) {
      const consumerTest = generateConsumerTest(relation.consumer, relation.provider);
      files.push({
        name: `${relation.consumer}-${relation.provider}.consumer.test.js`,
        type: 'consumer-test',
        content: consumerTest.content,
      });
    }

    // Generate provider tests for each unique provider
    const providers = [...new Set(serviceRelations.map(r => r.provider))];
    for (const provider of providers) {
      const providerTest = generateProviderTest(provider, { broker });
      files.push({
        name: `${provider}.provider.test.js`,
        type: 'provider-test',
        content: providerTest.content,
      });
    }

    // If only standalone services, generate provider tests anyway
    if (serviceRelations.length === 0) {
      for (const service of services) {
        const providerTest = generateProviderTest(service, { broker });
        files.push({
          name: `${service}.provider.test.js`,
          type: 'provider-test',
          content: providerTest.content,
        });
      }
    }

    // Generate broker config
    const brokerConfig = generateBrokerConfig(broker);
    files.push({
      name: 'pact.config.js',
      type: 'broker-config',
      content: brokerConfig.config,
    });

    // Generate CI workflow
    const ciWorkflow = generateCiWorkflow();
    files.push({
      name: 'contract-tests.yml',
      type: 'ci-workflow',
      content: JSON.stringify(ciWorkflow, null, 2),
    });

    return { files };
  }

  /**
   * Infer relations from services (assume all-to-all for simplicity)
   * @param {string[]} services - Service names
   * @returns {Object[]} Relations
   * @private
   */
  _inferRelations(services) {
    if (services.length < 2) {
      return [];
    }

    // Simple: first service is consumer, rest are providers
    const relations = [];
    for (let i = 0; i < services.length; i++) {
      for (let j = i + 1; j < services.length; j++) {
        relations.push({
          consumer: services[i],
          provider: services[j],
        });
      }
    }
    return relations;
  }
}

/**
 * Generate consumer contract test template
 * @param {string} consumer - Consumer service name
 * @param {string} provider - Provider service name
 * @returns {Object} Generated test file
 */
function generateConsumerTest(consumer, provider) {
  const content = `/**
 * Consumer Contract Test: ${consumer} -> ${provider}
 * Defines expected interactions from ${consumer}'s perspective
 */

const { Pact, Matchers } = require('@pact-foundation/pact');
const path = require('path');
const { expect } = require('chai');

const { like, eachLike, term } = Matchers;

describe('${consumer} -> ${provider} contract', () => {
  const mockProvider = new Pact({
    consumer: '${consumer}',
    provider: '${provider}',
    port: 0, // Random available port
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });

  beforeAll(() => mockProvider.setup());
  afterAll(() => mockProvider.finalize());
  afterEach(() => mockProvider.verify());

  describe('when requesting data from ${provider}', () => {
    it('should return expected response', async () => {
      // Define the interaction
      const interaction = {
        state: '${provider} has data',
        uponReceiving: 'a request for data from ${consumer}',
        withRequest: {
          method: 'GET',
          path: '/api/data',
          headers: {
            Accept: 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: like({
            id: 1,
            name: 'example',
          }),
        },
      };

      await mockProvider.addInteraction(interaction);

      // Make the actual request to the mock provider
      const response = await fetch(\`\${mockProvider.mockService.baseUrl}/api/data\`, {
        headers: { Accept: 'application/json' },
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data).to.have.property('id');
      expect(data).to.have.property('name');
    });
  });

  // After all tests pass, write the contract file
  afterAll(async () => {
    await writeContract(mockProvider);
  });
});

/**
 * Write contract to pacts directory
 * @param {Object} provider - Pact provider instance
 */
async function writeContract(provider) {
  try {
    await provider.writePact();
    console.log('Contract written to pacts directory');
  } catch (error) {
    console.error('Failed to write contract:', error.message);
    throw error;
  }
}
`;

  return {
    name: `${consumer}-${provider}.consumer.test.js`,
    content,
  };
}

/**
 * Generate provider verification test template
 * @param {string} provider - Provider service name
 * @param {Object} options - Test options
 * @param {string} options.broker - Broker mode
 * @returns {Object} Generated test file
 */
function generateProviderTest(provider, options = {}) {
  const { broker = 'local' } = options;

  const contractSource = broker === 'pactflow'
    ? `// Load contracts from pactflow broker
    pactBrokerUrl: process.env.PACT_BROKER_URL,
    pactBrokerToken: process.env.PACT_BROKER_TOKEN,
    providerVersionBranch: process.env.GIT_BRANCH || 'main',`
    : `// Load contracts from local contracts/ directory
    pactUrls: loadContracts('contracts/', '${provider}'),`;

  const content = `/**
 * Provider Verification Test: ${provider}
 * Verifies that ${provider} implements all consumer contracts
 */

const { Verifier } = require('@pact-foundation/pact');
const path = require('path');
const fs = require('fs');

/**
 * Load contracts from local directory
 * @param {string} dir - Contracts directory
 * @param {string} provider - Provider name
 * @returns {string[]} Contract file paths
 */
function loadContracts(dir, provider) {
  const contractsPath = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(contractsPath)) {
    console.warn(\`Contracts directory not found: \${contractsPath}\`);
    return [];
  }

  return fs.readdirSync(contractsPath)
    .filter(file => file.includes(\`-\${provider}.json\`) || file.includes(\`\${provider}-\`))
    .map(file => path.join(contractsPath, file));
}

describe('${provider} provider verification', () => {
  let server;

  beforeAll(async () => {
    // Start the provider service
    // Replace with your actual server startup
    server = await startServer();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  it('should fulfill all consumer contracts', async () => {
    const opts = {
      provider: '${provider}',
      providerBaseUrl: \`http://localhost:\${server.port}\`,
      ${contractSource}
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_SHA || '1.0.0',
      stateHandlers: {
        '${provider} has data': async () => {
          // Set up provider state
          // e.g., seed database, configure mock
          return { description: 'Provider state set up' };
        },
      },
    };

    try {
      const result = await new Verifier(opts).verifyProvider();
      console.log('Provider verification successful:', result);
    } catch (error) {
      // Check for missing endpoint errors
      if (error.message && error.message.includes('missing')) {
        console.error('Missing endpoint detected - provider does not implement contract');
        fail('Provider verification failed: missing endpoint');
      }
      throw error;
    }
  });
});

/**
 * Start the provider server for testing
 * @returns {Object} Server instance with port and close method
 */
async function startServer() {
  // Replace with your actual server implementation
  const app = require('../app'); // or your server entry point

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      resolve({
        port,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}
`;

  return {
    name: `${provider}.provider.test.js`,
    content,
  };
}

/**
 * Generate broker configuration
 * @param {string} mode - Broker mode ('local' or 'pactflow')
 * @returns {Object} Broker configuration
 */
function generateBrokerConfig(mode = 'local') {
  if (mode === 'pactflow') {
    const config = `/**
 * Pact Broker Configuration (Pactflow)
 */

module.exports = {
  broker: {
    url: process.env.PACT_BROKER_URL || 'https://your-broker.pactflow.io',
    token: process.env.PACT_BROKER_TOKEN,
  },
  publish: {
    providerVersion: process.env.GIT_SHA,
    providerVersionBranch: process.env.GIT_BRANCH,
    tags: [process.env.GIT_BRANCH],
  },
};
`;

    const publishScript = `#!/bin/bash
# Publish contracts to Pactflow broker
npx pact-broker publish pacts/ \\
  --broker-base-url=\${PACT_BROKER_URL} \\
  --broker-token=\${PACT_BROKER_TOKEN} \\
  --consumer-app-version=\${GIT_SHA} \\
  --branch=\${GIT_BRANCH}
`;

    const fetchScript = `#!/bin/bash
# Fetch contracts from Pactflow broker
npx pact-broker can-i-deploy \\
  --pacticipant=\${SERVICE_NAME} \\
  --version=\${GIT_SHA} \\
  --to-environment=production \\
  --broker-base-url=\${PACT_BROKER_URL} \\
  --broker-token=\${PACT_BROKER_TOKEN}
`;

    return {
      mode: 'pactflow',
      contractsDir: 'pacts/',
      config,
      publishScript,
      fetchScript,
    };
  }

  // Local mode
  const config = `/**
 * Pact Configuration (Local)
 */

const path = require('path');

module.exports = {
  contractsDir: path.resolve(__dirname, 'contracts/'),
  logsDir: path.resolve(__dirname, 'logs/'),
  pactfileWriteMode: 'merge',
};
`;

  const publishScript = `#!/bin/bash
# Publish contracts locally (copy to shared location)
mkdir -p contracts/
cp pacts/*.json contracts/
echo "Contracts published to contracts/"
`;

  const fetchScript = `#!/bin/bash
# Fetch contracts from local directory
ls contracts/*.json 2>/dev/null || echo "No contracts found"
`;

  return {
    mode: 'local',
    contractsDir: 'contracts/',
    config,
    publishScript,
    fetchScript,
  };
}

/**
 * Generate CI workflow for contract testing
 * @param {Object} options - Workflow options
 * @returns {Object} GitHub Actions workflow configuration
 */
function generateCiWorkflow(options = {}) {
  const {
    name = 'Contract Tests',
    branches = ['main', 'master'],
  } = options;

  return {
    name,
    on: {
      pull_request: {
        branches,
      },
      push: {
        branches,
      },
    },
    jobs: {
      contract_tests: {
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout code',
            uses: 'actions/checkout@v4',
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '20',
              cache: 'npm',
            },
          },
          {
            name: 'Install dependencies',
            run: 'npm ci',
          },
          {
            name: 'Run consumer contract tests',
            run: 'npm run test:contracts:consumer',
          },
          {
            name: 'Run provider verification tests',
            run: 'npm run test:contracts:provider',
          },
          {
            name: 'Upload contract artifacts',
            uses: 'actions/upload-artifact@v4',
            with: {
              name: 'pact-contracts',
              path: 'pacts/',
            },
          },
        ],
      },
    },
  };
}

/**
 * Generate contract definitions from OpenAPI specification
 * @param {Object} spec - OpenAPI specification object
 * @returns {Object} Extracted endpoints and contracts
 */
function generateFromOpenApi(spec) {
  const endpoints = [];
  const contracts = [];

  if (!spec || !spec.paths) {
    return { endpoints, contracts };
  }

  const methods = ['get', 'post', 'put', 'patch', 'delete'];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of methods) {
      if (!pathItem[method]) continue;

      const operation = pathItem[method];

      // Extract endpoint info
      const endpoint = {
        path,
        method: method.toUpperCase(),
        operationId: operation.operationId || `${method}${path.replace(/\//g, '_')}`,
        summary: operation.summary || '',
        responses: {},
        requestBody: null,
      };

      // Extract responses
      if (operation.responses) {
        for (const [status, response] of Object.entries(operation.responses)) {
          endpoint.responses[status] = {
            description: response.description || '',
            schema: extractSchema(response),
          };
        }
      }

      // Extract request body
      if (operation.requestBody) {
        endpoint.requestBody = extractRequestBody(operation.requestBody);
      }

      endpoints.push(endpoint);

      // Generate contract for this endpoint
      contracts.push(generateContractFromEndpoint(endpoint));
    }
  }

  return { endpoints, contracts };
}

/**
 * Extract schema from response object
 * @param {Object} response - OpenAPI response object
 * @returns {Object|null} Schema object
 */
function extractSchema(response) {
  if (!response.content) return null;

  const jsonContent = response.content['application/json'];
  if (!jsonContent) return null;

  return jsonContent.schema || null;
}

/**
 * Extract request body schema
 * @param {Object} requestBody - OpenAPI request body object
 * @returns {Object} Request body info
 */
function extractRequestBody(requestBody) {
  if (!requestBody.content) {
    return { schema: null };
  }

  const jsonContent = requestBody.content['application/json'];
  if (!jsonContent) {
    return { schema: null };
  }

  return {
    required: requestBody.required || false,
    schema: jsonContent.schema || null,
  };
}

/**
 * Generate contract expectation from endpoint
 * @param {Object} endpoint - Endpoint definition
 * @returns {Object} Contract expectation
 */
function generateContractFromEndpoint(endpoint) {
  return {
    description: `${endpoint.method} ${endpoint.path}`,
    request: {
      method: endpoint.method,
      path: endpoint.path,
      body: endpoint.requestBody?.schema || undefined,
    },
    response: {
      status: Object.keys(endpoint.responses)[0] || '200',
      body: endpoint.responses['200']?.schema || undefined,
    },
  };
}

/**
 * Create a ContractTesting factory instance
 * @param {Object} options - Configuration options
 * @returns {Object} Factory with methods
 */
function createContractTesting(options = {}) {
  const instance = new ContractTesting(options);

  return {
    generate: (config) => instance.generate(config),
    generateConsumerTest: (consumer, provider) => generateConsumerTest(consumer, provider),
    generateProviderTest: (provider, opts) => generateProviderTest(provider, { ...options, ...opts }),
    generateBrokerConfig: (mode) => generateBrokerConfig(mode || options.broker || 'local'),
    generateCiWorkflow: (opts) => generateCiWorkflow({ ...options, ...opts }),
    generateFromOpenApi: (spec) => generateFromOpenApi(spec),
  };
}

module.exports = {
  ContractTesting,
  DEFAULT_OPTIONS,
  generateConsumerTest,
  generateProviderTest,
  generateBrokerConfig,
  generateCiWorkflow,
  generateFromOpenApi,
  createContractTesting,
};
