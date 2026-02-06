/**
 * Tag Classifier - Parse and classify git tags into release tiers
 * with semantic versioning support.
 */

/**
 * Regex for valid semver tag: v{major}.{minor}.{patch}[-{prerelease}]
 * Prerelease must be one of: alpha.N, beta.N, rc.N
 */
const TAG_REGEX = /^v(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/;

/**
 * Tier ordering for prerelease comparison.
 * Higher number = closer to release.
 */
const TIER_ORDER = {
  alpha: 1,
  beta: 2,
  rc: 3,
  release: 4,
};

/**
 * Parse a git tag string into its semantic version components.
 *
 * @param {string} tagString - The git tag to parse (e.g., "v1.0.0", "v1.0.0-rc.1")
 * @returns {{ version: string, major: number, minor: number, patch: number, prerelease: string|null, tier: string, valid: boolean }}
 *   Parsed tag object. If the tag is invalid, `valid` is false and `tier` is "unknown".
 */
function parseTag(tagString) {
  const invalid = {
    version: null,
    major: null,
    minor: null,
    patch: null,
    prerelease: null,
    tier: 'unknown',
    valid: false,
  };

  if (typeof tagString !== 'string') {
    return invalid;
  }

  const match = tagString.match(TAG_REGEX);
  if (!match) {
    return invalid;
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = parseInt(match[3], 10);
  const prereleaseLabel = match[4] || null;
  const prereleaseNum = match[5] ? parseInt(match[5], 10) : null;

  const prerelease = prereleaseLabel ? `${prereleaseLabel}.${prereleaseNum}` : null;
  const tier = prereleaseLabel || 'release';
  const version = prerelease ? `${major}.${minor}.${patch}-${prerelease}` : `${major}.${minor}.${patch}`;

  return {
    version,
    major,
    minor,
    patch,
    prerelease,
    tier,
    valid: true,
  };
}

/**
 * Check whether a tag string is a valid semver tag.
 *
 * @param {string} tagString - The git tag to validate
 * @returns {boolean} True if the tag is a valid semver tag with v prefix
 */
function isValidTag(tagString) {
  if (typeof tagString !== 'string') {
    return false;
  }
  return TAG_REGEX.test(tagString);
}

/**
 * Classify a tag string into its release tier.
 *
 * @param {string} tagString - The git tag to classify
 * @returns {'release' | 'rc' | 'beta' | 'alpha' | 'unknown'} The release tier
 */
function classifyTier(tagString) {
  const parsed = parseTag(tagString);
  return parsed.tier;
}

/**
 * Compare two version tag strings for ordering.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 *
 * Comparison order:
 * 1. Major version
 * 2. Minor version
 * 3. Patch version
 * 4. Tier (release > rc > beta > alpha)
 * 5. Prerelease number
 *
 * Invalid tags are ranked below valid tags. Two invalid tags are considered equal.
 *
 * @param {string} a - First tag string
 * @param {string} b - Second tag string
 * @returns {-1 | 0 | 1} Comparison result
 */
function compareVersions(a, b) {
  const parsedA = parseTag(a);
  const parsedB = parseTag(b);

  // Handle invalid tags
  if (!parsedA.valid && !parsedB.valid) return 0;
  if (!parsedA.valid) return -1;
  if (!parsedB.valid) return 1;

  // Compare major.minor.patch
  if (parsedA.major !== parsedB.major) {
    return parsedA.major > parsedB.major ? 1 : -1;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor > parsedB.minor ? 1 : -1;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch > parsedB.patch ? 1 : -1;
  }

  // Compare tiers
  const tierA = TIER_ORDER[parsedA.tier] || 0;
  const tierB = TIER_ORDER[parsedB.tier] || 0;
  if (tierA !== tierB) {
    return tierA > tierB ? 1 : -1;
  }

  // Compare prerelease numbers within the same tier
  const preNumA = parsedA.prerelease ? parseInt(parsedA.prerelease.split('.')[1], 10) : 0;
  const preNumB = parsedB.prerelease ? parseInt(parsedB.prerelease.split('.')[1], 10) : 0;
  if (preNumA !== preNumB) {
    return preNumA > preNumB ? 1 : -1;
  }

  return 0;
}

module.exports = {
  parseTag,
  compareVersions,
  isValidTag,
  classifyTier,
};
