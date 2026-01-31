import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from './ui/Badge.js';
import { Card } from './ui/Card.js';

export interface ProjectCardProps {
  name: string;
  description?: string;
  phase?: {
    current: number;
    total: number;
    name: string;
  };
  tests?: {
    passing: number;
    failing: number;
    total: number;
  };
  coverage?: number;
  lastActivity?: string;
  isSelected?: boolean;
}

export function ProjectCard({
  name,
  description,
  phase,
  tests,
  coverage,
  lastActivity,
  isSelected = false,
}: ProjectCardProps) {
  const testStatus = tests
    ? tests.failing > 0
      ? 'error'
      : 'success'
    : 'neutral';

  const coverageStatus =
    coverage !== undefined
      ? coverage >= 80
        ? 'success'
        : coverage >= 60
        ? 'warning'
        : 'error'
      : 'neutral';

  return (
    <Card variant={isSelected ? 'elevated' : 'default'}>
      <Box flexDirection="column">
        {/* Project Name */}
        <Box marginBottom={1}>
          <Text bold color={isSelected ? 'cyan' : 'white'}>
            {isSelected ? '▶ ' : '  '}
            {name}
          </Text>
        </Box>

        {/* Description */}
        {description && (
          <Box marginBottom={1}>
            <Text dimColor wrap="truncate-end">
              {description}
            </Text>
          </Box>
        )}

        {/* Phase Progress */}
        {phase && (
          <Box marginBottom={1}>
            <Text dimColor>Phase: </Text>
            <Text color="cyan">
              {phase.current}/{phase.total}
            </Text>
            <Text dimColor> - {phase.name}</Text>
          </Box>
        )}

        {/* Stats Row */}
        <Box>
          {/* Tests */}
          {tests && (
            <Box marginRight={2}>
              <Badge variant={testStatus} size="sm">
                {tests.passing}/{tests.total} tests
              </Badge>
            </Box>
          )}

          {/* Coverage */}
          {coverage !== undefined && (
            <Box marginRight={2}>
              <Badge variant={coverageStatus} size="sm">
                {coverage}% cov
              </Badge>
            </Box>
          )}

          {/* Last Activity */}
          {lastActivity && (
            <Box>
              <Text dimColor>{lastActivity}</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
}
