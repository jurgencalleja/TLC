/**
 * Bug Submit Panel
 * Form for submitting bugs with screenshot support
 */
import { useState, useCallback, type FormEvent, type DragEvent, type ClipboardEvent } from 'react';

interface BugFormData {
  title: string;
  description: string;
  severity: string;
  screenshot?: File;
}

interface BugSubmitPanelProps {
  onSubmit?: (data: BugFormData) => Promise<{ success: boolean }>;
}

export function BugSubmitPanel({ onSubmit }: BugSubmitPanelProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleScreenshotFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setScreenshotPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const files = e.clipboardData?.files;
    const firstFile = files?.[0];
    if (firstFile) {
      handleScreenshotFile(firstFile);
    }
  }, [handleScreenshotFile]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    const firstFile = files?.[0];
    if (firstFile) {
      handleScreenshotFile(firstFile);
    }
  }, [handleScreenshotFile]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const removeScreenshot = useCallback(() => {
    setScreenshot(null);
    setScreenshotPreview(null);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('Title is required');
      return;
    }

    if (onSubmit) {
      try {
        const result = await onSubmit({
          title,
          description,
          severity,
          screenshot: screenshot || undefined,
        });
        if (result.success) {
          setSuccess(true);
          setTitle('');
          setDescription('');
          setSeverity('medium');
          setScreenshot(null);
          setScreenshotPreview(null);
        }
      } catch (err) {
        setError('Failed to submit bug');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="bug-title" className="block text-sm font-medium text-text-secondary mb-1.5">
          Title
        </label>
        <input
          id="bug-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input w-full"
        />
      </div>

      <div>
        <label htmlFor="bug-description" className="block text-sm font-medium text-text-secondary mb-1.5">
          Description
        </label>
        <textarea
          id="bug-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input w-full min-h-[100px]"
        />
      </div>

      <div>
        <label htmlFor="bug-severity" className="block text-sm font-medium text-text-secondary mb-1.5">
          Severity
        </label>
        <select
          id="bug-severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="input w-full"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div>
        <div
          data-testid="screenshot-dropzone"
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
          tabIndex={0}
        >
          {screenshotPreview ? (
            <div className="space-y-2">
              <img
                src={screenshotPreview}
                alt="Screenshot preview"
                className="max-w-full max-h-48 mx-auto rounded"
              />
              <p className="text-sm text-success">Screenshot attached</p>
              <button
                type="button"
                onClick={removeScreenshot}
                className="btn btn-ghost btn-sm"
                aria-label="Remove screenshot"
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="text-text-muted">
              Paste or drop a screenshot here
            </p>
          )}
        </div>
      </div>

      {validationError && (
        <p className="text-sm text-error" role="alert">
          {validationError}
        </p>
      )}

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-success" role="status">
          Bug submitted successfully
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full">
        Submit Bug
      </button>
    </form>
  );
}
