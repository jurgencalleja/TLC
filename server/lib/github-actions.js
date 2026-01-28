/**
 * GitHub Actions Module
 * Generates GitHub Actions workflow templates for CI/CD
 */

/**
 * Default test commands by language/framework
 */
const TEST_COMMANDS = {
  node: {
    install: 'npm ci',
    test: 'npm test',
    coverage: 'npm run test:coverage',
    lint: 'npm run lint',
  },
  pnpm: {
    install: 'pnpm install --frozen-lockfile',
    test: 'pnpm test',
    coverage: 'pnpm run test:coverage',
    lint: 'pnpm run lint',
  },
  yarn: {
    install: 'yarn install --frozen-lockfile',
    test: 'yarn test',
    coverage: 'yarn test:coverage',
    lint: 'yarn lint',
  },
  python: {
    install: 'pip install -r requirements.txt',
    test: 'pytest',
    coverage: 'pytest --cov',
    lint: 'ruff check .',
  },
  go: {
    install: 'go mod download',
    test: 'go test ./...',
    coverage: 'go test -coverprofile=coverage.out ./...',
    lint: 'golangci-lint run',
  },
};

/**
 * Node version matrix options
 */
const NODE_VERSIONS = ['18', '20', '22'];

/**
 * Detect package manager from project
 * @param {Object} files - Files in project
 * @returns {string} Package manager
 */
function detectPackageManager(files = {}) {
  if (files['pnpm-lock.yaml']) return 'pnpm';
  if (files['yarn.lock']) return 'yarn';
  if (files['package-lock.json']) return 'node';
  if (files['requirements.txt'] || files['pyproject.toml']) return 'python';
  if (files['go.mod']) return 'go';
  return 'node';
}

/**
 * Generate checkout step
 * @returns {Object} Checkout step
 */
function generateCheckoutStep() {
  return {
    name: 'Checkout code',
    uses: 'actions/checkout@v4',
  };
}

/**
 * Generate Node.js setup step
 * @param {string} version - Node version
 * @param {string} packageManager - Package manager
 * @returns {Object} Setup step
 */
function generateNodeSetupStep(version = '20', packageManager = 'node') {
  const step = {
    name: 'Setup Node.js',
    uses: 'actions/setup-node@v4',
    with: {
      'node-version': version,
    },
  };

  if (packageManager === 'pnpm') {
    step.with.cache = 'pnpm';
  } else if (packageManager === 'yarn') {
    step.with.cache = 'yarn';
  } else {
    step.with.cache = 'npm';
  }

  return step;
}

/**
 * Generate pnpm setup step
 * @returns {Object} PNPM setup step
 */
function generatePnpmSetupStep() {
  return {
    name: 'Setup pnpm',
    uses: 'pnpm/action-setup@v2',
    with: {
      version: 8,
    },
  };
}

/**
 * Generate Python setup step
 * @param {string} version - Python version
 * @returns {Object} Setup step
 */
function generatePythonSetupStep(version = '3.11') {
  return {
    name: 'Setup Python',
    uses: 'actions/setup-python@v5',
    with: {
      'python-version': version,
      cache: 'pip',
    },
  };
}

/**
 * Generate Go setup step
 * @param {string} version - Go version
 * @returns {Object} Setup step
 */
function generateGoSetupStep(version = '1.21') {
  return {
    name: 'Setup Go',
    uses: 'actions/setup-go@v5',
    with: {
      'go-version': version,
    },
  };
}

/**
 * Generate install dependencies step
 * @param {string} packageManager - Package manager
 * @returns {Object} Install step
 */
function generateInstallStep(packageManager = 'node') {
  const commands = TEST_COMMANDS[packageManager] || TEST_COMMANDS.node;
  return {
    name: 'Install dependencies',
    run: commands.install,
  };
}

/**
 * Generate test step
 * @param {string} packageManager - Package manager
 * @param {boolean} withCoverage - Include coverage
 * @returns {Object} Test step
 */
function generateTestStep(packageManager = 'node', withCoverage = false) {
  const commands = TEST_COMMANDS[packageManager] || TEST_COMMANDS.node;
  return {
    name: withCoverage ? 'Run tests with coverage' : 'Run tests',
    run: withCoverage ? commands.coverage : commands.test,
  };
}

/**
 * Generate lint step
 * @param {string} packageManager - Package manager
 * @returns {Object} Lint step
 */
