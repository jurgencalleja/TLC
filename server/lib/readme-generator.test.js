import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { ReadmeGenerator, generateReadme, createReadmeGenerator } = await import('./readme-generator.js');

describe('ReadmeGenerator', () => {
  let tempDir;
  let generator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-gen-test-'));
    generator = new ReadmeGenerator(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractProjectInfo', () => {
    it('extracts project name and description from package.json', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'my-awesome-project',
          description: 'A project that does awesome things',
        })
      );

      const info = generator.extractProjectInfo();

      expect(info.name).toBe('my-awesome-project');
      expect(info.description).toBe('A project that does awesome things');
    });

    it('handles scoped package names', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: '@myorg/my-package',
          description: 'Scoped package',
        })
      );

      const info = generator.extractProjectInfo();

      expect(info.name).toBe('@myorg/my-package');
    });

    it('returns defaults when package.json is missing', () => {
      const info = generator.extractProjectInfo();

      expect(info.name).toBe(path.basename(tempDir));
      expect(info.description).toBe('');
    });

    it('handles package.json with missing fields', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ version: '1.0.0' })
      );

      const info = generator.extractProjectInfo();

      expect(info.name).toBe(path.basename(tempDir));
      expect(info.description).toBe('');
    });
  });

  describe('extractScripts', () => {
    it('detects and documents scripts (build, test, start)', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'tsc',
            test: 'vitest',
            start: 'node dist/index.js',
            lint: 'eslint .',
          },
        })
      );

      const scripts = generator.extractScripts();

      expect(scripts).toContainEqual({ name: 'build', command: 'tsc' });
      expect(scripts).toContainEqual({ name: 'test', command: 'vitest' });
      expect(scripts).toContainEqual({ name: 'start', command: 'node dist/index.js' });
      expect(scripts).toContainEqual({ name: 'lint', command: 'eslint .' });
    });

    it('returns empty array when no scripts', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'no-scripts' })
      );

      const scripts = generator.extractScripts();

      expect(scripts).toEqual([]);
    });

    it('returns empty array when package.json is missing', () => {
      const scripts = generator.extractScripts();

      expect(scripts).toEqual([]);
    });
  });

  describe('extractDependencies', () => {
    it('lists runtime dependencies', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'dep-test',
          dependencies: {
            express: '^4.18.0',
            lodash: '^4.17.21',
          },
        })
      );

      const deps = generator.extractDependencies();

      expect(deps.runtime).toContainEqual({ name: 'express', version: '^4.18.0' });
      expect(deps.runtime).toContainEqual({ name: 'lodash', version: '^4.17.21' });
    });

    it('lists dev dependencies', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'dev-dep-test',
          devDependencies: {
            vitest: '^1.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const deps = generator.extractDependencies();

      expect(deps.dev).toContainEqual({ name: 'vitest', version: '^1.0.0' });
      expect(deps.dev).toContainEqual({ name: 'typescript', version: '^5.0.0' });
    });

    it('returns empty arrays when no dependencies', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'no-deps' })
      );

      const deps = generator.extractDependencies();

      expect(deps.runtime).toEqual([]);
      expect(deps.dev).toEqual([]);
    });
  });

  describe('extractEnvVars', () => {
    it('documents environment variables from .env.example', () => {
      fs.writeFileSync(
        path.join(tempDir, '.env.example'),
        `# Database configuration
DATABASE_URL=postgres://localhost:5432/mydb
# API keys
API_KEY=your-api-key-here
SECRET_TOKEN=
PORT=3000
`
      );

      const envVars = generator.extractEnvVars();

      expect(envVars).toContainEqual({
        name: 'DATABASE_URL',
        example: 'postgres://localhost:5432/mydb',
        comment: 'Database configuration',
      });
      expect(envVars).toContainEqual({
        name: 'API_KEY',
        example: 'your-api-key-here',
        comment: 'API keys',
      });
      expect(envVars).toContainEqual({
        name: 'SECRET_TOKEN',
        example: '',
        comment: '',
      });
      expect(envVars).toContainEqual({
        name: 'PORT',
        example: '3000',
        comment: '',
      });
    });

    it('returns empty array when .env.example is missing', () => {
      const envVars = generator.extractEnvVars();

      expect(envVars).toEqual([]);
    });

    it('handles .env.example with no variables', () => {
      fs.writeFileSync(
        path.join(tempDir, '.env.example'),
        '# Just comments\n# No actual variables\n'
      );

      const envVars = generator.extractEnvVars();

      expect(envVars).toEqual([]);
    });
  });

  describe('detectApiEndpoints', () => {
    it('documents API endpoints if detected', () => {
      // Create a simple route file
      fs.mkdirSync(path.join(tempDir, 'src', 'routes'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'src', 'routes', 'users.js'),
        `
const express = require('express');
const router = express.Router();

router.get('/users', (req, res) => {
  res.json([]);
});

router.post('/users', (req, res) => {
  res.status(201).json({ id: 1 });
});

router.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});

module.exports = router;
`
      );

      const endpoints = generator.detectApiEndpoints();

      expect(endpoints.length).toBeGreaterThan(0);
      expect(endpoints.some(e => e.method === 'GET' && e.path.includes('users'))).toBe(true);
      expect(endpoints.some(e => e.method === 'POST' && e.path.includes('users'))).toBe(true);
    });

    it('returns empty array when no routes found', () => {
      const endpoints = generator.detectApiEndpoints();

      expect(endpoints).toEqual([]);
    });
  });

  describe('generateInstallationSection', () => {
    it('includes installation instructions', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );

      const section = generator.generateInstallationSection();

      expect(section).toContain('npm install');
      expect(section).toContain('Installation');
    });

    it('includes git clone if repo is specified', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          repository: {
            url: 'https://github.com/user/repo.git',
          },
        })
      );

      const section = generator.generateInstallationSection();

      expect(section).toContain('git clone');
    });
  });

  describe('generate', () => {
    it('generates README with project name and description', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'my-project',
          description: 'Does wonderful things',
        })
      );

      const readme = generator.generate();

      expect(readme).toContain('# my-project');
      expect(readme).toContain('Does wonderful things');
    });

    it('includes npm scripts documentation', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'scripted-project',
          scripts: {
            test: 'vitest',
            build: 'tsc',
          },
        })
      );

      const readme = generator.generate();

      expect(readme).toContain('npm run test');
      expect(readme).toContain('npm run build');
    });

    it('lists key dependencies', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'with-deps',
          dependencies: {
            express: '^4.18.0',
            pg: '^8.11.0',
          },
        })
      );

      const readme = generator.generate();

      expect(readme).toContain('express');
      expect(readme).toContain('Dependencies');
    });

    it('documents env vars from .env.example', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'env-project' })
      );
      fs.writeFileSync(
        path.join(tempDir, '.env.example'),
        'DATABASE_URL=postgres://localhost/db\nAPI_KEY=your-key\n'
      );

      const readme = generator.generate();

      expect(readme).toContain('DATABASE_URL');
      expect(readme).toContain('Environment Variables');
    });

    it('includes installation section', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'installable' })
      );

      const readme = generator.generate();

      expect(readme).toContain('## Installation');
      expect(readme).toContain('npm install');
    });

    it('skips sections with no content', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'minimal-project' })
      );

      const readme = generator.generate();

      // Should have title but skip empty sections
      expect(readme).toContain('# minimal-project');
      // Should not have Environment Variables section if no .env.example
      expect(readme).not.toContain('## Environment Variables');
    });

    it('formats markdown correctly', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'formatted-project',
          description: 'Test project',
          scripts: { test: 'vitest' },
        })
      );

      const readme = generator.generate();

      // Should have proper markdown structure
      expect(readme).toMatch(/^# formatted-project/);
      expect(readme).toMatch(/## \w+/); // At least one h2 section
      expect(readme).toContain('```'); // Code blocks for commands
    });
  });

  describe('write', () => {
    it('writes README.md to disk', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'writeable-project' })
      );

      generator.write();

      const readmePath = path.join(tempDir, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);

      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toContain('# writeable-project');
    });

    it('accepts custom output path', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'custom-path-project' })
      );

      const customPath = path.join(tempDir, 'docs', 'README.md');
      fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });

      generator.write(customPath);

      expect(fs.existsSync(customPath)).toBe(true);
    });
  });
});

describe('generateReadme', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-fn-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('is a convenience function that generates readme for a path', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'convenience-project',
        description: 'Quick generation',
      })
    );

    const readme = generateReadme(tempDir);

    expect(readme).toContain('# convenience-project');
    expect(readme).toContain('Quick generation');
  });
});

describe('createReadmeGenerator', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-factory-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a generator with methods', () => {
    const gen = createReadmeGenerator(tempDir);

    expect(gen.generate).toBeDefined();
    expect(gen.write).toBeDefined();
    expect(gen.extractProjectInfo).toBeDefined();
    expect(gen.extractScripts).toBeDefined();
    expect(gen.extractDependencies).toBeDefined();
    expect(gen.extractEnvVars).toBeDefined();
    expect(gen.detectApiEndpoints).toBeDefined();
  });

  it('generates readme through factory instance', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'factory-project' })
    );

    const gen = createReadmeGenerator(tempDir);
    const readme = gen.generate();

    expect(readme).toContain('# factory-project');
  });
});
