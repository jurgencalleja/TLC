import { useEffect, useState, useCallback } from 'react';
import { useUIStore } from '../stores';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { RefreshCw, Play, Square, RotateCw, Box, HardDrive, Database } from 'lucide-react';

interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: { private: number; public: number; type: string }[];
  created: number;
  labels: Record<string, string>;
}

interface DockerImage {
  id: string;
  tags: string[];
  size: number;
  created: number;
}

interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
}

type Tab = 'containers' | 'images' | 'volumes';

const API_BASE = '';

function statusBadge(state: string) {
  const variant = state === 'running' ? 'success' : state === 'exited' ? 'danger' : 'warning';
  return <Badge variant={variant}>{state}</Badge>;
}

function formatSize(bytes: number) {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(1)} KB`;
}

export function DockerPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const [tab, setTab] = useState<Tab>('containers');
  const [containers, setContainers] = useState<Container[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveView('docker');
  }, [setActiveView]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await fetch(`${API_BASE}/api/docker/status`);
      if (statusRes.status === 503) {
        setAvailable(false);
        setLoading(false);
        return;
      }
      setAvailable(true);

      const [cRes, iRes, vRes] = await Promise.all([
        fetch(`${API_BASE}/api/docker/containers?all=true`),
        fetch(`${API_BASE}/api/docker/images`),
        fetch(`${API_BASE}/api/docker/volumes`),
      ]);
      setContainers(await cRes.json());
      setImages(await iRes.json());
      setVolumes(await vRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Docker data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const containerAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    await fetch(`${API_BASE}/api/docker/containers/${id}/${action}`, { method: 'POST' });
    fetchData();
  };

  if (!available) {
    return (
      <div className="h-full overflow-auto p-6">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Docker</h1>
        <Card className="p-8 text-center">
          <Box className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
          <h2 className="text-lg font-medium mb-2">Docker Not Available</h2>
          <p className="text-text-secondary mb-4">
            Mount the Docker socket to enable container management:
          </p>
          <code className="block bg-bg-secondary p-3 rounded text-sm">
            -v /var/run/docker.sock:/var/run/docker.sock
          </code>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Docker</h1>
        <Button variant="ghost" onClick={fetchData} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {(['containers', 'images', 'volumes'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'containers' && <Box className="w-4 h-4 inline mr-1" />}
            {t === 'images' && <HardDrive className="w-4 h-4 inline mr-1" />}
            {t === 'volumes' && <Database className="w-4 h-4 inline mr-1" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="ml-1 text-text-secondary">
              ({t === 'containers' ? containers.length : t === 'images' ? images.length : volumes.length})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="text-text-secondary">Loading...</div>}
      {error && <div className="text-danger">{error}</div>}

      {/* Containers tab */}
      {tab === 'containers' && !loading && (
        <div className="space-y-2">
          {containers.map((c) => (
            <Card key={c.id} className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary">{c.name}</span>
                  {statusBadge(c.state)}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  {c.image} &middot; {c.status}
                  {c.ports.length > 0 && (
                    <span> &middot; {c.ports.map(p => `${p.public}:${p.private}`).join(', ')}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {c.state !== 'running' && (
                  <Button size="sm" variant="ghost" onClick={() => containerAction(c.id, 'start')}>
                    <Play className="w-3 h-3" />
                  </Button>
                )}
                {c.state === 'running' && (
                  <Button size="sm" variant="ghost" onClick={() => containerAction(c.id, 'stop')}>
                    <Square className="w-3 h-3" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => containerAction(c.id, 'restart')}>
                  <RotateCw className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
          {containers.length === 0 && (
            <div className="text-text-secondary text-center py-8">No containers found</div>
          )}
        </div>
      )}

      {/* Images tab */}
      {tab === 'images' && !loading && (
        <div className="space-y-2">
          {images.map((img) => (
            <Card key={img.id} className="p-4">
              <span className="font-medium text-text-primary">{img.tags.join(', ') || '<untagged>'}</span>
              <span className="text-sm text-text-secondary ml-2">{formatSize(img.size)}</span>
            </Card>
          ))}
        </div>
      )}

      {/* Volumes tab */}
      {tab === 'volumes' && !loading && (
        <div className="space-y-2">
          {volumes.map((vol) => (
            <Card key={vol.name} className="p-4">
              <span className="font-medium text-text-primary">{vol.name}</span>
              <span className="text-sm text-text-secondary ml-2">{vol.driver}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
