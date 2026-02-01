/**
 * AST Code Analyzer
 * Parse JavaScript/TypeScript files and extract complexity metrics
 */

const ts = require('typescript');

class AstAnalyzer {
  constructor(options = {}) {
    this.options = {
      longFunctionThreshold: options.longFunctionThreshold || 50,
      deepNestingThreshold: options.deepNestingThreshold || 4,
      highComplexityThreshold: options.highComplexityThreshold || 10,
    };
  }

  /**
   * Analyze code and extract metrics
   * @param {string} code - Source code to analyze
   * @param {string} filename - Filename (used to determine language)
   * @returns {Object} Analysis result with functions and metrics
   */
  analyze(code, filename) {
    if (!code || code.trim() === '') {
      return {
        functions: [],
        fileMetrics: {
          totalFunctions: 0,
          averageComplexity: 0,
          maxComplexity: 0,
        },
      };
    }

    try {
      const scriptKind = this.getScriptKind(filename);
      const sourceFile = ts.createSourceFile(
        filename,
        code,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );

      // Check for parse errors
      const diagnostics = this.getParseErrors(sourceFile);
      if (diagnostics.length > 0) {
        return {
          error: diagnostics[0].messageText.toString(),
          functions: [],
          fileMetrics: {
            totalFunctions: 0,
            averageComplexity: 0,
            maxComplexity: 0,
          },
        };
      }

      const functions = [];
      this.visitNode(sourceFile, sourceFile, functions, 0);

      const fileMetrics = this.calculateFileMetrics(functions);

      return {
        functions,
        fileMetrics,
      };
    } catch (error) {
      return {
        error: error.message,
        functions: [],
        fileMetrics: {
          totalFunctions: 0,
          averageComplexity: 0,
          maxComplexity: 0,
        },
      };
    }
  }

  /**
   * Get parse errors from source file
   */
  getParseErrors(sourceFile) {
    // TypeScript parser is error-tolerant, but we can check for obvious issues
    const errors = [];

    const visit = (node) => {
      // Check for missing tokens or syntax issues
      if (node.kind === ts.SyntaxKind.Unknown) {
        errors.push({ messageText: 'Syntax error: unknown token' });
      }
      ts.forEachChild(node, visit);
    };

    // Check if file has unbalanced braces/parens by looking at structure
    const text = sourceFile.text;
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    const openParens = (text.match(/\(/g) || []).length;
    const closeParens = (text.match(/\)/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push({ messageText: 'Syntax error: unbalanced braces' });
    }
    if (openParens !== closeParens) {
      errors.push({ messageText: 'Syntax error: unbalanced parentheses' });
    }

    return errors;
  }

  /**
   * Get TypeScript script kind based on filename
   */
  getScriptKind(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'tsx':
        return ts.ScriptKind.TSX;
      case 'ts':
        return ts.ScriptKind.TS;
      case 'jsx':
        return ts.ScriptKind.JSX;
      case 'js':
      default:
        return ts.ScriptKind.JS;
    }
  }

  /**
   * Visit AST nodes recursively
   */
  visitNode(node, sourceFile, functions, depth) {
    if (this.isFunctionNode(node)) {
      const funcInfo = this.analyzeFunctionNode(node, sourceFile);
      functions.push(funcInfo);
    }

    ts.forEachChild(node, (child) => {
      this.visitNode(child, sourceFile, functions, depth + 1);
    });
  }

