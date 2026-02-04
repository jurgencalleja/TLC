/**
 * Optimize Command
 * Suggest optimizations for cost and quality
 */

/**
 * Analyze cost optimizations
 * @param {object} data - Usage data
 * @returns {Array} Cost suggestions
 */
function analyzeCostOptimizations(data) {
  const suggestions = [];

  // Check for expensive models on simple tasks
  const expensiveAgents = (data.agents || []).filter(a =>
    a.model?.includes('opus') && a.quality?.score < 75
  );

  if (expensiveAgents.length > 0) {
    suggestions.push({
      type: 'cost',
      action: 'downgrade',
      explanation: `Consider downgrading ${expensiveAgents.length} agents from opus to sonnet for simpler tasks`,
      savings: expensiveAgents.reduce((sum, a) => sum + (a.cost || 0) * 0.5, 0),
      impact: expensiveAgents.length,
      targetModel: 'claude-3-sonnet',
    });
  }

  // Check for cost spikes
  const history = data.costHistory || [];
  for (let i = 1; i < history.length; i++) {
    const increase = history[i].total / (history[i - 1].total || 1);
    if (increase > 2) {
      suggestions.push({
        type: 'cost',
        action: 'investigate',
        explanation: `Cost spike detected on ${history[i].date}: ${(increase * 100 - 100).toFixed(0)}% increase`,
        savings: 0,
        impact: increase,
      });
    }
  }

  // Check for batching opportunities
  const usage = data.modelUsage || {};
  for (const [model, stats] of Object.entries(usage)) {
    if (stats.count > 100 && stats.totalCost / stats.count < 0.01) {
      suggestions.push({
        type: 'cost',
        action: 'batch',
        explanation: `Consider batching ${stats.count} small ${model} requests`,
        savings: stats.totalCost * 0.2,
        impact: stats.count,
      });
    }
  }

  return suggestions;
}

/**
 * Analyze quality improvements
 * @param {object} data - Usage data
 * @returns {Array} Quality suggestions
 */
function analyzeQualityImprovements(data) {
  const suggestions = [];

  // Check for low quality agents
  const lowQuality = (data.agents || []).filter(a =>
    a.quality?.score < 70
  );

  if (lowQuality.length > 0) {
    suggestions.push({
      type: 'quality',
      action: 'upgrade',
      explanation: `Consider upgrading ${lowQuality.length} low-quality agents to a better model`,
      impact: lowQuality.length,
      targetModel: 'claude-3-opus',
    });
  }

  // Check for recurring failures
  const failed = (data.agents || []).filter(a => a.status === 'failed');
  if (failed.length > 2) {
    suggestions.push({
      type: 'quality',
      action: 'review',
      explanation: `Review ${failed.length} failed agents for common patterns`,
      impact: failed.length,
    });
  }

  return suggestions;
}

/**
 * Format suggestions for display
 * @param {Array} suggestions - Suggestions to format
 * @returns {string} Formatted output
 */
function formatSuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    return 'No optimization suggestions at this time.';
  }

  const lines = ['Optimization Suggestions:', '='.repeat(50), ''];

  suggestions.forEach((s, i) => {
    lines.push(`${i + 1}. [${s.type.toUpperCase()}] ${s.explanation}`);
    if (s.savings) {
      lines.push(`   Estimated savings: $${s.savings.toFixed(2)}`);
    }
    if (s.action) {
      lines.push(`   Action: ${s.action}`);
    }
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Apply a suggestion
 * @param {object} suggestion - Suggestion to apply
 * @param {object} context - Application context
 * @returns {object} Result
 */
function applySuggestion(suggestion, context) {
  // In a real implementation, this would update config or settings
  return {
    applied: true,
    suggestion,
    message: `Applied ${suggestion.type} suggestion: ${suggestion.action}`,
  };
}

/**
 * Execute optimize command
 * @param {object} context - Execution context
 * @returns {Promise<object>} Command result
 */
async function execute(context) {
  const { data, options = {}, onApply } = context;

  let suggestions = [];

  // Get suggestions based on filter
  if (!options.quality) {
    suggestions = suggestions.concat(analyzeCostOptimizations(data));
  }
  if (!options.cost) {
    suggestions = suggestions.concat(analyzeQualityImprovements(data));
  }

  // Sort by impact
  suggestions.sort((a, b) => (b.impact || 0) - (a.impact || 0));

  // Handle apply
  if (options.apply) {
    if (!options.force) {
      return {
        success: true,
        suggestions,
        needsConfirmation: true,
        output: formatSuggestions(suggestions) + '\n\nApply these suggestions?',
      };
    }

    // Apply all suggestions
    suggestions.forEach(s => applySuggestion(s, context));
    if (onApply) onApply(suggestions);

    return {
      success: true,
      suggestions,
      applied: suggestions.length,
      output: `Applied ${suggestions.length} optimizations`,
    };
  }

  return {
    success: true,
    suggestions,
    output: formatSuggestions(suggestions),
  };
}

module.exports = {
  execute,
  analyzeCostOptimizations,
  analyzeQualityImprovements,
  formatSuggestions,
  applySuggestion,
};
