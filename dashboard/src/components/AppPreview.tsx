import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

interface Service {
  name: string;
  port: number;
  state: 'running' | 'stopped' | 'starting' | 'error';
}

interface AppPreviewProps {
  services: Service[];
  selectedService?: string;
  dashboardPort?: number;
  isActive: boolean;
  onServiceSelect?: (name: string) => void;
  onOpenInBrowser?: (url: string) => void;
}

/**
 * Get proxy URL for a service
 */
export function getProxyUrl(serviceName: string, dashboardPort: number = 3147): string {
  return `http://localhost:${dashboardPort}/proxy/${serviceName}`;
}

/**
 * Get direct URL for a service
 */
export function getDirectUrl(port: number): string {
  return `http://localhost:${port}`;
}

/**
 * Format service URL for display
 */
export function formatServiceUrl(service: Service, useProxy: boolean = true, dashboardPort: number = 3147): string {
  if (useProxy) {
    return getProxyUrl(service.name, dashboardPort);
  }
  return getDirectUrl(service.port);
}

/**
 * Get service state indicator
 */
export function getStateIndicator(state: string): { icon: string; color: string } {
  switch (state) {
    case 'running':
      return { icon: '●', color: 'green' };
    case 'starting':
      return { icon: '◐', color: 'yellow' };
    case 'stopped':
      return { icon: '○', color: 'gray' };
    case 'error':
      return { icon: '✗', color: 'red' };
    default:
      return { icon: '?', color: 'gray' };
  }
}

function ServiceSelector({
  services,
  selected,
  onSelect,
}: {
  services: Service[];
  selected?: string;
  onSelect: (name: string) => void;
}) {
  return (
    <Box flexDirection="row" gap={2}>
      {services.map((service, idx) => {
        const isSelected = selected === service.name;
        const { icon, color } = getStateIndicator(service.state);

        return (
          <Box key={service.name}>
            <Text
              color={color as any}
              bold={isSelected}
              underline={isSelected}
            >
              [{idx + 1}] {icon} {service.name}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

function PreviewInfo({
  service,
  dashboardPort,
}: {
  service: Service;
  dashboardPort: number;
}) {
  const proxyUrl = getProxyUrl(service.name, dashboardPort);
  const directUrl = getDirectUrl(service.port);
  const { icon, color } = getStateIndicator(service.state);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text bold>{service.name}</Text>
        <Text color={color as any}> {icon} {service.state}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text dimColor>Proxy URL:  </Text>
          <Text color="cyan">{proxyUrl}</Text>
        </Box>
        <Box>
          <Text dimColor>Direct URL: </Text>
          <Text color="cyan">{directUrl}</Text>
        </Box>
      </Box>

      {service.state === 'running' && (
        <Box marginTop={1}>
          <Text color="green">Ready for preview</Text>
        </Box>
      )}

      {service.state === 'stopped' && (
        <Box marginTop={1}>
          <Text color="gray">Service not running</Text>
        </Box>
      )}

      {service.state === 'starting' && (
        <Box marginTop={1}>
          <Text color="yellow">Starting...</Text>
        </Box>
      )}

      {service.state === 'error' && (
        <Box marginTop={1}>
          <Text color="red">Service error - check logs</Text>
        </Box>
      )}
    </Box>
  );
}

export function AppPreview({
  services,
  selectedService,
  dashboardPort = 3147,
  isActive,
  onServiceSelect,
  onOpenInBrowser,
}: AppPreviewProps) {
  const [useProxy, setUseProxy] = useState(true);

  const runningServices = services.filter(s => s.state === 'running' || s.state === 'starting');
  const selected = selectedService
    ? services.find(s => s.name === selectedService)
    : runningServices[0];

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Number keys to select service
      const num = parseInt(input, 10);
      if (num >= 1 && num <= services.length) {
        onServiceSelect?.(services[num - 1].name);
      }

      // Toggle proxy mode
      if (input === 'p') {
        setUseProxy(!useProxy);
      }

      // Open in browser
      if (input === 'o' && selected && selected.state === 'running') {
        const url = formatServiceUrl(selected, useProxy, dashboardPort);
        onOpenInBrowser?.(url);
      }
    },
    { isActive }
  );

  if (services.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>App Preview</Text>
        <Box marginTop={1}>
          <Text color="gray">No services configured</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run /tlc:start to begin</Text>
        </Box>
      </Box>
    );
  }

  if (runningServices.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>App Preview</Text>
        <Box marginTop={1}>
          <Text color="yellow">No services running</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            {services.length} service{services.length !== 1 ? 's' : ''} configured but stopped
          </Text>
        </Box>

        <Box marginTop={1}>
          <ServiceSelector
            services={services}
            selected={selected?.name}
            onSelect={onServiceSelect || (() => {})}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>App Preview </Text>
        <Text dimColor>
          ({runningServices.length}/{services.length} running)
        </Text>
      </Box>

      <ServiceSelector
        services={services}
        selected={selected?.name}
        onSelect={onServiceSelect || (() => {})}
      />

      {selected && (
        <PreviewInfo service={selected} dashboardPort={dashboardPort} />
      )}

      <Box marginTop={1}>
        <Text dimColor>Mode: </Text>
        <Text color={useProxy ? 'green' : 'yellow'}>
          {useProxy ? 'Proxy' : 'Direct'}
        </Text>
      </Box>

      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            [1-{services.length}] Select  [p] Toggle proxy  [o] Open browser
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default AppPreview;
