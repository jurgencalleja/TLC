import { Box, Text } from 'ink';
import { useState, useEffect } from 'react';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface Task {
  number: number;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  owner?: string;
  criteriaDone: number;
  criteriaTotal: number;
}

export interface Phase {
  number: number;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  tasksDone: number;
  tasksInProgress: number;
  tasksTotal: number;
  progress: number;
  tasks: Task[];
}

export interface Milestone {
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  phaseNumbers: number[];
  phases: Phase[];
}

export interface PlanViewProps {
  expandedPhase?: number;
  filter?: 'all' | 'in_progress' | 'pending' | 'completed';
}

export function PlanView({ expandedPhase, filter = 'all' }: PlanViewProps = {}) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedMilestones, setCollapsedMilestones] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadPlan() {
      const roadmapPath = join(process.cwd(), '.planning', 'ROADMAP.md');

      if (!existsSync(roadmapPath)) {
        setMilestones([]);
        setLoading(false);
        return;
      }

      try {
        const content = await readFile(roadmapPath, 'utf-8');
        const planContents = await loadPlanFiles();

        const parsedMilestones = parseMilestones(content);
        const phases = parsePhases(content, planContents);

        // Attach phases to milestones
        const milestonesWithPhases = parsedMilestones.map(m => ({
          ...m,
          phases: phases.filter(p => m.phaseNumbers.includes(p.number))
        }));

        // Auto-collapse completed milestones (but not if there's only one milestone)
        const completed = new Set<string>();
        if (milestonesWithPhases.length > 1) {
          milestonesWithPhases.forEach(m => {
            if (m.status === 'completed') {
              completed.add(m.name);
            }
          });
        }
        setCollapsedMilestones(completed);

        setMilestones(milestonesWithPhases);
      } catch (e) {
        setMilestones([]);
      }
      setLoading(false);
    }

    loadPlan();
    const interval = setInterval(loadPlan, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="gray">Loading...</Text>
      </Box>
    );
  }

  if (milestones.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="gray">No roadmap found.</Text>
        <Text color="gray" dimColor>Run /tlc:new-project or /tlc:init</Text>
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      {milestones.map((milestone, idx) => (
        <MilestoneView
          key={milestone.name}
          milestone={milestone}
          collapsed={collapsedMilestones.has(milestone.name)}
          expandedPhase={expandedPhase}
          filter={filter}
        />
      ))}
    </Box>
  );
}

interface MilestoneViewProps {
  milestone: Milestone;
  collapsed: boolean;
  expandedPhase?: number;
  filter: 'all' | 'in_progress' | 'pending' | 'completed';
}

function MilestoneView({ milestone, collapsed, expandedPhase, filter }: MilestoneViewProps) {
  const statusIcon = milestone.status === 'completed' ? '✓' :
                     milestone.status === 'in_progress' ? '▶' : '○';
  const statusColor = milestone.status === 'completed' ? 'green' :
                      milestone.status === 'in_progress' ? 'yellow' : 'gray';

  const completedPhases = milestone.phases.filter(p => p.status === 'completed').length;
  const totalPhases = milestone.phases.length;
  const progress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const filteredPhases = milestone.phases.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={statusColor}>{statusIcon} </Text>
        <Text bold color={milestone.status === 'in_progress' ? 'cyan' : 'white'}>
          {milestone.name}
        </Text>
        <Text color="gray"> ({completedPhases}/{totalPhases} phases</Text>
        {progress > 0 && <Text color="gray"> · {progress}%</Text>}
        <Text color="gray">)</Text>
        {collapsed && <Text color="gray" dimColor> [collapsed]</Text>}
      </Box>

      {!collapsed && filteredPhases.map(phase => (
        <PhaseView
          key={phase.number}
          phase={phase}
          expanded={expandedPhase === phase.number}
        />
      ))}
    </Box>
  );
}

interface PhaseViewProps {
  phase: Phase;
  expanded: boolean;
}

