/**
 * LaunchAgent plist generator tests - Phase 83 Task 1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';

import {
  generatePlist,
  installAgent,
  uninstallAgent,
  isInstalled,
  loadAgent,
  unloadAgent,
  statusAgent,
  PLIST_LABEL,
  PLIST_PATH,
} from './launchd-agent.js';

describe('launchd-agent', () => {
  describe('generatePlist', () => {
    it('returns valid XML with correct label', () => {
      const xml = generatePlist({ projectRoot: '/Users/dev/myproject' });
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<!DOCTYPE plist');
      expect(xml).toContain('<string>com.tlc.server</string>');
    });

    it('includes KeepAlive and ThrottleInterval', () => {
      const xml = generatePlist({ projectRoot: '/Users/dev/myproject' });
      expect(xml).toContain('<key>KeepAlive</key>');
      expect(xml).toContain('<true/>');
      expect(xml).toContain('<key>ThrottleInterval</key>');
      expect(xml).toContain('<integer>10</integer>');
    });

    it('sets WorkingDirectory to project root', () => {
      const xml = generatePlist({ projectRoot: '/Users/dev/myproject' });
      expect(xml).toContain('<key>WorkingDirectory</key>');
      expect(xml).toContain('<string>/Users/dev/myproject</string>');
    });

    it('sets EnvironmentVariables including PATH and NODE_ENV', () => {
      const xml = generatePlist({ projectRoot: '/Users/dev/myproject' });
      expect(xml).toContain('<key>EnvironmentVariables</key>');
      expect(xml).toContain('<key>NODE_ENV</key>');
      expect(xml).toContain('<string>development</string>');
      expect(xml).toContain('<key>PATH</key>');
    });

    it('uses absolute node path in ProgramArguments', () => {
      const xml = generatePlist({ projectRoot: '/Users/dev/myproject' });
      expect(xml).toContain('<key>ProgramArguments</key>');
      // Should contain path to node and path to server/index.js
      expect(xml).toContain('server/index.js');
    });

    it('sets log paths under ~/.tlc/logs/', () => {
      const xml = generatePlist({ projectRoot: '/Users/dev/myproject' });
      expect(xml).toContain('<key>StandardOutPath</key>');
      expect(xml).toContain('<key>StandardErrorPath</key>');
      expect(xml).toContain('.tlc/logs/server.log');
    });

    it('allows custom port via opts', () => {
      const xml = generatePlist({ projectRoot: '/Users/dev/myproject', port: 4000 });
      expect(xml).toContain('<key>TLC_PORT</key>');
      expect(xml).toContain('<string>4000</string>');
    });
  });

  describe('installAgent', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-launchd-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('writes plist file to target directory', () => {
      const plistPath = path.join(tmpDir, 'com.tlc.server.plist');
      installAgent({ projectRoot: '/Users/dev/myproject', targetDir: tmpDir });
      expect(fs.existsSync(plistPath)).toBe(true);
      const content = fs.readFileSync(plistPath, 'utf-8');
      expect(content).toContain('com.tlc.server');
    });
  });

  describe('uninstallAgent', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-launchd-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('removes plist file', () => {
      const plistPath = path.join(tmpDir, 'com.tlc.server.plist');
      fs.writeFileSync(plistPath, '<plist/>');
      uninstallAgent({ targetDir: tmpDir });
      expect(fs.existsSync(plistPath)).toBe(false);
    });
  });

  describe('isInstalled', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-launchd-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns true when plist exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'com.tlc.server.plist'), '<plist/>');
      expect(isInstalled({ targetDir: tmpDir })).toBe(true);
    });

    it('returns false when plist does not exist', () => {
      expect(isInstalled({ targetDir: tmpDir })).toBe(false);
    });
  });

  describe('loadAgent', () => {
    it('calls launchctl load with correct path', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      const result = await loadAgent({ exec: mockExec, targetDir: '/tmp/agents' });
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('launchctl load'),
      );
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('com.tlc.server.plist'),
      );
    });
  });

  describe('unloadAgent', () => {
    it('calls launchctl unload then removes plist', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-launchd-'));
      const plistPath = path.join(tmpDir, 'com.tlc.server.plist');
      fs.writeFileSync(plistPath, '<plist/>');

      const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      await unloadAgent({ exec: mockExec, targetDir: tmpDir });

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('launchctl unload'),
      );
      expect(fs.existsSync(plistPath)).toBe(false);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('statusAgent', () => {
    it('returns loaded when launchctl finds the agent', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '12345\t0\tcom.tlc.server', stderr: '' });
      const result = await statusAgent({ exec: mockExec });
      expect(result.loaded).toBe(true);
      expect(result.pid).toBeDefined();
    });

    it('returns not loaded when launchctl does not find agent', async () => {
      const mockExec = vi.fn().mockRejectedValue(new Error('Could not find service'));
      const result = await statusAgent({ exec: mockExec });
      expect(result.loaded).toBe(false);
    });
  });

  describe('constants', () => {
    it('exports correct plist label', () => {
      expect(PLIST_LABEL).toBe('com.tlc.server');
    });
  });
});
