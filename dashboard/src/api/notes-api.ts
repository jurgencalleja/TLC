import * as fs from 'fs/promises';
import * as path from 'path';

export interface GetNotesResult {
  content: string;
  lastModified: string | null;
  error?: string;
}

export interface UpdateNotesResult {
  success: boolean;
  lastModified?: string;
  error?: string;
}

/**
 * Gets the project directory path.
 * Uses TLC_PROJECT_DIR env var if set, otherwise uses current working directory.
 */
function getProjectDir(): string {
  return process.env.TLC_PROJECT_DIR || process.cwd();
}

/**
 * Gets the path to PROJECT.md file.
 */
function getProjectMdPath(): string {
  return path.join(getProjectDir(), 'PROJECT.md');
}

/**
 * Reads the content of PROJECT.md and returns it with the last modified timestamp.
 */
export async function getNotes(): Promise<GetNotesResult> {
  const filePath = getProjectMdPath();

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    const lastModified = stats.mtime.toISOString();

    return {
      content,
      lastModified,
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    // File not found - return empty content without error
    if (nodeError.code === 'ENOENT') {
      return {
        content: '',
        lastModified: null,
      };
    }

    // Other errors - return empty content with error message
    return {
      content: '',
      lastModified: null,
      error: nodeError.message,
    };
  }
}

/**
 * Updates the content of PROJECT.md and returns the new last modified timestamp.
 */
export async function updateNotes(content: string): Promise<UpdateNotesResult> {
  const filePath = getProjectMdPath();

  try {
    await fs.writeFile(filePath, content, 'utf-8');
    const stats = await fs.stat(filePath);
    const lastModified = stats.mtime.toISOString();

    return {
      success: true,
      lastModified,
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    return {
      success: false,
      error: nodeError.message,
    };
  }
}