function PhaseView({ phase, expanded }: PhaseViewProps) {
  const statusIcon = phase.status === 'completed' ? '[x]' :
                     phase.status === 'in_progress' ? '[>]' : '[ ]';
  const statusColor = phase.status === 'completed' ? 'green' :
                      phase.status === 'in_progress' ? 'yellow' : 'gray';

  const progressBar = renderProgressBar(phase.progress, 10);
  const taskInfo = phase.tasksTotal > 0
    ? `${phase.tasksDone}/${phase.tasksTotal}`
    : '0/0';

  // Truncate long phase names
  const maxNameLength = 30;
  const displayName = phase.name.length > maxNameLength
    ? phase.name.slice(0, maxNameLength - 1) + '…'
    : phase.name;

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text color={statusColor}>{statusIcon} </Text>
        <Text color={phase.status === 'in_progress' ? 'cyan' : 'white'}>
          {phase.number}. {displayName}
        </Text>
        <Text color="gray"> </Text>
        <Text color={phase.progress === 100 ? 'green' : 'gray'}>{progressBar}</Text>
        <Text color="gray"> {taskInfo}</Text>
        {phase.tasksInProgress > 0 && (
          <Text color="yellow"> ({phase.tasksInProgress} active)</Text>
        )}
      </Box>

      {expanded && phase.tasks.length > 0 && (
        <Box flexDirection="column" marginLeft={2} marginTop={0}>
          {phase.tasks.map(task => (
            <TaskView key={task.number} task={task} />
          ))}
        </Box>
      )}
    </Box>
  );
}

interface TaskViewProps {
  task: Task;
}

function TaskView({ task }: TaskViewProps) {
  const statusIcon = task.status === 'completed' ? '✓' :
                     task.status === 'in_progress' ? '▶' : '○';
  const statusColor = task.status === 'completed' ? 'green' :
                      task.status === 'in_progress' ? 'yellow' : 'gray';

  const criteriaInfo = task.criteriaTotal > 0
    ? ` (${task.criteriaDone}/${task.criteriaTotal} criteria)`
    : '';

  return (
    <Box>
      <Text color={statusColor}>{statusIcon} </Text>
      <Text color={task.status === 'in_progress' ? 'cyan' : 'white'}>
        {task.name}
      </Text>
      {task.owner && <Text color="magenta"> @{task.owner}</Text>}
      {criteriaInfo && <Text color="gray">{criteriaInfo}</Text>}
    </Box>
  );
}

function renderProgressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function loadPlanFiles(): Promise<Record<number, string>> {
  const phasesDir = join(process.cwd(), '.planning', 'phases');
  const planContents: Record<number, string> = {};

  if (!existsSync(phasesDir)) {
    return planContents;
  }

  try {
    const entries = await readdir(phasesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Extract phase number from directory name (e.g., "01-core" -> 1)
        const match = entry.name.match(/^(\d+)/);
        if (match) {
          const phaseNum = parseInt(match[1], 10);
          const planPath = join(phasesDir, entry.name, `${match[1]}-PLAN.md`);

          if (existsSync(planPath)) {
            try {
              planContents[phaseNum] = await readFile(planPath, 'utf-8');
            } catch (e) {
              // Skip unreadable files
            }
          }
        }
      }
    }
  } catch (e) {
    // Return empty if can't read directory
  }

  return planContents;
}

