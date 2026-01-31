import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { DeviceType, getDeviceDimensions, generateViewportUrl } from './DeviceFrame.js';

export type ServiceState = 'running' | 'stopped' | 'starting' | 'error';

export interface Service {
  name: string;
  port: number;
  state: ServiceState;
}

export interface PreviewPanelProps {
  services: Service[];
  dashboardPort?: number;
  initialDevice?: DeviceType;
  useProxy?: boolean;
  isActive?: boolean;
  onServiceSelect?: (name: string) => void;
  onDeviceChange?: (device: DeviceType) => void;
  onOpenBrowser?: (url: string) => void;
}

const stateIndicators: Record<ServiceState, { icon: string; color: string }> = {
  running: { icon: '●', color: 'green' },
  starting: { icon: '◐', color: 'yellow' },
  stopped: { icon: '○', color: 'gray' },
  error: { icon: '✗', color: 'red' },
};

const deviceOrder: DeviceType[] = ['phone', 'tablet', 'desktop'];

export function PreviewPanel({
  services,
  dashboardPort = 3147,
  initialDevice = 'desktop',
  useProxy: initialUseProxy = true,
  isActive = true,
  onServiceSelect,
  onDeviceChange,
  onOpenBrowser,
}: PreviewPanelProps) {
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>(initialDevice);
  const [useProxy, setUseProxy] = useState(initialUseProxy);

  const runningServices = useMemo(
    () => services.filter((s) => s.state === 'running' || s.state === 'starting'),
    [services]
  );

  const selectedService = services[selectedServiceIndex] || services[0];

  // Generate URL
  const getServiceUrl = (service: Service): string => {
    if (useProxy) {
      return `http://localhost:${dashboardPort}/proxy/${service.name}`;
    }
    return `http://localhost:${service.port}`;
  };

  const currentUrl = selectedService ? getServiceUrl(selectedService) : '';
  const viewportUrl = currentUrl ? generateViewportUrl(currentUrl, selectedDevice) : '';

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Service selection by number
      const num = parseInt(input, 10);
      if (num >= 1 && num <= services.length) {
        setSelectedServiceIndex(num - 1);
        onServiceSelect?.(services[num - 1].name);
      }

      // Device cycle
      if (input === 'd') {
        const currentIdx = deviceOrder.indexOf(selectedDevice);
        const nextIdx = (currentIdx + 1) % deviceOrder.length;
        const newDevice = deviceOrder[nextIdx];
        setSelectedDevice(newDevice);
        onDeviceChange?.(newDevice);
      }

      // Toggle proxy
      if (input === 'p') {
        setUseProxy(!useProxy);
      }

      // Open browser
      if (input === 'o' && selectedService?.state === 'running') {
        onOpenBrowser?.(viewportUrl);
      }
    },
    { isActive }
  );

  // Empty state
  if (services.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Preview</Text>
        <Box marginTop={1}>
          <Text dimColor>No services configured</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run /tlc:start to begin</Text>
        </Box>
      </Box>
    );
  }

  // All stopped
  if (runningServices.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Preview</Text>
        <Box marginTop={1}>
          <Text color="yellow">All services stopped</Text>
        </Box>
        <Box marginTop={1}>
          {services.map((s, i) => {
            const { icon, color } = stateIndicators[s.state];
            return (
              <Box key={s.name}>
                <Text color={color as any}>{icon} </Text>
                <Text>{s.name}</Text>
                {s.state === 'error' && (
                  <Text color="red"> - check logs</Text>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  const dims = getDeviceDimensions(selectedDevice);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Preview </Text>
        <Text dimColor>
          ({runningServices.length}/{services.length} running)
        </Text>
      </Box>

      {/* Service selector */}
      <Box marginBottom={1}>
        <Text bold>Services: </Text>
        {services.map((service, idx) => {
          const isSelected = idx === selectedServiceIndex;
          const { icon, color } = stateIndicators[service.state];
          return (
            <Box key={service.name} marginRight={2}>
              <Text color={color as any}>{icon} </Text>
              <Text
                bold={isSelected}
                underline={isSelected}
                color={isSelected ? 'cyan' : undefined}
              >
                [{idx + 1}] {service.name}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Device selector */}
      <Box marginBottom={1}>
        <Text bold>Device: </Text>
        {deviceOrder.map((device) => {
          const isSelected = device === selectedDevice;
          return (
            <Box key={device} marginRight={2}>
              <Text
                bold={isSelected}
                color={isSelected ? 'cyan' : 'gray'}
              >
                {device}
              </Text>
            </Box>
          );
        })}
        <Text dimColor>({dims.width}×{dims.height})</Text>
      </Box>

      {/* URL display */}
      <Box
        flexDirection="column"
        borderStyle="single"
        paddingX={1}
        marginBottom={1}
      >
        <Box>
          <Text bold>{selectedService?.name}</Text>
          {selectedService && (
            <Text color={stateIndicators[selectedService.state].color as any}>
              {' '}{stateIndicators[selectedService.state].icon} {selectedService.state}
            </Text>
          )}
        </Box>

        <Box marginTop={1}>
          <Text dimColor>URL: </Text>
          <Text color="cyan">{viewportUrl}</Text>
        </Box>

        <Box>
          <Text dimColor>Port: </Text>
          <Text>{selectedService?.port}</Text>
          <Text dimColor> • Mode: </Text>
          <Text color={useProxy ? 'green' : 'yellow'}>
            {useProxy ? 'proxy' : 'direct'}
          </Text>
        </Box>

        {selectedService?.state === 'error' && (
          <Box marginTop={1}>
            <Text color="red">Service error - check logs for details</Text>
          </Box>
        )}
      </Box>

      {/* Mobile hint */}
      <Box marginBottom={1}>
        <Text dimColor>
          📱 Scan QR or open URL on phone for mobile testing
        </Text>
      </Box>

      {/* Navigation hints */}
      <Box>
        <Text dimColor>
          1-{services.length} service • d device • p proxy • o open browser
        </Text>
      </Box>
    </Box>
  );
}
