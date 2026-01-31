import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { ProjectCard, ProjectCardProps } from './ProjectCard.js';

export interface Project extends Omit<ProjectCardProps, 'isSelected'> {
  id: string;
}

export interface ProjectListProps {
  projects: Project[];
  onSelect?: (project: Project) => void;
  sortBy?: 'name' | 'activity' | 'status';
  filter?: string;
}

export function ProjectList({
  projects,
  onSelect,
  sortBy = 'name',
  filter = '',
}: ProjectListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!filter) return projects;
    const lowerFilter = filter.toLowerCase();
    return projects.filter(
      p =>
        p.name.toLowerCase().includes(lowerFilter) ||
        p.description?.toLowerCase().includes(lowerFilter)
    );
  }, [projects, filter]);

  // Sort projects
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'activity':
        // Sort by lastActivity (assuming ISO date string or relative time)
        sorted.sort((a, b) => {
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return b.lastActivity.localeCompare(a.lastActivity);
        });
        break;
      case 'status':
        // Sort by test status (failing first)
        sorted.sort((a, b) => {
          const aFailing = a.tests?.failing || 0;
          const bFailing = b.tests?.failing || 0;
          return bFailing - aFailing;
        });
        break;
    }
    return sorted;
  }, [filteredProjects, sortBy]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (sortedProjects.length === 0) return;

    if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(prev + 1, sortedProjects.length - 1));
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (key.return && onSelect) {
      onSelect(sortedProjects[selectedIndex]);
    }
  });

  // Empty state
  if (sortedProjects.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>
          {filter ? `No projects matching "${filter}"` : 'No projects found'}
        </Text>
        <Text dimColor>
          {filter ? 'Try a different search term' : 'Run /tlc:new-project to create one'}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text dimColor>
          {sortedProjects.length} project{sortedProjects.length !== 1 ? 's' : ''}
          {filter && ` matching "${filter}"`}
        </Text>
      </Box>

      {/* Project Cards */}
      {sortedProjects.map((project, index) => (
        <Box key={project.id} marginBottom={1}>
          <ProjectCard {...project} isSelected={index === selectedIndex} />
        </Box>
      ))}

      {/* Navigation hint */}
      <Box marginTop={1}>
        <Text dimColor>↑/k ↓/j navigate • Enter select</Text>
      </Box>
    </Box>
  );
}
