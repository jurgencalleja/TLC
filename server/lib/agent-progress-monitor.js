/**
 * Agent Progress Monitor - Parse and display agent output in real-time
 */

const fs = require('fs');
const path = require('path');

class AgentProgressMonitor {
  constructor(outputDir) {
    this.outputDir = outputDir;
  }

  /**
   * Get status for a single agent
   */
  getAgentStatus(agentId) {
    const outputPath = path.join(this.outputDir, `${agentId}.output`);

    if (!fs.existsSync(outputPath)) {
      return {
        agentId,
        error: 'Output file not found',
        turns: 0,
        filesCreated: [],
        testsPassed: 0,
        testsFailed: 0,
      };
    }

    const content = fs.readFileSync(outputPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    const status = {
      agentId,
      description: '',
      turns: 0,
      filesCreated: [],
      testsPassed: 0,
      testsFailed: 0,
      currentAction: '',
      phase: 'starting',
      committed: false,
      commitMessage: '',
    };

    let lastAssistantText = '';

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);

        // Count assistant turns
        if (parsed.type === 'assistant') {
          status.turns++;
          // Extract text from assistant message
          if (parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) {
                lastAssistantText = block.text;
              }
            }
          }
        }

        // Extract description from initial user message
        if (parsed.type === 'user' && !status.description) {
          if (parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) {
                const match = block.text.match(/Build Task \d+:\s*(.+?)(?:\n|$)/);
                if (match) {
                  status.description = match[1].trim();
                }
              }
            }
          }
        }

        // Detect files created
        if (parsed.type === 'tool_result' && typeof parsed.content === 'string') {
          const fileMatch = parsed.content.match(/File created successfully at:\s*(.+)/);
          if (fileMatch) {
            status.filesCreated.push(fileMatch[1].trim());
          }

          // Detect test results
          const testMatch = parsed.content.match(/Tests?\s+(\d+)\s+passed/i);
          if (testMatch) {
            status.testsPassed = parseInt(testMatch[1], 10);
          }

          const failMatch = parsed.content.match(/(\d+)\s+failed/i);
          if (failMatch) {
            status.testsFailed = parseInt(failMatch[1], 10);
          }

          // Also handle "14 passed" pattern separately
          const passedOnly = parsed.content.match(/(\d+)\s+passed\s*\(/i);
          if (passedOnly) {
            status.testsPassed = parseInt(passedOnly[1], 10);
          }

          // Detect commits
          const commitMatch = parsed.content.match(/\[main\s+\w+\]\s+(.+)/);
          if (commitMatch) {
            status.committed = true;
            status.commitMessage = commitMatch[1].trim();
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    // Set current action from last assistant text
    if (lastAssistantText) {
      // Truncate to first line or 100 chars
      const firstLine = lastAssistantText.split('\n')[0];
      status.currentAction = firstLine.length > 100
        ? firstLine.slice(0, 100) + '...'
        : firstLine;
    }

    // Detect phase from last assistant text
    status.phase = this.detectPhase(lastAssistantText);

    return status;
  }

  /**
   * Detect current phase from assistant text
   */
  detectPhase(text) {
    const lower = text.toLowerCase();

    if (lower.includes('commit')) {
      return 'committing';
    }
    if (lower.includes('implement') || lower.includes('writing the code') || lower.includes('now writing')) {
      return 'implementing';
    }
    if (lower.includes('test') && (lower.includes('writing') || lower.includes('creating') || lower.includes('first'))) {
      return 'writing-tests';
    }
    if (lower.includes('running test')) {
      return 'testing';
    }

    return 'working';
  }

  /**
   * Get status for multiple agents
   */
  getAllAgentStatus(agentIds) {
    return agentIds.map(id => this.getAgentStatus(id));
  }

  /**
   * Format status as compact summary string
   */
  formatStatus(agentId) {
    const status = this.getAgentStatus(agentId);

    if (status.error) {
      return `${agentId}: ${status.error}`;
    }

    const parts = [];

    if (status.description) {
      parts.push(status.description);
    }

    parts.push(`${status.turns} turns`);

    if (status.filesCreated.length > 0) {
      parts.push(`${status.filesCreated.length} files`);
    }

    if (status.testsPassed > 0 || status.testsFailed > 0) {
      if (status.testsFailed > 0) {
        parts.push(`${status.testsPassed}/${status.testsPassed + status.testsFailed} tests`);
      } else {
        parts.push(`${status.testsPassed} tests ✓`);
      }
    }

    if (status.committed) {
      parts.push('✓ committed');
    } else {
      parts.push(`[${status.phase}]`);
    }

    return parts.join(' | ');
  }

  /**
   * Format all agents as a table
   */
  formatTable(agentIds) {
    const statuses = this.getAllAgentStatus(agentIds);
    const lines = ['| Agent | Task | Tests | Phase |', '|-------|------|-------|-------|'];

    for (const status of statuses) {
      const tests = status.testsFailed > 0
        ? `${status.testsPassed}/${status.testsPassed + status.testsFailed}`
        : status.testsPassed > 0
          ? `${status.testsPassed} ✓`
          : '-';

      const phase = status.committed ? '✓ Done' : status.phase;

      lines.push(`| ${status.agentId.slice(-6)} | ${status.description || 'Working...'} | ${tests} | ${phase} |`);
    }

    return lines.join('\n');
  }
}

module.exports = {
  AgentProgressMonitor,
};
