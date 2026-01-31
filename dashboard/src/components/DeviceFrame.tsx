import React from 'react';
import { Box, Text, useInput } from 'ink';

export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'custom';

export interface DeviceDimensions {
  width: number;
  height: number;
  label: string;
}

const devicePresets: Record<Exclude<DeviceType, 'custom'>, DeviceDimensions> = {
  phone: { width: 390, height: 844, label: 'Phone (iPhone 14)' },
  tablet: { width: 820, height: 1180, label: 'Tablet (iPad Air)' },
  desktop: { width: 1440, height: 900, label: 'Desktop (MacBook)' },
};

export function getDeviceDimensions(device: DeviceType, customWidth?: number, customHeight?: number): DeviceDimensions {
  if (device === 'custom') {
    return {
      width: customWidth || 800,
      height: customHeight || 600,
      label: 'Custom',
    };
  }
  return devicePresets[device];
}

export function generateViewportUrl(baseUrl: string, device: DeviceType, customWidth?: number, customHeight?: number): string {
  const dims = getDeviceDimensions(device, customWidth, customHeight);
  const url = new URL(baseUrl);
  url.searchParams.set('viewport', `${dims.width}x${dims.height}`);
  return url.toString();
}

export interface DeviceFrameProps {
  selectedDevice: DeviceType;
  baseUrl?: string;
  customWidth?: number;
  customHeight?: number;
  showCustom?: boolean;
  isActive?: boolean;
  onSelect: (device: DeviceType) => void;
  onCustomDimensions?: (width: number, height: number) => void;
}

const devices: { key: DeviceType; num: string }[] = [
  { key: 'phone', num: '1' },
  { key: 'tablet', num: '2' },
  { key: 'desktop', num: '3' },
];

export function DeviceFrame({
  selectedDevice,
  baseUrl,
  customWidth = 800,
  customHeight = 600,
  showCustom = false,
  isActive = true,
  onSelect,
  onCustomDimensions,
}: DeviceFrameProps) {
  const allDevices = showCustom
    ? [...devices, { key: 'custom' as DeviceType, num: '4' }]
    : devices;

  useInput(
    (input) => {
      if (!isActive) return;

      if (input === '1') onSelect('phone');
      else if (input === '2') onSelect('tablet');
      else if (input === '3') onSelect('desktop');
      else if (input === '4' && showCustom) onSelect('custom');
    },
    { isActive }
  );

  const currentDims = getDeviceDimensions(selectedDevice, customWidth, customHeight);
  const viewportUrl = baseUrl ? generateViewportUrl(baseUrl, selectedDevice, customWidth, customHeight) : null;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Device Size</Text>
      </Box>

      {/* Device options */}
      {allDevices.map((device) => {
        const isSelected = device.key === selectedDevice;
        const dims = getDeviceDimensions(device.key, customWidth, customHeight);

        return (
          <Box key={device.key} marginBottom={1}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '▶ ' : '  '}
            </Text>
            <Text color={isSelected ? 'cyan' : 'gray'}>
              [{device.num}]
            </Text>
            <Text bold={isSelected} color={isSelected ? 'cyan' : 'white'}>
              {' '}{device.key.charAt(0).toUpperCase() + device.key.slice(1)}
            </Text>
            <Text dimColor>
              {' '}{dims.width} × {dims.height}
            </Text>
          </Box>
        );
      })}

      {/* Current selection details */}
      <Box marginTop={1} borderStyle="single" paddingX={1} flexDirection="column">
        <Box>
          <Text bold>Selected: </Text>
          <Text color="cyan">{currentDims.label}</Text>
        </Box>
        <Box>
          <Text dimColor>Viewport: </Text>
          <Text>{currentDims.width} × {currentDims.height}</Text>
        </Box>
        {viewportUrl && (
          <Box>
            <Text dimColor>URL: </Text>
            <Text color="blue">{viewportUrl}</Text>
          </Box>
        )}
      </Box>

      {/* Navigation hints */}
      <Box marginTop={1}>
        <Text dimColor>
          1 phone • 2 tablet • 3 desktop
          {showCustom && ' • 4 custom'}
        </Text>
      </Box>
    </Box>
  );
}
