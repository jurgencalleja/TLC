/**
 * Impact Scorer
 * Calculate priority score for refactoring opportunities
 */

const { execSync } = require('child_process');

class ImpactScorer {
  constructor(options = {}) {
    this.weights = {
      complexityReduction: options.complexityWeight || 0.30,
      blastRadius: options.blastRadiusWeight || 0.25,
      changeFrequency: options.frequencyWeight || 0.25,
      risk: options.riskWeight || 0.20,
    };
    this.exec = options.exec || this.defaultExec.bind(this);
  }

  defaultExec(command) {
    try {
      return execSync(command, { encoding: 'utf-8' });
    } catch {
      return '';
    }
  }

  /**
   * Calculate impact score for a refactoring opportunity
   * @param {Object} opportunity - Refactoring opportunity
   * @returns {Object} Score breakdown and total
   */
  score(opportunity) {
    const complexityScore = this.scoreComplexityReduction(opportunity);
    const blastRadiusScore = this.scoreBlastRadius(opportunity);
    const frequencyScore = this.scoreChangeFrequency(opportunity);
    const riskScore = this.scoreRisk(opportunity);

    const total = Math.round(
      complexityScore * this.weights.complexityReduction +
      blastRadiusScore * this.weights.blastRadius +
      frequencyScore * this.weights.changeFrequency +
      riskScore * this.weights.risk
    );

    return {
      total: Math.min(100, Math.max(0, total)),
      breakdown: {
        complexityReduction: complexityScore,
        blastRadius: blastRadiusScore,
        changeFrequency: frequencyScore,
        risk: riskScore,
      },
      weights: this.weights,
    };
  }

  /**
   * Score based on complexity reduction potential
   * Higher complexity = higher score (more to gain)
   */
  scoreComplexityReduction(opportunity) {
    const { complexity, targetComplexity } = opportunity;

    if (!complexity) return 50; // Default middle score

    const reduction = complexity - (targetComplexity || 1);

    // Scale: 0-5 reduction = 0-50, 5-15 = 50-80, 15+ = 80-100
    if (reduction <= 0) return 20;
    if (reduction <= 5) return 20 + (reduction * 10);
    if (reduction <= 15) return 70 + ((reduction - 5) * 2);
    return 90 + Math.min(10, (reduction - 15));
  }

  /**
   * Score based on blast radius (files affected)
   */
  scoreBlastRadius(opportunity) {
    const { filesAffected, linesAffected } = opportunity;

    // More files affected = higher impact
    let score = 30; // base

    if (filesAffected) {
      if (filesAffected === 1) score = 40;
      else if (filesAffected <= 3) score = 60;
      else if (filesAffected <= 10) score = 80;
      else score = 95;
    }

    // Adjust for lines affected
    if (linesAffected) {
      if (linesAffected > 100) score = Math.min(100, score + 10);
      if (linesAffected > 500) score = Math.min(100, score + 10);
    }

    return score;
  }

  /**
   * Score based on change frequency from git history
   */
  scoreChangeFrequency(opportunity) {
    const { filePath, changeCount } = opportunity;

    // If changeCount provided, use it
    if (changeCount !== undefined) {
      if (changeCount === 0) return 30;
      if (changeCount <= 5) return 50;
      if (changeCount <= 20) return 70;
      if (changeCount <= 50) return 85;
      return 95;
    }

    // Otherwise try to get from git
    if (filePath) {
      try {
        const output = this.exec(`git log --oneline "${filePath}" 2>/dev/null | wc -l`);
        const commits = parseInt(output.trim(), 10) || 0;

        if (commits === 0) return 30;
        if (commits <= 5) return 50;
        if (commits <= 20) return 70;
        if (commits <= 50) return 85;
        return 95;
      } catch {
        return 50; // Default if git fails
      }
    }

    return 50;
  }

  /**
   * Score based on risk (test coverage, criticality)
   * Lower coverage = higher risk = higher priority to refactor safely
   */
  scoreRisk(opportunity) {
    const { testCoverage, isCritical } = opportunity;

    let score = 50;

    // Lower test coverage = higher risk score
    if (testCoverage !== undefined) {
      if (testCoverage >= 80) score = 30;
      else if (testCoverage >= 60) score = 50;
      else if (testCoverage >= 40) score = 70;
      else if (testCoverage >= 20) score = 85;
      else score = 95;
    }

    // Critical paths get higher score
    if (isCritical) {
      score = Math.min(100, score + 15);
    }

    return score;
  }

  /**
   * Score multiple opportunities and sort by impact
   * @param {Array} opportunities - Array of opportunities
   * @returns {Array} Sorted opportunities with scores
   */
  scoreAll(opportunities) {
    return opportunities
      .map(opp => ({
        ...opp,
        impact: this.score(opp),
      }))
      .sort((a, b) => b.impact.total - a.impact.total);
  }

  /**
   * Get priority tier from score
   */
  static getTier(score) {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
}

module.exports = { ImpactScorer };
