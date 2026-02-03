import { useState } from 'react';
import { Smartphone, Tablet, Monitor, RefreshCw, ExternalLink, Play } from 'lucide-react';
import { Dropdown, DropdownItem } from '../ui/Dropdown';

export type ServiceStatus = 'running' | 'stopped' | 'building' | 'error';

export interface Service {
  id: string;
  name: string;
  url: string;
  status: ServiceStatus;
}

export interface PreviewPanelProps {
  services: Service[];
  selectedService?: string;
  className?: string;
}

type DeviceSize = 'phone' | 'tablet' | 'desktop';

const deviceSizes: Record<DeviceSize, string> = {
  phone: '375px',
  tablet: '768px',
  desktop: '100%',
};

const statusColors: Record<ServiceStatus, string> = {
  running: 'bg-success',
  stopped: 'bg-muted',
  building: 'bg-warning',
  error: 'bg-error',
};

export function PreviewPanel({
  services,
  selectedService: initialService,
  className = '',
}: PreviewPanelProps) {
  const [selectedService, setSelectedService] = useState(
    initialService || services[0]?.id
  );
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  const currentService = services.find((s) => s.id === selectedService);

  const handleServiceChange = (item: DropdownItem) => {
    setSelectedService(item.id);
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleOpenNewTab = () => {
    if (currentService) {
      window.open(currentService.url, '_blank');
    }
  };

  const dropdownItems: DropdownItem[] = services.map((s) => ({
    id: s.id,
    label: s.name,
  }));

  if (services.length === 0) {
    return (
      <div
        data-testid="preview-panel"
        className={`bg-surface border border-border rounded-lg ${className}`}
      >
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Play className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No services running</h3>
          <p className="text-muted-foreground">
            Start your services to see a live preview.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="preview-panel"
      className={`bg-surface border border-border rounded-lg flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Service Selector */}
          <div data-testid="service-selector">
            <Dropdown
              items={dropdownItems}
              onSelect={handleServiceChange}
              trigger={
                <span className="flex items-center gap-2">
                  <span
                    data-testid="service-status"
                    className={`w-2 h-2 rounded-full ${
                      currentService ? statusColors[currentService.status] : 'bg-muted'
                    }`}
                  />
                  {currentService?.name || 'Select service'}
                </span>
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Device Toggle */}
          <div className="flex items-center border border-border rounded-md">
            <button
              onClick={() => setDeviceSize('phone')}
              aria-label="Phone view"
              className={`
                p-2 transition-colors
                ${deviceSize === 'phone' ? 'bg-muted' : 'hover:bg-muted/50'}
              `}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceSize('tablet')}
              aria-label="Tablet view"
              className={`
                p-2 transition-colors border-x border-border
                ${deviceSize === 'tablet' ? 'bg-muted' : 'hover:bg-muted/50'}
              `}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceSize('desktop')}
              aria-label="Desktop view"
              className={`
                p-2 transition-colors
                ${deviceSize === 'desktop' ? 'bg-muted' : 'hover:bg-muted/50'}
              `}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handleRefresh}
            aria-label="Refresh preview"
            className="p-2 hover:bg-muted rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenNewTab}
            aria-label="Open in new tab"
            className="p-2 hover:bg-muted rounded transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-4 bg-muted/30 flex items-center justify-center min-h-[400px]">
        {currentService?.status === 'running' ? (
          <div
            data-testid="iframe-container"
            className="bg-white rounded-lg shadow-lg overflow-hidden h-full"
            style={{ width: deviceSizes[deviceSize] }}
          >
            <iframe
              key={refreshKey}
              data-testid="preview-iframe"
              src={`${currentService.url}${refreshKey ? `?_t=${refreshKey}` : ''}`}
              className="w-full h-full min-h-[400px]"
              title={`${currentService.name} preview`}
            />
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground">
              Service is not running. Start the service to see preview.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
