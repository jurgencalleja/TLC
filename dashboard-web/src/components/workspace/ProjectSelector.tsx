import { ChevronDown } from 'lucide-react';

export interface ProjectSelectorProps {
  projects: Array<{ id: string; name: string; path?: string }>;
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

/**
 * ProjectSelector renders a dropdown for selecting a project from
 * the workspace project list. Shows the current selection, a placeholder
 * when nothing is selected, and the total project count.
 */
export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelect,
}: ProjectSelectorProps) {
  const projectLabel = projects.length === 1 ? 'project' : 'projects';

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <select
          data-testid="project-selector"
          value={selectedProjectId ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onSelect(e.target.value);
            }
          }}
          className="
            appearance-none
            w-56 pl-3 pr-8 py-1.5
            text-sm font-medium
            bg-surface border border-border rounded-md
            text-foreground
            cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          "
        >
          <option value="">Select a project...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      <span
        data-testid="project-selector-count"
        className="text-sm text-muted-foreground"
      >
        {projects.length} {projectLabel}
      </span>
    </div>
  );
}
