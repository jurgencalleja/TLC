/**
 * Duplication Detector
 * Find copy-pasted and structurally similar code
 */

class DuplicationDetector {
  constructor(options = {}) {
    this.options = {
      minLines: options.minLines || 5,
      minTokens: options.minTokens || 50,
      similarityThreshold: options.similarityThreshold || 0.8,
      ignoreImports: options.ignoreImports !== false,
    };
  }

  /**
   * Detect duplications across files
   * @param {Array} files - Array of { path, content } objects
   * @returns {Object} Detection result
   */
  detect(files) {
    if (!files || files.length === 0) {
      return this.emptyResult();
    }

    // Preprocess files
    const processed = files.map((f) => ({
      path: f.path,
      content: f.content,
      lines: this.getSignificantLines(f.content),
      normalized: this.normalizeCode(f.content),
    }));

    // Find exact duplicates
    const duplicates = this.findExactDuplicates(processed);

    // Find similar code
    const similar = this.findSimilarCode(processed);

    // Build file pairs
    const pairs = this.buildFilePairs(duplicates, processed);

    // Calculate per-file stats
    const fileStats = this.calculateFileStats(processed, duplicates);

    // Summary
    const summary = this.buildSummary(processed, duplicates);

    return {
      duplicates,
      similar,
      pairs,
      fileStats,
      summary,
    };
  }

  /**
   * Get empty result structure
   */
  emptyResult() {
    return {
      duplicates: [],
      similar: [],
      pairs: [],
      fileStats: {},
      summary: {
        totalFiles: 0,
        filesWithDuplication: 0,
        totalDuplicateBlocks: 0,
      },
    };
  }

  /**
   * Get significant lines (non-empty, non-import)
   */
  getSignificantLines(content) {
    if (!content) return [];

    return content
      .split('\n')
      .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
      .filter((item) => {
        if (!item.line) return false;
        if (this.options.ignoreImports && this.isImportLine(item.line)) return false;
        return true;
      });
  }

  /**
   * Check if line is an import/require statement
   */
  isImportLine(line) {
    return (
      line.startsWith('import ') ||
      line.startsWith('const ') && line.includes('require(') ||
      line.startsWith('let ') && line.includes('require(') ||
      line.startsWith('var ') && line.includes('require(')
    );
  }

