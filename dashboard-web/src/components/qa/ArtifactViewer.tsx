import { useState } from 'react';
import { Image, Video, FileArchive, X } from 'lucide-react';

export interface Screenshot {
  name: string;
  url: string;
  timestamp: string;
}

export interface VideoArtifact {
  name: string;
  url: string;
  duration: string;
}

export interface TraceArtifact {
  name: string;
  url: string;
  size: string;
}

export interface Artifacts {
  screenshots: Screenshot[];
  videos: VideoArtifact[];
  traces: TraceArtifact[];
}

export interface ArtifactViewerProps {
  artifacts: Artifacts;
  className?: string;
}

type TabType = 'screenshots' | 'videos' | 'traces';

export function ArtifactViewer({
  artifacts,
  className = '',
}: ArtifactViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('screenshots');
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  const hasArtifacts =
    artifacts.screenshots.length > 0 ||
    artifacts.videos.length > 0 ||
    artifacts.traces.length > 0;

  if (!hasArtifacts) {
    return (
      <div
        data-testid="artifact-viewer"
        className={`bg-surface border border-border rounded-lg p-6 ${className}`}
      >
        <div data-testid="empty-state" className="text-center text-muted-foreground">
          <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No test artifacts available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="artifact-viewer"
      className={`bg-surface border border-border rounded-lg ${className}`}
    >
      {/* Tabs */}
      <div className="flex border-b border-border" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'screenshots'}
          onClick={() => setActiveTab('screenshots')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'screenshots'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Image className="w-4 h-4" />
          Screenshots ({artifacts.screenshots.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'videos'}
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'videos'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Video className="w-4 h-4" />
          Videos ({artifacts.videos.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'traces'}
          onClick={() => setActiveTab('traces')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'traces'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileArchive className="w-4 h-4" />
          Traces ({artifacts.traces.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'screenshots' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {artifacts.screenshots.map((screenshot) => (
              <button
                key={screenshot.name}
                onClick={() => setSelectedScreenshot(screenshot)}
                className="group relative aspect-video bg-muted rounded-lg overflow-hidden hover:ring-2 hover:ring-primary"
              >
                <img
                  src={screenshot.url}
                  alt={screenshot.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs p-2 truncate">
                  {screenshot.name}
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="space-y-3">
            {artifacts.videos.map((video) => (
              <div
                key={video.name}
                className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
              >
                <Video className="w-8 h-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{video.name}</p>
                  <p className="text-sm text-muted-foreground">{video.duration}</p>
                </div>
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
                >
                  Play
                </a>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'traces' && (
          <div className="space-y-3">
            {artifacts.traces.map((trace) => (
              <div
                key={trace.name}
                className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
              >
                <FileArchive className="w-8 h-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{trace.name}</p>
                  <p className="text-sm text-muted-foreground">{trace.size}</p>
                </div>
                <a
                  href={trace.url}
                  download
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          data-testid="artifact-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedScreenshot.url}
              alt={selectedScreenshot.name}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
