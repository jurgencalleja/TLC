/**
 * Audit Query Engine - Search and filter audit logs
 *
 * Features:
 * - Filter by date range
 * - Filter by action type (exact match or wildcard)
 * - Filter by user (single or multiple)
 * - Filter by severity (single, multiple, or minimum level)
 * - Full-text search in parameters
 * - Pagination support
 * - Count-only queries
 */

// Severity levels in order from lowest to highest
const SEVERITY_LEVELS = ['debug', 'info', 'warning', 'error', 'critical'];

export class AuditQuery {
  /**
   * Create an AuditQuery instance
   * @param {AuditStorage} storage - AuditStorage instance to query
   */
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Query audit log entries with filters
   * @param {Object} options - Query options
   * @param {Date} options.from - Start date (inclusive)
   * @param {Date} options.to - End date (inclusive)
   * @param {string} options.action - Action type filter (supports wildcard with *)
   * @param {string|string[]} options.user - User filter (single or array)
   * @param {string|string[]} options.severity - Severity filter (single or array)
   * @param {string} options.minSeverity - Minimum severity level
   * @param {string} options.search - Full-text search in parameters
   * @param {number} options.limit - Maximum entries to return
   * @param {number} options.offset - Number of entries to skip
   * @param {number} options.page - Page number (alternative to offset)
   * @param {string} options.sort - Sort order: 'asc' or 'desc' (default: 'desc')
   * @param {boolean} options.countOnly - Return only count, not entries
   * @returns {Promise<Object>} Query result { entries, total, hasMore, page }
   */
  async query(options = {}) {
    const {
      from,
      to,
      action,
      user,
      severity,
      minSeverity,
      search,
      limit,
      offset,
      page,
      sort = 'desc',
      countOnly = false,
    } = options;

    // Get all entries from storage (with basic date filtering if supported)
    let entries = await this.storage.getEntries({ from, to });

    // Apply action filter
    if (action) {
      entries = this.filterByAction(entries, action);
    }

    // Apply user filter
    if (user) {
      entries = this.filterByUser(entries, user);
    }

    // Apply severity filter
    if (severity) {
      entries = this.filterBySeverity(entries, severity);
    }

    // Apply minimum severity filter
    if (minSeverity) {
      entries = this.filterByMinSeverity(entries, minSeverity);
    }

    // Apply search filter
    if (search) {
      entries = this.filterBySearch(entries, search);
    }

    // Sort entries
    entries = this.sortEntries(entries, sort);

    // Get total count
    const total = entries.length;

    // If count only, return early
    if (countOnly) {
      return { total };
    }

    // Apply pagination
    const { paginatedEntries, hasMore, currentPage } = this.paginate(
      entries,
      limit,
      offset,
      page
    );

    return {
      entries: paginatedEntries,
      total,
      hasMore,
      page: currentPage,
    };
  }

  /**
   * Filter entries by action type
   * @param {Object[]} entries - Entries to filter
   * @param {string} action - Action filter (supports * wildcard)
   * @returns {Object[]} Filtered entries
   */
  filterByAction(entries, action) {
    if (action.endsWith('*')) {
      // Wildcard prefix match
      const prefix = action.slice(0, -1);
      return entries.filter((e) => e.action && e.action.startsWith(prefix));
    }
    // Exact match
    return entries.filter((e) => e.action === action);
  }

  /**
   * Filter entries by user
   * @param {Object[]} entries - Entries to filter
   * @param {string|string[]} user - User or array of users
   * @returns {Object[]} Filtered entries
   */
  filterByUser(entries, user) {
    const users = Array.isArray(user) ? user : [user];
    return entries.filter((e) => users.includes(e.user));
  }

  /**
   * Filter entries by severity
   * @param {Object[]} entries - Entries to filter
   * @param {string|string[]} severity - Severity or array of severities
   * @returns {Object[]} Filtered entries
   */
  filterBySeverity(entries, severity) {
    const severities = Array.isArray(severity) ? severity : [severity];
    return entries.filter((e) => severities.includes(e.severity));
  }

  /**
   * Filter entries by minimum severity level
   * @param {Object[]} entries - Entries to filter
   * @param {string} minSeverity - Minimum severity level
   * @returns {Object[]} Filtered entries
   */
  filterByMinSeverity(entries, minSeverity) {
    const minIndex = SEVERITY_LEVELS.indexOf(minSeverity);
    if (minIndex === -1) {
      return entries; // Invalid severity, return all
    }
    return entries.filter((e) => {
      const entryIndex = SEVERITY_LEVELS.indexOf(e.severity);
      return entryIndex >= minIndex;
    });
  }

  /**
   * Filter entries by full-text search
   * @param {Object[]} entries - Entries to filter
   * @param {string} search - Search term
   * @returns {Object[]} Filtered entries
   */
  filterBySearch(entries, search) {
    const searchLower = search.toLowerCase();
    return entries.filter((e) => {
      // Search in action field
      if (e.action && e.action.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Search in user field
      if (e.user && e.user.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Search in parameters
      if (e.parameters) {
        const paramStr = JSON.stringify(e.parameters).toLowerCase();
        if (paramStr.includes(searchLower)) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Sort entries by timestamp
   * @param {Object[]} entries - Entries to sort
   * @param {string} order - Sort order: 'asc' or 'desc'
   * @returns {Object[]} Sorted entries
   */
  sortEntries(entries, order) {
    const sorted = [...entries];
    if (order === 'asc') {
      sorted.sort((a, b) => a.timestamp - b.timestamp);
    } else {
      sorted.sort((a, b) => b.timestamp - a.timestamp);
    }
    return sorted;
  }

  /**
   * Paginate entries
   * @param {Object[]} entries - Entries to paginate
   * @param {number} limit - Maximum entries per page
   * @param {number} offset - Number of entries to skip
   * @param {number} page - Page number (1-based)
   * @returns {Object} { paginatedEntries, hasMore, currentPage }
   */
  paginate(entries, limit, offset, page) {
    if (!limit) {
      return {
        paginatedEntries: entries,
        hasMore: false,
        currentPage: 1,
      };
    }

    let startIndex;
    let currentPage;

    if (page !== undefined) {
      // Use page number (1-based)
      currentPage = page;
      startIndex = (page - 1) * limit;
    } else if (offset !== undefined) {
      // Use offset
      startIndex = offset;
      currentPage = Math.floor(offset / limit) + 1;
    } else {
      // Default to first page
      startIndex = 0;
      currentPage = 1;
    }

    const endIndex = startIndex + limit;
    const paginatedEntries = entries.slice(startIndex, endIndex);
    const hasMore = endIndex < entries.length;

    return {
      paginatedEntries,
      hasMore,
      currentPage,
    };
  }
}
