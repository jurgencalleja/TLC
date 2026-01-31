/**
 * Memory Observer - Non-blocking capture of memorable patterns from exchanges
 */

const { detectPatterns } = require('./pattern-detector.js');
const { classifyMemory, CLASSIFICATION } = require('./memory-classifier.js');
const { writeTeamDecision, writeTeamGotcha, writePersonalPreference, appendSessionLog } = require('./memory-writer.js');

/**
 * Process an exchange and extract patterns with classification
 * @param {Object} exchange - Conversation exchange
 * @returns {Object} Extracted patterns with classification
 */
async function processExchange(exchange) {
  const patterns = detectPatterns(exchange);

  // Add classification to each pattern
  const classified = {
    decisions: patterns.decisions.map(d => ({
      ...d,
      classification: classifyMemory(d),
    })),
    preferences: patterns.preferences.map(p => ({
      ...p,
      classification: classifyMemory(p),
    })),
    gotchas: patterns.gotchas.map(g => ({
      ...g,
      classification: classifyMemory(g),
    })),
    reasoning: patterns.reasoning.map(r => ({
      ...r,
      classification: classifyMemory(r),
    })),
  };

  return classified;
}

/**
 * Store extracted patterns to appropriate storage
 * @param {string} projectRoot - Project root directory
 * @param {Object} classified - Classified patterns
 */
async function storePatterns(projectRoot, classified) {
  // Store team decisions
  for (const decision of classified.decisions) {
    if (decision.classification === CLASSIFICATION.TEAM) {
      try {
        await writeTeamDecision(projectRoot, {
          title: decision.choice || 'Decision',
          reasoning: decision.reasoning || decision.raw || '',
          context: decision.over ? `Chosen over ${decision.over}` : undefined,
        });
      } catch (e) {
        console.error('Failed to write team decision:', e.message);
      }
    }
  }

  // Store team gotchas
  for (const gotcha of classified.gotchas) {
    if (gotcha.classification === CLASSIFICATION.TEAM) {
      try {
        await writeTeamGotcha(projectRoot, {
          title: gotcha.subject || 'Gotcha',
          issue: gotcha.issue || gotcha.raw || '',
          severity: 'medium',
        });
      } catch (e) {
        console.error('Failed to write team gotcha:', e.message);
      }
    }
  }

  // Store personal preferences
  for (const pref of classified.preferences) {
    if (pref.classification === CLASSIFICATION.PERSONAL) {
      try {
        const key = pref.category || 'learned';
        await writePersonalPreference(projectRoot, key, {
          preference: pref.preference,
          antiPreference: pref.antiPreference,
          raw: pref.raw,
        });
      } catch (e) {
        console.error('Failed to write personal preference:', e.message);
      }
    }
  }
}

/**
 * Log the exchange to session log
 * @param {string} projectRoot - Project root directory
 * @param {Object} classified - Classified patterns
 */
async function logToSession(projectRoot, classified) {
  const hasContent =
    classified.decisions.length > 0 ||
    classified.preferences.length > 0 ||
    classified.gotchas.length > 0 ||
    classified.reasoning.length > 0;

  if (!hasContent) return;

  try {
    await appendSessionLog(projectRoot, {
      type: 'memory_capture',
      decisions: classified.decisions.length,
      preferences: classified.preferences.length,
      gotchas: classified.gotchas.length,
      reasoning: classified.reasoning.length,
    });
  } catch (e) {
    console.error('Failed to log to session:', e.message);
  }
}

/**
 * Observe an exchange and remember memorable patterns
 * Fire-and-forget async - does not block
 * @param {string} projectRoot - Project root directory
 * @param {Object} exchange - Conversation exchange
 */
async function observeAndRemember(projectRoot, exchange) {
  // Fire and forget - don't await the full processing
  setImmediate(async () => {
    try {
      const classified = await processExchange(exchange);

      // Store patterns (errors are caught inside)
      await storePatterns(projectRoot, classified);

      // Log to session
      await logToSession(projectRoot, classified);
    } catch (e) {
      // Silently fail - memory is nice-to-have, not critical
      console.error('Memory observation failed:', e.message);
    }
  });
}

module.exports = {
  observeAndRemember,
  processExchange,
  storePatterns,
  logToSession,
};