function generateLintStep(packageManager = 'node') {
  const commands = TEST_COMMANDS[packageManager] || TEST_COMMANDS.node;
  return {
    name: 'Lint code',
    run: commands.lint,
  };
}

/**
 * Generate coverage upload step
 * @param {Object} options - Upload options
 * @returns {Object} Upload step
 */
function generateCoverageUploadStep(options = {}) {
  const { service = 'codecov' } = options;

  if (service === 'codecov') {
    return {
      name: 'Upload coverage to Codecov',
      uses: 'codecov/codecov-action@v4',
      with: {
        fail_ci_if_error: true,
      },
    };
  }

  return {
    name: 'Upload coverage',
    uses: 'actions/upload-artifact@v4',
    with: {
      name: 'coverage',
      path: 'coverage/',
    },
  };
}

/**
 * Generate PR comment step
 * @param {string} message - Comment message
 * @returns {Object} Comment step
 */
function generatePRCommentStep(message) {
  return {
    name: 'Comment on PR',
    if: "github.event_name == 'pull_request'",
    uses: 'actions/github-script@v7',
    with: {
      script: `
github.rest.issues.createComment({
  issue_number: context.issue.number,
  owner: context.repo.owner,
  repo: context.repo.repo,
  body: \`${message}\`
})
`.trim(),
    },
  };
}

/**
 * Generate coverage threshold check step
 * @param {number} threshold - Coverage threshold percentage
 * @returns {Object} Threshold check step
 */
function generateCoverageThresholdStep(threshold = 80) {
  return {
    name: 'Check coverage threshold',
    run: `
# Extract coverage percentage and check threshold
COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
echo "Coverage: $COVERAGE%"
if (( $(echo "$COVERAGE < ${threshold}" | bc -l) )); then
  echo "Coverage $COVERAGE% is below threshold of ${threshold}%"
  exit 1
fi
echo "Coverage $COVERAGE% meets threshold of ${threshold}%"
`.trim(),
  };
}

/**
 * Generate test workflow
 * @param {Object} options - Workflow options
 * @returns {Object} Workflow configuration
 */
function generateTestWorkflow(options = {}) {
  const {
    name = 'Tests',
    packageManager = 'node',
    nodeVersions = ['20'],
    branches = ['main', 'master'],
    withCoverage = true,
    coverageThreshold = null,
    withLint = true,
  } = options;

  const steps = [generateCheckoutStep()];

  // Setup steps
  if (packageManager === 'pnpm') {
    steps.push(generatePnpmSetupStep());
  }

  if (['node', 'pnpm', 'yarn'].includes(packageManager)) {
    steps.push(generateNodeSetupStep('${{ matrix.node-version }}', packageManager));
  } else if (packageManager === 'python') {
    steps.push(generatePythonSetupStep());
  } else if (packageManager === 'go') {
    steps.push(generateGoSetupStep());
  }

  // Install
  steps.push(generateInstallStep(packageManager));

  // Lint
  if (withLint) {
    steps.push(generateLintStep(packageManager));
  }

  // Test
  steps.push(generateTestStep(packageManager, withCoverage));

  // Coverage threshold
  if (withCoverage && coverageThreshold) {
    steps.push(generateCoverageThresholdStep(coverageThreshold));
  }

  // Coverage upload
  if (withCoverage) {
    steps.push(generateCoverageUploadStep());
  }

  const workflow = {
    name,
    on: {
      push: {
        branches,
      },
      pull_request: {
        branches,
      },
    },
    jobs: {
      test: {
        'runs-on': 'ubuntu-latest',
        strategy: {
          matrix: {
            'node-version': nodeVersions,
          },
        },
        steps,
      },
    },
  };

  return workflow;
}

/**
 * Generate PR workflow with test report
 * @param {Object} options - Workflow options
 * @returns {Object} Workflow configuration
 */
