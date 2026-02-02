/**
 * SSO Command - CLI command for SSO configuration
 *
 * Features:
 * - List configured providers
 * - Add OAuth/SAML providers
 * - Remove providers
 * - Test provider connectivity
 * - Show role mappings
 * - Show SSO status
 */

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed options
 */
export function parseArgs(args) {
  const result = {
    subcommand: 'help',
    provider: null,
    type: null,
    force: false,
  };

  if (args.length === 0) {
    return result;
  }

  // Check for --help flag
  if (args.includes('--help') || args.includes('-h')) {
    result.subcommand = 'help';
    return result;
  }

  // Get subcommand
  const subcommand = args[0];
  const validSubcommands = ['providers', 'add', 'remove', 'test', 'roles', 'status'];

  if (validSubcommands.includes(subcommand)) {
    result.subcommand = subcommand;
  } else {
    result.subcommand = subcommand; // Keep unknown for error handling
  }

  // Parse remaining arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--type') {
      result.type = args[i + 1];
      i++;
    } else if (arg.startsWith('--type=')) {
      result.type = arg.split('=')[1];
    } else if (arg === '--force' || arg === '-f') {
      result.force = true;
    } else if (!arg.startsWith('-') && !result.provider) {
      result.provider = arg;
    }
  }

  return result;
}

/**
 * Format provider for display
 * @param {Object} provider - Provider object with name and type
 * @param {Object} options - Formatting options
 * @param {boolean} options.showStatus - Whether to show connection status
 * @returns {string} Formatted provider string
 */
export function formatProvider(provider, options = {}) {
  const name = getProviderDisplayName(provider.name);
  const type = formatType(provider.type);

  let output = `${name} (${type})`;

  if (options.showStatus && provider.connected !== undefined) {
    const status = provider.connected ? 'Connected' : 'Disconnected';
    output += `     ${status}`;
  }

  return output;
}

/**
 * Known provider display names for proper capitalization
 */
const PROVIDER_DISPLAY_NAMES = {
  github: 'GitHub',
  google: 'Google',
  okta: 'Okta',
  azuread: 'Azure AD',
  'azure-ad': 'Azure AD',
  onelogin: 'OneLogin',
  auth0: 'Auth0',
  pingone: 'PingOne',
  jumpcloud: 'JumpCloud',
};

/**
 * Get display name for a provider
 * @param {string} name - Provider name
 * @returns {string} Display name
 */
function getProviderDisplayName(name) {
  if (!name) return name;
  const lower = name.toLowerCase();
  return PROVIDER_DISPLAY_NAMES[lower] || capitalizeFirst(name);
}

/**
 * Format type for display (OAuth, SAML)
 * @param {string} type - Provider type
 * @returns {string} Formatted type
 */
function formatType(type) {
  if (!type) return type;
  const lower = type.toLowerCase();
  if (lower === 'oauth') return 'OAuth';
  if (lower === 'saml') return 'SAML';
  return type.toUpperCase();
}

/**
 * Capitalize first letter of a string
 * @param {string} str - Input string
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * SSOCommand class - handles tlc sso command
 */
export class SSOCommand {
  /**
   * Create an SSOCommand instance
   * @param {Object} options - Configuration options
   * @param {Object} options.idpManager - IdP Manager instance
   * @param {Object} options.roleMapper - Role Mapper instance
   * @param {Object} options.ssoSession - SSO Session manager instance
   * @param {Object} options.config - TLC configuration
   * @param {Function} options.prompt - Prompt function for user input
   */
  constructor(options = {}) {
    this.idpManager = options.idpManager;
    this.roleMapper = options.roleMapper;
    this.ssoSession = options.ssoSession;
    this.config = options.config || {};
    this.prompt = options.prompt || (() => Promise.resolve(''));
  }

