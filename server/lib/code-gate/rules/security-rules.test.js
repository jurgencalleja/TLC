/**
 * Security Rules Tests
 *
 * Detects eval(), innerHTML, SQL injection patterns,
 * and other security anti-patterns.
 */
import { describe, it, expect } from 'vitest';

const {
  checkEvalUsage,
  checkInnerHtml,
  checkSqlInjection,
  checkDisabledSecurity,
} = require('./security-rules.js');

describe('Security Rules', () => {
  describe('checkEvalUsage', () => {
    it('detects eval()', () => {
      const findings = checkEvalUsage('app.js', 'eval(userInput);');
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-eval');
      expect(findings[0].severity).toBe('block');
    });

    it('detects new Function()', () => {
      const findings = checkEvalUsage('app.js', 'const fn = new Function("return " + code);');
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-eval');
    });

    it('detects setTimeout with string arg', () => {
      const findings = checkEvalUsage('app.js', 'setTimeout("alert(1)", 1000);');
      expect(findings).toHaveLength(1);
    });

    it('passes setTimeout with function arg', () => {
      const findings = checkEvalUsage('app.js', 'setTimeout(() => alert(1), 1000);');
      expect(findings).toHaveLength(0);
    });

    it('passes clean code', () => {
      const findings = checkEvalUsage('app.js', 'const result = compute(input);');
      expect(findings).toHaveLength(0);
    });

    it('ignores test files', () => {
      const findings = checkEvalUsage('app.test.js', 'eval("test code");');
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkInnerHtml', () => {
    it('detects innerHTML assignment', () => {
      const findings = checkInnerHtml('ui.js', 'element.innerHTML = userInput;');
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-inner-html');
      expect(findings[0].severity).toBe('block');
    });

    it('detects dangerouslySetInnerHTML', () => {
      const findings = checkInnerHtml('ui.jsx', 'dangerouslySetInnerHTML={{ __html: data }}');
      expect(findings).toHaveLength(1);
    });

    it('detects outerHTML', () => {
      const findings = checkInnerHtml('ui.js', 'el.outerHTML = markup;');
      expect(findings).toHaveLength(1);
    });

    it('passes textContent', () => {
      const findings = checkInnerHtml('ui.js', 'element.textContent = userInput;');
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkSqlInjection', () => {
    it('detects string concatenation in SQL', () => {
      const code = 'const query = "SELECT * FROM users WHERE id = " + userId;';
      const findings = checkSqlInjection('db.js', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-sql-injection');
      expect(findings[0].severity).toBe('block');
    });

    it('detects template literal in SQL', () => {
      const code = 'const query = `SELECT * FROM users WHERE id = ${userId}`;';
      const findings = checkSqlInjection('db.js', code);
      expect(findings).toHaveLength(1);
    });

    it('passes parameterized queries', () => {
      const code = 'const query = "SELECT * FROM users WHERE id = $1";';
      const findings = checkSqlInjection('db.js', code);
      expect(findings).toHaveLength(0);
    });

    it('passes query builder patterns', () => {
      const code = 'db.query("SELECT * FROM users WHERE id = ?", [userId]);';
      const findings = checkSqlInjection('db.js', code);
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkDisabledSecurity', () => {
    it('detects disabled HTTPS verification', () => {
      const code = 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";';
      const findings = checkDisabledSecurity('server.js', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-disabled-security');
      expect(findings[0].severity).toBe('block');
    });

    it('detects rejectUnauthorized false', () => {
      const code = '{ rejectUnauthorized: false }';
      const findings = checkDisabledSecurity('api.js', code);
      expect(findings).toHaveLength(1);
    });

    it('detects disabled CORS', () => {
      const code = "app.use(cors({ origin: '*' }));";
      const findings = checkDisabledSecurity('server.js', code);
      expect(findings).toHaveLength(1);
    });

    it('passes proper CORS config', () => {
      const code = "app.use(cors({ origin: allowedOrigins }));";
      const findings = checkDisabledSecurity('server.js', code);
      expect(findings).toHaveLength(0);
    });
  });
});
