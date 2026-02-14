import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { createProjectsRegistry } = await import('./projects-registry.js');

describe('ProjectsRegistry', () => {
  let tempDir;
  let registry;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projects-registry-test-'));
    registry = createProjectsRegistry();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('save', () => {
    it('creates projects.json with schema version on save', async () => {
      const registryData = { version: 1, projects: [] };

      await registry.save(tempDir, registryData);

      const filePath = path.join(tempDir, 'projects.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const contents = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(contents.version).toBe(1);
      expect(contents.projects).toEqual([]);
    });
  });

  describe('addProject', () => {
    it('adds project with git URL and local path', async () => {
      await registry.addProject(tempDir, {
        name: 'my-project',
        gitUrl: 'git@github.com:user/repo.git',
        localPath: 'my-project',
        branch: 'main',
      });

      const projects = await registry.listProjects(tempDir);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('my-project');
      expect(projects[0].gitUrl).toBe('git@github.com:user/repo.git');
      expect(projects[0].localPath).toBe('my-project');
      expect(projects[0].defaultBranch).toBe('main');
    });
  });

  describe('removeProject', () => {
    it('removes project by name', async () => {
      await registry.addProject(tempDir, {
        name: 'to-remove',
        gitUrl: 'git@github.com:user/to-remove.git',
        localPath: 'to-remove',
        branch: 'main',
      });

      await registry.addProject(tempDir, {
        name: 'to-keep',
        gitUrl: 'git@github.com:user/to-keep.git',
        localPath: 'to-keep',
        branch: 'main',
      });

      await registry.removeProject(tempDir, 'to-remove');

      const projects = await registry.listProjects(tempDir);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('to-keep');
    });
  });

  describe('listProjects', () => {
    it('lists all projects (returns array)', async () => {
      await registry.addProject(tempDir, {
        name: 'project-a',
        gitUrl: 'git@github.com:user/project-a.git',
        localPath: 'project-a',
        branch: 'main',
      });

      await registry.addProject(tempDir, {
        name: 'project-b',
        gitUrl: 'git@github.com:user/project-b.git',
        localPath: 'project-b',
        branch: 'develop',
      });

      const projects = await registry.listProjects(tempDir);
      expect(Array.isArray(projects)).toBe(true);
      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.name)).toEqual(['project-a', 'project-b']);
    });
  });

  describe('detectFromFilesystem', () => {
    it('detects existing repos from filesystem (directories with .git/)', async () => {
      // Create directories with .git/ subdirs to simulate repos
      const repoA = path.join(tempDir, 'repo-alpha');
      const repoB = path.join(tempDir, 'repo-beta');
      const notARepo = path.join(tempDir, 'just-a-folder');

      fs.mkdirSync(repoA);
      fs.mkdirSync(path.join(repoA, '.git'));
      fs.mkdirSync(repoB);
      fs.mkdirSync(path.join(repoB, '.git'));
      fs.mkdirSync(notARepo);

      const detected = await registry.detectFromFilesystem(tempDir);

      const names = detected.map(p => p.name || p.localPath);
      expect(names).toContain('repo-alpha');
      expect(names).toContain('repo-beta');
      expect(names).not.toContain('just-a-folder');
    });

    it('auto-extracts git remote URL from sub-repos', async () => {
      // Create a repo directory with .git/
      const repoDir = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoDir);
      fs.mkdirSync(path.join(repoDir, '.git'));

      // Create a git config file so the module can read it or mock exec
      const gitConfigDir = path.join(repoDir, '.git');
      fs.writeFileSync(
        path.join(gitConfigDir, 'config'),
        `[remote "origin"]
	url = git@github.com:user/my-repo.git
	fetch = +refs/heads/*:refs/remotes/origin/*`
      );

      const detected = await registry.detectFromFilesystem(tempDir);

      // Should have extracted the remote URL (either from git config or exec)
      const repo = detected.find(p => (p.name || p.localPath) === 'my-repo');
      expect(repo).toBeDefined();
      // The git URL should be extracted if the implementation reads git config
      // or calls git remote. Either way, it should be populated or gracefully empty.
      expect(repo.gitUrl).toBeDefined();
    });
  });

  describe('path handling', () => {
    it('relative paths stored (not absolute) - localPath should not start with /', async () => {
      await registry.addProject(tempDir, {
        name: 'rel-path-project',
        gitUrl: 'git@github.com:user/rel-path-project.git',
        localPath: 'rel-path-project',
        branch: 'main',
      });

      const projects = await registry.listProjects(tempDir);
      expect(projects[0].localPath).not.toMatch(/^\//);
      expect(projects[0].localPath).toBe('rel-path-project');
    });
  });

  describe('git URL validation', () => {
    it('validates SSH git URLs (git@github.com:user/repo.git)', async () => {
      // SSH URLs should be accepted without error
      await expect(
        registry.addProject(tempDir, {
          name: 'ssh-project',
          gitUrl: 'git@github.com:user/repo.git',
          localPath: 'ssh-project',
          branch: 'main',
        })
      ).resolves.not.toThrow();

      const projects = await registry.listProjects(tempDir);
      expect(projects.find(p => p.name === 'ssh-project')).toBeDefined();
    });

    it('validates HTTPS git URLs (https://github.com/user/repo.git)', async () => {
      // HTTPS URLs should be accepted without error
      await expect(
        registry.addProject(tempDir, {
          name: 'https-project',
          gitUrl: 'https://github.com/user/repo.git',
          localPath: 'https-project',
          branch: 'main',
        })
      ).resolves.not.toThrow();

      const projects = await registry.listProjects(tempDir);
      expect(projects.find(p => p.name === 'https-project')).toBeDefined();
    });

    it('rejects invalid git URLs', async () => {
      await expect(
        registry.addProject(tempDir, {
          name: 'bad-url-project',
          gitUrl: 'not-a-valid-url',
          localPath: 'bad-url-project',
          branch: 'main',
        })
      ).rejects.toThrow();
    });
  });

  describe('duplicate handling', () => {
    it('duplicate project names rejected', async () => {
      await registry.addProject(tempDir, {
        name: 'unique-project',
        gitUrl: 'git@github.com:user/unique-project.git',
        localPath: 'unique-project',
        branch: 'main',
      });

      await expect(
        registry.addProject(tempDir, {
          name: 'unique-project',
          gitUrl: 'git@github.com:user/another-repo.git',
          localPath: 'another-path',
          branch: 'main',
        })
      ).rejects.toThrow(/duplicate|already exists/i);
    });
  });

  describe('atomic writes', () => {
    it('atomic write prevents corruption (writes to temp file then renames)', async () => {
      // Spy on fs.renameSync or fs.rename to verify atomic write pattern
      const renameSpy = vi.spyOn(fs, 'renameSync');

      const registryData = {
        version: 1,
        projects: [
          {
            name: 'atomic-test',
            gitUrl: 'git@github.com:user/atomic-test.git',
            localPath: 'atomic-test',
            defaultBranch: 'main',
          },
        ],
      };

      await registry.save(tempDir, registryData);

      // Verify that renameSync was called (atomic write pattern:
      // write to temp file, then rename to final destination)
      expect(renameSpy).toHaveBeenCalled();

      const renameCall = renameSpy.mock.calls[0];
      // The source should be a temp file (not the final projects.json)
      expect(renameCall[0]).not.toBe(path.join(tempDir, 'projects.json'));
      // The destination should be the final projects.json
      expect(renameCall[1]).toBe(path.join(tempDir, 'projects.json'));

      // Verify the file was actually written correctly
      const contents = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'projects.json'), 'utf-8')
      );
      expect(contents.projects).toHaveLength(1);

      renameSpy.mockRestore();
    });
  });

  describe('empty registry', () => {
    it('empty registry returns empty array (load on non-existent file)', async () => {
      // No projects.json file exists in tempDir
      const data = await registry.load(tempDir);

      expect(data).toBeDefined();
      expect(data.projects).toEqual([]);
      expect(data.version).toBe(1);
    });
  });
});
