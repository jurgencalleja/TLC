/**
 * API utilities for the TLC Dashboard
 */

export {
  safeFetch,
  safePost,
  safePut,
  safeDelete,
  type FetchResult,
  type FetchError,
  type SafeFetchOptions,
} from './safeFetch.js';

export { getNotes, updateNotes, type GetNotesResult, type UpdateNotesResult } from './notes-api.js';