export function parseMilestones(content: string): Milestone[] {
  const milestones: Milestone[] = [];
  const lines = content.split('\n');

  let currentMilestone: Milestone | null = null;
  let hasExplicitMilestones = false;

  // Track phase statuses per milestone for status calculation
  const milestonePhaseStatuses: Map<number, ('completed' | 'in_progress' | 'pending')[]> = new Map();
  let milestoneIndex = -1;

  for (const line of lines) {
    // Match milestone headers like "## Milestone: v1.0 - Release" or "## Milestone: v1.0 [x]"
    const milestoneMatch = line.match(/^##\s*Milestone:\s*(.+?)(?:\s*\[([x>]?)\])?\s*$/i);
    if (milestoneMatch) {
      hasExplicitMilestones = true;
      if (currentMilestone) {
        milestones.push(currentMilestone);
      }
      milestoneIndex++;
      milestonePhaseStatuses.set(milestoneIndex, []);
      currentMilestone = {
        name: milestoneMatch[1].trim(),
        status: milestoneMatch[2] === 'x' ? 'completed' : 'pending',
        phaseNumbers: [],
        phases: []
      };
      continue;
    }

    // Match phase headers like "### Phase 1: Setup [x]"
    const phaseMatch = line.match(/^###\s*(?:Phase\s+)?(\d+)[.:]?\s*(.+?)(?:\s*\[([x>]?)\])?\s*$/i);
    if (phaseMatch) {
      const phaseNum = parseInt(phaseMatch[1], 10);
      const phaseStatus = phaseMatch[3] === 'x' ? 'completed' :
                          phaseMatch[3] === '>' ? 'in_progress' : 'pending';

      if (currentMilestone) {
        currentMilestone.phaseNumbers.push(phaseNum);
        milestonePhaseStatuses.get(milestoneIndex)?.push(phaseStatus);
      } else if (!hasExplicitMilestones) {
        // Create implicit "Current" milestone for roadmaps without explicit milestones
        milestoneIndex = 0;
        milestonePhaseStatuses.set(milestoneIndex, [phaseStatus]);
        currentMilestone = {
          name: 'Current',
          status: 'pending',
          phaseNumbers: [phaseNum],
          phases: []
        };
      }
    }
  }

  // Add the last milestone
  if (currentMilestone) {
    milestones.push(currentMilestone);
  }

  // Determine milestone statuses from their phases
  milestones.forEach((milestone, idx) => {
    const statuses = milestonePhaseStatuses.get(idx) || [];
    if (statuses.length === 0) {
      milestone.status = 'pending';
    } else if (statuses.every(s => s === 'completed')) {
      milestone.status = 'completed';
    } else if (statuses.some(s => s === 'in_progress')) {
      milestone.status = 'in_progress';
    } else {
      milestone.status = 'pending';
    }
  });

  return milestones;
}

export function parsePhases(roadmapContent: string, planContents: Record<number, string>): Phase[] {
  const phases: Phase[] = [];
  const lines = roadmapContent.split('\n');

  for (const line of lines) {
    const match = line.match(/^###\s*(?:Phase\s+)?(\d+)[.:]?\s*(.+?)(?:\s*\[([x>]?)\])?\s*$/i);
    if (match) {
      const phaseNum = parseInt(match[1], 10);
      const phaseName = match[2].replace(/\s*\[.*?\]\s*$/, '').trim();
      const status: Phase['status'] = match[3] === 'x' ? 'completed' :
                                       match[3] === '>' ? 'in_progress' : 'pending';

      // Parse tasks from PLAN file if available
      const planContent = planContents[phaseNum] || '';
      const tasks = parseTasks(planContent);

      const tasksDone = tasks.filter(t => t.status === 'completed').length;
      const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length;
      const tasksTotal = tasks.length;
      const progress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

      phases.push({
        number: phaseNum,
        name: phaseName,
        status,
        tasksDone,
        tasksInProgress,
        tasksTotal,
        progress,
        tasks
      });
    }
  }

  return phases;
}

export function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');

  let currentTask: Task | null = null;
  let inAcceptanceCriteria = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match task headers like "### Task 1: Setup Project [x@alice]" or "### Task 1: Name [ ]"
    // Also match without brackets for incomplete lines
    const taskMatch = line.match(/^###\s*Task\s+(\d+)[.:]?\s*(.+?)\s*\[([x> ]?)(?:@(\w+))?\]\s*$/i);
    if (taskMatch) {
      // Save previous task
      if (currentTask) {
        tasks.push(currentTask);
      }

      const statusChar = taskMatch[3].trim();
      const status: Task['status'] = statusChar === 'x' ? 'completed' :
                                      statusChar === '>' ? 'in_progress' : 'pending';

      currentTask = {
        number: parseInt(taskMatch[1], 10),
        name: taskMatch[2].trim(),
        status,
        owner: taskMatch[4] || undefined,
        criteriaDone: 0,
        criteriaTotal: 0
      };
      inAcceptanceCriteria = false;
      continue;
    }

    // Track when we enter acceptance criteria section
    if (line.match(/\*\*Acceptance Criteria\*\*|Acceptance Criteria:/i)) {
      inAcceptanceCriteria = true;
      continue;
    }

    // Count acceptance criteria checkboxes
    if (currentTask && (inAcceptanceCriteria || line.match(/^-\s*\[[ x]\]/))) {
      const checkboxMatch = line.match(/^-\s*\[([ x])\]/);
      if (checkboxMatch) {
        currentTask.criteriaTotal++;
        if (checkboxMatch[1] === 'x') {
          currentTask.criteriaDone++;
        }
      }
    }

    // Reset criteria tracking on new section
    if (line.match(/^###\s/) && !line.match(/^###\s*Task/i)) {
      inAcceptanceCriteria = false;
    }
  }

  // Don't forget the last task
  if (currentTask) {
    tasks.push(currentTask);
  }

  return tasks;
}
