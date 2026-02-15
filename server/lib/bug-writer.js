/**
 * Bug Writer - CRUD operations for bugs in BUGS.md files
 *
 * Provides functions to update bug status, content, and create new bugs.
 * All writes are atomic (write to temp file, then rename).
 *
 * Uses dependency injection for fs to enable testability.
 */

/**
 * Create a bug writer with injected dependencies
 * @param {object} deps
 * @param {object} deps.fs - Node.js fs module (or mock)
 * @returns {{ updateBugStatus, updateBugContent, createBug }}
 */
function createBugWriter({ fs }) {
  /**
   * Write content atomically: write to .tmp, then rename
   */
  function atomicWrite(filePath, content) {
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  /**
   * Find all bug headings in BUGS.md content
   */
  function findBugs(content) {
    const bugs = [];
    const regex = /###\s+(BUG-\d+):\s+(.+?)\s*\[(\w+)\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      bugs.push({
        id: match[1],
        title: match[2].trim(),
        status: match[3],
        fullMatch: match[0],
        index: match.index,
      });
    }
    return bugs;
  }

  /**
   * Get the section of content belonging to a specific bug
   */
  function getBugSection(content, bugIndex, bugs) {
    const start = bugIndex;
    // Find end: next bug heading or end of content
    const afterStart = content.slice(start + 1);
    const nextBugMatch = afterStart.match(/\n###\s+BUG-/);
    const end = nextBugMatch ? start + 1 + nextBugMatch.index : content.length;
    return { start, end, section: content.slice(start, end) };
  }

  /**
   * Update a bug's status in BUGS.md
   * @param {string} bugsPath - Path to BUGS.md file
   * @param {string} bugId - Bug ID (e.g., 'BUG-001')
   * @param {string} newStatus - 'open' | 'fixed' | 'closed'
   */
  function updateBugStatus(bugsPath, bugId, newStatus) {
    const content = fs.readFileSync(bugsPath, 'utf-8');
    const bugs = findBugs(content);
    const bug = bugs.find((b) => b.id === bugId);

    if (!bug) {
      throw new Error(`Bug ${bugId} not found in ${bugsPath}`);
    }

    const newHeading = `### ${bugId}: ${bug.title} [${newStatus}]`;
    const updated = content.replace(bug.fullMatch, newHeading);

    atomicWrite(bugsPath, updated);
  }

  /**
   * Update a bug's content (title, severity, description)
   * @param {string} bugsPath - Path to BUGS.md file
   * @param {string} bugId - Bug ID (e.g., 'BUG-001')
   * @param {object} updates - { title?, severity?, description? }
   */
  function updateBugContent(bugsPath, bugId, updates) {
    let content = fs.readFileSync(bugsPath, 'utf-8');
    const bugs = findBugs(content);
    const bug = bugs.find((b) => b.id === bugId);

    if (!bug) {
      throw new Error(`Bug ${bugId} not found in ${bugsPath}`);
    }

    // Update title
    if (updates.title) {
      const newHeading = `### ${bugId}: ${updates.title} [${bug.status}]`;
      content = content.replace(bug.fullMatch, newHeading);
    }

    // Update severity
    if (updates.severity) {
      const { start, end, section } = getBugSection(content, bug.index, bugs);
      const newSection = section.replace(
        /\*\*Severity:\*\*\s*\w+/,
        `**Severity:** ${updates.severity}`
      );
      content = content.slice(0, start) + newSection + content.slice(end);
    }

    // Update description - replace content after metadata lines
    if (updates.description) {
      // Re-find bug position after potential title/severity changes
      const updatedBugs = findBugs(content);
      const updatedBug = updatedBugs.find((b) => b.id === bugId);
      if (updatedBug) {
        const { start, end, section } = getBugSection(content, updatedBug.index, updatedBugs);
        // Find the end of metadata (after **Reported:** line)
        const lines = section.split('\n');
        let descStart = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('**Reported:**') || lines[i].startsWith('**Severity:**')) {
            continue;
          }
          if (i > 1 && lines[i].trim() === '') {
            continue;
          }
          if (i > 2 && lines[i].trim() !== '' && !lines[i].startsWith('**') && !lines[i].startsWith('###')) {
            descStart = i;
            break;
          }
        }

        if (descStart >= 0) {
          // Find end of description (before --- or next heading)
          let descEnd = lines.length;
          for (let i = descStart; i < lines.length; i++) {
            if (lines[i].trim() === '---' || lines[i].startsWith('###')) {
              descEnd = i;
              break;
            }
          }
          // Replace description lines
          const newLines = [...lines.slice(0, descStart), updates.description, ...lines.slice(descEnd)];
          const newSection = newLines.join('\n');
          content = content.slice(0, start) + newSection + content.slice(end);
        }
      }
    }

    atomicWrite(bugsPath, content);
  }

  /**
   * Create a new bug in BUGS.md
   * @param {string} bugsPath - Path to BUGS.md file
   * @param {object} bugData - { title, severity, description, url?, screenshot? }
   * @returns {{ id: string, title: string, status: string }}
   */
  function createBug(bugsPath, bugData) {
    let content;
    try {
      content = fs.readFileSync(bugsPath, 'utf-8');
    } catch {
      content = '# Bugs\n';
    }

    const bugs = findBugs(content);
    const maxNum = bugs.reduce((max, b) => {
      const num = parseInt(b.id.replace('BUG-', ''));
      return num > max ? num : max;
    }, 0);
    const nextNum = maxNum + 1;
    const bugId = `BUG-${String(nextNum).padStart(3, '0')}`;

    const today = new Date().toISOString().split('T')[0];

    const lines = [];
    lines.push('');
    lines.push(`### ${bugId}: ${bugData.title} [open]`);
    lines.push('');
    lines.push(`**Severity:** ${bugData.severity}`);
    lines.push(`**Reported:** ${today}`);
    if (bugData.url) {
      lines.push(`**URL:** ${bugData.url}`);
    }
    if (bugData.screenshot) {
      lines.push(`**Screenshot:** ${bugData.screenshot}`);
    }
    lines.push('');
    lines.push(bugData.description);
    lines.push('');
    lines.push('---');
    lines.push('');

    content = content.trimEnd() + '\n' + lines.join('\n');

    atomicWrite(bugsPath, content);

    return { id: bugId, title: bugData.title, status: 'open' };
  }

  return { updateBugStatus, updateBugContent, createBug };
}

module.exports = { createBugWriter };
