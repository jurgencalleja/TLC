import { describe, it, expect } from 'vitest';
import {
  TYPE_MAPPINGS,
  detectORM,
  mapTypeToJsonSchema,
  parseDrizzleSchema,
  parseDrizzleColumns,
  parsePrismaSchema,
  parsePrismaFields,
  parseTypeORMSchema,
  extractClassBody,
  parseTypeORMColumns,
  modelToJsonSchema,
  parseSchema,
  generateOpenAPISchemas,
  createOrmSchemaParser,
} from './orm-schema-parser.js';

describe('orm-schema-parser', () => {
  describe('TYPE_MAPPINGS', () => {
    it('maps common types', () => {
      expect(TYPE_MAPPINGS.string.type).toBe('string');
      expect(TYPE_MAPPINGS.int.type).toBe('integer');
      expect(TYPE_MAPPINGS.boolean.type).toBe('boolean');
    });

    it('includes format for dates', () => {
      expect(TYPE_MAPPINGS.date.format).toBe('date');
      expect(TYPE_MAPPINGS.datetime.format).toBe('date-time');
      expect(TYPE_MAPPINGS.uuid.format).toBe('uuid');
    });
  });

  describe('detectORM', () => {
    it('detects Drizzle', () => {
      expect(detectORM("import { pgTable } from 'drizzle-orm'")).toBe('drizzle');
      expect(detectORM('from "drizzle-orm/pg-core"')).toBe('drizzle');
    });

    it('detects Prisma', () => {
      expect(detectORM('generator client {\n  provider = "prisma-client-js"\n}')).toBe('prisma');
      expect(detectORM('model User {\n  id Int @id\n}')).toBe('prisma');
    });

    it('detects TypeORM', () => {
      expect(detectORM("import { Entity } from 'typeorm'")).toBe('typeorm');
      expect(detectORM('@Entity()\nexport class User {}')).toBe('typeorm');
    });

    it('returns null for unknown', () => {
      expect(detectORM('console.log("hello")')).toBeNull();
    });
  });

  describe('mapTypeToJsonSchema', () => {
    it('maps basic types', () => {
      expect(mapTypeToJsonSchema('string').type).toBe('string');
      expect(mapTypeToJsonSchema('integer').type).toBe('integer');
      expect(mapTypeToJsonSchema('boolean').type).toBe('boolean');
    });

    it('handles type variations', () => {
      expect(mapTypeToJsonSchema('VARCHAR(255)').type).toBe('string');
      expect(mapTypeToJsonSchema('INT').type).toBe('integer');
    });

    it('defaults to string for unknown', () => {
      expect(mapTypeToJsonSchema('unknown').type).toBe('string');
    });
  });

  describe('parseDrizzleColumns', () => {
    it('parses column definitions', () => {
      const block = `
        id: serial('id').primaryKey(),
        name: varchar('name', { length: 255 }).notNull(),
        email: text('email')
      `;

      const columns = parseDrizzleColumns(block);

      expect(columns.length).toBeGreaterThanOrEqual(2);
      const idCol = columns.find(c => c.name === 'id');
      expect(idCol).toBeDefined();
    });
  });

  describe('parseDrizzleSchema', () => {
    it('parses table definition', () => {
      const content = `
        import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

        export const users = pgTable('users', {
          id: serial('id').primaryKey(),
          name: varchar('name', { length: 255 }).notNull()
        });
      `;

      const models = parseDrizzleSchema(content);

      expect(models).toHaveLength(1);
      expect(models[0].name).toBe('users');
      expect(models[0].tableName).toBe('users');
      expect(models[0].orm).toBe('drizzle');
    });

    it('parses multiple tables', () => {
      const content = `
        const users = pgTable('users', { id: serial('id') });
        const posts = pgTable('posts', { id: serial('id') });
      `;

      const models = parseDrizzleSchema(content);

      expect(models).toHaveLength(2);
    });
  });

  describe('parsePrismaFields', () => {
    it('parses field definitions', () => {
      const block = `
        id        Int      @id @default(autoincrement())
        email     String   @unique
        name      String?
        posts     Post[]
      `;

      const columns = parsePrismaFields(block);

      expect(columns.length).toBeGreaterThanOrEqual(2);
      const idCol = columns.find(c => c.name === 'id');
      expect(idCol.primary).toBe(true);
    });

    it('handles optional fields', () => {
      const block = 'name String?';
      const columns = parsePrismaFields(block);

      expect(columns[0].nullable).toBe(true);
    });

    it('handles array fields', () => {
      const block = 'tags String[]';
      const columns = parsePrismaFields(block);

      expect(columns[0].isArray).toBe(true);
    });
  });

  describe('parsePrismaSchema', () => {
    it('parses model definition', () => {
      const content = `
        model User {
          id    Int     @id @default(autoincrement())
          email String  @unique
          name  String?
        }
      `;

      const models = parsePrismaSchema(content);

      expect(models).toHaveLength(1);
      expect(models[0].name).toBe('User');
      expect(models[0].orm).toBe('prisma');
    });

    it('parses multiple models', () => {
      const content = `
        model User {
          id Int @id
        }

        model Post {
          id Int @id
        }
      `;

      const models = parsePrismaSchema(content);

      expect(models).toHaveLength(2);
    });

    it('skips relation fields', () => {
      const content = `
        model User {
          id     Int    @id
          posts  Post[] @relation("UserPosts")
        }
      `;

      const models = parsePrismaSchema(content);

      // Should only have id, not posts (relation)
      expect(models[0].columns.some(c => c.name === 'posts')).toBe(false);
    });
  });

  describe('extractClassBody', () => {
    it('extracts body between braces', () => {
      const content = 'class User { id: number; name: string; }';
      const start = content.indexOf('{');

      const body = extractClassBody(content, start);

      expect(body).toContain('id');
      expect(body).toContain('name');
    });

    it('handles nested braces', () => {
      const content = 'class User { options = { foo: 1 }; }';
      const start = content.indexOf('{');

      const body = extractClassBody(content, start);

      expect(body).toContain('options');
    });
  });

  describe('parseTypeORMColumns', () => {
    it('parses column decorators', () => {
      const body = `
        @PrimaryGeneratedColumn()
        id: number;

        @Column()
        name: string;

        @Column({ nullable: true })
        bio: string;
      `;

      const columns = parseTypeORMColumns(body);

      expect(columns.length).toBeGreaterThanOrEqual(2);
      const idCol = columns.find(c => c.name === 'id');
      expect(idCol.primary).toBe(true);
    });

    it('handles nullable columns', () => {
      const body = '@Column({ nullable: true }) name: string;';
      const columns = parseTypeORMColumns(body);

      expect(columns[0].nullable).toBe(true);
    });
  });

  describe('parseTypeORMSchema', () => {
    it('parses entity definition', () => {
      const content = `
        import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

        @Entity()
        export class User {
          @PrimaryGeneratedColumn()
          id: number;

          @Column()
          name: string;
        }
      `;

      const models = parseTypeORMSchema(content);

      expect(models).toHaveLength(1);
      expect(models[0].name).toBe('User');
      expect(models[0].orm).toBe('typeorm');
    });

    it('uses custom table name', () => {
      const content = `
        @Entity('custom_users')
        class User {
          @PrimaryGeneratedColumn()
          id: number;
        }
      `;

      const models = parseTypeORMSchema(content);

      expect(models[0].tableName).toBe('custom_users');
    });
  });

  describe('modelToJsonSchema', () => {
    it('converts model to JSON Schema', () => {
      const model = {
        name: 'User',
        columns: [
          { name: 'id', type: 'integer', primary: true },
          { name: 'name', type: 'string', nullable: false },
          { name: 'bio', type: 'string', nullable: true },
        ],
      };

      const schema = modelToJsonSchema(model);

      expect(schema.type).toBe('object');
      expect(schema.properties.id.type).toBe('integer');
      expect(schema.properties.name.type).toBe('string');
    });

    it('sets required for non-nullable fields', () => {
      const model = {
        name: 'User',
        columns: [
          { name: 'id', type: 'integer', primary: true },
          { name: 'name', type: 'string', nullable: false },
          { name: 'bio', type: 'string', nullable: true },
        ],
      };

      const schema = modelToJsonSchema(model);

      expect(schema.required).toContain('name');
      expect(schema.required).not.toContain('bio');
    });

    it('handles array types', () => {
      const model = {
        name: 'User',
        columns: [
          { name: 'tags', type: 'string', isArray: true },
        ],
      };

      const schema = modelToJsonSchema(model);

      expect(schema.properties.tags.type).toBe('array');
      expect(schema.properties.tags.items.type).toBe('string');
    });
  });

  describe('parseSchema', () => {
    it('auto-detects and parses Drizzle', () => {
      const content = `
        import { pgTable } from 'drizzle-orm/pg-core';
        export const users = pgTable('users', { id: serial('id') });
      `;

      const result = parseSchema(content);

      expect(result.orm).toBe('drizzle');
      expect(result.models).toHaveLength(1);
    });

    it('auto-detects and parses Prisma', () => {
      const content = 'model User { id Int @id }';

      const result = parseSchema(content);

      expect(result.orm).toBe('prisma');
    });

    it('returns empty for unknown', () => {
      const result = parseSchema('console.log("hello")');

      expect(result.orm).toBeNull();
      expect(result.models).toHaveLength(0);
    });
  });

  describe('generateOpenAPISchemas', () => {
    it('generates schemas for all models', () => {
      const models = [
        {
          name: 'User',
          columns: [{ name: 'id', type: 'integer' }],
        },
        {
          name: 'Post',
          columns: [{ name: 'id', type: 'integer' }],
        },
      ];

      const schemas = generateOpenAPISchemas(models);

      expect(schemas.User).toBeDefined();
      expect(schemas.Post).toBeDefined();
    });
  });

  describe('createOrmSchemaParser', () => {
    it('creates parser with all methods', () => {
      const parser = createOrmSchemaParser();

      expect(parser.detectORM).toBeDefined();
      expect(parser.parse).toBeDefined();
      expect(parser.parseDrizzle).toBeDefined();
      expect(parser.parsePrisma).toBeDefined();
      expect(parser.parseTypeORM).toBeDefined();
      expect(parser.toJsonSchema).toBeDefined();
      expect(parser.toOpenAPISchemas).toBeDefined();
    });
  });
});
