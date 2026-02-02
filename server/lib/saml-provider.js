/**
 * SAML Provider
 * SAML 2.0 Service Provider implementation
 */

const crypto = require('crypto');
const zlib = require('zlib');

/**
 * SAML namespaces
 */
const SAML_NAMESPACES = {
  SAMLP: 'urn:oasis:names:tc:SAML:2.0:protocol',
  SAML: 'urn:oasis:names:tc:SAML:2.0:assertion',
  DS: 'http://www.w3.org/2000/09/xmldsig#',
  MD: 'urn:oasis:names:tc:SAML:2.0:metadata',
};

/**
 * SAML bindings
 */
const SAML_BINDINGS = {
  REDIRECT: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
  POST: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
};

/**
 * SAML status codes
 */
const SAML_STATUS = {
  SUCCESS: 'urn:oasis:names:tc:SAML:2.0:status:Success',
  PARTIAL_LOGOUT: 'urn:oasis:names:tc:SAML:2.0:status:PartialLogout',
};

/**
 * Generate unique SAML ID
 * @returns {string} Unique ID prefixed with underscore
 */
function generateId() {
  return '_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Get current ISO timestamp
 * @returns {string} ISO timestamp
 */
function getISOTimestamp() {
  return new Date().toISOString();
}

/**
 * Simple XML parser - extracts elements and attributes
 * @param {string} xml - XML string to parse
 * @returns {Object} Parsed structure
 */
function parseXML(xml) {
  if (!xml || typeof xml !== 'string') {
    throw new Error('Invalid XML input');
  }

  const trimmed = xml.trim();
  if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<')) {
    throw new Error('Invalid XML: does not start with XML declaration or element');
  }

  return {
    raw: xml,

    // Get attribute value from element
    getAttribute(elementPattern, attrName) {
      const regex = new RegExp(`<[^>]*${elementPattern}[^>]*${attrName}="([^"]*)"`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : null;
    },

    // Get element content
    getElementContent(elementName) {
      // Handle namespaced elements
      const patterns = [
        new RegExp(`<(?:[a-z]+:)?${elementName}[^>]*>([^<]*)<\\/(?:[a-z]+:)?${elementName}>`, 'i'),
        new RegExp(`<${elementName}[^>]*>([^<]*)<\\/${elementName}>`, 'i'),
      ];

      for (const regex of patterns) {
        const match = xml.match(regex);
        if (match) return match[1].trim();
      }
      return null;
    },

    // Get all elements with a name
    getAllElements(elementName) {
      const results = [];
      const regex = new RegExp(`<(?:[a-z]+:)?${elementName}([^>]*)(?:\\/>|>([\\s\\S]*?)<\\/(?:[a-z]+:)?${elementName}>)`, 'gi');
      let match;
      while ((match = regex.exec(xml)) !== null) {
        results.push({
          attributes: match[1],
          content: match[2] ? match[2].trim() : '',
        });
      }
      return results;
    },

    // Check if element exists
    hasElement(elementName) {
      const regex = new RegExp(`<(?:[a-z]+:)?${elementName}[\\s>]`, 'i');
      return regex.test(xml);
    },

    // Get attribute from specific element
    getAttributeFromElement(elementName, attrName) {
      const regex = new RegExp(`<(?:[a-z]+:)?${elementName}[^>]*${attrName}="([^"]*)"`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : null;
    },
  };
}

/**
 * Parse SAML IdP metadata
 * @param {string} metadata - XML metadata string
 * @returns {Object} Parsed metadata
 */
function parseMetadata(metadata) {
  const doc = parseXML(metadata);

  // Get entity ID
  const entityId = doc.getAttribute('EntityDescriptor', 'entityID');
  if (!entityId) {
    throw new Error('Invalid metadata: missing entity ID');
  }

  // Get SSO URLs
  const ssoUrls = {};
  const ssoServices = doc.getAllElements('SingleSignOnService');
  for (const sso of ssoServices) {
    const binding = sso.attributes.match(/Binding="([^"]*)"/)?.[1];
    const location = sso.attributes.match(/Location="([^"]*)"/)?.[1];

    if (binding && location) {
      if (binding.includes('Redirect')) {
        ssoUrls.redirect = location;
      } else if (binding.includes('POST')) {
        ssoUrls.post = location;
      }
    }
  }

  // Get SLO URLs
  const sloUrls = {};
  const sloServices = doc.getAllElements('SingleLogoutService');
  for (const slo of sloServices) {
    const binding = slo.attributes.match(/Binding="([^"]*)"/)?.[1];
    const location = slo.attributes.match(/Location="([^"]*)"/)?.[1];

    if (binding && location) {
      if (binding.includes('Redirect')) {
        sloUrls.redirect = location;
      } else if (binding.includes('POST')) {
        sloUrls.post = location;
      }
    }
  }

  // Get signing certificate
  let signingCert = null;
  const certElements = doc.getAllElements('X509Certificate');
  if (certElements.length > 0) {
    signingCert = certElements[0].content.replace(/\s/g, '');
  }

  return {
    entityId,
    ssoUrls,
    sloUrls,
    signingCert,
  };
}

