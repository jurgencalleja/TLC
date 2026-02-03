/**
 * Query Builder Module
 *
 * Safe parameterized query building to prevent SQL injection.
 * Addresses OWASP A03: Injection
 */

/**
 * Custom error for security violations
 */
export class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * SQL reserved words that need quoting
 */
const RESERVED_WORDS = new Set([
  'order', 'group', 'select', 'table', 'user', 'index', 'key', 'from', 'to',
  'where', 'and', 'or', 'not', 'null', 'true', 'false', 'like', 'in', 'as',
  'join', 'left', 'right', 'inner', 'outer', 'on', 'using', 'limit', 'offset',
]);

/**
 * Escape identifier (table/column name)
 * @param {string} identifier - The identifier to escape
 * @returns {string} Escaped identifier
 */
function escapeIdentifier(identifier) {
  // Handle schema-qualified names (e.g., public.users)
  if (identifier.includes('.') && !identifier.includes('..')) {
    return identifier.split('.').map(escapeIdentifier).join('.');
  }

  // Check for dangerous SQL injection patterns in identifier (but allow hyphens)
  if (/[;'"\\]/.test(identifier) || /--/.test(identifier)) {
    throw new SecurityError(`Invalid identifier: ${identifier}`);
  }

  // Quote if contains special chars or is reserved word
  if (/-/.test(identifier) || RESERVED_WORDS.has(identifier.toLowerCase())) {
    return `"${identifier}"`;
  }

  return identifier;
}

/**
 * Create a SELECT query builder
 * @param {string} table - The table name
 * @returns {Object} Query builder
 */
export function select(table) {
  return new SelectBuilder(table);
}

/**
 * Create an INSERT query builder
 * @param {string} table - The table name
 * @returns {Object} Query builder
 */
export function insert(table) {
  return new InsertBuilder(table);
}

/**
 * Create an UPDATE query builder
 * @param {string} table - The table name
 * @returns {Object} Query builder
 */
export function update(table) {
  return new UpdateBuilder(table);
}

/**
 * Create a DELETE query builder
 * @param {string} table - The table name
 * @returns {Object} Query builder
 */
export function del(table) {
  return new DeleteBuilder(table);
}

/**
 * Create a query builder with options
 * @param {Object} options - Builder options
 * @returns {Object} Query builder factory
 */
export function createQueryBuilder(options = {}) {
  const { dialect = 'postgresql', allowedTables = null, allowedColumns = null } = options;

  return {
    select(table) {
      if (allowedTables && !allowedTables.includes(table)) {
        throw new SecurityError(`Table not allowed: ${table}`);
      }
      const builder = new SelectBuilder(table, { dialect, allowedColumns });
      return builder;
    },
    insert(table) {
      if (allowedTables && !allowedTables.includes(table)) {
        throw new SecurityError(`Table not allowed: ${table}`);
      }
      return new InsertBuilder(table, { dialect });
    },
    update(table) {
      if (allowedTables && !allowedTables.includes(table)) {
        throw new SecurityError(`Table not allowed: ${table}`);
      }
      return new UpdateBuilder(table, { dialect });
    },
    delete(table) {
      if (allowedTables && !allowedTables.includes(table)) {
        throw new SecurityError(`Table not allowed: ${table}`);
      }
      return new DeleteBuilder(table, { dialect });
    },
  };
}

/**
 * Base query builder class
 */
class BaseBuilder {
  constructor(table, options = {}) {
    this._table = escapeIdentifier(table);
    this._dialect = options.dialect || 'postgresql';
    this._params = [];
    this._paramIndex = 0;
    this._allowedColumns = options.allowedColumns;
  }

  _placeholder() {
    this._paramIndex++;
    if (this._dialect === 'postgresql') {
      return `$${this._paramIndex}`;
    }
    return '?';
  }

  _validateColumn(column) {
    if (this._allowedColumns && this._allowedColumns[this._table]) {
      if (!this._allowedColumns[this._table].includes(column)) {
        throw new SecurityError(`Column not allowed: ${column}`);
      }
    }
  }
}

/**
 * SELECT query builder
 */
class SelectBuilder extends BaseBuilder {
  constructor(table, options) {
    super(table, options);
    this._columns = ['*'];
    this._where = [];
    this._orderBy = [];
    this._limit = null;
    this._offset = null;
  }

  columns(cols) {
    if (cols.length > 0 && cols[0] !== '*') {
      cols.forEach((col) => this._validateColumn(col));
    }
    this._columns = cols.map((col) => col === '*' ? '*' : escapeIdentifier(col));
    return this;
  }

  where(column, operator, value) {
    this._where.push({
      column: escapeIdentifier(column),
      operator,
      value,
      type: 'AND',
    });
    return this;
  }

  orWhere(column, operator, value) {
    this._where.push({
      column: escapeIdentifier(column),
      operator,
      value,
      type: 'OR',
    });
    return this;
  }

  whereIn(column, values) {
    this._where.push({
      column: escapeIdentifier(column),
      operator: 'IN',
      value: values,
      type: 'AND',
      isIn: true,
    });
    return this;
  }

  whereRaw(/* raw */) {
    throw new SecurityError('Raw WHERE clauses are not allowed - use parameterized queries');
  }

  orderBy(column, direction = 'ASC') {
    const dir = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    this._orderBy.push(`${escapeIdentifier(column)} ${dir}`);
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  offset(n) {
    this._offset = n;
    return this;
  }

  build() {
    const parts = [`SELECT ${this._columns.join(', ')} FROM ${this._table}`];

    if (this._where.length > 0) {
      const whereClauses = this._where.map((w, i) => {
        let clause;
        if (w.isIn) {
          const placeholders = w.value.map(() => this._placeholder());
          this._params.push(...w.value);
          clause = `${w.column} IN (${placeholders.join(', ')})`;
        } else {
          clause = `${w.column} ${w.operator} ${this._placeholder()}`;
          this._params.push(w.value);
        }
        return i === 0 ? clause : `${w.type} ${clause}`;
      });
      parts.push(`WHERE ${whereClauses.join(' ')}`);
    }

    if (this._orderBy.length > 0) {
      parts.push(`ORDER BY ${this._orderBy.join(', ')}`);
    }

    if (this._limit !== null) {
      parts.push(`LIMIT ${this._placeholder()}`);
      this._params.push(this._limit);
    }

    if (this._offset !== null) {
      parts.push(`OFFSET ${this._placeholder()}`);
      this._params.push(this._offset);
    }

    return { sql: parts.join(' '), params: this._params };
  }
}

/**
 * INSERT query builder
 */
class InsertBuilder extends BaseBuilder {
  constructor(table, options) {
    super(table, options);
    this._values = null;
    this._returning = [];
  }

  values(data) {
    this._values = Array.isArray(data) ? data : [data];
    return this;
  }

  returning(cols) {
    this._returning = cols;
    return this;
  }

  build() {
    if (!this._values || this._values.length === 0) {
      throw new SecurityError('INSERT requires values');
    }

    const columns = Object.keys(this._values[0]);

    // Validate column names
    columns.forEach((col) => {
      if (/[;'"\\\/]/.test(col) || /\b(drop|delete|truncate|alter)\b/i.test(col)) {
        throw new SecurityError(`Invalid column name: ${col}`);
      }
    });

    const escapedColumns = columns.map((col) => escapeIdentifier(col));
    const valueSets = this._values.map((row) => {
      const placeholders = columns.map(() => this._placeholder());
      columns.forEach((col) => this._params.push(row[col]));
      return `(${placeholders.join(', ')})`;
    });

    let sql = `INSERT INTO ${this._table} (${escapedColumns.join(', ')}) VALUES ${valueSets.join(', ')}`;

    if (this._returning.length > 0) {
      sql += ` RETURNING ${this._returning.map((c) => escapeIdentifier(c)).join(', ')}`;
    }

    return { sql, params: this._params };
  }
}

/**
 * UPDATE query builder
 */
class UpdateBuilder extends BaseBuilder {
  constructor(table, options) {
    super(table, options);
    this._set = {};
    this._where = [];
    this._returning = [];
    this._unsafe = false;
  }

  set(data) {
    this._set = data;
    return this;
  }

  where(column, operator, value) {
    this._where.push({
      column: escapeIdentifier(column),
      operator,
      value,
    });
    return this;
  }

  returning(cols) {
    this._returning = cols;
    return this;
  }

  unsafe() {
    this._unsafe = true;
    return this;
  }

  build() {
    if (!this._unsafe && this._where.length === 0) {
      throw new SecurityError('UPDATE without WHERE clause requires .unsafe() call');
    }

    const setClauses = Object.entries(this._set).map(([col, val]) => {
      const placeholder = this._placeholder();
      this._params.push(val);
      return `${escapeIdentifier(col)} = ${placeholder}`;
    });

    let sql = `UPDATE ${this._table} SET ${setClauses.join(', ')}`;

    if (this._where.length > 0) {
      const whereClauses = this._where.map((w, i) => {
        const clause = `${w.column} ${w.operator} ${this._placeholder()}`;
        this._params.push(w.value);
        return i === 0 ? clause : `AND ${clause}`;
      });
      sql += ` WHERE ${whereClauses.join(' ')}`;
    }

    if (this._returning.length > 0) {
      sql += ` RETURNING ${this._returning.map((c) => escapeIdentifier(c)).join(', ')}`;
    }

    return { sql, params: this._params };
  }
}

/**
 * DELETE query builder
 */
class DeleteBuilder extends BaseBuilder {
  constructor(table, options) {
    super(table, options);
    this._where = [];
    this._unsafe = false;
  }

  where(column, operator, value) {
    this._where.push({
      column: escapeIdentifier(column),
      operator,
      value,
    });
    return this;
  }

  unsafe() {
    this._unsafe = true;
    return this;
  }

  build() {
    if (!this._unsafe && this._where.length === 0) {
      throw new SecurityError('DELETE without WHERE clause requires .unsafe() call');
    }

    let sql = `DELETE FROM ${this._table}`;

    if (this._where.length > 0) {
      const whereClauses = this._where.map((w, i) => {
        const clause = `${w.column} ${w.operator} ${this._placeholder()}`;
        this._params.push(w.value);
        return i === 0 ? clause : `AND ${clause}`;
      });
      sql += ` WHERE ${whereClauses.join(' ')}`;
    }

    return { sql, params: this._params };
  }
}
