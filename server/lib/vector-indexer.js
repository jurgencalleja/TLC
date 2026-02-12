/**
 * Vector Indexer — embeds and indexes memory content into the vector store.
 *
 * Reads markdown files from memory/decisions/, memory/gotchas/, and
 * memory/conversations/, strips formatting, generates embeddings, and
 * inserts into the vector store for semantic search.
 *
 * @module vector-indexer
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/** Memory subdirectories and their types */
const MEMORY_DIRS = [
  { dir: 'decisions', type: 'decision' },
  { dir: 'gotchas', type: 'gotcha' },
  { dir: 'conversations', type: 'conversation' },
];

/**
 * Strip markdown formatting from text for cleaner embeddings.
 * @param {string} text
 * @returns {string}
 */
function stripMarkdown(text) {
  return text
    .replace(/^---[\s\S]*?---\n?/m, '')  // Remove frontmatter
    .replace(/^#+\s+/gm, '')              // Remove # headers
    .replace(/\*\*([^*]+)\*\*/g, '$1')    // Remove bold
    .replace(/\*([^*]+)\*/g, '$1')        // Remove italic
    .replace(/`([^`]+)`/g, '$1')          // Remove inline code
    .replace(/```[\s\S]*?```/g, '')       // Remove code blocks
    .replace(/^\s*[-*]\s+/gm, '')         // Remove list markers
    .replace(/\n{3,}/g, '\n\n')           // Collapse multiple newlines
    .trim();
}

/**
 * Parse YAML frontmatter from markdown content.
 * @param {string} content
 * @returns {{ permanent: boolean }}
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { permanent: false };

  const yaml = match[1];
  const permanentMatch = yaml.match(/permanent:\s*(true|false)/i);
  return {
    permanent: permanentMatch ? permanentMatch[1].toLowerCase() === 'true' : false,
  };
}

/**
 * Detect memory type from file path based on parent directory.
 * @param {string} filePath
 * @returns {string}
 */
function detectType(filePath) {
  for (const { dir, type } of MEMORY_DIRS) {
    if (filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)) {
      return type;
    }
  }
  return 'unknown';
}

/**
 * Generate a deterministic ID for a file.
 * @param {string} filePath
 * @returns {string}
 */
function fileId(filePath) {
  return crypto.createHash('sha256').update(filePath).digest('hex').slice(0, 16);
}

/**
 * List all .md files in a directory (non-recursive).
 * @param {string} dirPath
 * @returns {string[]}
 */
function listMarkdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dirPath, f))
    .sort();
}

/**
 * Create a vector indexer that embeds and stores memory content.
 *
 * @param {object} deps
 * @param {object} deps.vectorStore - Vector store instance
 * @param {object} deps.embeddingClient - Embedding client instance
 * @returns {object} Indexer with indexAll/indexFile/indexChunk/isIndexed/rebuildIndex
 */
export function createVectorIndexer({ vectorStore, embeddingClient }) {
  /**
   * Index all memory files from a project.
   */
  async function indexAll(projectRoot, options = {}) {
    const { onProgress } = options;
    const memoryRoot = path.join(projectRoot, 'memory');

    // Collect all files to index
    const filesToIndex = [];
    for (const { dir, type } of MEMORY_DIRS) {
      const dirPath = path.join(memoryRoot, dir);
      const files = listMarkdownFiles(dirPath);
      for (const f of files) {
        filesToIndex.push({ path: f, type });
      }
    }

    let indexed = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < filesToIndex.length; i++) {
      const file = filesToIndex[i];
      try {
        const result = await indexSingleFile(projectRoot, file.path, file.type);
        if (result.success) {
          indexed++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }

      if (onProgress) {
        onProgress({
          indexed: indexed,
          total: filesToIndex.length,
          current: path.basename(file.path),
        });
      }
    }

    return { indexed, skipped, errors };
  }

  /**
   * Index a single file.
   */
  async function indexFile(projectRoot, filePath) {
    const type = detectType(filePath);
    return indexSingleFile(projectRoot, filePath, type);
  }

  /**
   * Internal: index a single file with known type.
   */
  async function indexSingleFile(projectRoot, filePath, type) {
    try {
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const frontmatter = parseFrontmatter(rawContent);
      const cleanText = stripMarkdown(rawContent);

      if (!cleanText || cleanText.length === 0) {
        return { success: false };
      }

      const embedding = await embeddingClient.embed(cleanText);
      if (!embedding) {
        return { success: false };
      }

      const id = fileId(filePath);
      vectorStore.insert({
        id,
        text: cleanText,
        embedding,
        type,
        project: null,
        workspace: projectRoot,
        branch: null,
        timestamp: Date.now(),
        sourceFile: filePath,
        permanent: frontmatter.permanent,
      });

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Index a conversation chunk object directly (not from file).
   */
  async function indexChunk(projectRoot, chunk) {
    try {
      const text = chunk.text || '';
      if (!text) return { success: false };

      const embedding = await embeddingClient.embed(text);
      if (!embedding) return { success: false };

      vectorStore.insert({
        id: chunk.id,
        text,
        embedding,
        type: chunk.type || 'conversation',
        project: chunk.project || null,
        workspace: chunk.workspace || projectRoot,
        branch: null,
        timestamp: chunk.timestamp || Date.now(),
        sourceFile: chunk.sourceFile || null,
        permanent: chunk.permanent || false,
      });

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Check if a file is already indexed in the store.
   */
  async function isIndexed(filePath) {
    const all = vectorStore.getAll();
    return all.some((entry) => entry.sourceFile === filePath);
  }

  /**
   * Drop all vectors and re-index everything from text files.
   */
  async function rebuildIndex(projectRoot) {
    vectorStore.rebuild();
    await indexAll(projectRoot);
  }

  return {
    indexAll,
    indexFile,
    indexChunk,
    isIndexed,
    rebuildIndex,
  };
}
