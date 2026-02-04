import { Box, Text } from 'ink';

interface Model {
  id: string;
  name: string;
  available: boolean;
  pricing?: number;
  capabilities?: string[];
}

interface ModelSelectorProps {
  models: Model[];
  selected?: string;
  currentOverride?: string;
  showCapabilities?: boolean;
  showPricing?: boolean;
  allowOneTime?: boolean;
  allowPersistent?: boolean;
  onSelect?: (modelId: string) => void;
  onClear?: () => void;
}

export function ModelSelector({
  models,
  selected,
  currentOverride,
  showCapabilities,
  showPricing,
  allowOneTime,
  allowPersistent,
  onSelect,
  onClear,
}: ModelSelectorProps) {
  if (models.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No models available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Model Selection</Text>

      {/* Current override indicator */}
      {currentOverride && (
        <Box marginTop={1}>
          <Text color="cyan">Override: {currentOverride}</Text>
          {onClear && (
            <Text color="gray"> [Clear]</Text>
          )}
        </Box>
      )}

      {/* Model list */}
      <Box marginTop={1} flexDirection="column">
        {models.map((model) => {
          const isSelected = selected === model.id;
          const isOverride = currentOverride === model.id;

          return (
            <Box key={model.id} marginBottom={1}>
              <Box>
                {/* Selection indicator */}
                <Text color={isSelected ? 'cyan' : 'gray'}>
                  {isSelected ? '●' : '○'}
                </Text>

                {/* Model name */}
                <Text
                  color={model.available ? 'white' : 'gray'}
                  dimColor={!model.available}
                >
                  {' '}{model.name}
                </Text>

                {/* Override indicator */}
                {isOverride && (
                  <Text color="yellow"> (override)</Text>
                )}

                {/* Availability */}
                {!model.available && (
                  <Text color="red"> (unavailable)</Text>
                )}
              </Box>

              {/* Pricing */}
              {showPricing && model.pricing !== undefined && (
                <Box marginLeft={2}>
                  <Text dimColor>Price: </Text>
                  <Text>${model.pricing.toFixed(4)}/1K</Text>
                </Box>
              )}

              {/* Capabilities */}
              {showCapabilities && model.capabilities && (
                <Box marginLeft={2}>
                  <Text dimColor>Capabilities: </Text>
                  <Text>{model.capabilities.join(', ')}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Override options */}
      {(allowOneTime || allowPersistent) && (
        <Box marginTop={1}>
          <Text dimColor>Options: </Text>
          {allowOneTime && <Text>[One-time] </Text>}
          {allowPersistent && <Text>[Persistent]</Text>}
        </Box>
      )}
    </Box>
  );
}
