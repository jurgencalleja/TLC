/**
 * Conversation Chunker — splits exchanges into topic-coherent chunks.
 *
 * Detects boundaries from TLC commands (hard), user signals (soft),
 * and topic shifts (semantic). Generates titles, summaries, and metadata.
 *
 * @module conversation-chunker
 */

import crypto from 'crypto';

/** TLC command patterns that trigger hard boundaries */
const TLC_COMMAND_PATTERN = /^\/?tlc:/i;

/** User signals that indicate topic transition (soft boundaries) */
const SOFT_BOUNDARY_SIGNALS = [
  /^ok\b/i,
  /^okay\b/i,
  /^done\b/i,
  /^next\b/i,
  /^moving on/i,
  /^let'?s move on/i,
  /^let'?s build/i,
  /^let'?s do/i,
  /^sounds good/i,
  /^got it/i,
  /^alright/i,
];

/** File path pattern */
const FILE_PATH_PATTERN = /(?:^|\s|['"`(])([a-zA-Z0-9._-]+\/[a-zA-Z0-9._\-/]+\.[a-zA-Z]{1,10})(?:['"`)\s,]|$)/g;

/** Decision patterns */
const DECISION_PATTERNS = [
  /let'?s use (\S+.*?)(?:\.|$)/gi,
  /we (?:decided|chose|agreed) to (.*?)(?:\.|$)/gi,
  /(?:going|switched?) (?:with|to) (.*?)(?:\.|$)/gi,
  /instead of (\S+),?\s+(?:we'?ll|let'?s|use) (.*?)(?:\.|$)/gi,
];

/** Minimum keyword overlap ratio to consider exchanges on the same topic */
const SEMANTIC_SIMILARITY_THRESHOLD = 0.15;

/**
 * Extract significant words from text for keyword overlap comparison.
 * @param {string} text
 * @returns {Set<string>}
 */
function extractKeywords(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  return new Set(words.filter((w) => w.length > 3));
}

/**
 * Calculate keyword overlap ratio between two texts.
 * @param {string} textA
 * @param {string} textB
 * @returns {number} 0-1 overlap ratio
 */
function keywordOverlap(textA, textB) {
  const wordsA = extractKeywords(textA);
  const wordsB = extractKeywords(textB);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  return intersection / Math.min(wordsA.size, wordsB.size);
}

/**
 * Get full text of an exchange (user + assistant combined).
 * @param {object} exchange
 * @returns {string}
 */
function exchangeText(exchange) {
  return `${exchange.user || ''} ${exchange.assistant || ''}`;
}

/**
 * Detect whether a boundary exists between the current and previous exchange.
 *
 * @param {object} exchange - Current exchange `{ user, assistant, timestamp }`
 * @param {object|undefined} previousExchange - Previous exchange
 * @returns {{ isBoundary: boolean, type: 'hard'|'soft'|'semantic'|null }}
 */
export function detectBoundary(exchange, previousExchange) {
  // No boundary on first exchange
  if (!previousExchange) {
    return { isBoundary: false, type: null };
  }

  const userText = (exchange.user || '').trim();

  // Hard boundary: TLC command invocation
  if (TLC_COMMAND_PATTERN.test(userText)) {
    return { isBoundary: true, type: 'hard' };
  }

  // Soft boundary: user transition signals
  for (const pattern of SOFT_BOUNDARY_SIGNALS) {
    if (pattern.test(userText)) {
      return { isBoundary: true, type: 'soft' };
    }
  }

  // Semantic boundary: topic divergence via keyword overlap
  // Skip semantic detection for very short exchanges (Q&A style)
  const prevText = exchangeText(previousExchange);
  const currText = exchangeText(exchange);
  const prevKeywords = extractKeywords(prevText);
  const currKeywords = extractKeywords(currText);

  if (prevKeywords.size >= 5 && currKeywords.size >= 5) {
    const overlap = keywordOverlap(prevText, currText);
    if (overlap < SEMANTIC_SIMILARITY_THRESHOLD) {
      return { isBoundary: true, type: 'semantic' };
    }
  }

  return { isBoundary: false, type: null };
}

/**
 * Generate a deterministic hash-based ID for a chunk.
 * @param {object[]} exchanges
 * @returns {string}
 */
function generateChunkId(exchanges) {
  const content = exchanges.map((e) => `${e.timestamp}:${e.user}`).join('|');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Generate a title from chunk exchanges. Extracts the most meaningful
 * question or decision phrase from the first user message.
 *
 * @param {object[]} exchanges
 * @returns {string}
 */
export function generateChunkTitle(exchanges) {
  if (!exchanges || exchanges.length === 0) return 'Untitled';

  const firstUser = (exchanges[0].user || '').trim();

  // If it's a TLC command, use it as title
  if (TLC_COMMAND_PATTERN.test(firstUser)) {
    return firstUser;
  }

  // If it's a question, use it (truncated)
  if (firstUser.includes('?')) {
    const question = firstUser.split('?')[0] + '?';
    return question.length > 80 ? question.slice(0, 77) + '...' : question;
  }

  // Otherwise use the first meaningful sentence
  const firstSentence = firstUser.split(/[.!?\n]/)[0].trim();
  if (firstSentence.length > 0) {
    return firstSentence.length > 80 ? firstSentence.slice(0, 77) + '...' : firstSentence;
  }

  return 'Untitled';
}

/**
 * Generate a summary from chunk exchanges. Combines key points from
 * user questions and assistant answers.
 *
 * @param {object[]} exchanges
 * @returns {string}
 */
export function generateChunkSummary(exchanges) {
  if (!exchanges || exchanges.length === 0) return '';

  const parts = [];

  // Summarize what was discussed
  const firstUser = (exchanges[0].user || '').trim();
  if (firstUser) {
    parts.push(`Discussed: ${firstUser.length > 100 ? firstUser.slice(0, 97) + '...' : firstUser}.`);
  }

  // Summarize key response
  const firstAssistant = (exchanges[0].assistant || '').trim();
  if (firstAssistant) {
    const firstSentence = firstAssistant.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 0) {
      parts.push(`${firstSentence}.`);
    }
  }

  // If multiple exchanges, note the follow-up
  if (exchanges.length > 1) {
    parts.push(`${exchanges.length} exchanges in this topic.`);
  }

  return parts.join(' ');
}

/**
 * Extract metadata from chunk exchanges: file paths, project names,
 * TLC commands used, and decisions made.
 *
 * @param {object[]} exchanges
 * @returns {{ projects: string[], files: string[], commands: string[], decisions: string[] }}
 */
export function extractChunkMetadata(exchanges) {
  const files = new Set();
  const commands = new Set();
  const decisions = [];
  const projects = new Set();

  for (const exchange of exchanges) {
    const fullText = exchangeText(exchange);
    const userText = (exchange.user || '');

    // Extract file paths
    let fileMatch;
    const fileRegex = new RegExp(FILE_PATH_PATTERN.source, 'g');
    while ((fileMatch = fileRegex.exec(fullText)) !== null) {
      files.add(fileMatch[1]);
    }

    // Extract TLC commands
    const cmdMatch = userText.match(/\/?tlc:\S+/i);
    if (cmdMatch) {
      // Normalize to /tlc:command format (strip arguments)
      const cmd = cmdMatch[0].startsWith('/') ? cmdMatch[0] : '/' + cmdMatch[0];
      const cmdBase = cmd.split(/\s/)[0];
      commands.add(cmdBase);
    }

    // Extract decisions
    for (const pattern of DECISION_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let decMatch;
      while ((decMatch = regex.exec(fullText)) !== null) {
        const decision = decMatch[0].trim();
        if (decision.length > 5) {
          decisions.push(decision);
        }
      }
    }

    // Extract project names (heuristic: capitalized proper nouns that look like project names)
    const projectPattern = /\b(?:the\s+)?([A-Z][a-zA-Z0-9-]+)(?:\s+(?:project|module|service|repo|package))/g;
    let projMatch;
    while ((projMatch = projectPattern.exec(fullText)) !== null) {
      projects.add(projMatch[1]);
    }
  }

  return {
    files: [...files],
    commands: [...commands],
    decisions: [...new Set(decisions)],
    projects: [...projects],
  };
}

/**
 * Chunk a conversation into topic-coherent segments.
 *
 * @param {object[]} exchanges - Array of `{ user, assistant, timestamp }`
 * @param {object} [options]
 * @param {number} [options.minChunkSize=1] - Minimum exchanges per chunk
 * @param {number} [options.maxChunkSize=8] - Maximum exchanges per chunk
 * @returns {object[]} Array of chunks
 */
export function chunkConversation(exchanges, options = {}) {
  if (!exchanges || exchanges.length === 0) return [];

  const { minChunkSize = 1, maxChunkSize = 8 } = options;

  const chunks = [];
  let currentChunk = [];

  for (let i = 0; i < exchanges.length; i++) {
    const exchange = exchanges[i];
    const prevExchange = i > 0 ? exchanges[i - 1] : undefined;
    const boundary = detectBoundary(exchange, prevExchange);

    // Check if we should split
    const shouldSplit = boundary.isBoundary && currentChunk.length >= minChunkSize;
    const exceedsMax = currentChunk.length >= maxChunkSize;

    if ((shouldSplit || exceedsMax) && currentChunk.length > 0) {
      chunks.push(buildChunk(currentChunk));
      currentChunk = [];
    }

    currentChunk.push(exchange);
  }

  // Flush remaining
  if (currentChunk.length > 0) {
    chunks.push(buildChunk(currentChunk));
  }

  return chunks;
}

/**
 * Build a chunk object from a set of exchanges.
 * @param {object[]} exchanges
 * @returns {object}
 */
function buildChunk(exchanges) {
  return {
    id: generateChunkId(exchanges),
    title: generateChunkTitle(exchanges),
    summary: generateChunkSummary(exchanges),
    topic: generateChunkTitle(exchanges),
    exchanges,
    startTime: exchanges[0].timestamp,
    endTime: exchanges[exchanges.length - 1].timestamp,
    metadata: extractChunkMetadata(exchanges),
  };
}
