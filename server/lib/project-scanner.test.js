import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { ProjectScanner } = await import('./project-scanner.js');

describe('ProjectScanner', () => {
  let tempDir;
  let scanner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-scanner-test-'));
    scanner = new ProjectScanner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper: create a minimal TLC project directory structure
   */
  function createTlcProject(parentDir, name, options = {}) {
    const projectDir = path.join(parentDir, name);
    fs.mkdirSync(projectDir, { recursive: true });

    // .tlc.json
    if (options.tlcJson !== false) {
      fs.writeFileSync(
        path.join(projectDir, '.tlc.json'),
        JSON.stringify(options.tlcJson || { name })
      );
    }

    // package.json
    if (options.packageJson !== false) {
      const pkg = options.packageJson || { name, version: '1.0.0' };
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify(pkg)
      );
    }

    // .planning directory
    if (options.planning !== false) {
      fs.mkdirSync(path.join(projectDir, '.planning'), { recursive: true });
    }

    // .git directory
    if (options.git !== false) {
      fs.mkdirSync(path.join(projectDir, '.git'), { recursive: true });
    }

    // ROADMAP.md
    if (options.roadmap) {
      fs.writeFileSync(
        path.join(projectDir, '.planning', 'ROADMAP.md'),
        options.roadmap
      );
    }

    return projectDir;
  }

  // Test 1: Discovers project with .tlc.json
  it('discovers project with .tlc.json', () => {
    createTlcProject(tempDir, 'alpha-project');

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('alpha-project');
    expect(results[0].hasTlc).toBe(true);
  });

  // Test 2: Discovers project with .planning/ directory (no .tlc.json)
  it('discovers project with .planning/ directory (no .tlc.json)', () => {
    createTlcProject(tempDir, 'planning-only', {
      tlcJson: false,
      packageJson: { name: 'planning-only', version: '2.0.0' },
    });

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('planning-only');
    expect(results[0].hasTlc).toBe(false);
    expect(results[0].hasPlanning).toBe(true);
  });

  // Test 3: Discovers candidate project with package.json + .git/ (marked hasTlc: false)
  it('discovers candidate project with package.json + .git/ (marked hasTlc: false)', () => {
    createTlcProject(tempDir, 'candidate-project', {
      tlcJson: false,
      planning: false,
      packageJson: { name: 'candidate-project', version: '0.1.0' },
      git: true,
    });

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('candidate-project');
    expect(results[0].hasTlc).toBe(false);
    expect(results[0].hasPlanning).toBe(false);
    expect(results[0].version).toBe('0.1.0');
  });

  // Test 4: Skips node_modules directories
  it('skips node_modules directories', () => {
    // Create a project inside node_modules — should be ignored
    const nmDir = path.join(tempDir, 'node_modules');
    fs.mkdirSync(nmDir, { recursive: true });
    createTlcProject(nmDir, 'hidden-project');

    // Create a valid project at the top level
    createTlcProject(tempDir, 'visible-project');

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('visible-project');
  });

  // Test 5: Skips all ignored directories (dist, build, coverage, etc.)
  it('skips all ignored directories (dist, build, coverage, vendor, .next, .nuxt)', () => {
    const ignoreDirs = ['dist', 'build', 'coverage', 'vendor', '.next', '.nuxt'];

    for (const dir of ignoreDirs) {
      const ignored = path.join(tempDir, dir);
      fs.mkdirSync(ignored, { recursive: true });
      createTlcProject(ignored, `project-in-${dir}`);
    }

    // One valid project
    createTlcProject(tempDir, 'valid-project');

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('valid-project');
  });

  // Test 6: Respects depth limit (default 5)
  it('respects depth limit (default 5)', () => {
    // Create a project nested 4 levels deep — within default depth of 5
    let nested = tempDir;
    for (let i = 0; i < 4; i++) {
      nested = path.join(nested, `level${i}`);
      fs.mkdirSync(nested, { recursive: true });
    }
    createTlcProject(nested, 'deep-project');

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('deep-project');
  });

  // Test 7: Depth 1 only scans immediate children
  it('depth 1 only scans immediate children', () => {
    const shallowScanner = new ProjectScanner({ scanDepth: 1 });

    // Immediate child — should be found
    createTlcProject(tempDir, 'shallow-project');

    // Nested one level deeper — should NOT be found
    const subDir = path.join(tempDir, 'subdir');
    fs.mkdirSync(subDir, { recursive: true });
    createTlcProject(subDir, 'nested-project');

    const results = shallowScanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('shallow-project');
  });

  // Test 8: Returns empty array for empty root directory
  it('returns empty array for empty root directory', () => {
    const results = scanner.scan([tempDir]);

    expect(results).toEqual([]);
  });

  // Test 9: Handles multiple root paths
  it('handles multiple root paths', () => {
    const root1 = fs.mkdtempSync(path.join(os.tmpdir(), 'root1-'));
    const root2 = fs.mkdtempSync(path.join(os.tmpdir(), 'root2-'));

    try {
      createTlcProject(root1, 'project-a');
      createTlcProject(root2, 'project-b');

      const results = scanner.scan([root1, root2]);

      expect(results).toHaveLength(2);
      const names = results.map(r => r.name);
      expect(names).toContain('project-a');
      expect(names).toContain('project-b');
    } finally {
      fs.rmSync(root1, { recursive: true, force: true });
      fs.rmSync(root2, { recursive: true, force: true });
    }
  });

  // Test 10: Deduplicates projects found in overlapping roots
  it('deduplicates projects found in overlapping roots', () => {
    createTlcProject(tempDir, 'unique-project');

    // Pass the same root twice
    const results = scanner.scan([tempDir, tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('unique-project');
  });

  // Test 11: Caches results on repeated calls within TTL
  it('caches results on repeated calls within TTL', () => {
    createTlcProject(tempDir, 'cached-project');

    const results1 = scanner.scan([tempDir]);
    expect(results1).toHaveLength(1);

    // Remove the project on disk
    fs.rmSync(path.join(tempDir, 'cached-project'), { recursive: true, force: true });

    // Second scan within TTL should return cached results
    const results2 = scanner.scan([tempDir]);
    expect(results2).toHaveLength(1);
    expect(results2[0].name).toBe('cached-project');
  });

  // Test 12: Force re-scan bypasses cache
  it('force re-scan bypasses cache', () => {
    createTlcProject(tempDir, 'cached-project');

    const results1 = scanner.scan([tempDir]);
    expect(results1).toHaveLength(1);

    // Remove the project on disk
    fs.rmSync(path.join(tempDir, 'cached-project'), { recursive: true, force: true });

    // Force re-scan should see the project is gone
    const results2 = scanner.scan([tempDir], { force: true });
    expect(results2).toHaveLength(0);
  });

  // Test 13: Handles permission denied errors gracefully
  it('handles permission denied errors gracefully', () => {
    createTlcProject(tempDir, 'accessible-project');

    // Create a directory that can't be read
    const restrictedDir = path.join(tempDir, 'restricted');
    fs.mkdirSync(restrictedDir, { recursive: true });
    fs.chmodSync(restrictedDir, 0o000);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const results = scanner.scan([tempDir]);

      // Should still find the accessible project
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('accessible-project');

      // Should have logged a warning about the restricted dir
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      // Restore permissions for cleanup
      fs.chmodSync(restrictedDir, 0o755);
    }
  });

  // Test 14: Returns project metadata (name, version from package.json)
  it('returns project metadata (name, version from package.json)', () => {
    createTlcProject(tempDir, 'meta-project', {
      packageJson: { name: 'meta-project', version: '3.2.1' },
    });

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('meta-project');
    expect(results[0].path).toBe(path.join(tempDir, 'meta-project'));
    expect(results[0].version).toBe('3.2.1');
    expect(results[0].hasTlc).toBe(true);
    expect(results[0].hasPlanning).toBe(true);
  });

  // Test 15: Reads phase info from ROADMAP.md (heading format)
  it('reads phase info from ROADMAP.md (heading format)', () => {
    const roadmap = [
      '# Roadmap',
      '',
      '### Phase 1: Core Infrastructure [x]',
      '',
      '### Phase 2: Test Quality [x]',
      '',
      '### Phase 3: Dev Server [>]',
      '',
      '### Phase 4: API Docs [ ]',
      '',
      '### Phase 5: CI/CD [ ]',
    ].join('\n');

    createTlcProject(tempDir, 'roadmap-heading-project', { roadmap });

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].phase).toBe(3);
    expect(results[0].phaseName).toBe('Dev Server');
    expect(results[0].totalPhases).toBe(5);
    expect(results[0].completedPhases).toBe(2);
  });

  // Test 16: Reads phase info from ROADMAP.md (table format)
  it('reads phase info from ROADMAP.md (table format)', () => {
    const roadmap = [
      '# Roadmap',
      '',
      '| # | Phase | Status |',
      '|---|-------|--------|',
      '| 1 | [Auth](./phases/1-PLAN.md) | complete |',
      '| 2 | [API](./phases/2-PLAN.md) | done |',
      '| 3 | [UI](./phases/3-PLAN.md) | active |',
      '| 4 | [Deploy](./phases/4-PLAN.md) | pending |',
    ].join('\n');

    createTlcProject(tempDir, 'roadmap-table-project', { roadmap });

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].phase).toBe(3);
    expect(results[0].phaseName).toBe('UI');
    expect(results[0].totalPhases).toBe(4);
    expect(results[0].completedPhases).toBe(2);
  });

  // Test 17: Projects sorted alphabetically by name
  it('projects sorted alphabetically by name', () => {
    createTlcProject(tempDir, 'zulu-project');
    createTlcProject(tempDir, 'alpha-project');
    createTlcProject(tempDir, 'mike-project');

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(3);
    expect(results[0].name).toBe('alpha-project');
    expect(results[1].name).toBe('mike-project');
    expect(results[2].name).toBe('zulu-project');
  });

  // Test 18: Handles root path that doesn't exist (returns empty, logs warning)
  it('handles root path that does not exist (returns empty, logs warning)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const results = scanner.scan(['/tmp/nonexistent-root-path-xyz-123']);

      expect(results).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/nonexistent-root-path-xyz-123')
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  // Test 19: Scan progress callback reports discovered count
  it('scan progress callback reports discovered count', () => {
    createTlcProject(tempDir, 'project-one');
    createTlcProject(tempDir, 'project-two');

    const progressCounts = [];
    const onProgress = (count) => progressCounts.push(count);

    const results = scanner.scan([tempDir], { onProgress });

    expect(results).toHaveLength(2);
    // Progress callback should have been called at least once
    expect(progressCounts.length).toBeGreaterThanOrEqual(1);
    // The last reported count should match total found
    expect(progressCounts[progressCounts.length - 1]).toBe(2);
  });

  // =========================================================================
  // Phase 79 — Task 1: Stop recursion at project boundaries
  // =========================================================================

  // Test 20: Does NOT recurse into subdirectories of a detected project
  it('does not recurse into subdirectories of a detected project', () => {
    // Create a TLC project with a nested sub-package that also looks like a project
    const projectDir = createTlcProject(tempDir, 'monorepo-project');
    const subPkgDir = path.join(projectDir, 'packages', 'sub-package');
    fs.mkdirSync(subPkgDir, { recursive: true });
    fs.writeFileSync(path.join(subPkgDir, 'package.json'), JSON.stringify({ name: 'sub-package' }));
    fs.mkdirSync(path.join(subPkgDir, '.git'), { recursive: true });

    const results = scanner.scan([tempDir]);

    // Should only find the parent project, not the sub-package
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('monorepo-project');
  });

  // Test 21: TLC project's server/ subdirectory not listed separately
  it('does not list subdirectories of a TLC project as separate projects', () => {
    const projectDir = createTlcProject(tempDir, 'tlc-project');
    // Create a server/ subdirectory with its own package.json + .git
    const serverDir = path.join(projectDir, 'server');
    fs.mkdirSync(serverDir, { recursive: true });
    fs.writeFileSync(path.join(serverDir, 'package.json'), JSON.stringify({ name: 'tlc-server' }));
    fs.mkdirSync(path.join(serverDir, '.git'), { recursive: true });

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('tlc-project');
  });

  // Test 22: Top-level non-project directories are still traversed
  it('still traverses non-project directories to find nested projects', () => {
    // Create a plain directory (not a project) with a project nested inside
    const groupDir = path.join(tempDir, 'my-workspace');
    fs.mkdirSync(groupDir, { recursive: true });
    // No .tlc.json, no .planning, no package.json+.git — just a folder
    createTlcProject(groupDir, 'nested-real-project');

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('nested-real-project');
  });

  // Test 23: Multiple projects at same level, none recurse into children
  it('finds sibling projects but does not recurse into either', () => {
    const projA = createTlcProject(tempDir, 'project-a');
    const projB = createTlcProject(tempDir, 'project-b');

    // Add nested sub-projects inside each
    const nestedA = path.join(projA, 'nested');
    fs.mkdirSync(nestedA, { recursive: true });
    fs.writeFileSync(path.join(nestedA, '.tlc.json'), '{}');

    const nestedB = path.join(projB, 'apps', 'frontend');
    fs.mkdirSync(nestedB, { recursive: true });
    fs.writeFileSync(path.join(nestedB, 'package.json'), JSON.stringify({ name: 'frontend' }));
    fs.mkdirSync(path.join(nestedB, '.git'), { recursive: true });

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(2);
    const names = results.map(r => r.name);
    expect(names).toContain('project-a');
    expect(names).toContain('project-b');
  });

  // =========================================================================
  // Phase 79 — Task 2: Monorepo sub-package metadata
  // =========================================================================

  // Test 24: Detects npm workspaces array format
  it('detects npm workspaces and returns isMonorepo: true', () => {
    createTlcProject(tempDir, 'npm-monorepo', {
      packageJson: {
        name: 'npm-monorepo',
        version: '1.0.0',
        workspaces: ['packages/*'],
      },
    });

    // Create a matching sub-package directory
    const pkgDir = path.join(tempDir, 'npm-monorepo', 'packages', 'core');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: '@mono/core' }));

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].isMonorepo).toBe(true);
    expect(results[0].workspaces).toBeInstanceOf(Array);
    expect(results[0].workspaces.length).toBeGreaterThanOrEqual(1);
  });

  // Test 25: Detects yarn workspaces object format
  it('detects yarn workspaces object format', () => {
    createTlcProject(tempDir, 'yarn-monorepo', {
      packageJson: {
        name: 'yarn-monorepo',
        version: '1.0.0',
        workspaces: { packages: ['packages/*'] },
      },
    });

    const pkgDir = path.join(tempDir, 'yarn-monorepo', 'packages', 'utils');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: '@mono/utils' }));

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].isMonorepo).toBe(true);
    expect(results[0].workspaces).toBeInstanceOf(Array);
    expect(results[0].workspaces.length).toBeGreaterThanOrEqual(1);
  });

  // Test 26: Non-monorepo returns isMonorepo: false and empty workspaces
  it('returns isMonorepo false and empty workspaces for regular project', () => {
    createTlcProject(tempDir, 'regular-project', {
      packageJson: { name: 'regular-project', version: '1.0.0' },
    });

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].isMonorepo).toBe(false);
    expect(results[0].workspaces).toEqual([]);
  });

  // Test 27: Monorepo with no matching workspace directories
  it('returns empty workspaces when glob pattern matches nothing', () => {
    createTlcProject(tempDir, 'empty-mono', {
      packageJson: {
        name: 'empty-mono',
        version: '1.0.0',
        workspaces: ['packages/*'],
      },
    });
    // Don't create the packages/ directory at all

    const results = scanner.scan([tempDir]);

    expect(results).toHaveLength(1);
    expect(results[0].isMonorepo).toBe(true);
    expect(results[0].workspaces).toEqual([]);
  });
});
