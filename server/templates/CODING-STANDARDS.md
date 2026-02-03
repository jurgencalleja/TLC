# TLC Coding Standards

This document defines the coding standards for projects using TLC (Test-Led Coding).

## Module Structure

Organize code by **entity**, not by type. Each entity gets its own folder with consistent substructure.

### Correct Structure

```
src/
  {entity}/
    types/           # TypeScript interfaces and types
    schemas/         # Validation schemas (Zod, Joi, etc.)
    constants/       # Entity-specific constants
    {entity}.service.js
    {entity}.controller.js
    {entity}.repository.js
    {entity}.seed.js
```

### Examples

```
src/
  user/
    types/
      user.types.ts
      user-response.types.ts
    schemas/
      create-user.schema.ts
      update-user.schema.ts
    constants/
      user.constants.ts
    user.service.ts
    user.controller.ts
    user.repository.ts
    user.seed.ts
  order/
    types/
      order.types.ts
    schemas/
      create-order.schema.ts
    constants/
      order-status.constants.ts
    order.service.ts
    order.controller.ts
```

### Never Do This

```
src/
  services/          # NO - flat service folder
    user.service.ts
    order.service.ts
  interfaces/        # NO - flat interface folder
    user.interface.ts
    order.interface.ts
  types/             # NO - flat types folder
```

## Type Definitions

### Types in Separate Files

All types must be in dedicated files under `types/` folder.

```typescript
// CORRECT: src/user/types/user.types.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
}
```

### Never Inline Types in Services

```typescript
// WRONG: Inline interface in service
export class UserService {
  async createUser(input: { email: string; name: string }): Promise<{ id: string; email: string }> {
    // ...
  }
}

// CORRECT: Import types from types folder
import { CreateUserInput, User } from './types/user.types.js';

export class UserService {
  async createUser(input: CreateUserInput): Promise<User> {
    // ...
  }
}
```

## Validation Schemas

Place all validation schemas in the `schemas/` folder.

```typescript
// src/user/schemas/create-user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

## Constants

### No Magic Strings

All repeated values must be defined as constants.

```typescript
// WRONG: Magic strings
if (user.role === 'admin') { ... }
if (status === 'pending') { ... }

// CORRECT: Use constants
import { UserRole } from './constants/user.constants.js';
import { OrderStatus } from '../order/constants/order-status.constants.js';

if (user.role === UserRole.ADMIN) { ... }
if (status === OrderStatus.PENDING) { ... }
```

### Constants File Structure

```typescript
// src/user/constants/user.constants.ts
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const USER_DEFAULTS = {
  MAX_LOGIN_ATTEMPTS: 5,
  SESSION_TIMEOUT_MS: 3600000,
} as const;
```

## Configuration

### No Hardcoded Values

Configuration values must come from environment variables.

```typescript
// WRONG: Hardcoded URL
const API_URL = 'https://api.example.com';

// CORRECT: From environment
const API_URL = process.env.API_URL;

// BETTER: Validated config module
import { config } from './config.js';
const apiUrl = config.apiUrl; // Validated at startup
```

### Config Module Pattern

```typescript
// src/config.ts
import { z } from 'zod';

const configSchema = z.object({
  apiUrl: z.string().url(),
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']),
});

export const config = configSchema.parse({
  apiUrl: process.env.API_URL,
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
});
```

## Seed Files

Each entity should have its own seed file for test and development data.

```typescript
// src/user/user.seed.ts
import { User } from './types/user.types.js';

export const userSeeds: User[] = [
  { id: '1', email: 'admin@example.com', name: 'Admin User' },
  { id: '2', email: 'user@example.com', name: 'Regular User' },
];

export async function seedUsers(repository: UserRepository): Promise<void> {
  for (const user of userSeeds) {
    await repository.create(user);
  }
}
```

## JSDoc Requirements

All public members must have JSDoc documentation.

### Functions

```typescript
/**
 * Creates a new user in the system.
 * @param input - The user creation input data
 * @returns The created user with generated ID
 * @throws {ValidationError} If input fails validation
 * @throws {DuplicateError} If email already exists
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  // ...
}
```

### Classes

```typescript
/**
 * Service for managing user operations.
 * Handles user CRUD operations and authentication.
 */
export class UserService {
  /**
   * Creates a new UserService instance.
   * @param repository - The user repository for data access
   * @param eventBus - Event bus for publishing user events
   */
  constructor(
    private repository: UserRepository,
    private eventBus: EventBus
  ) {}
}
```

### Interfaces

```typescript
/**
 * Represents a user in the system.
 */
export interface User {
  /** Unique identifier */
  id: string;
  /** User's email address (unique) */
  email: string;
  /** User's display name */
  name: string;
  /** Account creation timestamp */
  createdAt: Date;
}
```

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Service | `{entity}.service.ts` | `user.service.ts` |
| Controller | `{entity}.controller.ts` | `user.controller.ts` |
| Repository | `{entity}.repository.ts` | `user.repository.ts` |
| Types | `{entity}.types.ts` | `user.types.ts` |
| Schema | `{action}-{entity}.schema.ts` | `create-user.schema.ts` |
| Constants | `{entity}.constants.ts` | `user.constants.ts` |
| Seed | `{entity}.seed.ts` | `user.seed.ts` |
| Tests | `{file}.test.ts` | `user.service.test.ts` |

## Import Rules

### Use Path Aliases

```typescript
// CORRECT: Path alias
import { User } from '@/user/types/user.types.js';

// AVOID: Deep relative paths
import { User } from '../../../user/types/user.types.js';
```

### Import Order

1. Node built-ins (`fs`, `path`, `crypto`)
2. External packages (`express`, `zod`)
3. Internal modules using path aliases
4. Relative imports (same module only)

```typescript
import { readFile } from 'fs/promises';

import express from 'express';
import { z } from 'zod';

import { logger } from '@/lib/logger.js';
import { config } from '@/config.js';

import { UserService } from './user.service.js';
import { User } from './types/user.types.js';
```

## Service Design

### Single Responsibility

Each service handles one entity or domain concept.

```typescript
// CORRECT: Single responsibility
class UserService { /* user operations only */ }
class AuthService { /* authentication only */ }
class EmailService { /* email sending only */ }

// WRONG: Mixed responsibilities
class UserService {
  sendEmail() { /* NO */ }
  authenticate() { /* NO */ }
}
```

### Dependency Injection

Services receive dependencies through constructor.

```typescript
export class UserService {
  constructor(
    private repository: UserRepository,
    private emailService: EmailService,
    private eventBus: EventBus
  ) {}
}
```

## Error Handling

### Custom Error Classes

```typescript
// src/lib/errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
```

### Error Handling in Services

```typescript
async function getUser(id: string): Promise<User> {
  const user = await repository.findById(id);
  if (!user) {
    throw new NotFoundError('User', id);
  }
  return user;
}
```

### Error Handling in Controllers

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
  }

  logger.error('Unhandled error', { error: err });
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
});
```
