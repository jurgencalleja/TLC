/**
 * ORM Schema Parser Module
 * Parses Drizzle, Prisma, and TypeORM schemas for documentation
 */

/**
 * ORM type to JSON Schema type mapping
 */
const TYPE_MAPPINGS = {
  // Common types
  string: { type: 'string' },
  text: { type: 'string' },
  varchar: { type: 'string' },
  char: { type: 'string' },
  int: { type: 'integer' },
  integer: { type: 'integer' },
  bigint: { type: 'integer', format: 'int64' },
  smallint: { type: 'integer' },
  float: { type: 'number', format: 'float' },
  double: { type: 'number', format: 'double' },
  decimal: { type: 'number' },
  numeric: { type: 'number' },
  boolean: { type: 'boolean' },
  bool: { type: 'boolean' },
  date: { type: 'string', format: 'date' },
  datetime: { type: 'string', format: 'date-time' },
  timestamp: { type: 'string', format: 'date-time' },
  time: { type: 'string', format: 'time' },
  json: { type: 'object' },
  jsonb: { type: 'object' },
  uuid: { type: 'string', format: 'uuid' },
  serial: { type: 'integer' },
  bigserial: { type: 'integer', format: 'int64' },
};

/**
 * Detect ORM type from file content
 * @param {string} content - File content
 * @returns {string|null} ORM type: 'drizzle', 'prisma', 'typeorm', or null
 */
function detectORM(content) {
  // Drizzle: imports from drizzle-orm
  if (content.includes('from \'drizzle-orm\'') ||
      content.includes('from "drizzle-orm"') ||
      content.includes('drizzle-orm/')) {
    return 'drizzle';
  }

  // Prisma: model declarations in schema.prisma format
  if (content.includes('generator client') ||
      content.includes('datasource db') ||
      /^model\s+\w+\s*\{/m.test(content)) {
    return 'prisma';
  }

  // TypeORM: entity decorators
  if (content.includes('@Entity') ||
      content.includes('from \'typeorm\'') ||
      content.includes('from "typeorm"')) {
    return 'typeorm';
  }

  return null;
}

/**
 * Map ORM type to JSON Schema type
 * @param {string} ormType - ORM-specific type
 * @returns {Object} JSON Schema type definition
 */
function mapTypeToJsonSchema(ormType) {
  const normalized = ormType.toLowerCase().replace(/[()0-9,\s]/g, '');
  return TYPE_MAPPINGS[normalized] || { type: 'string' };
}

/**
 * Parse Drizzle schema
 * @param {string} content - Schema file content
 * @returns {Array} Parsed models
 */
function parseDrizzleSchema(content) {
  const models = [];

  // Match table definitions: export const tableName = pgTable('table_name', { ... })
  const tablePattern = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:pg|mysql|sqlite)Table\s*\(\s*['"`](\w+)['"`]\s*,\s*\{([^}]+)\}/g;

  let match;
  while ((match = tablePattern.exec(content)) !== null) {
    const [, varName, tableName, columnsBlock] = match;

    const columns = parseDrizzleColumns(columnsBlock);

    models.push({
      name: varName,
      tableName,
      columns,
      orm: 'drizzle',
    });
  }

  return models;
}

/**
 * Parse Drizzle column definitions
 * @param {string} columnsBlock - Column definitions block
 * @returns {Array} Parsed columns
 */
function parseDrizzleColumns(columnsBlock) {
  const columns = [];

  // Match column: columnName: type('db_name').constraints()
  const columnPattern = /(\w+)\s*:\s*(\w+)\s*\(\s*['"`]?(\w+)?['"`]?\s*\)/g;

  let match;
  while ((match = columnPattern.exec(columnsBlock)) !== null) {
    const [fullMatch, name, type, dbName] = match;
    const isNotNull = fullMatch.includes('.notNull()');
    const isPrimary = fullMatch.includes('.primaryKey()');
    const hasDefault = fullMatch.includes('.default(');

    columns.push({
      name,
      type: type.replace(/^(pg|mysql|sqlite)/, ''),
      dbName: dbName || name,
      nullable: !isNotNull,
      primary: isPrimary,
      hasDefault,
    });
  }

  return columns;
}

/**
 * Parse Prisma schema
 * @param {string} content - Schema file content
 * @returns {Array} Parsed models
 */
function parsePrismaSchema(content) {
  const models = [];

  // Match model definitions
  const modelPattern = /model\s+(\w+)\s*\{([^}]+)\}/g;

  let match;
  while ((match = modelPattern.exec(content)) !== null) {
    const [, name, fieldsBlock] = match;

    const columns = parsePrismaFields(fieldsBlock);

    models.push({
      name,
      tableName: name.toLowerCase(),
      columns,
      orm: 'prisma',
    });
  }

  return models;
}

/**
 * Parse Prisma field definitions
 * @param {string} fieldsBlock - Fields block
 * @returns {Array} Parsed columns
 */
function parsePrismaFields(fieldsBlock) {
  const columns = [];
  const lines = fieldsBlock.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) {
      continue;
    }

    // Match field: fieldName Type modifiers
    const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?(\[\])?\s*(.*)?$/);
    if (fieldMatch) {
      const [, name, type, optional, isArray, rest] = fieldMatch;

      // Skip relation fields
      if (rest && rest.includes('@relation')) {
        continue;
      }

      const isPrimary = rest && rest.includes('@id');
      const hasDefault = rest && rest.includes('@default');
      const isUnique = rest && rest.includes('@unique');

      columns.push({
        name,
        type: type.toLowerCase(),
        nullable: !!optional,
        isArray: !!isArray,
        primary: isPrimary,
        unique: isUnique,
        hasDefault,
      });
    }
  }

  return columns;
}

