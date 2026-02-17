/**
 * Input Sanitizer — validation for user-supplied values used in shell commands
 * Phase 80 Review Fix
 */

/** Strict DNS hostname pattern */
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

/** Safe git branch pattern (allows slashes, dots, dashes, underscores) */
const BRANCH_RE = /^[a-zA-Z0-9._\/-]+$/;

/** Safe git repo URL pattern (git@... or https://...) */
const REPO_URL_RE = /^(git@[\w.-]+:[\w./-]+\.git|https?:\/\/[\w.-]+(\/[\w./-]+)*(\.git)?)$/;

/** Safe unix username pattern */
const USERNAME_RE = /^[a-z_][a-z0-9_-]*$/;

/** Safe project name pattern */
const PROJECT_NAME_RE = /^[a-zA-Z0-9._-]+$/;

/**
 * Validate a DNS hostname/domain
 * @param {string} domain
 * @returns {boolean}
 */
function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  if (domain.length > 253) return false;
  return DOMAIN_RE.test(domain);
}

/**
 * Validate a git branch name
 * @param {string} branch
 * @returns {boolean}
 */
function isValidBranch(branch) {
  if (!branch || typeof branch !== 'string') return false;
  if (branch.length > 255) return false;
  if (branch.includes('..')) return false;
  return BRANCH_RE.test(branch);
}

/**
 * Validate a git repo URL
 * @param {string} url
 * @returns {boolean}
 */
function isValidRepoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return REPO_URL_RE.test(url);
}

/**
 * Validate a unix username
 * @param {string} username
 * @returns {boolean}
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  if (username.length > 32) return false;
  return USERNAME_RE.test(username);
}

/**
 * Validate a project name (used in file paths)
 * @param {string} name
 * @returns {boolean}
 */
function isValidProjectName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length > 128) return false;
  if (name.includes('..') || name.includes('/')) return false;
  return PROJECT_NAME_RE.test(name);
}

module.exports = {
  isValidDomain,
  isValidBranch,
  isValidRepoUrl,
  isValidUsername,
  isValidProjectName,
  DOMAIN_RE,
  BRANCH_RE,
  REPO_URL_RE,
};
