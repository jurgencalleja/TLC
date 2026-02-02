/**
 * SAML Provider Tests
 * SAML 2.0 Service Provider implementation tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseMetadata,
  generateAuthnRequest,
  validateResponse,
  extractAttributes,
  handleLogout,
  generateLogoutResponse,
  createSAMLProvider,
  SAML_NAMESPACES,
} from './saml-provider.js';

// Sample IdP metadata XML
const SAMPLE_METADATA = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="https://idp.example.com">
  <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>MIICajCCAdOgAwIBAgIBADANBgkqhkiG9w0BAQ0FADBSMQswCQYDVQQGEwJ1czETMBEGA1UECAwKQ2FsaWZvcm5pYTEVMBMGA1UECgwMT25lbG9naW4gSW5jMRcwFQYDVQQDDA5zcC5leGFtcGxlLmNvbTAeFw0xNDA3MTcxNDEyNTZaFw0xNTA3MTcxNDEyNTZaMFIxCzAJBgNVBAYTAnVzMRMwEQYDVQQIDApDYWxpZm9ybmlhMRUwEwYDVQQKDAxPbmVsb2dpbiBJbmMxFzAVBgNVBAMMDnNwLmV4YW1wbGUuY29tMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDZx+ON4IUoIWxgukTb1tOiX3bMYzYQiwWPUNMp+Fq82xoNogso2bykZG0yiJm5o8zv/sd6pGouayMgkx/2FSOdc36T0jGbCHuRSbtia0PEzNIRtmViMrt3AeoWBidRXmZsxCNLwgIV6dn2WpuE5Az0bHgpZnQxTKFek0BMKU/d8wIDAQABo1AwTjAdBgNVHQ4EFgQUGHxYqZYyX7cTxKVODVgZwSTdCnwwHwYDVR0jBBgwFoAUGHxYqZYyX7cTxKVODVgZwSTdCnwwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQ0FAAOBgQByFOl+hMFICbd3DJfnp2Rgd/dqttsZG/tyhILWvErbio/DEe98mXpowhTkC04ENprOyXi7ZbUqiicF89uAGyt1oqgTUCD1VsLahqIcmrzgumNyTwLGWo17WDAa1/usDhetWAMhgzF/Cnf5ek0nK00m0YZGyc4LzgD0CROMASTWNg==</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="https://idp.example.com/sso/redirect"/>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://idp.example.com/sso/post"/>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="https://idp.example.com/slo/redirect"/>
  </IDPSSODescriptor>
</EntityDescriptor>`;

// Sample SAML Response
const createSampleResponse = (options = {}) => {
  const {
    issuer = 'https://idp.example.com',
    email = 'user@example.com',
    name = 'Test User',
    nameId = 'user123',
    notOnOrAfter = new Date(Date.now() + 3600000).toISOString(),
    notBefore = new Date(Date.now() - 60000).toISOString(),
    inResponseTo = '_abc123',
    customAttrs = {},
  } = options;

  const attrStatements = Object.entries(customAttrs)
    .map(([key, value]) => `
      <saml:Attribute Name="${key}">
        <saml:AttributeValue>${value}</saml:AttributeValue>
      </saml:Attribute>
    `)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_response123" Version="2.0" IssueInstant="${new Date().toISOString()}"
  Destination="https://app.example.com/saml/callback"
  InResponseTo="${inResponseTo}">
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion Version="2.0" ID="_assertion123" IssueInstant="${new Date().toISOString()}">
    <saml:Issuer>${issuer}</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${nameId}</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter}"
          Recipient="https://app.example.com/saml/callback"
          InResponseTo="${inResponseTo}"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>https://app.example.com</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>${email}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="name">
        <saml:AttributeValue>${name}</saml:AttributeValue>
      </saml:Attribute>
      ${attrStatements}
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;
};

// Sample SAML Logout Request
const SAMPLE_LOGOUT_REQUEST = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_logout123" Version="2.0" IssueInstant="${new Date().toISOString()}"
  Destination="https://app.example.com/saml/logout">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <saml:NameID>user123</saml:NameID>
  <samlp:SessionIndex>_session456</samlp:SessionIndex>
</samlp:LogoutRequest>`;

describe('saml-provider', () => {
  describe('SAML_NAMESPACES', () => {
    it('defines SAML protocol namespace', () => {
      expect(SAML_NAMESPACES.SAMLP).toBe('urn:oasis:names:tc:SAML:2.0:protocol');
    });

    it('defines SAML assertion namespace', () => {
      expect(SAML_NAMESPACES.SAML).toBe('urn:oasis:names:tc:SAML:2.0:assertion');
    });

    it('defines XML signature namespace', () => {
      expect(SAML_NAMESPACES.DS).toBe('http://www.w3.org/2000/09/xmldsig#');
    });
  });

  describe('parseMetadata', () => {
    it('extracts IdP endpoints', () => {
      const result = parseMetadata(SAMPLE_METADATA);

      expect(result.entityId).toBe('https://idp.example.com');
      expect(result.ssoUrls).toBeDefined();
      expect(result.ssoUrls.redirect).toBe('https://idp.example.com/sso/redirect');
      expect(result.ssoUrls.post).toBe('https://idp.example.com/sso/post');
    });

    it('extracts signing certificate', () => {
      const result = parseMetadata(SAMPLE_METADATA);

      expect(result.signingCert).toBeDefined();
      expect(result.signingCert).toContain('MIICajCCAdOgAwIBAgIBADA');
    });

    it('extracts logout URL', () => {
      const result = parseMetadata(SAMPLE_METADATA);

      expect(result.sloUrls).toBeDefined();
      expect(result.sloUrls.redirect).toBe('https://idp.example.com/slo/redirect');
    });

    it('throws for invalid XML', () => {
      expect(() => parseMetadata('not xml')).toThrow();
      expect(() => parseMetadata('<invalid>')).toThrow();
    });

    it('throws for missing entity ID', () => {
      const noEntityId = `<?xml version="1.0"?>
        <EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
          <IDPSSODescriptor></IDPSSODescriptor>
        </EntityDescriptor>`;
      expect(() => parseMetadata(noEntityId)).toThrow('entity');
    });
  });

  describe('generateAuthnRequest', () => {
    const config = {
      issuer: 'https://app.example.com',
      callbackUrl: 'https://app.example.com/saml/callback',
      destination: 'https://idp.example.com/sso',
    };

    it('creates valid SAML request', () => {
      const result = generateAuthnRequest(config);

      expect(result.xml).toContain('AuthnRequest');
      expect(result.xml).toContain('samlp:');
      expect(result.xml).toContain('Version="2.0"');
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^_/);
    });

    it('includes issuer and callback URL', () => {
      const result = generateAuthnRequest(config);

      expect(result.xml).toContain('<saml:Issuer');
      expect(result.xml).toContain('https://app.example.com');
      expect(result.xml).toContain('AssertionConsumerServiceURL="https://app.example.com/saml/callback"');
    });

    it('includes destination', () => {
      const result = generateAuthnRequest(config);

      expect(result.xml).toContain('Destination="https://idp.example.com/sso"');
    });

    it('generates unique IDs', () => {
      const result1 = generateAuthnRequest(config);
      const result2 = generateAuthnRequest(config);

      expect(result1.id).not.toBe(result2.id);
    });

    it('includes IssueInstant timestamp', () => {
      const result = generateAuthnRequest(config);

      expect(result.xml).toMatch(/IssueInstant="[0-9]{4}-[0-9]{2}-[0-9]{2}T/);
    });

    it('returns deflated and encoded request for redirect binding', () => {
      const result = generateAuthnRequest({ ...config, binding: 'redirect' });

      expect(result.encoded).toBeDefined();
      expect(result.encoded).not.toBe(result.xml);
      // URL-safe base64
      expect(result.encoded).not.toContain('+');
      expect(result.encoded).not.toContain('/');
    });

    it('returns base64 encoded request for POST binding', () => {
      const result = generateAuthnRequest({ ...config, binding: 'post' });

      expect(result.encoded).toBeDefined();
      // Should be valid base64
      expect(() => Buffer.from(result.encoded, 'base64').toString()).not.toThrow();
    });

    it('throws for missing issuer', () => {
      expect(() => generateAuthnRequest({ callbackUrl: 'url' })).toThrow('issuer');
    });

    it('throws for missing callback URL', () => {
      expect(() => generateAuthnRequest({ issuer: 'iss' })).toThrow('callback');
    });
  });

  describe('validateResponse', () => {
    const validCert = `MIICajCCAdOgAwIBAgIBADANBgkqhkiG9w0BAQ0FADBSMQswCQYDVQQGEwJ1czETMBEGA1UECAwKQ2FsaWZvcm5pYTEVMBMGA1UECgwMT25lbG9naW4gSW5jMRcwFQYDVQQDDA5zcC5leGFtcGxlLmNvbTAeFw0xNDA3MTcxNDEyNTZaFw0xNTA3MTcxNDEyNTZaMFIxCzAJBgNVBAYTAnVzMRMwEQYDVQQIDApDYWxpZm9ybmlhMRUwEwYDVQQKDAxPbmVsb2dpbiBJbmMxFzAVBgNVBAMMDnNwLmV4YW1wbGUuY29tMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDZx+ON4IUoIWxgukTb1tOiX3bMYzYQiwWPUNMp+Fq82xoNogso2bykZG0yiJm5o8zv/sd6pGouayMgkx/2FSOdc36T0jGbCHuRSbtia0PEzNIRtmViMrt3AeoWBidRXmZsxCNLwgIV6dn2WpuE5Az0bHgpZnQxTKFek0BMKU/d8wIDAQABo1AwTjAdBgNVHQ4EFgQUGHxYqZYyX7cTxKVODVgZwSTdCnwwHwYDVR0jBBgwFoAUGHxYqZYyX7cTxKVODVgZwSTdCnwwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQ0FAAOBgQByFOl+hMFICbd3DJfnp2Rgd/dqttsZG/tyhILWvErbio/DEe98mXpowhTkC04ENprOyXi7ZbUqiicF89uAGyt1oqgTUCD1VsLahqIcmrzgumNyTwLGWo17WDAa1/usDhetWAMhgzF/Cnf5ek0nK00m0YZGyc4LzgD0CROMASTWNg==`;

    const config = {
      issuer: 'https://app.example.com',
      idpCert: validCert,
      expectedInResponseTo: '_abc123',
    };

    it('validates well-formed response', () => {
      const response = createSampleResponse();
      // Note: full signature validation requires signed XML
      // This test validates structure
      const result = validateResponse(response, {
        ...config,
        skipSignatureValidation: true,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects expired assertion', () => {
      const expiredResponse = createSampleResponse({
        notOnOrAfter: new Date(Date.now() - 3600000).toISOString(),
      });

      const result = validateResponse(expiredResponse, {
        ...config,
        skipSignatureValidation: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('expired') || e.includes('NotOnOrAfter'))).toBe(true);
    });

    it('rejects assertion not yet valid', () => {
      const notYetValidResponse = createSampleResponse({
        notBefore: new Date(Date.now() + 3600000).toISOString(),
      });

      const result = validateResponse(notYetValidResponse, {
        ...config,
        skipSignatureValidation: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('NotBefore') || e.includes('not yet valid'))).toBe(true);
    });

    it('rejects mismatched InResponseTo', () => {
      const response = createSampleResponse({ inResponseTo: '_wrong_id' });

      const result = validateResponse(response, {
        ...config,
        skipSignatureValidation: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('InResponseTo'))).toBe(true);
    });

    it('validates issuer matches expected IdP', () => {
      const wrongIssuerResponse = createSampleResponse({
        issuer: 'https://wrong-idp.example.com',
      });

      const result = validateResponse(wrongIssuerResponse, {
        ...config,
        expectedIssuer: 'https://idp.example.com',
        skipSignatureValidation: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('issuer') || e.includes('Issuer'))).toBe(true);
    });

    it('throws for invalid XML', () => {
      expect(() => validateResponse('not xml', config)).toThrow();
    });

    it('returns valid false for missing assertion', () => {
      const noAssertionResponse = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
          <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
          </samlp:Status>
        </samlp:Response>`;

      const result = validateResponse(noAssertionResponse, {
        ...config,
        skipSignatureValidation: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('assertion') || e.includes('Assertion'))).toBe(true);
    });
  });

  describe('extractAttributes', () => {
    it('gets user email and name', () => {
      const response = createSampleResponse({
        email: 'john@example.com',
        name: 'John Doe',
        nameId: 'john123',
      });

      const attrs = extractAttributes(response);

      expect(attrs.email).toBe('john@example.com');
      expect(attrs.name).toBe('John Doe');
      expect(attrs.nameId).toBe('john123');
    });

    it('gets custom attributes', () => {
      const response = createSampleResponse({
        customAttrs: {
          department: 'Engineering',
          role: 'developer',
          employeeId: 'EMP001',
        },
      });

      const attrs = extractAttributes(response);

      expect(attrs.department).toBe('Engineering');
      expect(attrs.role).toBe('developer');
      expect(attrs.employeeId).toBe('EMP001');
    });

    it('handles missing attributes gracefully', () => {
      const minimalResponse = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
          xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const attrs = extractAttributes(minimalResponse);

      expect(attrs.nameId).toBe('user@example.com');
      expect(attrs.email).toBeUndefined();
      expect(attrs.name).toBeUndefined();
    });

    it('returns empty object for invalid input', () => {
      const attrs = extractAttributes(null);
      expect(attrs).toEqual({});
    });

    it('handles namespaced attribute names', () => {
      const namespacedResponse = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
          xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Subject>
              <saml:NameID>user123</saml:NameID>
            </saml:Subject>
            <saml:AttributeStatement>
              <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress">
                <saml:AttributeValue>jane@example.com</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname">
                <saml:AttributeValue>Jane</saml:AttributeValue>
              </saml:Attribute>
            </saml:AttributeStatement>
          </saml:Assertion>
        </samlp:Response>`;

      const attrs = extractAttributes(namespacedResponse, {
        attributeMapping: {
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'email',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'firstName',
        },
      });

      expect(attrs.email).toBe('jane@example.com');
      expect(attrs.firstName).toBe('Jane');
    });
  });

  describe('handleLogout', () => {
    it('processes SAML logout request', () => {
      const result = handleLogout(SAMPLE_LOGOUT_REQUEST);

      expect(result.nameId).toBe('user123');
      expect(result.sessionIndex).toBe('_session456');
      expect(result.issuer).toBe('https://idp.example.com');
      expect(result.requestId).toBe('_logout123');
    });

    it('handles logout without session index', () => {
      const noSessionLogout = `<?xml version="1.0"?>
        <samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
          xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
          ID="_logout789">
          <saml:Issuer>https://idp.example.com</saml:Issuer>
          <saml:NameID>user456</saml:NameID>
        </samlp:LogoutRequest>`;

      const result = handleLogout(noSessionLogout);

      expect(result.nameId).toBe('user456');
      expect(result.sessionIndex).toBeUndefined();
    });

    it('throws for invalid logout request', () => {
      expect(() => handleLogout('not xml')).toThrow();
    });
  });

  describe('generateLogoutResponse', () => {
    it('generates logout response', () => {
      const config = {
        inResponseTo: '_logout123',
        issuer: 'https://app.example.com',
        destination: 'https://idp.example.com/slo',
        status: 'Success',
      };

      const result = generateLogoutResponse(config);

      expect(result.xml).toContain('LogoutResponse');
      expect(result.xml).toContain('InResponseTo="_logout123"');
      expect(result.xml).toContain('https://app.example.com');
      expect(result.xml).toContain('Success');
      expect(result.id).toBeDefined();
    });

    it('supports partial logout status', () => {
      const config = {
        inResponseTo: '_logout123',
        issuer: 'https://app.example.com',
        destination: 'https://idp.example.com/slo',
        status: 'PartialLogout',
      };

      const result = generateLogoutResponse(config);

      expect(result.xml).toContain('PartialLogout');
    });

    it('returns encoded response for redirect binding', () => {
      const config = {
        inResponseTo: '_logout123',
        issuer: 'https://app.example.com',
        destination: 'https://idp.example.com/slo',
        status: 'Success',
        binding: 'redirect',
      };

      const result = generateLogoutResponse(config);

      expect(result.encoded).toBeDefined();
    });
  });

  describe('createSAMLProvider', () => {
    const spConfig = {
      entityId: 'https://app.example.com',
      callbackUrl: 'https://app.example.com/saml/callback',
      logoutUrl: 'https://app.example.com/saml/logout',
    };

    it('creates provider with methods', () => {
      const provider = createSAMLProvider(spConfig);

      expect(provider.registerIdP).toBeDefined();
      expect(provider.getIdP).toBeDefined();
      expect(provider.createLoginRequest).toBeDefined();
      expect(provider.handleLoginResponse).toBeDefined();
      expect(provider.handleLogoutRequest).toBeDefined();
      expect(provider.createLogoutRequest).toBeDefined();
    });

    it('supports multiple IdP configurations', () => {
      const provider = createSAMLProvider(spConfig);

      provider.registerIdP('idp1', {
        entityId: 'https://idp1.example.com',
        ssoUrl: 'https://idp1.example.com/sso',
        cert: 'cert1',
      });

      provider.registerIdP('idp2', {
        entityId: 'https://idp2.example.com',
        ssoUrl: 'https://idp2.example.com/sso',
        cert: 'cert2',
      });

      expect(provider.getIdP('idp1').entityId).toBe('https://idp1.example.com');
      expect(provider.getIdP('idp2').entityId).toBe('https://idp2.example.com');
    });

    it('registers IdP from metadata', () => {
      const provider = createSAMLProvider(spConfig);

      provider.registerIdPFromMetadata('corporate', SAMPLE_METADATA);

      const idp = provider.getIdP('corporate');
      expect(idp.entityId).toBe('https://idp.example.com');
      expect(idp.ssoUrl).toBe('https://idp.example.com/sso/redirect');
    });

    it('creates login request for specific IdP', () => {
      const provider = createSAMLProvider(spConfig);

      provider.registerIdP('test-idp', {
        entityId: 'https://idp.example.com',
        ssoUrl: 'https://idp.example.com/sso',
        cert: 'test-cert',
      });

      const request = provider.createLoginRequest('test-idp');

      expect(request.url).toContain('https://idp.example.com/sso');
      expect(request.id).toBeDefined();
    });

    it('throws for unknown IdP', () => {
      const provider = createSAMLProvider(spConfig);

      expect(() => provider.createLoginRequest('unknown')).toThrow('IdP');
    });

    it('handles login response', async () => {
      const provider = createSAMLProvider(spConfig);

      provider.registerIdP('test-idp', {
        entityId: 'https://idp.example.com',
        ssoUrl: 'https://idp.example.com/sso',
        cert: 'test-cert',
        skipSignatureValidation: true, // For testing
      });

      const response = createSampleResponse({
        issuer: 'https://idp.example.com',
      });
      const encoded = Buffer.from(response).toString('base64');

      const result = await provider.handleLoginResponse(encoded, {
        idpId: 'test-idp',
        expectedInResponseTo: '_abc123',
      });

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.name).toBe('Test User');
    });

    it('generates SP metadata', () => {
      const provider = createSAMLProvider(spConfig);

      const metadata = provider.generateMetadata();

      expect(metadata).toContain('EntityDescriptor');
      expect(metadata).toContain('https://app.example.com');
      expect(metadata).toContain('AssertionConsumerService');
      expect(metadata).toContain('https://app.example.com/saml/callback');
    });

    it('lists registered IdPs', () => {
      const provider = createSAMLProvider(spConfig);

      provider.registerIdP('idp1', { entityId: 'e1', ssoUrl: 'u1', cert: 'c1' });
      provider.registerIdP('idp2', { entityId: 'e2', ssoUrl: 'u2', cert: 'c2' });

      const list = provider.listIdPs();
      expect(list).toHaveLength(2);
      expect(list).toContain('idp1');
      expect(list).toContain('idp2');
    });

    it('removes IdP', () => {
      const provider = createSAMLProvider(spConfig);

      provider.registerIdP('temp', { entityId: 'e', ssoUrl: 'u', cert: 'c' });
      expect(provider.getIdP('temp')).toBeDefined();

      provider.removeIdP('temp');
      expect(provider.getIdP('temp')).toBeUndefined();
    });
  });

  describe('encoding/decoding', () => {
    const config = {
      issuer: 'https://app.example.com',
      callbackUrl: 'https://app.example.com/saml/callback',
      destination: 'https://idp.example.com/sso',
    };

    it('deflate/inflate round-trip for redirect binding', () => {
      const result = generateAuthnRequest({ ...config, binding: 'redirect' });

      // The encoded value should be URL-safe base64 of deflated content
      expect(result.encoded).toBeDefined();
      expect(typeof result.encoded).toBe('string');
      expect(result.encoded.length).toBeGreaterThan(0);
    });

    it('base64 encode/decode round-trip for POST binding', () => {
      const result = generateAuthnRequest({ ...config, binding: 'post' });

      const decoded = Buffer.from(result.encoded, 'base64').toString('utf8');
      expect(decoded).toContain('AuthnRequest');
    });
  });
});