  /**
   * Check if node is a function-like node
   */
  isFunctionNode(node) {
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    );
  }

  /**
   * Analyze a function node and extract metrics
   */
  analyzeFunctionNode(node, sourceFile) {
    const name = this.getFunctionName(node, sourceFile);
    const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const lineCount = endLine - startLine + 1;

    const complexity = this.calculateComplexity(node);
    const maxNesting = this.calculateMaxNesting(node);

    return {
      name,
      startLine: startLine + 1,
      endLine: endLine + 1,
      lineCount,
      complexity,
      maxNesting,
      isLong: lineCount >= this.options.longFunctionThreshold,
      isDeeplyNested: maxNesting > this.options.deepNestingThreshold,
      isComplex: complexity > this.options.highComplexityThreshold,
    };
  }

  /**
   * Get function name from node
   */
  getFunctionName(node, sourceFile) {
    // Function declaration with name
    if (node.name) {
      return node.name.getText(sourceFile);
    }

    // Arrow function or function expression assigned to variable
    if (node.parent && ts.isVariableDeclaration(node.parent)) {
      return node.parent.name.getText(sourceFile);
    }

    // Method in class
    if (ts.isMethodDeclaration(node) && node.name) {
      return node.name.getText(sourceFile);
    }

    return '<anonymous>';
  }

  /**
   * Calculate cyclomatic complexity
   * Base of 1 + decision points
   */
  calculateComplexity(node) {
    let complexity = 1;

    const visit = (n) => {
      // Conditional statements
      if (ts.isIfStatement(n)) complexity++;
      if (ts.isConditionalExpression(n)) complexity++; // ternary

      // Loops
      if (ts.isForStatement(n)) complexity++;
      if (ts.isForInStatement(n)) complexity++;
      if (ts.isForOfStatement(n)) complexity++;
      if (ts.isWhileStatement(n)) complexity++;
      if (ts.isDoStatement(n)) complexity++;

      // Switch cases (each case except default)
      if (ts.isCaseClause(n)) complexity++;

      // Logical operators
      if (ts.isBinaryExpression(n)) {
        if (
          n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          n.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity++;
        }
      }

      // Catch clauses
      if (ts.isCatchClause(n)) complexity++;

      // Nullish coalescing
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        complexity++;
      }

      ts.forEachChild(n, visit);
    };

    if (node.body) {
      visit(node.body);
    }

    return complexity;
  }

  /**
   * Calculate maximum nesting depth
   */
  calculateMaxNesting(node) {
    let maxDepth = 0;

    const visit = (n, depth) => {
      // Track nesting for control structures
      if (
        ts.isIfStatement(n) ||
        ts.isForStatement(n) ||
        ts.isForInStatement(n) ||
        ts.isForOfStatement(n) ||
        ts.isWhileStatement(n) ||
        ts.isDoStatement(n) ||
        ts.isTryStatement(n) ||
        ts.isSwitchStatement(n)
      ) {
        const newDepth = depth + 1;
        maxDepth = Math.max(maxDepth, newDepth);
        ts.forEachChild(n, (child) => visit(child, newDepth));
      } else {
        ts.forEachChild(n, (child) => visit(child, depth));
      }
    };

    if (node.body) {
      visit(node.body, 0);
    }

    return maxDepth;
  }

  /**
   * Calculate file-level metrics
   */
  calculateFileMetrics(functions) {
    if (functions.length === 0) {
      return {
        totalFunctions: 0,
        averageComplexity: 0,
        maxComplexity: 0,
      };
    }

    const complexities = functions.map((f) => f.complexity);
    const totalComplexity = complexities.reduce((a, b) => a + b, 0);

    return {
      totalFunctions: functions.length,
      averageComplexity: totalComplexity / functions.length,
      maxComplexity: Math.max(...complexities),
      longFunctions: functions.filter((f) => f.isLong).length,
      deeplyNestedFunctions: functions.filter((f) => f.isDeeplyNested).length,
      complexFunctions: functions.filter((f) => f.isComplex).length,
    };
  }

  /**
   * Analyze a file from path
   * @param {string} filePath - Path to file
   * @returns {Object} Analysis result
   */
  async analyzeFile(filePath) {
    const fs = require('fs').promises;
    const code = await fs.readFile(filePath, 'utf-8');
    return this.analyze(code, filePath);
  }
}

module.exports = { AstAnalyzer };
