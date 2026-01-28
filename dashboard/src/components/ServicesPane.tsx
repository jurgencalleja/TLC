import { Box, Text } from 'ink';

interface Service {
  name: string;
  type: string;
  port: number;
  state: 'running' | 'stopped' | 'starting' | 'error';
  health?: 'healthy' | 'unhealthy' | 'starting';
  uptime?: number;
}

interface ServicesPaneProps {
  services: Service[];
  selectedService?: string;
  isActive: boolean;
}

const stateIcons: Record<string, string> = {
  running: '🟢',
  stopped: '⚪',
  starting: '🟡',
  error: '🔴',
};

const healthIcons: Record<string, string> = {
  healthy: '✓',
  unhealthy: '✗',
  starting: '...',
};

export function formatUptime(ms: number | undefined): string {
  if (!ms) return '-';

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

interface StatusInfo {
  text: string;
  color: string;
  running: number;
  total: number;
}

export function getStatusInfo(services: Array<{ state: string; health?: string }>): StatusInfo {
  const total = services.length;
  const running = services.filter((s) => s.state === 'running').length;
  const allHealthy = services.every(
    (s) => s.state === 'running' && s.health !== 'unhealthy'
  );

  let text = 'Stopped';
  let color = 'gray';

  if (running === total && allHealthy && total > 0) {
    text = 'All healthy';
    color = 'green';
  } else if (running > 0 && running < total) {
    text = `${running}/${total} running`;
    color = 'yellow';
  } else if (running === total && total > 0) {
    text = 'Some unhealthy';
    color = 'yellow';
  }

  return { text, color, running, total };
}

function ServiceCard({ service, isSelected }: { service: Service; isSelected: boolean }) {
  const stateIcon = stateIcons[service.state] || '❓';
  const healthIcon = service.health ? healthIcons[service.health] : '-';

  return (
    <Box
      borderStyle={isSelected ? 'double' : 'single'}
      borderColor={isSelected ? 'blue' : undefined}
      paddingX={1}
      flexDirection="column"
      width={24}
    >
      <Box>
        <Text>{stateIcon} </Text>
        <Text bold>{service.name}</Text>
      </Box>
      <Box>
        <Text dimColor>Type: </Text>
        <Text>{service.type}</Text>
      </Box>
      <Box>
        <Text dimColor>Port: </Text>
        <Text>{service.port}</Text>
      </Box>
      <Box>
        <Text dimColor>Health: </Text>
        <Text color={service.health === 'healthy' ? 'green' : service.health === 'unhealthy' ? 'red' : undefined}>
          {healthIcon}
        </Text>
      </Box>
      <Box>
        <Text dimColor>Uptime: </Text>
        <Text>{formatUptime(service.uptime)}</Text>
      </Box>
    </Box>
  );
}

function StackSummary({ services }: { services: Service[] }) {
  const { text, color, running, total } = getStatusInfo(services);

  return (
    <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
      <Box>
        <Text bold>Services </Text>
        <Text color={color as any}>({text})</Text>
      </Box>
      <Box>
        <Text bold>{running}/{total}</Text>
        <Text dimColor> running</Text>
      </Box>
    </Box>
  );
}

export function ServicesPane({ services, selectedService, isActive }: ServicesPaneProps) {
  if (services.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Services</Text>
        <Box marginTop={1}>
          <Text color="gray">📦 No services detected</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Add docker-compose.yml or package.json</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      <StackSummary services={services} />

      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {services.map((service) => (
          <ServiceCard
            key={service.name}
            service={service}
            isSelected={selectedService === service.name}
          />
        ))}
      </Box>

      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            [r] Restart  [l] Logs  [p] Preview  [↑↓] Select
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default ServicesPane;
