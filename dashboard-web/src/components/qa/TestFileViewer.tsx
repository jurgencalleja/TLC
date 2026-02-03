import { Copy, Check, FileCode } from 'lucide-react';
import { useState } from 'react';

export interface TestFile {
  path: string;
  name: string;
  content: string;
  language: string;
}

export interface TestFileViewerProps {
  file: TestFile;
  className?: string;
}

export function TestFileViewer({
  file,
  className = '',
}: TestFileViewerProps) {
  const [copied, setCopied] = useState(false);

  const lines = file.content.split('\n');

  const handleCopy = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      data-testid="test-file-viewer"
      className={`bg-surface border border-border rounded-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono text-foreground">{file.path}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {file.language}
          </span>
          <button
            onClick={handleCopy}
            aria-label="Copy code"
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex overflow-x-auto">
        {/* Line Numbers */}
        <div
          data-testid="line-numbers"
          className="select-none bg-muted/30 text-muted-foreground text-right py-4 px-2 font-mono text-sm border-r border-border"
        >
          {lines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code */}
        <pre
          data-testid="code-block"
          className="flex-1 p-4 font-mono text-sm text-foreground overflow-x-auto"
        >
          {lines.map((line, i) => (
            <div key={i} className="leading-6">
              {line || ' '}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