/**
 * Generate SAML AuthnRequest
 * @param {Object} config - Request configuration
 * @returns {Object} Request XML and metadata
 */
function generateAuthnRequest(config) {
  const {
    issuer,
    callbackUrl,
    destination,
    binding = 'redirect',
    nameIdFormat = 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  } = config;

  if (!issuer) {
    throw new Error('Missing required configuration: issuer');
  }

  if (!callbackUrl) {
    throw new Error('Missing required configuration: callbackUrl');
  }

  const id = generateId();
  const issueInstant = getISOTimestamp();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="${SAML_NAMESPACES.SAMLP}"
  xmlns:saml="${SAML_NAMESPACES.SAML}"
  ID="${id}" Version="2.0" IssueInstant="${issueInstant}"
  ${destination ? `Destination="${destination}"` : ''}
  AssertionConsumerServiceURL="${callbackUrl}"
  ProtocolBinding="${SAML_BINDINGS.POST}">
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:NameIDPolicy Format="${nameIdFormat}" AllowCreate="true"/>
</samlp:AuthnRequest>`;

  let encoded;
  if (binding === 'redirect') {
    // Deflate and URL-safe base64 encode
    const deflated = zlib.deflateRawSync(xml);
    encoded = deflated.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } else {
    // POST binding - just base64 encode
    encoded = Buffer.from(xml).toString('base64');
  }

  return {
    id,
    xml,
    encoded,
    issueInstant,
  };
}

/**
 * Validate SAML Response
 * @param {string} response - SAML Response XML
 * @param {Object} config - Validation configuration
 * @returns {Object} Validation result
 */
function validateResponse(response, config = {}) {
  const {
    issuer,
    idpCert,
    expectedInResponseTo,
    expectedIssuer,
    skipSignatureValidation = false,
  } = config;

  const errors = [];
  let doc;

  try {
    doc = parseXML(response);
  } catch (err) {
    throw new Error(`Invalid SAML Response XML: ${err.message}`);
  }

  // Check for Assertion
  if (!doc.hasElement('Assertion')) {
    errors.push('Missing Assertion element');
  }

  // Check InResponseTo
  if (expectedInResponseTo) {
    const inResponseTo = doc.getAttribute('Response', 'InResponseTo') ||
                         doc.getAttributeFromElement('SubjectConfirmationData', 'InResponseTo');
    if (inResponseTo && inResponseTo !== expectedInResponseTo) {
      errors.push(`InResponseTo mismatch: expected ${expectedInResponseTo}, got ${inResponseTo}`);
    }
  }

  // Check Issuer
  if (expectedIssuer) {
    const responseIssuer = doc.getElementContent('Issuer');
    if (responseIssuer && responseIssuer !== expectedIssuer) {
      errors.push(`Issuer mismatch: expected ${expectedIssuer}, got ${responseIssuer}`);
    }
  }

  // Check timing conditions
  const notOnOrAfter = doc.getAttributeFromElement('Conditions', 'NotOnOrAfter') ||
                       doc.getAttributeFromElement('SubjectConfirmationData', 'NotOnOrAfter');
  if (notOnOrAfter) {
    const expiry = new Date(notOnOrAfter);
    if (expiry < new Date()) {
      errors.push(`Assertion expired: NotOnOrAfter ${notOnOrAfter}`);
    }
  }

  const notBefore = doc.getAttributeFromElement('Conditions', 'NotBefore');
  if (notBefore) {
    const start = new Date(notBefore);
    if (start > new Date()) {
      errors.push(`Assertion not yet valid: NotBefore ${notBefore}`);
    }
  }

  // Signature validation would go here
  // For now, we skip it if requested (for testing)
  if (!skipSignatureValidation && idpCert) {
    // In production, this would verify the XML signature
    // Using the IdP certificate
    // This is a simplified placeholder
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract user attributes from SAML Response
 * @param {string} response - SAML Response XML
 * @param {Object} options - Extraction options
 * @returns {Object} User attributes
 */
function extractAttributes(response, options = {}) {
  if (!response) {
    return {};
  }

  const { attributeMapping = {} } = options;
  const attrs = {};

  let doc;
  try {
    doc = parseXML(response);
  } catch {
    return {};
  }

  // Get NameID
  const nameId = doc.getElementContent('NameID');
  if (nameId) {
    attrs.nameId = nameId;
  }

  // Get Attributes using a more robust regex approach
  // Match Attribute elements with their Name and nested AttributeValue
  const attrRegex = /<(?:saml:)?Attribute\s+Name="([^"]*)"[^>]*>([\s\S]*?)<\/(?:saml:)?Attribute>/gi;
  let attrMatch;

  while ((attrMatch = attrRegex.exec(response)) !== null) {
    const name = attrMatch[1];
    const content = attrMatch[2];

    // Extract the value from AttributeValue element
    const valueMatch = content.match(/<(?:saml:)?AttributeValue[^>]*>([^<]*)<\/(?:saml:)?AttributeValue>/i);
    const value = valueMatch ? valueMatch[1].trim() : null;

    if (value !== null) {
      // Check for mapping
      const mappedName = attributeMapping[name] || name;
      attrs[mappedName] = value;
    }
  }

  return attrs;
}

/**
 * Handle SAML Logout Request
 * @param {string} logoutRequest - SAML LogoutRequest XML
 * @returns {Object} Parsed logout request
 */
function handleLogout(logoutRequest) {
  let doc;
  try {
    doc = parseXML(logoutRequest);
  } catch (err) {
    throw new Error(`Invalid SAML LogoutRequest: ${err.message}`);
  }

  const sessionIndex = doc.getElementContent('SessionIndex');

  return {
    requestId: doc.getAttribute('LogoutRequest', 'ID'),
    nameId: doc.getElementContent('NameID'),
    sessionIndex: sessionIndex || undefined, // Return undefined instead of null when missing
    issuer: doc.getElementContent('Issuer'),
  };
}

/**
 * Generate SAML Logout Response
 * @param {Object} config - Response configuration
 * @returns {Object} Response XML and metadata
 */
function generateLogoutResponse(config) {
  const {
    inResponseTo,
    issuer,
    destination,
    status = 'Success',
    binding = 'post',
  } = config;

  const id = generateId();
  const issueInstant = getISOTimestamp();

  const statusCode = status === 'PartialLogout'
    ? SAML_STATUS.PARTIAL_LOGOUT
    : SAML_STATUS.SUCCESS;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutResponse xmlns:samlp="${SAML_NAMESPACES.SAMLP}"
  xmlns:saml="${SAML_NAMESPACES.SAML}"
  ID="${id}" Version="2.0" IssueInstant="${issueInstant}"
  Destination="${destination}"
  InResponseTo="${inResponseTo}">
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="${statusCode}"/>
  </samlp:Status>
</samlp:LogoutResponse>`;

  let encoded;
  if (binding === 'redirect') {
    const deflated = zlib.deflateRawSync(xml);
    encoded = deflated.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } else {
    encoded = Buffer.from(xml).toString('base64');
  }

  return {
    id,
    xml,
    encoded,
    issueInstant,
  };
}

