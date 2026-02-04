/**
 * Secure Code Command Tests
 *
 * CLI for secure code generation
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  SecureCodeCommand,
  parseArgs,
  formatSecurityReport,
} = require('./secure-code-command.js');

describe('Secure Code Command', () => {
  let command;

  beforeEach(() => {
    command = new SecureCodeCommand();
  });

  describe('execute scan', () => {
    it('scans file for security issues', async () => {
      command._readFile = async () => `
        const password = 'secret123';
        const query = "SELECT * FROM users WHERE id = " + userId;
      `;

      const result = await command.execute('scan /path/to/file.js');

      assert.ok(result.success);
      assert.ok(result.issues.length > 0);
    });

    it('reports hardcoded secrets', async () => {
      command._readFile = async () => `
        const apiKey = 'sk_live_abc123';
      `;

      const result = await command.execute('scan /path/to/file.js');

      assert.ok(result.issues.some(i => i.type === 'hardcoded-secret'));
    });

    it('reports SQL injection vulnerabilities', async () => {
      command._readFile = async () => `
        db.query("SELECT * FROM users WHERE id = " + req.params.id);
      `;

      const result = await command.execute('scan /path/to/file.js');

      assert.ok(result.issues.some(i => i.type === 'sql-injection'));
    });

    it('reports XSS vulnerabilities', async () => {
      command._readFile = async () => `
        res.send('<div>' + userInput + '</div>');
      `;

      const result = await command.execute('scan /path/to/file.js');

      assert.ok(result.issues.some(i => i.type === 'xss'));
    });

    it('reports command injection', async () => {
      command._readFile = async () => `
        exec('ls ' + userDir);
      `;

      const result = await command.execute('scan /path/to/file.js');

      assert.ok(result.issues.some(i => i.type === 'command-injection'));
    });
  });

  describe('execute generate', () => {
    it('generates secure input validation', async () => {
      const result = await command.execute('generate input-validation --type email');

      assert.ok(result.success);
      assert.ok(result.code);
      assert.ok(result.code.includes('email'));
    });

    it('generates secure auth code', async () => {
      const result = await command.execute('generate auth --features hash,rateLimit');

      assert.ok(result.success);
      assert.ok(result.code);
    });

    it('generates secure error handling', async () => {
      const result = await command.execute('generate error-handler --framework express');

      assert.ok(result.success);
      assert.ok(result.code);
    });

    it('generates CSP header', async () => {
      const result = await command.execute('generate csp');

      assert.ok(result.success);
      assert.ok(result.code);
    });

    it('generates CORS config', async () => {
      const result = await command.execute('generate cors --origins https://example.com');

      assert.ok(result.success);
      assert.ok(result.code);
    });
  });

  describe('execute fix', () => {
    it('fixes hardcoded secrets', async () => {
      command._readFile = async () => `
        const apiKey = 'secret123';
      `;

      const result = await command.execute('fix /path/to/file.js --type hardcoded-secret');

      assert.ok(result.success);
      assert.ok(result.fixed.includes('process.env'));
    });

    it('fixes SQL injection', async () => {
      command._readFile = async () => `
        db.query("SELECT * FROM users WHERE id = " + id);
      `;

      const result = await command.execute('fix /path/to/file.js --type sql-injection');

      assert.ok(result.success);
      assert.ok(result.fixed.includes('?') || result.fixed.includes('$1'));
    });

    it('fixes XSS vulnerabilities', async () => {
      command._readFile = async () => `
        res.send('<div>' + userInput + '</div>');
      `;

      const result = await command.execute('fix /path/to/file.js --type xss');

      assert.ok(result.success);
      assert.ok(result.fixed.includes('escape') || result.fixed.includes('encode'));
    });

    it('generates diff for review', async () => {
      command._readFile = async () => `const secret = 'abc';`;

      const result = await command.execute('fix /path/to/file.js --diff');

      assert.ok(result.diff);
    });
  });

  describe('execute audit', () => {
    it('runs full security audit', async () => {
      command._listFiles = async () => ['file1.js', 'file2.js'];
      command._readFile = async () => 'const x = 1;';

      const result = await command.execute('audit /path/to/project');

      assert.ok(result.success);
      assert.ok(result.summary);
    });

    it('categorizes issues by severity', async () => {
      command._listFiles = async () => ['file.js'];
      command._readFile = async () => `
        const secret = 'abc123';
        db.query("SELECT * FROM " + table);
      `;

      const result = await command.execute('audit /path/to/project');

      assert.ok(result.summary.critical !== undefined || result.summary.high !== undefined);
    });

    it('generates SARIF output', async () => {
      command._listFiles = async () => ['file.js'];
      command._readFile = async () => 'const x = 1;';

      const result = await command.execute('audit /path/to/project --format sarif');

      assert.ok(result.sarif || result.format === 'sarif');
    });

    it('generates JSON output', async () => {
      command._listFiles = async () => ['file.js'];
      command._readFile = async () => 'const x = 1;';

      const result = await command.execute('audit /path/to/project --format json');

      assert.ok(result.format === 'json' || typeof result.output === 'object');
    });
  });

  describe('execute check', () => {
    it('checks OWASP compliance', async () => {
      command._listFiles = async () => ['file.js'];
      command._readFile = async () => 'const x = 1;';

      const result = await command.execute('check owasp /path/to/project');

      assert.ok(result.success !== undefined);
      assert.ok(result.compliance);
    });

    it('checks specific OWASP category', async () => {
      command._listFiles = async () => ['file.js'];
      command._readFile = async () => 'const x = 1;';

      const result = await command.execute('check owasp /path/to/project --category A01');

      assert.ok(result.category === 'A01' || result.compliance);
    });
  });

  describe('parseArgs', () => {
    it('parses scan command', () => {
      const args = parseArgs('scan /path/to/file.js');

      assert.strictEqual(args.command, 'scan');
      assert.strictEqual(args.path, '/path/to/file.js');
    });

    it('parses generate command with type', () => {
      const args = parseArgs('generate input-validation --type email');

      assert.strictEqual(args.command, 'generate');
      assert.strictEqual(args.type, 'email');
    });

    it('parses fix command with type', () => {
      const args = parseArgs('fix /path/to/file.js --type sql-injection');

      assert.strictEqual(args.command, 'fix');
      assert.strictEqual(args.type, 'sql-injection');
    });

    it('parses audit command with format', () => {
      const args = parseArgs('audit /path/to/project --format sarif');

      assert.strictEqual(args.command, 'audit');
      assert.strictEqual(args.format, 'sarif');
    });

    it('parses framework option', () => {
      const args = parseArgs('generate error-handler --framework express');

      assert.strictEqual(args.framework, 'express');
    });

    it('parses language option', () => {
      const args = parseArgs('generate auth --language typescript');

      assert.strictEqual(args.language, 'typescript');
    });
  });

  describe('formatSecurityReport', () => {
    it('formats issues by severity', () => {
      const issues = [
        { type: 'hardcoded-secret', severity: 'critical', file: 'a.js', line: 1 },
        { type: 'sql-injection', severity: 'high', file: 'b.js', line: 5 },
      ];

      const report = formatSecurityReport(issues);

      assert.ok(report.includes('critical') || report.includes('Critical'));
      assert.ok(report.includes('high') || report.includes('High'));
    });

    it('shows file and line numbers', () => {
      const issues = [
        { type: 'xss', severity: 'high', file: 'src/app.js', line: 42 },
      ];

      const report = formatSecurityReport(issues);

      assert.ok(report.includes('src/app.js') || report.includes('42'));
    });

    it('includes remediation suggestions', () => {
      const issues = [
        { type: 'sql-injection', severity: 'high', suggestion: 'Use parameterized queries' },
      ];

      const report = formatSecurityReport(issues, { showRemediation: true });

      assert.ok(report.includes('parameterized') || report.includes('suggestion'));
    });

    it('generates summary statistics', () => {
      const issues = [
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'high' },
        { severity: 'medium' },
      ];

      const report = formatSecurityReport(issues, { showSummary: true });

      assert.ok(report.includes('1') && report.includes('2')); // 1 critical, 2 high
    });
  });
});
