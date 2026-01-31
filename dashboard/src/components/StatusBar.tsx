import React from 'react';
import { Box, Text } from 'ink';
import { ConnectionState } from './ConnectionStatus.js';
import { Environment } from './EnvironmentBadge.js';

export interface StatusBarProps {
  projectName?: string;
  version?: string;
  branch?: string;
  environment?: Environment;
  connectionState?: ConnectionState;
  currentPhase?: number;
  totalPhases?: number;
  testsPassing?: number;
  testsTotal?: number;
  testsFailing?: number;
  width?: number;
}

const connectionConfig: Record<ConnectionState, { icon: string; color: string }> = {
  connected: { icon: '●', color: 'green' },
  connecting: { icon: '◐', color: 'yellow' },
  disconnected: { icon: '○', color: 'red' },
};

const envColors: Record<Environment, string> = {
  local: 'green',
  vps: 'cyan',
  staging: 'yellow',
  production: 'red',
};

export function StatusBar({
  projectName,
  version,
  branch,
  environment,
  connectionState,
  currentPhase,
  totalPhases,
  testsPassing,
  testsTotal,
  testsFailing,
  width,
}: StatusBarProps) {
  const sections: React.ReactNode[] = [];

  // Project name and version
  if (projectName) {
    sections.push(
      <Box key="project">
        <Text bold color="white">{projectName}</Text>
        {version && <Text dimColor> v{version}</Text>}
      </Box>
    );
  }

  // Branch
  if (branch) {
    sections.push(
      <Box key="branch">
        <Text dimColor>⎇ </Text>
        <Text color="cyan">{branch}</Text>
      </Box>
    );
  }

  // Environment
  if (environment) {
    const color = envColors[environment];
    sections.push(
      <Box key="env">
        <Text color={color as any}>
          {environment === 'production' ? '⚠ ' : ''}
          {environment}
        </Text>
      </Box>
    );
  }

  // Phase progress
  if (currentPhase !== undefined && totalPhases !== undefined) {
    sections.push(
      <Box key="phase">
        <Text dimColor>Phase </Text>
        <Text>{currentPhase}/{totalPhases}</Text>
      </Box>
    );
  }

  // Test status
  if (testsPassing !== undefined && testsTotal !== undefined) {
    const hasFailing = testsFailing !== undefined && testsFailing > 0;
    sections.push(
      <Box key="tests">
        <Text dimColor>Tests </Text>
        <Text color={hasFailing ? 'red' : 'green'}>
          {testsPassing}/{testsTotal}
        </Text>
        {hasFailing && (
          <Text color="red"> ({testsFailing} fail)</Text>
        )}
      </Box>
    );
  }

  // Connection status
  if (connectionState) {
    const config = connectionConfig[connectionState];
    sections.push(
      <Box key="connection">
        <Text color={config.color as any}>{config.icon}</Text>
      </Box>
    );
  }

  // Help hint (always shown)
  sections.push(
    <Box key="help">
      <Text dimColor>? help</Text>
    </Box>
  );

  return (
    <Box width={width} justifyContent="space-between">
      {sections.map((section, idx) => (
        <React.Fragment key={idx}>
          {section}
          {idx < sections.length - 1 && (
            <Text dimColor> │ </Text>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
}
