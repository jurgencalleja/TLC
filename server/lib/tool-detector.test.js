import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AI_TOOLS,
  ENV_PATTERNS,
  PROCESS_PATTERNS,
  CONFIG_FILES,
  detectFromEnvironment,
  detectFromProcess,
  detectFromConfigFiles,
  detectClaudeCode,
  getConfidenceScore,
  detectAITool,
  isToolActive,
  getToolDisplayName,
  createToolDetector,
} from './tool-detector.js';

describe('tool-detector', () => {
  describe('AI_TOOLS', () => {
    it('defines all AI tool constants', () => {
      expect(AI_TOOLS.CLAUDE_CODE).toBe('claude-code');
      expect(AI_TOOLS.CURSOR).toBe('cursor');
      expect(AI_TOOLS.ANTIGRAVITY).toBe('antigravity');
      expect(AI_TOOLS.WINDSURF).toBe('windsurf');
      expect(AI_TOOLS.COPILOT).toBe('copilot');
      expect(AI_TOOLS.CONTINUE).toBe('continue');
      expect(AI_TOOLS.CODY).toBe('cody');
      expect(AI_TOOLS.AMAZON_Q).toBe('amazon-q');
      expect(AI_TOOLS.AIDER).toBe('aider');
      expect(AI_TOOLS.UNKNOWN).toBe('unknown');
    });
  });

  describe('ENV_PATTERNS', () => {
    it('has patterns for each tool', () => {
      expect(ENV_PATTERNS[AI_TOOLS.CLAUDE_CODE]).toBeDefined();
      expect(ENV_PATTERNS[AI_TOOLS.CURSOR]).toBeDefined();
      expect(ENV_PATTERNS[AI_TOOLS.COPILOT]).toBeDefined();
    });

    it('includes expected patterns', () => {
      expect(ENV_PATTERNS[AI_TOOLS.CLAUDE_CODE]).toContain('CLAUDE_CODE');
      expect(ENV_PATTERNS[AI_TOOLS.CURSOR]).toContain('CURSOR_SESSION');
      expect(ENV_PATTERNS[AI_TOOLS.CODY]).toContain('SRC_ACCESS_TOKEN');
    });
  });

  describe('PROCESS_PATTERNS', () => {
    it('has patterns for each tool', () => {
      expect(PROCESS_PATTERNS[AI_TOOLS.CLAUDE_CODE]).toBeDefined();
      expect(PROCESS_PATTERNS[AI_TOOLS.CURSOR]).toBeDefined();
    });

    it('includes expected patterns', () => {
      expect(PROCESS_PATTERNS[AI_TOOLS.CLAUDE_CODE]).toContain('claude');
      expect(PROCESS_PATTERNS[AI_TOOLS.CURSOR]).toContain('cursor');
    });
  });

  describe('CONFIG_FILES', () => {
    it('has config files for each tool', () => {
      expect(CONFIG_FILES[AI_TOOLS.CLAUDE_CODE]).toBeDefined();
      expect(CONFIG_FILES[AI_TOOLS.CURSOR]).toBeDefined();
      expect(CONFIG_FILES[AI_TOOLS.WINDSURF]).toBeDefined();
    });

    it('includes expected files', () => {
      expect(CONFIG_FILES[AI_TOOLS.CLAUDE_CODE]).toContain('CLAUDE.md');
      expect(CONFIG_FILES[AI_TOOLS.CURSOR]).toContain('.cursor');
      expect(CONFIG_FILES[AI_TOOLS.WINDSURF]).toContain('.windsurfrules');
    });
  });

  describe('detectFromEnvironment', () => {
    it('detects Claude Code from env', () => {
      const env = { CLAUDE_CODE: '1' };
      const detected = detectFromEnvironment(env);

      expect(detected).toContain(AI_TOOLS.CLAUDE_CODE);
    });

    it('detects Cursor from env', () => {
      const env = { CURSOR_SESSION: 'abc123' };
      const detected = detectFromEnvironment(env);

      expect(detected).toContain(AI_TOOLS.CURSOR);
    });

    it('detects Copilot from env', () => {
      const env = { GITHUB_COPILOT: 'enabled' };
      const detected = detectFromEnvironment(env);

      expect(detected).toContain(AI_TOOLS.COPILOT);
    });

    it('detects Cody from env', () => {
      const env = { SRC_ACCESS_TOKEN: 'token123' };
      const detected = detectFromEnvironment(env);

      expect(detected).toContain(AI_TOOLS.CODY);
    });

    it('detects Continue from env', () => {
      const env = { CONTINUE_GLOBAL_DIR: '/home/user/.continue' };
      const detected = detectFromEnvironment(env);

      expect(detected).toContain(AI_TOOLS.CONTINUE);
    });

    it('detects multiple tools', () => {
      const env = {
        CLAUDE_CODE: '1',
        CURSOR_SESSION: 'abc',
      };
      const detected = detectFromEnvironment(env);

      expect(detected).toContain(AI_TOOLS.CLAUDE_CODE);
      expect(detected).toContain(AI_TOOLS.CURSOR);
    });

    it('returns empty array for no matches', () => {
      const env = { SOME_OTHER_VAR: 'value' };
      const detected = detectFromEnvironment(env);

      expect(detected).toEqual([]);
    });
  });

  describe('detectFromProcess', () => {
    it('detects Claude from exec path', () => {
      const processInfo = { execPath: '/usr/bin/claude' };
      const detected = detectFromProcess(processInfo);

      expect(detected).toContain(AI_TOOLS.CLAUDE_CODE);
    });

    it('detects Cursor from exec path', () => {
      const processInfo = { execPath: '/Applications/Cursor.app/Contents/MacOS/Cursor' };
      const detected = detectFromProcess(processInfo);

      expect(detected).toContain(AI_TOOLS.CURSOR);
    });

    it('detects from argv', () => {
      const processInfo = {
        execPath: '/usr/bin/node',
        argv: ['/usr/bin/node', '/path/to/aider'],
      };
      const detected = detectFromProcess(processInfo);

      expect(detected).toContain(AI_TOOLS.AIDER);
    });

    it('returns empty array for no matches', () => {
      const processInfo = {
        execPath: '/usr/bin/node',
        argv: ['/usr/bin/node', 'script.js'],
      };
      const detected = detectFromProcess(processInfo);

      expect(detected).toEqual([]);
    });

    it('handles empty process info', () => {
      const detected = detectFromProcess({});
      expect(Array.isArray(detected)).toBe(true);
    });
  });

  describe('detectFromConfigFiles', () => {
    it('returns empty array when no config files exist', () => {
      const detected = detectFromConfigFiles('/nonexistent/path');
      expect(detected).toEqual([]);
    });
  });

  describe('detectClaudeCode', () => {
    it('returns true when CLAUDE_CODE=1', () => {
      expect(detectClaudeCode({ CLAUDE_CODE: '1' })).toBe(true);
    });

    it('returns true when CLAUDE_CODE=true', () => {
      expect(detectClaudeCode({ CLAUDE_CODE: 'true' })).toBe(true);
    });

    it('returns false for other values', () => {
      expect(detectClaudeCode({ CLAUDE_CODE: '0' })).toBe(false);
      expect(detectClaudeCode({})).toBe(false);
    });
  });

  describe('getConfidenceScore', () => {
    it('returns 0 for no sources', () => {
      const sources = {
        environment: [],
        process: [],
        configFiles: [],
      };
      expect(getConfidenceScore(AI_TOOLS.CURSOR, sources)).toBe(0);
    });

    it('returns 40 for environment only', () => {
      const sources = {
        environment: [AI_TOOLS.CURSOR],
        process: [],
        configFiles: [],
      };
      expect(getConfidenceScore(AI_TOOLS.CURSOR, sources)).toBe(40);
    });

    it('returns 35 for process only', () => {
      const sources = {
        environment: [],
        process: [AI_TOOLS.CURSOR],
        configFiles: [],
      };
      expect(getConfidenceScore(AI_TOOLS.CURSOR, sources)).toBe(35);
    });

    it('returns 25 for config files only', () => {
      const sources = {
        environment: [],
        process: [],
        configFiles: [AI_TOOLS.CURSOR],
      };
      expect(getConfidenceScore(AI_TOOLS.CURSOR, sources)).toBe(25);
    });

    it('combines scores from multiple sources', () => {
      const sources = {
        environment: [AI_TOOLS.CURSOR],
        process: [AI_TOOLS.CURSOR],
        configFiles: [],
      };
      expect(getConfidenceScore(AI_TOOLS.CURSOR, sources)).toBe(75);
    });

    it('caps at 100', () => {
      const sources = {
        environment: [AI_TOOLS.CURSOR],
        process: [AI_TOOLS.CURSOR],
        configFiles: [AI_TOOLS.CURSOR],
      };
      expect(getConfidenceScore(AI_TOOLS.CURSOR, sources)).toBe(100);
    });
  });

  describe('detectAITool', () => {
    it('returns unknown when no tool detected', () => {
      const result = detectAITool({
        env: {},
        processInfo: { execPath: '/usr/bin/node', argv: [] },
        projectDir: '/nonexistent',
      });

      expect(result.primaryTool).toBe(AI_TOOLS.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it('detects Claude Code from env', () => {
      const result = detectAITool({
        env: { CLAUDE_CODE: '1' },
        processInfo: {},
        projectDir: '/nonexistent',
      });

      expect(result.primaryTool).toBe(AI_TOOLS.CLAUDE_CODE);
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });

    it('detects Cursor from env', () => {
      const result = detectAITool({
        env: { CURSOR_SESSION: 'abc' },
        processInfo: {},
        projectDir: '/nonexistent',
      });

      expect(result.primaryTool).toBe(AI_TOOLS.CURSOR);
    });

    it('returns all detected tools', () => {
      const result = detectAITool({
        env: { CURSOR_SESSION: 'abc', GITHUB_COPILOT: 'enabled' },
        processInfo: {},
        projectDir: '/nonexistent',
      });

      expect(result.allDetected.length).toBeGreaterThanOrEqual(2);
      expect(result.allDetected.some((d) => d.tool === AI_TOOLS.CURSOR)).toBe(true);
      expect(result.allDetected.some((d) => d.tool === AI_TOOLS.COPILOT)).toBe(true);
    });

    it('includes detection sources', () => {
      const result = detectAITool({
        env: { CURSOR_SESSION: 'abc' },
        processInfo: {},
        projectDir: '/nonexistent',
      });

      expect(result.sources).toBeDefined();
      expect(result.sources.environment).toBeDefined();
      expect(result.sources.process).toBeDefined();
      expect(result.sources.configFiles).toBeDefined();
    });

    it('sorts by confidence', () => {
      const result = detectAITool({
        env: { CURSOR_SESSION: 'abc' },
        processInfo: { execPath: '/app/Cursor', argv: [] },
        projectDir: '/nonexistent',
      });

      if (result.allDetected.length > 1) {
        for (let i = 1; i < result.allDetected.length; i++) {
          expect(result.allDetected[i - 1].confidence).toBeGreaterThanOrEqual(
            result.allDetected[i].confidence
          );
        }
      }
    });
  });

  describe('isToolActive', () => {
    it('returns true when tool is detected', () => {
      const active = isToolActive(AI_TOOLS.CURSOR, {
        env: { CURSOR_SESSION: 'abc' },
        projectDir: '/nonexistent',
      });

      expect(active).toBe(true);
    });

    it('returns false when tool is not detected', () => {
      const active = isToolActive(AI_TOOLS.CURSOR, {
        env: {},
        projectDir: '/nonexistent',
      });

      expect(active).toBe(false);
    });
  });

  describe('getToolDisplayName', () => {
    it('returns display name for Claude Code', () => {
      expect(getToolDisplayName(AI_TOOLS.CLAUDE_CODE)).toBe('Claude Code');
    });

    it('returns display name for Cursor', () => {
      expect(getToolDisplayName(AI_TOOLS.CURSOR)).toBe('Cursor');
    });

    it('returns display name for Copilot', () => {
      expect(getToolDisplayName(AI_TOOLS.COPILOT)).toBe('GitHub Copilot');
    });

    it('returns display name for Cody', () => {
      expect(getToolDisplayName(AI_TOOLS.CODY)).toBe('Sourcegraph Cody');
    });

    it('returns display name for Amazon Q', () => {
      expect(getToolDisplayName(AI_TOOLS.AMAZON_Q)).toBe('Amazon Q Developer');
    });

    it('returns tool id for unknown tool', () => {
      expect(getToolDisplayName('some-unknown')).toBe('some-unknown');
    });
  });

  describe('createToolDetector', () => {
    it('creates detector with default options', () => {
      const detector = createToolDetector({
        env: { CURSOR_SESSION: 'abc' },
      });

      const result = detector.detect({ projectDir: '/nonexistent' });
      expect(result.primaryTool).toBe(AI_TOOLS.CURSOR);
    });

    it('exposes isToolActive method', () => {
      const detector = createToolDetector({
        env: { CURSOR_SESSION: 'abc' },
      });

      expect(detector.isToolActive(AI_TOOLS.CURSOR, { projectDir: '/nonexistent' })).toBe(true);
    });

    it('exposes getToolDisplayName', () => {
      const detector = createToolDetector();
      expect(detector.getToolDisplayName(AI_TOOLS.CURSOR)).toBe('Cursor');
    });

    it('exposes constants', () => {
      const detector = createToolDetector();

      expect(detector.AI_TOOLS).toBeDefined();
      expect(detector.ENV_PATTERNS).toBeDefined();
      expect(detector.PROCESS_PATTERNS).toBeDefined();
      expect(detector.CONFIG_FILES).toBeDefined();
    });
  });
});
