import { useState, useCallback, useEffect } from 'react';
import { api } from '../api';

export function useProjectFiles(projectId?: string, filename?: string) {
  const [content, setContent] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFile = useCallback(async () => {
    if (!projectId || !filename) {
      setContent(null);
      setCurrentFilename(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.projects.getFile(projectId, filename);
      setContent(data.content);
      setCurrentFilename(data.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file');
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, filename]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile]);

  return { content, filename: currentFilename, loading, error, refresh: fetchFile };
}