  /**
   * Execute the SSO command
   * @param {string[]} args - Command arguments
   * @returns {Promise<Object>} Result { success, output, error? }
   */
  async execute(args) {
    const options = parseArgs(args);

    try {
      switch (options.subcommand) {
        case 'providers':
          return await this.handleProviders();
        case 'add':
          return await this.handleAdd(options);
        case 'remove':
          return await this.handleRemove(options);
        case 'test':
          return await this.handleTest(options);
        case 'roles':
          return await this.handleRoles();
        case 'status':
          return await this.handleStatus();
        case 'help':
          return this.handleHelp();
        default:
          return {
            success: false,
            output: '',
            error: `Unknown subcommand: ${options.subcommand}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  /**
   * Handle providers subcommand - list all providers
   * @returns {Promise<Object>} Result
   */
  async handleProviders() {
    const providers = this.idpManager.listProviders();

    if (providers.length === 0) {
      return {
        success: true,
        output: 'No providers configured.\n\nUse `tlc sso add <provider>` to add one.',
      };
    }

    const lines = [];
    lines.push('SSO Providers');
    lines.push('=============');
    lines.push('');

    for (const provider of providers) {
      const name = getProviderDisplayName(provider.name);
      const type = formatType(provider.type);
      lines.push(`  ${name} (${type})     Configured`);
    }

    return {
      success: true,
      output: lines.join('\n'),
    };
  }

  /**
   * Handle add subcommand - add new provider
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleAdd(options) {
    if (!options.provider) {
      return {
        success: false,
        output: '',
        error: 'Provider name required. Usage: tlc sso add <provider-name>',
      };
    }

    // Get provider type
    let providerType = options.type;
    if (!providerType) {
      providerType = await this.prompt('Provider type (oauth/saml): ');
    }

    providerType = providerType.toLowerCase();

    if (providerType === 'oauth') {
      return await this.addOAuthProvider(options.provider);
    } else if (providerType === 'saml') {
      return await this.addSAMLProvider(options.provider);
    } else {
      return {
        success: false,
        output: '',
        error: 'Invalid provider type. Use "oauth" or "saml".',
      };
    }
  }

  /**
   * Add OAuth provider
   * @param {string} name - Provider name
   * @returns {Promise<Object>} Result
   */
  async addOAuthProvider(name) {
    const clientId = await this.prompt('Client ID: ');
    if (!clientId) {
      return {
        success: false,
        output: '',
        error: 'Client ID is required',
      };
    }

    const clientSecret = await this.prompt('Client Secret: ');
    const authUrl = await this.prompt('Authorization URL: ');
    const tokenUrl = await this.prompt('Token URL: ');
    const userInfoUrl = await this.prompt('User Info URL: ');

    const config = {
      type: 'oauth',
      clientId,
      clientSecret,
      authUrl,
      tokenUrl,
      userInfoUrl,
    };

    this.idpManager.registerProvider(name, config);

    return {
      success: true,
      output: `Provider "${name}" added successfully.`,
    };
  }

  /**
   * Add SAML provider
   * @param {string} name - Provider name
   * @returns {Promise<Object>} Result
   */
  async addSAMLProvider(name) {
    const entityId = await this.prompt('Entity ID: ');
    if (!entityId) {
      return {
        success: false,
        output: '',
        error: 'Entity ID is required',
      };
    }

    const ssoUrl = await this.prompt('SSO URL: ');
    const certificate = await this.prompt('Certificate (PEM): ');

    const config = {
      type: 'saml',
      entityId,
      ssoUrl,
      certificate,
    };

    this.idpManager.registerProvider(name, config);

    return {
      success: true,
      output: `Provider "${name}" added successfully.`,
    };
  }

  /**
   * Handle remove subcommand - remove provider
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleRemove(options) {
    if (!options.provider) {
      return {
        success: false,
        output: '',
        error: 'Provider name required. Usage: tlc sso remove <provider-name>',
      };
    }

    // Check if provider exists
    const provider = this.idpManager.getProvider(options.provider);
    if (!provider) {
      return {
        success: false,
        output: '',
        error: `Provider "${options.provider}" not found`,
      };
    }

    // Confirm unless --force
    if (!options.force) {
      const confirm = await this.prompt(`Remove provider "${options.provider}"? (yes/no): `);
      if (confirm.toLowerCase() !== 'yes') {
        return {
          success: true,
          output: 'Operation cancelled.',
        };
      }
    }

    this.idpManager.removeProvider(options.provider);

    return {
      success: true,
      output: `Provider "${options.provider}" removed successfully.`,
    };
  }

  /**
   * Handle test subcommand - test provider connectivity
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleTest(options) {
    if (!options.provider) {
      return {
        success: false,
        output: '',
        error: 'Provider name required. Usage: tlc sso test <provider-name>',
      };
    }

    // Check if provider exists
    const provider = this.idpManager.getProvider(options.provider);
    if (!provider) {
      return {
        success: false,
        output: '',
        error: `Provider "${options.provider}" not found`,
      };
    }

    const result = await this.ssoSession.testProvider(options.provider);

    if (result.success) {
      const lines = [];
      lines.push(`Testing provider "${options.provider}"...`);
      lines.push('');
      lines.push('Connection successful');
      if (result.latency) {
        lines.push(`Latency: ${result.latency}ms`);
      }

      return {
        success: true,
        output: lines.join('\n'),
      };
    } else {
      const lines = [];
      lines.push(`Testing provider "${options.provider}"...`);
      lines.push('');
      lines.push(`Error: ${result.error}`);
      if (result.details) {
        lines.push('');
        lines.push('Details:');
        for (const [key, value] of Object.entries(result.details)) {
          lines.push(`  ${key}: ${value}`);
        }
      }

      return {
        success: false,
        output: lines.join('\n'),
      };
    }
  }

  /**
   * Handle roles subcommand - show role mappings
   * @returns {Promise<Object>} Result
   */
  async handleRoles() {
    const { mappings, defaultRole } = this.roleMapper.getMappings();

    if (mappings.length === 0 && !defaultRole) {
      return {
        success: true,
        output: 'No role mappings configured.\n\nAdd mappings in .tlc.json under sso.roleMappings.',
      };
    }

    const lines = [];
    lines.push('Role Mappings');
    lines.push('=============');
    lines.push('');

    // Sort by priority
    const sorted = [...mappings].sort((a, b) => a.priority - b.priority);

    for (const mapping of sorted) {
      lines.push(`  ${mapping.pattern} -> ${mapping.role}`);
    }

    if (defaultRole) {
      lines.push('');
      lines.push(`  Default: ${defaultRole}`);
    }

    return {
      success: true,
      output: lines.join('\n'),
    };
  }

  /**
   * Handle status subcommand - show SSO status
   * @returns {Promise<Object>} Result
   */
  async handleStatus() {
    const status = this.ssoSession.getStatus();
    const providers = this.idpManager.listProviders();
    const { mappings } = this.roleMapper.getMappings();

    const lines = [];
    lines.push('SSO Status');
    lines.push('==========');
    lines.push('');
    lines.push(`  Enabled: ${status.enabled ? 'Yes' : 'No'}`);
    lines.push(`  Providers: ${providers.length} configured`);
    lines.push(`  Active Sessions: ${status.activeSessions}`);

    // MFA info
    if (status.mfaRequired) {
      const roles = status.mfaRoles.join(', ');
      lines.push(`  MFA Required: Yes (for ${roles} role)`);
    } else {
      lines.push('  MFA Required: No');
    }

    // Role mappings summary
    if (mappings.length > 0) {
      lines.push('');
      lines.push('  Role Mappings:');
      for (const mapping of mappings) {
        lines.push(`    ${mapping.pattern} -> ${mapping.role}`);
      }
    }

    return {
      success: true,
      output: lines.join('\n'),
    };
  }

  /**
   * Handle help subcommand - show usage information
   * @returns {Object} Result
   */
  handleHelp() {
    const lines = [];
    lines.push('Usage: tlc sso <subcommand> [options]');
    lines.push('');
    lines.push('Subcommands:');
    lines.push('  providers           List configured SSO providers');
    lines.push('  add <provider>      Add a new SSO provider');
    lines.push('  remove <provider>   Remove an SSO provider');
    lines.push('  test <provider>     Test provider connectivity');
    lines.push('  roles               Show role mappings');
    lines.push('  status              Show SSO status');
    lines.push('');
    lines.push('Options:');
    lines.push('  --type <type>       Provider type (oauth/saml) for add');
    lines.push('  --force, -f         Skip confirmation for remove');
    lines.push('  --help, -h          Show this help message');
    lines.push('');
    lines.push('Examples:');
    lines.push('  tlc sso providers');
    lines.push('  tlc sso add github --type oauth');
    lines.push('  tlc sso remove okta --force');
    lines.push('  tlc sso test google');
    lines.push('  tlc sso status');

    return {
      success: true,
      output: lines.join('\n'),
    };
  }
}
