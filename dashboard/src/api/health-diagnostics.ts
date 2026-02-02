/**
 * Health diagnostics module for TLC Dashboard
 * Provides system health checks with self-repair suggestions
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface DiagnosticCheck {
  name: string;
  status: 'ok' | 'warning' | 'error' | 'unknown';
  message: string;
  fix: string | null;
}

export interface DiagnosticsResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: DiagnosticCheck[];
}

/**
 * Checks if .tlc.json configuration file exists
 */
export async function checkConfig(projectDir: string): Promise<DiagnosticCheck> {
  const configPath = path.join(projectDir, '.tlc.json');

  try {
    await fs.access(configPath);
    return {
      name: 'TLC Configuration',
      status: 'ok',
      message: 'Config found',
      fix: null,
    };
  } catch {
    return {
      name: 'TLC Configuration',
      status: 'warning',
      message: 'No .tlc.json found',
      fix: 'Run: tlc init',
    };
  }
}

/**
 * Checks if required project files exist
 */
export async function checkRequiredFiles(projectDir: string): Promise<DiagnosticCheck> {
  const required = ['package.json', '.planning/ROADMAP.md'];
  const missing: string[] = [];

  for (const file of required) {
    const filePath = path.join(projectDir, file);
    try {
      await fs.access(filePath);
    } catch {
      missing.push(file);
    }
  }

  if (missing.length === 0) {
    return {
      name: 'Required Files',
      status: 'ok',
      message: 'All present',
      fix: null,
    };
  }

  return {
    name: 'Required Files',
    status: 'warning',
    message: `Missing: ${missing.join(', ')}`,
    fix: 'Run: tlc init',
  };
}

/**
 * Runs all diagnostic checks and determines overall health status
 */
export async function runDiagnostics(projectDir: string): Promise<DiagnosticsResult> {
  const checks: DiagnosticCheck[] = [];

  // Run all checks
  checks.push(await checkConfig(projectDir));
  checks.push(await checkRequiredFiles(projectDir));

  // Determine overall status
  const hasErrors = checks.some(c => c.status === 'error');
  const hasWarnings = checks.some(c => c.status === 'warning');

  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (hasErrors) {
    overall = 'unhealthy';
  } else if (hasWarnings) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return {
    overall,
    checks,
  };
}