/**
 * Create SAML Service Provider
 * @param {Object} spConfig - SP configuration
 * @returns {Object} SAML Provider instance
 */
function createSAMLProvider(spConfig) {
  const {
    entityId,
    callbackUrl,
    logoutUrl,
    privateKey,
    certificate,
  } = spConfig;

  const idps = new Map();
  const pendingRequests = new Map();

  return {
    /**
     * Register an IdP
     * @param {string} id - IdP identifier
     * @param {Object} config - IdP configuration
     */
    registerIdP(id, config) {
      idps.set(id, {
        ...config,
        id,
      });
    },

    /**
     * Register IdP from metadata
     * @param {string} id - IdP identifier
     * @param {string} metadata - XML metadata
     */
    registerIdPFromMetadata(id, metadata) {
      const parsed = parseMetadata(metadata);
      idps.set(id, {
        id,
        entityId: parsed.entityId,
        ssoUrl: parsed.ssoUrls.redirect || parsed.ssoUrls.post,
        sloUrl: parsed.sloUrls?.redirect || parsed.sloUrls?.post,
        cert: parsed.signingCert,
        ssoUrls: parsed.ssoUrls,
        sloUrls: parsed.sloUrls,
      });
    },

    /**
     * Get IdP by ID
     * @param {string} id - IdP identifier
     * @returns {Object|undefined} IdP configuration
     */
    getIdP(id) {
      return idps.get(id);
    },

    /**
     * List registered IdPs
     * @returns {string[]} IdP identifiers
     */
    listIdPs() {
      return Array.from(idps.keys());
    },

    /**
     * Remove IdP
     * @param {string} id - IdP identifier
     */
    removeIdP(id) {
      idps.delete(id);
    },

    /**
     * Create login request for IdP
     * @param {string} idpId - IdP identifier
     * @param {Object} options - Request options
     * @returns {Object} Request data
     */
    createLoginRequest(idpId, options = {}) {
      const idp = idps.get(idpId);
      if (!idp) {
        throw new Error(`Unknown IdP: ${idpId}`);
      }

      const { binding = 'redirect', relayState } = options;

      const request = generateAuthnRequest({
        issuer: entityId,
        callbackUrl,
        destination: idp.ssoUrl,
        binding,
      });

      // Store pending request for validation
      pendingRequests.set(request.id, {
        idpId,
        createdAt: new Date(),
      });

      // Build URL
      let url = idp.ssoUrl;
      if (binding === 'redirect') {
        const params = new URLSearchParams();
        params.set('SAMLRequest', request.encoded);
        if (relayState) {
          params.set('RelayState', relayState);
        }
        url = `${idp.ssoUrl}?${params.toString()}`;
      }

      return {
        id: request.id,
        url,
        xml: request.xml,
        encoded: request.encoded,
        binding,
      };
    },

    /**
     * Handle login response
     * @param {string} samlResponse - Base64 encoded response
     * @param {Object} options - Processing options
     * @returns {Object} Result with user info
     */
    async handleLoginResponse(samlResponse, options = {}) {
      const { idpId, expectedInResponseTo, relayState } = options;

      // Decode response
      let responseXml;
      try {
        responseXml = Buffer.from(samlResponse, 'base64').toString('utf8');
      } catch {
        return { success: false, error: 'Failed to decode SAML response' };
      }

      // Get IdP config
      const idp = idpId ? idps.get(idpId) : null;

      // Validate response
      const validation = validateResponse(responseXml, {
        issuer: entityId,
        idpCert: idp?.cert,
        expectedInResponseTo,
        expectedIssuer: idp?.entityId,
        skipSignatureValidation: idp?.skipSignatureValidation,
      });

      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // Extract user attributes
      const user = extractAttributes(responseXml);

      // Clean up pending request
      if (expectedInResponseTo) {
        pendingRequests.delete(expectedInResponseTo);
      }

      return {
        success: true,
        user,
        relayState,
      };
    },

    /**
     * Handle logout request from IdP
     * @param {string} samlRequest - SAML logout request
     * @returns {Object} Logout info
     */
    handleLogoutRequest(samlRequest) {
      let requestXml = samlRequest;

      // Try to decode if base64
      try {
        const decoded = Buffer.from(samlRequest, 'base64').toString('utf8');
        if (decoded.includes('LogoutRequest')) {
          requestXml = decoded;
        }
      } catch {
        // Use as-is
      }

      // Try to inflate if deflated
      try {
        const inflated = zlib.inflateRawSync(Buffer.from(samlRequest, 'base64')).toString('utf8');
        if (inflated.includes('LogoutRequest')) {
          requestXml = inflated;
        }
      } catch {
        // Use as-is
      }

      return handleLogout(requestXml);
    },

    /**
     * Create logout request
     * @param {string} idpId - IdP identifier
     * @param {Object} session - Session info
     * @returns {Object} Logout request
     */
    createLogoutRequest(idpId, session) {
      const idp = idps.get(idpId);
      if (!idp) {
        throw new Error(`Unknown IdP: ${idpId}`);
      }

      const id = generateId();
      const issueInstant = getISOTimestamp();

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest xmlns:samlp="${SAML_NAMESPACES.SAMLP}"
  xmlns:saml="${SAML_NAMESPACES.SAML}"
  ID="${id}" Version="2.0" IssueInstant="${issueInstant}"
  Destination="${idp.sloUrl || idp.ssoUrl}">
  <saml:Issuer>${entityId}</saml:Issuer>
  <saml:NameID>${session.nameId}</saml:NameID>
  ${session.sessionIndex ? `<samlp:SessionIndex>${session.sessionIndex}</samlp:SessionIndex>` : ''}
</samlp:LogoutRequest>`;

      const deflated = zlib.deflateRawSync(xml);
      const encoded = deflated.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const params = new URLSearchParams();
      params.set('SAMLRequest', encoded);

      return {
        id,
        url: `${idp.sloUrl || idp.ssoUrl}?${params.toString()}`,
        xml,
        encoded,
      };
    },

    /**
     * Create logout response
     * @param {string} idpId - IdP identifier
     * @param {Object} options - Response options
     * @returns {Object} Logout response
     */
    createLogoutResponse(idpId, options) {
      const idp = idps.get(idpId);

      return generateLogoutResponse({
        inResponseTo: options.inResponseTo,
        issuer: entityId,
        destination: idp?.sloUrl || options.destination,
        status: options.status || 'Success',
        binding: options.binding || 'redirect',
      });
    },

    /**
     * Generate SP metadata
     * @returns {string} XML metadata
     */
    generateMetadata() {
      return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="${SAML_NAMESPACES.MD}"
  entityID="${entityId}">
  <SPSSODescriptor protocolSupportEnumeration="${SAML_NAMESPACES.SAMLP}"
    AuthnRequestsSigned="false" WantAssertionsSigned="true">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService
      Binding="${SAML_BINDINGS.POST}"
      Location="${callbackUrl}"
      index="0"
      isDefault="true"/>
    ${logoutUrl ? `<SingleLogoutService
      Binding="${SAML_BINDINGS.REDIRECT}"
      Location="${logoutUrl}"/>` : ''}
  </SPSSODescriptor>
</EntityDescriptor>`;
    },

    /**
     * Get pending request info
     * @param {string} id - Request ID
     * @returns {Object|undefined} Request info
     */
    getPendingRequest(id) {
      return pendingRequests.get(id);
    },

    /**
     * Clean expired pending requests
     * @param {number} maxAgeMs - Max age in milliseconds
     * @returns {number} Number of cleaned requests
     */
    cleanPendingRequests(maxAgeMs = 300000) {
      const now = new Date();
      let cleaned = 0;

      for (const [id, request] of pendingRequests) {
        if (now - request.createdAt > maxAgeMs) {
          pendingRequests.delete(id);
          cleaned++;
        }
      }

      return cleaned;
    },
  };
}

module.exports = {
  SAML_NAMESPACES,
  SAML_BINDINGS,
  SAML_STATUS,
  generateId,
  parseMetadata,
  generateAuthnRequest,
  validateResponse,
  extractAttributes,
  handleLogout,
  generateLogoutResponse,
  createSAMLProvider,
};
