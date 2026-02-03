import { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { ProjectCard, Project, ProjectStatus } from './ProjectCard';
import { Input } from '../ui/Input';
import { Dropdown, DropdownItem } from '../ui/Dropdown';
import { SkeletonCard } from '../ui/Skeleton';

export interface ProjectGridProps {
  projects: Project[];
  isLoading?: boolean;
  onProjectClick?: (project: Project) => void;
  className?: string;
}

type SortOption = 'name-asc' | 'name-desc' | 'coverage' | 'activity';

const statusFilterItems: DropdownItem[] = [
  { id: 'all', label: 'All Status' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'failing', label: 'Failing' },
  { id: 'building', label: 'Building' },
  { id: 'unknown', label: 'Unknown' },
];

const sortItems: DropdownItem[] = [
  { id: 'activity', label: 'Recent Activity' },
  { id: 'name-asc', label: 'Name (A-Z)' },
  { id: 'name-desc', label: 'Name (Z-A)' },
  { id: 'coverage', label: 'Coverage' },
];

export function ProjectGrid({
  projects,
  isLoading = false,
  onProjectClick,
  className = '',
}: ProjectGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('activity');

  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'coverage':
        result.sort((a, b) => b.coverage - a.coverage);
        break;
      case 'activity':
        result.sort(
          (a, b) =>
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        );
        break;
    }

    return result;
  }, [projects, searchQuery, statusFilter, sortBy]);

  const handleStatusFilter = (item: DropdownItem) => {
    setStatusFilter(item.id as ProjectStatus | 'all');
  };

  const handleSort = (item: DropdownItem) => {
    setSortBy(item.id as SortOption);
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search projects..."
              leftIcon={<Search className="w-4 h-4" />}
              disabled
            />
          </div>
        </div>
        <div
          data-testid="project-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} showHeader textLines={3} />
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={className}>
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No projects</h3>
          <p className="text-muted-foreground max-w-md">
            Get started by initializing TLC in your project directory with{' '}
            <code className="text-primary">/tlc:init</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2">
          <div data-testid="status-filter">
            <Dropdown
              items={statusFilterItems}
              onSelect={handleStatusFilter}
              trigger={
                <span className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {statusFilterItems.find((i) => i.id === statusFilter)?.label}
                </span>
              }
            />
          </div>
          <div data-testid="sort-select">
            <Dropdown
              items={sortItems}
              onSelect={handleSort}
              trigger={
                <span className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  {sortItems.find((i) => i.id === sortBy)?.label}
                </span>
              }
              align="right"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredAndSortedProjects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No projects found matching your criteria
        </div>
      ) : (
        <div
          data-testid="project-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredAndSortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={onProjectClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
