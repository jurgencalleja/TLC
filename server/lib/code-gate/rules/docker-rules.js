/**
 * Docker Rules
 *
 * Detects dangerous Docker patterns that can cause data loss:
 * external volumes, missing volume names, destructive commands.
 *
 * Derived from Bug #27 (AI wiped production database via docker volume).
 * See: TLC-BEST-PRACTICES.md Section 7 (Docker & Infrastructure)
 *
 * @module code-gate/rules/docker-rules
 */

/**
 * File types where docker-compose rules apply.
 * @param {string} filePath
 * @returns {boolean}
 */
function isDockerComposeFile(filePath) {
  const base = filePath.toLowerCase();
  return base.includes('docker-compose') || base.includes('compose.y');
}

/**
 * File types where shell command rules apply.
 * @param {string} filePath
 * @returns {boolean}
 */
function isShellOrCIFile(filePath) {
  const base = filePath.toLowerCase();
  return base.endsWith('.sh') || base.endsWith('.bash') ||
         base.includes('.github/') || base.includes('.gitlab-ci') ||
         base.includes('makefile') || base.includes('Makefile') ||
         base.endsWith('.yml') || base.endsWith('.yaml');
}

/**
 * Detect `external: true` in docker-compose volume definitions.
 * External volumes create fragile cross-project dependencies
 * and can silently reference wrong data.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array<{severity: string, rule: string, line: number, message: string, fix: string}>}
 */
function checkExternalVolumes(filePath, content) {
  if (!isDockerComposeFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*external\s*:\s*true/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-external-volumes',
        line: i + 1,
        message: 'Docker volume with external: true — creates fragile cross-project dependency',
        fix: 'Remove external: true and use explicit name: property instead',
      });
    }
  }

  return findings;
}

/**
 * Detect docker-compose volumes without explicit `name:` property.
 * Without explicit names, Docker generates project-prefixed names
 * that can collide or be accidentally deleted.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkMissingVolumeNames(filePath, content) {
  if (!isDockerComposeFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  let inVolumesSection = false;
  let currentVolume = null;
  let currentVolumeHasName = false;
  let currentVolumeLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect top-level volumes: section
    if (/^volumes\s*:/.test(line)) {
      inVolumesSection = true;
      continue;
    }

    // Exit volumes section on next top-level key
    if (inVolumesSection && /^\S/.test(line) && !/^\s/.test(line) && !line.startsWith('#')) {
      // Flush last volume
      if (currentVolume && !currentVolumeHasName) {
        findings.push({
          severity: 'warn',
          rule: 'require-volume-names',
          line: currentVolumeLine + 1,
          message: `Volume '${currentVolume}' has no explicit name: — data may be lost on project rename`,
          fix: `Add name: property: name: ${currentVolume}`,
        });
      }
      inVolumesSection = false;
      currentVolume = null;
      continue;
    }

    if (inVolumesSection) {
      // Volume key (indented once, ends with colon)
      const volumeKey = line.match(/^\s{2}(\w[\w-]*)\s*:/);
      if (volumeKey) {
        // Flush previous volume
        if (currentVolume && !currentVolumeHasName) {
          findings.push({
            severity: 'warn',
            rule: 'require-volume-names',
            line: currentVolumeLine + 1,
            message: `Volume '${currentVolume}' has no explicit name: — data may be lost on project rename`,
            fix: `Add name: property: name: ${currentVolume}`,
          });
        }
        currentVolume = volumeKey[1];
        currentVolumeLine = i;
        currentVolumeHasName = false;
      }

      // Check for name: property (indented further)
      if (currentVolume && /^\s+name\s*:/.test(line)) {
        currentVolumeHasName = true;
      }
    }
  }

  // Flush final volume
  if (inVolumesSection && currentVolume && !currentVolumeHasName) {
    findings.push({
      severity: 'warn',
      rule: 'require-volume-names',
      line: currentVolumeLine + 1,
      message: `Volume '${currentVolume}' has no explicit name: — data may be lost on project rename`,
      fix: `Add name: property: name: ${currentVolume}`,
    });
  }

  return findings;
}

/**
 * Detect dangerous Docker commands in scripts and CI files.
 * `docker compose down -v` removes data volumes.
 * `docker volume rm` deletes volumes directly.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkDangerousDockerCommands(filePath, content) {
  if (!isShellOrCIFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    // docker compose down -v (or docker-compose down -v)
    if (/docker[\s-]compose\s+down\s+.*-v/.test(line) ||
        /docker[\s-]compose\s+down\s+-v/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-dangerous-docker',
        line: i + 1,
        message: 'docker compose down -v removes data volumes — potential data loss',
        fix: 'Use docker compose down (without -v) to preserve data volumes',
      });
    }

    // docker volume rm
    if (/docker\s+volume\s+rm\b/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-dangerous-docker',
        line: i + 1,
        message: 'docker volume rm — irreversible data deletion',
        fix: 'Verify this is intentional. Use docker volume inspect first to check contents',
      });
    }
  }

  return findings;
}

module.exports = {
  checkExternalVolumes,
  checkMissingVolumeNames,
  checkDangerousDockerCommands,
};
