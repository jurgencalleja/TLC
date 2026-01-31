import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Card } from './ui/Card.js';
import { Badge } from './ui/Badge.js';

export interface Phase {
  number: number;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
}

export interface Task {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  assignee?: string;
}

export interface TestRun {
  id: string;
  timestamp: string;
  passed: number;
  failed: number;
  duration: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ProjectDetailData {
  id: string;
  name: string;
  description?: string;
  phases: Phase[];
  tasks: Task[];
  tests: {
    passing: number;
    failing: number;
    total: number;
    recentRuns: TestRun[];
  };
  logs: LogEntry[];
}

export interface ProjectDetailProps {
  project: ProjectDetailData;
  initialTab?: 'overview' | 'tasks' | 'tests' | 'logs';
  onBack?: () => void;
}

type TabType = 'overview' | 'tasks' | 'tests' | 'logs';

const tabs: { key: TabType; label: string; num: string }[] = [
  { key: 'overview', label: 'Overview', num: '1' },
  { key: 'tasks', label: 'Tasks', num: '2' },
  { key: 'tests', label: 'Tests', num: '3' },
  { key: 'logs', label: 'Logs', num: '4' },
];

export function ProjectDetail({
  project,
  initialTab = 'overview',
  onBack,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useInput((input, key) => {
    if (input === '1') setActiveTab('overview');
    else if (input === '2') setActiveTab('tasks');
    else if (input === '3') setActiveTab('tests');
    else if (input === '4') setActiveTab('logs');
    else if (key.escape && onBack) onBack();
  });

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">{project.name}</Text>
        {project.description && (
          <Text dimColor> - {project.description}</Text>
        )}
      </Box>

      {/* Tabs */}
      <Box marginBottom={1}>
        {tabs.map((tab, i) => (
          <Box key={tab.key} marginRight={2}>
            <Text
              color={activeTab === tab.key ? 'cyan' : 'gray'}
              bold={activeTab === tab.key}
            >
              [{tab.num}] {tab.label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Tab Content */}
      <Card variant="outlined">
        {activeTab === 'overview' && <OverviewTab project={project} />}
        {activeTab === 'tasks' && <TasksTab tasks={project.tasks} />}
        {activeTab === 'tests' && <TestsTab tests={project.tests} />}
        {activeTab === 'logs' && <LogsTab logs={project.logs} />}
      </Card>

      {/* Navigation hint */}
      <Box marginTop={1}>
        <Text dimColor>1-4 switch tabs • Esc back</Text>
      </Box>
    </Box>
  );
}

function OverviewTab({ project }: { project: ProjectDetailData }) {
  return (
    <Box flexDirection="column">
      {/* Phases */}
      <Box marginBottom={1}>
        <Text bold>Phases</Text>
      </Box>
      {project.phases.length === 0 ? (
        <Text dimColor>No phases defined</Text>
      ) : (
        project.phases.map((phase) => (
          <Box key={phase.number}>
            <Text
              color={
                phase.status === 'completed'
                  ? 'green'
                  : phase.status === 'in_progress'
                  ? 'yellow'
                  : 'gray'
              }
            >
              {phase.status === 'completed'
                ? '[x] '
                : phase.status === 'in_progress'
                ? '[>] '
                : '[ ] '}
            </Text>
            <Text>{phase.number}. {phase.name}</Text>
          </Box>
        ))
      )}

      {/* Test Summary */}
      <Box marginTop={1}>
        <Text bold>Tests: </Text>
        <Text color={project.tests.failing > 0 ? 'red' : 'green'}>
          {project.tests.passing}/{project.tests.total}
        </Text>
        {project.tests.failing > 0 && (
          <Text color="red"> ({project.tests.failing} failing)</Text>
        )}
      </Box>
    </Box>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <Text dimColor>No tasks in current phase</Text>;
  }

  return (
    <Box flexDirection="column">
      {tasks.map((task) => (
        <Box key={task.id} marginBottom={1}>
          <Text
            color={
              task.status === 'completed'
                ? 'green'
                : task.status === 'in_progress'
                ? 'yellow'
                : 'gray'
            }
          >
            {task.status === 'completed'
              ? '✓ '
              : task.status === 'in_progress'
              ? '▶ '
              : '○ '}
          </Text>
          <Text>{task.title}</Text>
          {task.assignee && (
            <Text dimColor> @{task.assignee}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

function TestsTab({
  tests,
}: {
  tests: ProjectDetailData['tests'];
}) {
  return (
    <Box flexDirection="column">
      {/* Summary */}
      <Box marginBottom={1}>
        <Badge variant={tests.failing > 0 ? 'error' : 'success'}>
          {tests.passing}/{tests.total} passing
        </Badge>
        {tests.failing > 0 && (
          <Box marginLeft={1}>
            <Badge variant="error">{tests.failing} failing</Badge>
          </Box>
        )}
      </Box>

      {/* Recent Runs */}
      <Box marginBottom={1}>
        <Text bold>Recent Runs</Text>
      </Box>
      {tests.recentRuns.length === 0 ? (
        <Text dimColor>No recent runs</Text>
      ) : (
        tests.recentRuns.map((run) => (
          <Box key={run.id}>
            <Text dimColor>{run.timestamp}</Text>
            <Text> - </Text>
            <Text color={run.failed > 0 ? 'red' : 'green'}>
              {run.passed}/{run.passed + run.failed}
            </Text>
            <Text dimColor> ({run.duration})</Text>
          </Box>
        ))
      )}
    </Box>
  );
}

function LogsTab({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return <Text dimColor>No logs available</Text>;
  }

  return (
    <Box flexDirection="column">
      {logs.map((log) => (
        <Box key={log.id}>
          <Text dimColor>{log.timestamp} </Text>
          <Text
            color={
              log.level === 'error'
                ? 'red'
                : log.level === 'warn'
                ? 'yellow'
                : 'gray'
            }
          >
            [{log.level}]
          </Text>
          <Text
            color={log.level === 'error' ? 'red' : undefined}
          >
            {' '}{log.message}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
