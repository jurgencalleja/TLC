import { useState } from 'react';
import { FolderOpen, Plus, Trash2, Search, Loader2 } from 'lucide-react';

export interface SetupScreenProps {
  onScan: (roots: string[]) => Promise<void>;
  onScanComplete: () => void;
  isScanning?: boolean;
  error?: string | null;
}

/**
 * SetupScreen is the first-run UI that prompts for root folder path(s)
 * when no workspace is configured. It allows users to add multiple root
 * folders, then triggers a project scan.
 */
export function SetupScreen({
  onScan,
  onScanComplete,
  isScanning = false,
  error = null,
}: SetupScreenProps) {
  const [roots, setRoots] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const addRoot = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setValidationError('Please enter a path');
      return;
    }
    if (roots.includes(trimmed)) {
      setInputValue('');
      return;
    }
    setRoots([...roots, trimmed]);
    setInputValue('');
    setValidationError(null);
  };

  const removeRoot = (index: number) => {
    setRoots(roots.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addRoot();
    }
  };

  const handleScan = async () => {
    if (roots.length === 0 || isScanning) return;
    await onScan(roots);
    onScanComplete();
  };

  const scanDisabled = roots.length === 0 || isScanning;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Welcome header */}
        <div data-testid="welcome-message" className="text-center space-y-2">
          <FolderOpen className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to TLC Dashboard
          </h1>
          <p className="text-muted-foreground">
            A workspace is a collection of project root folders that TLC will
            scan and monitor. Add one or more root folders below to get started.
          </p>
        </div>

        {/* Path input */}
        <div className="space-y-2">
          <label
            htmlFor="root-path-input"
            className="block text-sm font-medium text-foreground"
          >
            Root Folder Path
          </label>
          <div className="flex gap-2">
            <input
              id="root-path-input"
              data-testid="root-path-input"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="~/Projects"
              className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-md
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <button
              data-testid="add-root-button"
              onClick={addRoot}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                rounded-md border border-border bg-surface hover:bg-muted
                text-foreground transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Root
            </button>
          </div>
          {validationError && (
            <p
              data-testid="validation-error"
              className="text-sm text-error"
            >
              {validationError}
            </p>
          )}
        </div>

        {/* Roots list */}
        {roots.length > 0 && (
          <div data-testid="root-list" className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">
              Root Folders ({roots.length})
            </h2>
            <ul className="space-y-1">
              {roots.map((root, index) => (
                <li
                  key={root}
                  data-testid={`root-item-${index}`}
                  className="flex items-center justify-between px-3 py-2
                    bg-surface border border-border rounded-md"
                >
                  <span className="text-sm text-foreground truncate">
                    {root}
                  </span>
                  <button
                    data-testid={`remove-root-${index}`}
                    onClick={() => removeRoot(index)}
                    aria-label={`Remove ${root}`}
                    className="ml-2 p-1 text-muted-foreground hover:text-error
                      transition-colors rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scan error */}
        {error && (
          <p
            data-testid="scan-error"
            className="text-sm text-error text-center"
          >
            {error}
          </p>
        )}

        {/* Scanning spinner */}
        {isScanning && (
          <div data-testid="scan-spinner" className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">
              Scanning projects...
            </span>
          </div>
        )}

        {/* Scan button */}
        <button
          data-testid="scan-button"
          onClick={handleScan}
          disabled={scanDisabled}
          className={`
            w-full inline-flex items-center justify-center gap-2 px-4 py-2.5
            text-sm font-medium rounded-md transition-colors
            ${scanDisabled
              ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground border border-border'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
            }
          `}
        >
          <Search className="w-4 h-4" />
          Scan Projects
        </button>
      </div>
    </div>
  );
}
