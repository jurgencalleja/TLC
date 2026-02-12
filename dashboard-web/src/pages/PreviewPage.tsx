import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Smartphone, Tablet, Monitor, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dropdown, type DropdownItem } from '../components/ui/Dropdown';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';

type DeviceType = 'phone' | 'tablet' | 'desktop';

interface DeviceConfig {
  type: DeviceType;
  label: string;
  width: string;
  icon: React.ReactNode;
}

export interface Service {
  id: string;
  label: string;
  url: string;
}

interface PreviewPageProps {
  defaultUrl?: string;
  services?: Service[];
}

const DEVICES: DeviceConfig[] = [
  { type: 'phone', label: 'Phone', width: '375px', icon: <Smartphone className="w-4 h-4" /> },
  { type: 'tablet', label: 'Tablet', width: '768px', icon: <Tablet className="w-4 h-4" /> },
  { type: 'desktop', label: 'Desktop', width: '100%', icon: <Monitor className="w-4 h-4" /> },
];

export function PreviewPage({ defaultUrl = 'http://localhost:3000', services }: PreviewPageProps) {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const storeProjectId = useWorkspaceStore((s) => s.selectedProjectId);
  const [activeDevice, setActiveDevice] = useState<DeviceType>('desktop');
  const [currentUrl, setCurrentUrl] = useState(defaultUrl);
  const [iframeKey, setIframeKey] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(
    services?.[0] ?? null
  );

  useEffect(() => {
    setActiveView('preview');
  }, [setActiveView]);

  useEffect(() => {
    if (urlProjectId && urlProjectId !== storeProjectId) {
      selectProject(urlProjectId);
    }
  }, [urlProjectId, storeProjectId, selectProject]);

  useEffect(() => {
    if (selectedService) {
      setCurrentUrl(selectedService.url);
    }
  }, [selectedService]);

  const handleDeviceChange = useCallback((device: DeviceType) => {
    setActiveDevice(device);
  }, []);

  const handleRefresh = useCallback(() => {
    setIframeKey((prev) => prev + 1);
  }, []);

  const handleOpenNewTab = useCallback(() => {
    window.open(currentUrl, '_blank');
  }, [currentUrl]);

  const handleServiceSelect = useCallback((item: DropdownItem) => {
    const service = services?.find((s) => s.id === item.id);
    if (service) {
      setSelectedService(service);
    }
  }, [services]);

  const deviceWidth = DEVICES.find((d) => d.type === activeDevice)?.width ?? '100%';

  const serviceDropdownItems: DropdownItem[] = services?.map((s) => ({
    id: s.id,
    label: s.label,
  })) ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-text-primary">Preview</h1>
            <span className="text-sm text-text-secondary">{currentUrl}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Service Selector */}
            {services && services.length > 0 && (
              <Dropdown
                items={serviceDropdownItems}
                onSelect={handleServiceSelect}
                trigger={selectedService?.label ?? 'Select Service'}
              />
            )}

            {/* Device Toggle */}
            <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
              {DEVICES.map((device) => (
                <Button
                  key={device.type}
                  variant={activeDevice === device.type ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleDeviceChange(device.type)}
                  aria-label={device.label}
                  leftIcon={device.icon}
                >
                  {device.label}
                </Button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                aria-label="Refresh"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenNewTab}
                aria-label="Open in new tab"
                leftIcon={<ExternalLink className="w-4 h-4" />}
              >
                Open in new tab
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden bg-surface-secondary p-4 flex justify-center">
        <div
          data-testid="iframe-container"
          className="h-full bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
          style={{ width: deviceWidth, maxWidth: '100%' }}
        >
          <iframe
            key={iframeKey}
            src={currentUrl}
            title="App Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
