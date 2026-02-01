/**
 * Refactor Command
 * Main orchestrator for /tlc:refactor skill
 */

const { AstAnalyzer } = require('./ast-analyzer.js');
const { DuplicationDetector } = require('./duplication-detector.js');
const { SemanticAnalyzer } = require('./semantic-analyzer.js');
const { ImpactScorer } = require('./impact-scorer.js');
const { CheckpointManager } = require('./checkpoint-manager.js');
const { RefactorExecutor } = require('./refactor-executor.js');
const { RefactorReporter } = require('./refactor-reporter.js');
const { CandidatesTracker } = require('./candidates-tracker.js');
const { RefactorProgress } = require('./refactor-progress.js');

class RefactorCommand {
  constructor(options = {}) {
    this.options = options;
    this.astAnalyzer = options.astAnalyzer || new AstAnalyzer();
    this.duplicationDetector = options.duplicationDetector || new DuplicationDetector();
    this.semanticAnalyzer = options.semanticAnalyzer || new SemanticAnalyzer(options.semanticOptions);
    this.impactScorer = options.impactScorer || new ImpactScorer(options.scorerOptions);
    this.checkpointManager = options.checkpointManager || new CheckpointManager(options.checkpointOptions);
    this.executor = options.executor || new RefactorExecutor(options.executorOptions);
    this.reporter = options.reporter || new RefactorReporter();
    this.candidatesTracker = options.candidatesTracker || new CandidatesTracker(options.trackerOptions);
    this.progress = options.progress || new RefactorProgress(options.progressOptions);

    // Callbacks for interactive mode
    this.onProgress = options.onProgress || (() => {});
    this.onConfirm = options.onConfirm || (async () => true);
    this.onSelectModels = options.onSelectModels || (async () => ['default']);
  }

