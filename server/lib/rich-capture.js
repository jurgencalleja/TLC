/**
 * Rich Capture Writer — writes conversation chunks and decisions as
 * detailed markdown to memory/conversations/ and memory/decisions/.
 *
 * Format designed for both human reading and vector embedding.
 *
 * @module rich-capture
 */

import fs from 'fs';
import path from 'path';

/**
 * Slugify a string for use in filenames.
 * @param {string} text
 * @returns {string} URL-safe lowercase slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Format a timestamp to YYYY-MM-DD.
 * @param {number} ts - Unix timestamp in milliseconds
 * @returns {string}
 */
function toDateString(ts) {
  return new Date(ts).toISOString().split('T')[0];
}

/**
 * Detect phase references in text and return cross-reference paths.
 * @param {string} text
 * @returns {string[]}
 */
function detectPhaseRefs(text) {
  const refs = [];
  const pattern = /phase\s+(\d+)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    refs.push(`.planning/phases/${match[1]}-PLAN.md`);
  }
  return [...new Set(refs)];
}

/**
 * Write a conversation chunk as a markdown file.
 *
 * @param {string} projectRoot - Project root directory
 * @param {object} chunk - Chunk from conversation-chunker
 * @returns {Promise<string>} Path to the written file
 */
export async function writeConversationChunk(projectRoot, chunk) {
  const convDir = path.join(projectRoot, 'memory', 'conversations');
  if (!fs.existsSync(convDir)) {
    fs.mkdirSync(convDir, { recursive: true });
  }

  const dateStr = toDateString(chunk.startTime);
  const slug = slugify(chunk.topic || chunk.title);
  const filename = `${dateStr}-${slug}.md`;
  const filepath = path.join(convDir, filename);

  // Build markdown content
  const lines = [];

  // If file exists, we're appending — add separator
  const isAppend = fs.existsSync(filepath);
  if (isAppend) {
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Header
  lines.push(`# ${chunk.title}`);
  lines.push('');

  // Context section
  lines.push('## Context');
  lines.push('');
  lines.push(`**Date:** ${new Date(chunk.startTime).toISOString()}`);
  if (chunk.summary) {
    lines.push(`**Summary:** ${chunk.summary}`);
  }
  if (chunk.metadata.projects && chunk.metadata.projects.length > 0) {
    lines.push(`**Projects:** ${chunk.metadata.projects.join(', ')}`);
  }
  lines.push('');

  // Exchanges
  lines.push('## Exchanges');
  lines.push('');
  for (const exchange of chunk.exchanges) {
    lines.push(`**User:** ${exchange.user}`);
    lines.push('');
    lines.push(`**Assistant:** ${exchange.assistant}`);
    lines.push('');
  }

  // Decisions
  if (chunk.metadata.decisions && chunk.metadata.decisions.length > 0) {
    lines.push('## Decisions');
    lines.push('');
    for (const decision of chunk.metadata.decisions) {
      lines.push(`- ${decision}`);
    }
    lines.push('');
  }

  // Related files
  if (chunk.metadata.files && chunk.metadata.files.length > 0) {
    lines.push('## Related Files');
    lines.push('');
    for (const file of chunk.metadata.files) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  // Commands used
  if (chunk.metadata.commands && chunk.metadata.commands.length > 0) {
    lines.push('## Commands');
    lines.push('');
    for (const cmd of chunk.metadata.commands) {
      lines.push(`- \`${cmd}\``);
    }
    lines.push('');
  }

  // Phase cross-references
  const fullText = chunk.exchanges.map((e) => `${e.user} ${e.assistant}`).join(' ');
  const phaseRefs = detectPhaseRefs(fullText);
  if (phaseRefs.length > 0) {
    lines.push('## Related Plans');
    lines.push('');
    for (const ref of phaseRefs) {
      lines.push(`- \`${ref}\``);
    }
    lines.push('');
  }

  const content = lines.join('\n');

  if (isAppend) {
    fs.appendFileSync(filepath, content, 'utf8');
  } else {
    fs.writeFileSync(filepath, content, 'utf8');
  }

  return filepath;
}

/**
 * Write an enhanced decision with full context, alternatives, and reasoning.
 *
 * @param {string} projectRoot - Project root directory
 * @param {object} decision - Decision object
 * @returns {Promise<string>} Path to the written file
 */
export async function writeDecisionDetail(projectRoot, decision) {
  const decDir = path.join(projectRoot, 'memory', 'decisions');
  if (!fs.existsSync(decDir)) {
    fs.mkdirSync(decDir, { recursive: true });
  }

  const dateStr = toDateString(Date.now());
  const slug = slugify(decision.title);
  const filename = `${dateStr}-${slug}.md`;
  const filepath = path.join(decDir, filename);

  const lines = [];

  // Frontmatter
  if (decision.permanent) {
    lines.push('---');
    lines.push('permanent: true');
    lines.push('---');
    lines.push('');
  }

  // Title
  lines.push(`# ${decision.title}`);
  lines.push('');

  // Date
  lines.push(`**Date:** ${new Date().toISOString()}`);
  lines.push('');

  // Context
  if (decision.context) {
    lines.push('## Context');
    lines.push('');
    lines.push(decision.context);
    lines.push('');
  }

  // Reasoning
  lines.push('## Reasoning');
  lines.push('');
  lines.push(decision.reasoning);
  lines.push('');

  // Alternatives considered
  if (decision.alternatives && decision.alternatives.length > 0) {
    lines.push('## Alternatives Considered');
    lines.push('');
    for (const alt of decision.alternatives) {
      lines.push(`- ${alt}`);
    }
    lines.push('');
  }

  fs.writeFileSync(filepath, lines.join('\n'), 'utf8');

  return filepath;
}
