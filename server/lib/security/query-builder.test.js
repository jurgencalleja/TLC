/**
 * Query Builder Tests
 *
 * Tests for safe parameterized query building.
 */

import { describe, it, expect } from 'vitest';
import {
  createQueryBuilder,
  select,
  insert,
  update,
  del,
  SecurityError,
} from './query-builder.js';

describe('query-builder', () => {
  describe('select', () => {
    it('builds SELECT with simple WHERE', () => {
      const result = select('users')
        .columns(['id', 'name', 'email'])
        .where('id', '=', 1)
        .build();

      expect(result.sql).toBe('SELECT id, name, email FROM users WHERE id = ?');
      expect(result.params).toEqual([1]);
    });

    it('builds SELECT with multiple WHERE conditions', () => {
      const result = select('users')
        .columns(['*'])
        .where('status', '=', 'active')
        .where('age', '>=', 18)
        .build();

      expect(result.sql).toBe('SELECT * FROM users WHERE status = ? AND age >= ?');
      expect(result.params).toEqual(['active', 18]);
    });

    it('builds SELECT with OR conditions', () => {
      const result = select('users')
        .columns(['*'])
        .where('role', '=', 'admin')
        .orWhere('role', '=', 'superadmin')
        .build();

      expect(result.sql).toContain('OR');
      expect(result.params).toEqual(['admin', 'superadmin']);
    });

    it('builds SELECT with IN clause', () => {
      const result = select('users')
        .columns(['*'])
        .whereIn('id', [1, 2, 3])
        .build();

      expect(result.sql).toBe('SELECT * FROM users WHERE id IN (?, ?, ?)');
      expect(result.params).toEqual([1, 2, 3]);
    });

    it('builds SELECT with ORDER BY', () => {
      const result = select('users')
        .columns(['*'])
        .orderBy('created_at', 'DESC')
        .build();

      expect(result.sql).toContain('ORDER BY created_at DESC');
    });

    it('builds SELECT with LIMIT and OFFSET', () => {
      const result = select('users')
        .columns(['*'])
        .limit(10)
        .offset(20)
        .build();

      expect(result.sql).toContain('LIMIT ?');
      expect(result.sql).toContain('OFFSET ?');
      expect(result.params).toContain(10);
      expect(result.params).toContain(20);
    });

    it('rejects string concatenation in WHERE value', () => {
      expect(() => {
        select('users')
          .columns(['*'])
          .whereRaw("name = '" + "'; DROP TABLE users;--")
          .build();
      }).toThrow(SecurityError);
    });

    it('rejects unwhitelisted table name', () => {
      const builder = createQueryBuilder({
        allowedTables: ['users', 'posts'],
      });

      expect(() => {
        builder.select('admin_secrets').columns(['*']).build();
      }).toThrow(SecurityError);
    });

    it('rejects unwhitelisted column name', () => {
      const builder = createQueryBuilder({
        allowedColumns: { users: ['id', 'name', 'email'] },
      });

      expect(() => {
        builder.select('users').columns(['password_hash']).build();
      }).toThrow(SecurityError);
    });
  });

  describe('insert', () => {
    it('builds INSERT with values', () => {
      const result = insert('users')
        .values({ name: 'John', email: 'john@example.com' })
        .build();

      expect(result.sql).toBe('INSERT INTO users (name, email) VALUES (?, ?)');
      expect(result.params).toEqual(['John', 'john@example.com']);
    });

    it('builds INSERT with multiple rows', () => {
      const result = insert('users')
        .values([
          { name: 'John', email: 'john@example.com' },
          { name: 'Jane', email: 'jane@example.com' },
        ])
        .build();

      expect(result.sql).toContain('VALUES (?, ?), (?, ?)');
      expect(result.params).toHaveLength(4);
    });

    it('builds INSERT with RETURNING clause', () => {
      const result = insert('users')
        .values({ name: 'John' })
        .returning(['id'])
        .build();

      expect(result.sql).toContain('RETURNING id');
    });

    it('escapes column names with special characters', () => {
      const result = insert('users')
        .values({ 'user-name': 'John' })
        .build();

      expect(result.sql).toContain('"user-name"');
    });

    it('rejects SQL in column names', () => {
      expect(() => {
        insert('users')
          .values({ 'name; DROP TABLE users;--': 'John' })
          .build();
      }).toThrow(SecurityError);
    });
  });

  describe('update', () => {
    it('builds UPDATE with SET and WHERE', () => {
      const result = update('users')
        .set({ name: 'John', status: 'active' })
        .where('id', '=', 1)
        .build();

      expect(result.sql).toBe('UPDATE users SET name = ?, status = ? WHERE id = ?');
      expect(result.params).toEqual(['John', 'active', 1]);
    });

    it('requires WHERE clause by default', () => {
      expect(() => {
        update('users')
          .set({ status: 'deleted' })
          .build();
      }).toThrow(SecurityError);
    });

    it('allows UPDATE without WHERE when explicitly unsafe', () => {
      const result = update('users')
        .set({ status: 'inactive' })
        .unsafe()
        .build();

      expect(result.sql).toBe('UPDATE users SET status = ?');
    });

    it('builds UPDATE with RETURNING', () => {
      const result = update('users')
        .set({ name: 'John' })
        .where('id', '=', 1)
        .returning(['id', 'name'])
        .build();

      expect(result.sql).toContain('RETURNING id, name');
    });
  });

  describe('delete', () => {
    it('builds DELETE with WHERE', () => {
      const result = del('users')
        .where('id', '=', 1)
        .build();

      expect(result.sql).toBe('DELETE FROM users WHERE id = ?');
      expect(result.params).toEqual([1]);
    });

    it('requires WHERE clause by default', () => {
      expect(() => {
        del('users').build();
      }).toThrow(SecurityError);
    });

    it('allows DELETE without WHERE when explicitly unsafe', () => {
      const result = del('users').unsafe().build();
      expect(result.sql).toBe('DELETE FROM users');
    });

    it('builds DELETE with multiple conditions', () => {
      const result = del('users')
        .where('status', '=', 'deleted')
        .where('deleted_at', '<', '2024-01-01')
        .build();

      expect(result.sql).toContain('AND');
      expect(result.params).toHaveLength(2);
    });
  });

  describe('SQL keyword safety', () => {
    it('treats SQL keywords in values as data', () => {
      const result = insert('users')
        .values({ name: 'SELECT * FROM users' })
        .build();

      expect(result.params).toContain('SELECT * FROM users');
      expect(result.sql).not.toContain('SELECT * FROM users');
    });

    it('treats DROP TABLE in values as data', () => {
      const result = update('users')
        .set({ bio: 'DROP TABLE users;' })
        .where('id', '=', 1)
        .build();

      expect(result.params).toContain('DROP TABLE users;');
    });

    it('treats UNION in values as data', () => {
      const result = select('users')
        .columns(['*'])
        .where('name', '=', "' UNION SELECT * FROM passwords--")
        .build();

      expect(result.params).toContain("' UNION SELECT * FROM passwords--");
    });
  });

  describe('dialect support', () => {
    it('uses PostgreSQL parameter style ($1)', () => {
      const builder = createQueryBuilder({ dialect: 'postgresql' });
      const result = builder.select('users')
        .columns(['*'])
        .where('id', '=', 1)
        .build();

      expect(result.sql).toContain('$1');
    });

    it('uses MySQL parameter style (?)', () => {
      const builder = createQueryBuilder({ dialect: 'mysql' });
      const result = builder.select('users')
        .columns(['*'])
        .where('id', '=', 1)
        .build();

      expect(result.sql).toContain('?');
    });

    it('uses SQLite parameter style (?)', () => {
      const builder = createQueryBuilder({ dialect: 'sqlite' });
      const result = builder.select('users')
        .columns(['*'])
        .where('id', '=', 1)
        .build();

      expect(result.sql).toContain('?');
    });
  });

  describe('identifier escaping', () => {
    it('escapes table names with special characters', () => {
      const result = select('user-data')
        .columns(['*'])
        .build();

      expect(result.sql).toContain('"user-data"');
    });

    it('escapes reserved word table names', () => {
      const result = select('order')
        .columns(['*'])
        .build();

      expect(result.sql).toContain('"order"');
    });

    it('handles schema-qualified table names', () => {
      const result = select('public.users')
        .columns(['*'])
        .build();

      expect(result.sql).toContain('public.users');
    });
  });
});
