import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

export interface TLCConfig {
  project?: string;
  version?: string;
  quality?: {
    coverageThreshold?: number;
    qualityScoreThreshold?: number;
  };
  git?: {
    mainBranch?: string;
  };
  paths?: {
    planning?: string;
    tests?: string;
  };
  team?: {
    enabled?: boolean;
  };
  testFrameworks?: {
    primary?: string;
    e2e?: string;
  };
}

interface SettingItem {
  key: string;
  label: string;
  value: string | number | boolean | undefined;
  type: 'string' | 'number' | 'boolean';
}

interface SettingSection {
  key: string;
  label: string;
  items: SettingItem[];
}

export interface SettingsPanelProps {
  config: TLCConfig;
  configPath?: string;
  isEditing?: boolean;
  isActive?: boolean;
  onEdit?: () => void;
  onSave?: (config: TLCConfig) => void;
  onCancel?: () => void;
}

function formatValue(value: string | number | boolean | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'enabled' : 'disabled';
  }
  return String(value);
}

function buildSections(config: TLCConfig): SettingSection[] {
  return [
    {
      key: 'project',
      label: 'Project',
      items: [
        { key: 'project', label: 'Name', value: config.project, type: 'string' },
        { key: 'version', label: 'Version', value: config.version, type: 'string' },
      ],
    },
    {
      key: 'quality',
      label: 'Quality',
      items: [
        {
          key: 'coverageThreshold',
          label: 'Coverage Threshold',
          value: config.quality?.coverageThreshold,
          type: 'number',
        },
        {
          key: 'qualityScoreThreshold',
          label: 'Quality Score Threshold',
          value: config.quality?.qualityScoreThreshold,
          type: 'number',
        },
      ],
    },
    {
      key: 'git',
      label: 'Git',
      items: [
        {
          key: 'mainBranch',
          label: 'Main Branch',
          value: config.git?.mainBranch,
          type: 'string',
        },
      ],
    },
    {
      key: 'paths',
      label: 'Paths',
      items: [
        {
          key: 'planning',
          label: 'Planning Directory',
          value: config.paths?.planning,
          type: 'string',
        },
        {
          key: 'tests',
          label: 'Tests Directory',
          value: config.paths?.tests,
          type: 'string',
        },
      ],
    },
    {
      key: 'team',
      label: 'Team',
      items: [
        {
          key: 'enabled',
          label: 'Team Mode',
          value: config.team?.enabled,
          type: 'boolean',
        },
      ],
    },
    {
      key: 'testFrameworks',
      label: 'Test Frameworks',
      items: [
        {
          key: 'primary',
          label: 'Primary Framework',
          value: config.testFrameworks?.primary,
          type: 'string',
        },
        {
          key: 'e2e',
          label: 'E2E Framework',
          value: config.testFrameworks?.e2e,
          type: 'string',
        },
      ],
    },
  ];
}

export function SettingsPanel({
  config,
  configPath = '.tlc.json',
  isEditing = false,
  isActive = true,
  onEdit,
  onSave,
  onCancel,
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [activeItem, setActiveItem] = useState(0);

  const sections = useMemo(() => buildSections(config), [config]);

  const currentSection = sections[activeSection];
  const totalItems = currentSection?.items.length || 0;

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Edit mode controls
      if (isEditing) {
        if (key.escape && onCancel) {
          onCancel();
        } else if ((key.return || input === 's') && onSave) {
          onSave(config);
        }
        return;
      }

      // View mode controls
      if (input === 'e' && onEdit) {
        onEdit();
      }

      // Section navigation (Tab)
      if (key.tab) {
        setActiveSection((prev) => (prev + 1) % sections.length);
        setActiveItem(0);
      }

      // Item navigation
      if (key.downArrow || input === 'j') {
        setActiveItem((prev) => Math.min(prev + 1, totalItems - 1));
      } else if (key.upArrow || input === 'k') {
        setActiveItem((prev) => Math.max(prev - 1, 0));
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Settings</Text>
        {isEditing && <Text color="yellow"> [editing]</Text>}
      </Box>

      {/* Config file path */}
      <Box marginBottom={1}>
        <Text dimColor>Config: </Text>
        <Text color="cyan">{configPath}</Text>
      </Box>

      {/* Sections */}
      {sections.map((section, sectionIdx) => {
        const isSectionActive = sectionIdx === activeSection;

        return (
          <Box
            key={section.key}
            flexDirection="column"
            marginBottom={1}
            borderStyle={isSectionActive ? 'double' : 'single'}
            borderColor={isSectionActive ? 'cyan' : 'gray'}
            paddingX={1}
          >
            {/* Section header */}
            <Box marginBottom={1}>
              <Text bold color={isSectionActive ? 'cyan' : 'white'}>
                {section.label}
              </Text>
            </Box>

            {/* Section items */}
            {section.items.map((item, itemIdx) => {
              const isItemActive = isSectionActive && itemIdx === activeItem;
              const displayValue = formatValue(item.value);
              const isNotSet = displayValue === '—';

              return (
                <Box key={item.key}>
                  {/* Selection indicator */}
                  <Text color={isItemActive ? 'cyan' : undefined}>
                    {isItemActive ? '▶ ' : '  '}
                  </Text>

                  {/* Label */}
                  <Box width={24}>
                    <Text dimColor>{item.label}:</Text>
                  </Box>

                  {/* Value */}
                  <Text
                    color={
                      isNotSet
                        ? 'gray'
                        : item.type === 'boolean'
                        ? item.value
                          ? 'green'
                          : 'yellow'
                        : 'white'
                    }
                    bold={isItemActive}
                  >
                    {displayValue}
                    {item.type === 'number' && !isNotSet && '%'}
                  </Text>

                  {/* Edit indicator */}
                  {isEditing && isItemActive && (
                    <Text color="yellow"> ←</Text>
                  )}
                </Box>
              );
            })}
          </Box>
        );
      })}

      {/* Navigation hints */}
      <Box marginTop={1}>
        {isEditing ? (
          <Text dimColor>Enter/s save • Esc cancel • ↑/k ↓/j navigate</Text>
        ) : (
          <Text dimColor>e edit • Tab section • ↑/k ↓/j navigate</Text>
        )}
      </Box>
    </Box>
  );
}