function generatePRWorkflow(options = {}) {
  const {
    name = 'PR Tests',
    packageManager = 'node',
    withCoverage = true,
    reportToComment = true,
  } = options;

  const steps = [
    generateCheckoutStep(),
  ];

  if (packageManager === 'pnpm') {
    steps.push(generatePnpmSetupStep());
  }

  steps.push(generateNodeSetupStep('20', packageManager));
  steps.push(generateInstallStep(packageManager));
  steps.push(generateTestStep(packageManager, withCoverage));

  if (reportToComment) {
    steps.push({
      name: 'Generate test report',
      id: 'test-report',
      run: `
echo "## Test Results" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "✅ All tests passed" >> $GITHUB_STEP_SUMMARY
`.trim(),
    });
  }

  if (withCoverage) {
    steps.push(generateCoverageUploadStep());
  }

  return {
    name,
    on: {
      pull_request: {
        types: ['opened', 'synchronize', 'reopened'],
      },
    },
    jobs: {
      test: {
        'runs-on': 'ubuntu-latest',
        permissions: {
          contents: 'read',
          'pull-requests': 'write',
        },
        steps,
      },
    },
  };
}

/**
 * Serialize workflow to YAML
 * @param {Object} workflow - Workflow object
 * @returns {string} YAML string
 */
function serializeWorkflow(workflow) {
  return yamlSerialize(workflow, 0);
}

/**
 * Simple YAML serializer for workflows
 * @param {any} value - Value to serialize
 * @param {number} indent - Current indent level
 * @returns {string} YAML string
 */
function yamlSerialize(value, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    // Check if multiline
    if (value.includes('\n')) {
      const lines = value.split('\n');
      return '|\n' + lines.map(l => spaces + '  ' + l).join('\n');
    }

    // Check if needs quoting
    if (value === '' ||
        value.includes(':') ||
        value.includes('#') ||
        value.includes('{') ||
        value.includes('}') ||
        value.includes('[') ||
        value.includes(']') ||
        value.includes('$') ||
        value.startsWith(' ') ||
        value.endsWith(' ') ||
        /^[0-9]/.test(value) ||
        ['true', 'false', 'null', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase())) {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value
      .map(item => {
        const itemStr = yamlSerialize(item, indent + 1);
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          // Object in array - first key on same line as dash
          const lines = itemStr.split('\n');
          return `${spaces}- ${lines[0].trim()}\n${lines.slice(1).join('\n')}`;
        }
        return `${spaces}- ${itemStr}`;
      })
      .join('\n');
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '{}';
    }
    return keys
      .map(key => {
        const val = value[key];
        const keyStr = key.includes('-') || key.includes(':') ? `'${key}'` : key;
        const valStr = yamlSerialize(val, indent + 1);

        if (typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).length > 0) {
          return `${spaces}${keyStr}:\n${valStr}`;
        }
        if (Array.isArray(val) && val.length > 0) {
          return `${spaces}${keyStr}:\n${valStr}`;
        }
        if (typeof val === 'string' && val.includes('\n')) {
          return `${spaces}${keyStr}: ${valStr}`;
        }
        return `${spaces}${keyStr}: ${valStr}`;
      })
      .join('\n');
  }

  return String(value);
}

/**
 * Create GitHub Actions generator
 * @param {Object} options - Generator options
 * @returns {Object} Generator instance
 */
function createGitHubActionsGenerator(options = {}) {
  return {
    detectPackageManager,
    generateTestWorkflow: (opts) => generateTestWorkflow({ ...options, ...opts }),
    generatePRWorkflow: (opts) => generatePRWorkflow({ ...options, ...opts }),
    serializeWorkflow,
    // Individual step generators
    steps: {
      checkout: generateCheckoutStep,
      nodeSetup: generateNodeSetupStep,
      pnpmSetup: generatePnpmSetupStep,
      pythonSetup: generatePythonSetupStep,
      goSetup: generateGoSetupStep,
      install: generateInstallStep,
      test: generateTestStep,
      lint: generateLintStep,
      coverageUpload: generateCoverageUploadStep,
      coverageThreshold: generateCoverageThresholdStep,
      prComment: generatePRCommentStep,
    },
  };
}

module.exports = {
  TEST_COMMANDS,
  NODE_VERSIONS,
  detectPackageManager,
  generateCheckoutStep,
  generateNodeSetupStep,
  generatePnpmSetupStep,
  generatePythonSetupStep,
  generateGoSetupStep,
  generateInstallStep,
  generateTestStep,
  generateLintStep,
  generateCoverageUploadStep,
  generatePRCommentStep,
  generateCoverageThresholdStep,
  generateTestWorkflow,
  generatePRWorkflow,
  serializeWorkflow,
  yamlSerialize,
  createGitHubActionsGenerator,
};