/**
 * Parse TypeORM entity
 * @param {string} content - Entity file content
 * @returns {Array} Parsed models
 */
function parseTypeORMSchema(content) {
  const models = [];

  // Match class with @Entity decorator
  const entityPattern = /@Entity\s*\(\s*(?:['"`](\w+)['"`])?\s*\)[\s\S]*?(?:export\s+)?class\s+(\w+)/g;

  let match;
  while ((match = entityPattern.exec(content)) !== null) {
    const [fullMatch, tableName, className] = match;

    // Find the class body
    const classStart = content.indexOf(fullMatch) + fullMatch.length;
    const classBody = extractClassBody(content, classStart);

    const columns = parseTypeORMColumns(classBody);

    models.push({
      name: className,
      tableName: tableName || className.toLowerCase(),
      columns,
      orm: 'typeorm',
    });
  }

  return models;
}

/**
 * Extract class body from position
 * @param {string} content - Full content
 * @param {number} start - Start position after class declaration
 * @returns {string} Class body
 */
function extractClassBody(content, start) {
  let braceCount = 0;
  let bodyStart = -1;

  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') {
      if (braceCount === 0) {
        bodyStart = i + 1;
      }
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        return content.slice(bodyStart, i);
      }
    }
  }

  return '';
}

/**
 * Parse TypeORM column definitions
 * @param {string} classBody - Class body
 * @returns {Array} Parsed columns
 */
function parseTypeORMColumns(classBody) {
  const columns = [];

  // Match @Column() decorated properties
  const columnPattern = /@(?:PrimaryGeneratedColumn|PrimaryColumn|Column)\s*\(\s*(?:\{([^}]*)\}|['"`]?(\w+)['"`]?)?\s*\)[\s\S]*?(?:readonly\s+)?(\w+)\s*[?!]?\s*:\s*(\w+)/g;

  let match;
  while ((match = columnPattern.exec(classBody)) !== null) {
    const [fullMatch, options, simpleType, name, tsType] = match;

    const isPrimary = fullMatch.includes('@Primary');
    const isNullable = options && options.includes('nullable: true');
    const type = simpleType || tsType.toLowerCase();

    columns.push({
      name,
      type,
      nullable: isNullable,
      primary: isPrimary,
    });
  }

  return columns;
}

/**
 * Convert parsed model to JSON Schema
 * @param {Object} model - Parsed model
 * @returns {Object} JSON Schema
 */
function modelToJsonSchema(model) {
  const properties = {};
  const required = [];

  for (const column of model.columns) {
    const schema = mapTypeToJsonSchema(column.type);

    if (column.isArray) {
      properties[column.name] = {
        type: 'array',
        items: schema,
      };
    } else {
      properties[column.name] = { ...schema };
    }

    if (column.primary) {
      properties[column.name].description = 'Primary key';
    }

    if (!column.nullable && !column.hasDefault && !column.primary) {
      required.push(column.name);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

/**
 * Parse any ORM schema file
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {Object} Parse result
 */
function parseSchema(content, filePath = '') {
  const orm = detectORM(content);

  if (!orm) {
    return { models: [], orm: null };
  }

  let models;
  switch (orm) {
    case 'drizzle':
      models = parseDrizzleSchema(content);
      break;
    case 'prisma':
      models = parsePrismaSchema(content);
      break;
    case 'typeorm':
      models = parseTypeORMSchema(content);
      break;
    default:
      models = [];
  }

  return {
    models,
    orm,
    file: filePath,
  };
}

/**
 * Generate OpenAPI schemas from parsed models
 * @param {Array} models - Parsed models
 * @returns {Object} OpenAPI schemas object
 */
function generateOpenAPISchemas(models) {
  const schemas = {};

  for (const model of models) {
    schemas[model.name] = modelToJsonSchema(model);
  }

  return schemas;
}

/**
 * Create ORM schema parser instance
 * @returns {Object} Parser instance
 */
function createOrmSchemaParser() {
  return {
    detectORM,
    parse: parseSchema,
    parseDrizzle: parseDrizzleSchema,
    parsePrisma: parsePrismaSchema,
    parseTypeORM: parseTypeORMSchema,
    toJsonSchema: modelToJsonSchema,
    toOpenAPISchemas: generateOpenAPISchemas,
    mapType: mapTypeToJsonSchema,
  };
}

module.exports = {
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
};
