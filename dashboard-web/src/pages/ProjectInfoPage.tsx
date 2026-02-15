import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';
import { useProjectFiles } from '../hooks/useProjectFiles';

const DOC_FILES = [
  { name: 'PROJECT.md', label: 'PROJECT.md' },
  { name: 'ROADMAP.md', label: 'ROADMAP.md' },
  { name: 'CODING-STANDARDS.md', label: 'CODING-STANDARDS.md' },
];

/** Minimal markdown renderer — headings, paragraphs, lists, bold, code */
function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Headings
    const h1 = line.match(/^# (.+)$/);
    if (h1) { elements.push(<h1 key={key++} className="text-2xl font-bold text-text-primary mb-3 mt-6 first:mt-0">{h1[1]}</h1>); continue; }
    const h2 = line.match(/^## (.+)$/);
    if (h2) { elements.push(<h2 key={key++} className="text-xl font-semibold text-text-primary mb-2 mt-5">{h2[1]}</h2>); continue; }
    const h3 = line.match(/^### (.+)$/);
    if (h3) { elements.push(<h3 key={key++} className="text-lg font-medium text-text-primary mb-2 mt-4">{h3[1]}</h3>); continue; }

    // List items
    const li = line.match(/^[-*]\s+(.+)$/);
    if (li) { elements.push(<li key={key++} className="text-sm text-text-secondary ml-4 list-disc">{li[1]}</li>); continue; }

    // Checklist items
    const check = line.match(/^- \[(x| )\]\s+(.+)$/);
    if (check) {
      const done = check[1] === 'x';
      elements.push(
        <li key={key++} className={`text-sm ml-4 list-none flex items-center gap-2 ${done ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
          <span>{done ? '\u2611' : '\u2610'}</span>
          <span>{check[2]}</span>
        </li>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') { elements.push(<div key={key++} className="h-2" />); continue; }

    // Code block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!);
        i++;
      }
      elements.push(
        <pre key={key++} className="bg-bg-tertiary border border-border rounded-lg p-3 text-sm font-mono text-text-primary overflow-x-auto my-2">
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }

    // Regular paragraph
    elements.push(<p key={key++} className="text-sm text-text-secondary leading-relaxed">{line}</p>);
  }

  return elements;
}

export function ProjectInfoPage() {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const storeProjectId = useWorkspaceStore((s) => s.selectedProjectId);
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const projectId = urlProjectId ?? storeProjectId ?? undefined;
  useEffect(() => {
    if (urlProjectId && urlProjectId !== storeProjectId) {
      selectProject(urlProjectId);
    }
  }, [urlProjectId, storeProjectId, selectProject]);

  const [selectedFile, setSelectedFile] = useState('PROJECT.md');
  const { content, filename, loading, error } = useProjectFiles(projectId, selectedFile);

  useEffect(() => {
    setActiveView('info');
  }, [setActiveView]);

  if (loading) {
    return (
      <div className="p-6 space-y-6" data-testid="loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-semibold text-text-primary">Project Info</h1>
      </div>

      {/* File selector */}
      <div className="flex gap-2 flex-wrap">
        {DOC_FILES.map((f) => (
          <button
            key={f.name}
            onClick={() => setSelectedFile(f.name)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
              selectedFile === f.name
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-danger text-sm p-3 bg-danger/10 rounded-lg">{error}</div>
      )}

      {!content && !loading && !error ? (
        <Card className="p-8" data-testid="empty-state">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">No documentation found.</p>
            <p className="text-text-muted text-sm mt-1">
              Add a {selectedFile} file to your project's .planning/ directory.
            </p>
          </div>
        </Card>
      ) : content ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <FileText className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium text-text-secondary">{filename}</span>
          </div>
          <div className="prose-sm">
            {renderMarkdown(content)}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
