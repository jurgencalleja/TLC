import { Box, Text } from 'ink';
import { useState, useEffect } from 'react';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface Phase {
  number: number;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
}

export function PhasesPane() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPhases() {
      const roadmapPath = join(process.cwd(), '.planning', 'ROADMAP.md');

      if (!existsSync(roadmapPath)) {
        setPhases([]);
        setLoading(false);
        return;
      }

      try {
        const content = await readFile(roadmapPath, 'utf-8');
        const parsed = parseRoadmap(content);
        setPhases(parsed);
      } catch (e) {
        setPhases([]);
      }
      setLoading(false);
    }

    loadPhases();
    const interval = setInterval(loadPhases, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="gray">Loading...</Text>
      </Box>
    );
  }

  if (phases.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="gray">No roadmap found.</Text>
        <Text color="gray" dimColor>Run /tdd:new-project or /tdd:init</Text>
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      {phases.map((phase) => (
        <Box key={phase.number}>
          <Text color={
            phase.status === 'completed' ? 'green' :
            phase.status === 'in_progress' ? 'yellow' :
            'gray'
          }>
            {phase.status === 'completed' ? ' [x] ' :
             phase.status === 'in_progress' ? ' [>] ' :
             ' [ ] '}
          </Text>
          <Text color={phase.status === 'in_progress' ? 'cyan' : 'white'}>
            {phase.number}. {phase.name}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export function parseRoadmap(content: string): Phase[] {
  const phases: Phase[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match patterns like "## Phase 1: Setup" or "### 1. Auth System"
    const match = line.match(/^#+\s*(?:Phase\s+)?(\d+)[.:]?\s*(.+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const name = match[2].replace(/\[.*?\]/g, '').trim();

      // Determine status from markers
      let status: Phase['status'] = 'pending';
      if (line.includes('[x]') || line.includes('[completed]')) {
        status = 'completed';
      } else if (line.includes('[>]') || line.includes('[in progress]') || line.includes('[current]')) {
        status = 'in_progress';
      }

      phases.push({ number: num, name, status });
    }
  }

  return phases;
}