  /**
   * Normalize code for comparison (remove variable names, literals)
   */
  normalizeCode(content) {
    if (!content) return '';

    return content
      // Remove comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Normalize string literals
      .replace(/'[^']*'/g, "'STR'")
      .replace(/"[^"]*"/g, '"STR"')
      .replace(/`[^`]*`/g, '`STR`')
      // Normalize numbers
      .replace(/\b\d+\.?\d*\b/g, 'NUM')
      // Normalize variable names (basic)
      .replace(/\b(const|let|var)\s+(\w+)/g, '$1 VAR')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Find exact duplicate blocks
   */
  findExactDuplicates(processed) {
    const duplicates = [];
    const blockMap = new Map();

    for (const file of processed) {
      const blocks = this.extractBlocks(file.lines, file.path);

      for (const block of blocks) {
        const key = block.content;
        if (!blockMap.has(key)) {
          blockMap.set(key, []);
        }
        blockMap.get(key).push({
          path: file.path,
          startLine: block.startLine,
          endLine: block.endLine,
        });
      }
    }

    // Find blocks that appear in multiple places
    for (const [content, locations] of blockMap.entries()) {
      if (locations.length > 1) {
        duplicates.push({
          content,
          lineCount: content.split('\n').length,
          files: [...new Set(locations.map((l) => l.path))],
          locations,
        });
      }
    }

    return duplicates;
  }

  /**
   * Extract code blocks of minimum size
   */
  extractBlocks(lines, path) {
    const blocks = [];
    const minLines = this.options.minLines;

    if (lines.length < minLines) return blocks;

    // Sliding window approach
    for (let i = 0; i <= lines.length - minLines; i++) {
      for (let length = minLines; length <= Math.min(lines.length - i, 50); length++) {
        const blockLines = lines.slice(i, i + length);
        const content = blockLines.map((l) => l.line).join('\n');

        // Skip blocks that are too simple (mostly braces/whitespace)
        if (this.isSignificantBlock(content)) {
          blocks.push({
            content,
            startLine: blockLines[0].lineNumber,
            endLine: blockLines[blockLines.length - 1].lineNumber,
          });
        }
      }
    }

    return blocks;
  }

  /**
   * Check if a block has significant content
   */
  isSignificantBlock(content) {
    // Remove braces, semicolons, whitespace
    const stripped = content.replace(/[{};()\s]/g, '');
    return stripped.length > 20;
  }

  /**
   * Find structurally similar code
   */
  findSimilarCode(processed) {
    const similar = [];

    for (let i = 0; i < processed.length; i++) {
      for (let j = i + 1; j < processed.length; j++) {
        const similarity = this.calculateSimilarity(
          processed[i].normalized,
          processed[j].normalized
        );

        if (similarity >= this.options.similarityThreshold) {
          similar.push({
            file1: processed[i].path,
            file2: processed[j].path,
            similarity,
          });
        }
      }
    }

    return similar;
  }

  /**
   * Calculate similarity between two normalized code strings
   * Uses Jaccard similarity on token sets
   */
  calculateSimilarity(code1, code2) {
    if (!code1 || !code2) return 0;

    const tokens1 = new Set(code1.split(/\s+/));
    const tokens2 = new Set(code2.split(/\s+/));

    const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  /**
   * Build file pairs from duplicates
   */
  buildFilePairs(duplicates, processed) {
    const pairMap = new Map();

    for (const dup of duplicates) {
      for (let i = 0; i < dup.locations.length; i++) {
        for (let j = i + 1; j < dup.locations.length; j++) {
          const loc1 = dup.locations[i];
          const loc2 = dup.locations[j];
          const key = [loc1.path, loc2.path].sort().join(':::');

          if (!pairMap.has(key)) {
            pairMap.set(key, {
              file1: loc1.path < loc2.path ? loc1.path : loc2.path,
              file2: loc1.path < loc2.path ? loc2.path : loc1.path,
              duplicates: [],
            });
          }

          pairMap.get(key).duplicates.push({
            lines1: { start: loc1.startLine, end: loc1.endLine },
            lines2: { start: loc2.startLine, end: loc2.endLine },
            lineCount: dup.lineCount,
          });
        }
      }
    }

    return Array.from(pairMap.values()).map((pair) => ({
      ...pair,
      totalDuplicatedLines: pair.duplicates.reduce((sum, d) => sum + d.lineCount, 0),
    }));
  }

  /**
   * Calculate per-file duplication stats
   */
  calculateFileStats(processed, duplicates) {
    const stats = {};

    for (const file of processed) {
      const totalLines = file.lines.length;
      let duplicatedLines = 0;

      for (const dup of duplicates) {
        for (const loc of dup.locations) {
          if (loc.path === file.path) {
            duplicatedLines += loc.endLine - loc.startLine + 1;
          }
        }
      }

      // Avoid counting overlapping duplicates multiple times
      const percentage = totalLines > 0
        ? Math.min(100, Math.round((duplicatedLines / totalLines) * 100))
        : 0;

      stats[file.path] = {
        totalLines,
        duplicatedLines: Math.min(duplicatedLines, totalLines),
        duplicationPercentage: percentage,
      };
    }

    return stats;
  }

  /**
   * Build summary statistics
   */
  buildSummary(processed, duplicates) {
    const filesWithDuplication = new Set();

    for (const dup of duplicates) {
      for (const loc of dup.locations) {
        filesWithDuplication.add(loc.path);
      }
    }

    return {
      totalFiles: processed.length,
      filesWithDuplication: filesWithDuplication.size,
      totalDuplicateBlocks: duplicates.length,
    };
  }
}

module.exports = { DuplicationDetector };