  /**
   * Run the refactor command
   * @param {Object} options - Command options
   * @returns {Object} Result with report and applied changes
   */
  async run(options = {}) {
    const {
      mode = 'interactive', // 'interactive', 'auto', 'analyze-only'
      scope = 'changed', // 'changed', 'all', 'file', 'directory'
      target = null, // specific file/directory for 'file' or 'directory' scope
      format = 'markdown', // report format
      useMultiModel = true,
      dryRun = false,
    } = options;

    const result = {
      analyzed: 0,
      opportunities: [],
      applied: [],
      skipped: [],
      report: null,
      cancelled: false,
    };

    try {
      // Step 1: Get files to analyze
      const files = await this.getFilesToAnalyze(scope, target);
      result.analyzed = files.length;

      if (files.length === 0) {
        result.report = this.reporter.generate([], format);
        return result;
      }

      // Step 2: Ask about multi-model if enabled
      let models = ['default'];
      if (useMultiModel) {
        models = await this.onSelectModels();
      }

      // Step 3: Analyze files
      this.onProgress({ phase: 'analyzing', total: files.length, completed: 0 });

      const analysisResult = await this.analyzeFiles(files, models);

      if (analysisResult.cancelled) {
        result.cancelled = true;
        return result;
      }

      result.opportunities = analysisResult.opportunities;

      // Step 4: Score and prioritize
      const scored = this.scoreOpportunities(result.opportunities);

      // Step 5: Add to candidates tracker
      await this.candidatesTracker.add(scored.map(s => ({
        file: s.opportunity.file,
        startLine: s.opportunity.line || 1,
        description: s.opportunity.description,
        impact: s.score.total,
      })));

      // Step 6: Handle based on mode
      if (mode === 'analyze-only') {
        result.report = this.reporter.generate(scored, format);
        return result;
      }

      // Step 7: Execute refactorings
      if (mode === 'interactive') {
        const toApply = await this.confirmRefactorings(scored);
        if (toApply.length === 0) {
          result.skipped = scored;
          result.report = this.reporter.generate([], format);
          return result;
        }

        if (!dryRun) {
          const applied = await this.applyRefactorings(toApply);
          result.applied = applied.successful;
          result.skipped = [...scored.filter(s => !toApply.includes(s)), ...applied.failed];
        } else {
          result.applied = toApply;
        }
      } else if (mode === 'auto') {
        // Auto mode: apply high-priority only
        const highPriority = scored.filter(s => s.score.total >= 80);
        if (!dryRun && highPriority.length > 0) {
          const applied = await this.applyRefactorings(highPriority);
          result.applied = applied.successful;
          result.skipped = [...scored.filter(s => s.score.total < 80), ...applied.failed];
        } else {
          result.applied = highPriority;
          result.skipped = scored.filter(s => s.score.total < 80);
        }
      }

      // Step 8: Generate report
      result.report = this.reporter.generate(result.applied, format);

      return result;
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Get files to analyze based on scope
   */
  async getFilesToAnalyze(scope, target) {
    const { getChangedFiles, getAllFiles, getFilesByPath } = this.options;

    switch (scope) {
      case 'changed':
        if (getChangedFiles) {
          return await getChangedFiles();
        }
        return [];

      case 'all':
        if (getAllFiles) {
          return await getAllFiles();
        }
        return [];

      case 'file':
      case 'directory':
        if (getFilesByPath && target) {
          return await getFilesByPath(target);
        }
        return [];

      default:
        return [];
    }
  }

  /**
   * Analyze files for refactoring opportunities
   */
  async analyzeFiles(files, models) {
    const opportunities = [];
    let completed = 0;

    this.progress.start(files.length);

    for (const file of files) {
      if (this.progress.isCancelled()) {
        return { opportunities, cancelled: true };
      }

      try {
        // AST analysis
        const astResult = this.astAnalyzer.analyze(file.content, file.path);

        // Check for complexity issues
        for (const fn of astResult.functions || []) {
          if (fn.complexity > 10) {
            opportunities.push({
              type: 'complexity',
              file: file.path,
              line: fn.line,
              name: fn.name,
              description: `High complexity (${fn.complexity}) in ${fn.name}`,
              metrics: fn,
            });
          }

          if (fn.lines > 50) {
            opportunities.push({
              type: 'length',
              file: file.path,
              line: fn.line,
              name: fn.name,
              description: `Long function (${fn.lines} lines) - ${fn.name}`,
              metrics: fn,
            });
          }
        }

        // Semantic analysis with models
        if (models.length > 0 && models[0] !== 'skip') {
          const semanticResult = await this.semanticAnalyzer.analyze(
            file.content,
            file.path,
            { models }
          );

          if (semanticResult.issues) {
            for (const issue of semanticResult.issues) {
              opportunities.push({
                type: 'semantic',
                file: file.path,
                line: issue.line,
                description: issue.description,
                suggestion: issue.suggestion,
              });
            }
          }
        }
      } catch (error) {
        // Log but continue
        console.error(`Error analyzing ${file.path}:`, error.message);
      }

      completed++;
      this.progress.update(file.path);
      this.onProgress({ phase: 'analyzing', total: files.length, completed });
    }

    // Duplication detection across all files
    const duplicationResult = this.duplicationDetector.detect(files);
    if (duplicationResult.duplicates) {
      for (const dup of duplicationResult.duplicates) {
        opportunities.push({
          type: 'duplication',
          file: dup.file1,
          line: dup.line1,
          description: `Duplicate code found in ${dup.file1} and ${dup.file2}`,
          duplicate: dup,
        });
      }
    }

    return { opportunities, cancelled: false };
  }

  /**
   * Score opportunities by impact
   */
  scoreOpportunities(opportunities) {
    return opportunities
      .map(opp => ({
        opportunity: opp,
        score: this.impactScorer.score(opp),
      }))
      .sort((a, b) => b.score.total - a.score.total);
  }

  /**
   * Confirm refactorings with user (interactive mode)
   */
  async confirmRefactorings(scored) {
    const confirmed = [];

    for (const item of scored) {
      const shouldApply = await this.onConfirm(item);
      if (shouldApply) {
        confirmed.push(item);
      }
    }

    return confirmed;
  }

  /**
   * Apply confirmed refactorings
   */
  async applyRefactorings(items) {
    const refactorings = items.map(item => ({
      ...item.opportunity,
      score: item.score,
    }));

    const result = await this.executor.execute(refactorings);

    // Mark completed in tracker
    for (const applied of result.successful || []) {
      await this.candidatesTracker.markComplete(applied.file, applied.line);
    }

    return result;
  }

  /**
   * Cancel ongoing analysis
   */
  cancel() {
    this.progress.cancel();
  }

  /**
   * Get current progress
   */
  getProgress() {
    return this.progress.getProgress();
  }
}

module.exports = { RefactorCommand };
