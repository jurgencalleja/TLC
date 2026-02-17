import { useEffect, useState, useCallback } from 'react';
import { useUIStore } from '../stores';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { RefreshCw, Plus, Server, Wifi, Trash2, Shield } from 'lucide-react';

interface VpsServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  domain: string;
  provider: string;
  pool: boolean;
  assignedProjects: string[];
  status: string;
  bootstrapped: boolean;
  lastChecked: string | null;
}

const API_BASE = '';

export function VpsPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const [servers, setServers] = useState<VpsServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', host: '', username: 'deploy', port: 22, privateKeyPath: '~/.ssh/id_rsa', domain: '' });
  const [testing, setTesting] = useState<string | null>(null);
  useEffect(() => {
    setActiveView('vps');
  }, [setActiveView]);

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/vps/servers`);
      setServers(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  const addServer = async () => {
    const res = await fetch(`${API_BASE}/api/vps/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      setShowAdd(false);
      setAddForm({ name: '', host: '', username: 'deploy', port: 22, privateKeyPath: '~/.ssh/id_rsa', domain: '' });
      fetchServers();
    }
  };

  const testConnection = async (id: string) => {
    setTesting(id);
    try {
      await fetch(`${API_BASE}/api/vps/servers/${id}/test`, { method: 'POST' });
      fetchServers();
    } catch {} finally {
      setTesting(null);
    }
  };

  const deleteServer = async (id: string) => {
    await fetch(`${API_BASE}/api/vps/servers/${id}`, { method: 'DELETE' });
    fetchServers();
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">VPS Servers</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchServers} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
          <Button onClick={() => setShowAdd(!showAdd)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Server
          </Button>
        </div>
      </div>

      {/* Add server form */}
      {showAdd && (
        <Card className="p-4 mb-6">
          <h3 className="font-medium mb-3">Register New VPS</h3>
          <div className="grid grid-cols-2 gap-3">
            <input className="border border-border rounded px-3 py-2 bg-bg-secondary text-text-primary" placeholder="Name (e.g. dev-1)" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
            <input className="border border-border rounded px-3 py-2 bg-bg-secondary text-text-primary" placeholder="Host / IP" value={addForm.host} onChange={e => setAddForm({ ...addForm, host: e.target.value })} />
            <input className="border border-border rounded px-3 py-2 bg-bg-secondary text-text-primary" placeholder="Username" value={addForm.username} onChange={e => setAddForm({ ...addForm, username: e.target.value })} />
            <input className="border border-border rounded px-3 py-2 bg-bg-secondary text-text-primary" placeholder="Domain (optional)" value={addForm.domain} onChange={e => setAddForm({ ...addForm, domain: e.target.value })} />
            <input className="border border-border rounded px-3 py-2 bg-bg-secondary text-text-primary" placeholder="SSH Key Path" value={addForm.privateKeyPath} onChange={e => setAddForm({ ...addForm, privateKeyPath: e.target.value })} />
            <input className="border border-border rounded px-3 py-2 bg-bg-secondary text-text-primary" placeholder="Port" type="number" value={addForm.port} onChange={e => setAddForm({ ...addForm, port: parseInt(e.target.value) || 22 })} />
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={addServer}>Save</Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {loading && <div className="text-text-secondary">Loading...</div>}

      {/* Server list */}
      {!loading && servers.length === 0 && (
        <Card className="p-8 text-center">
          <Server className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
          <h2 className="text-lg font-medium mb-2">No VPS Servers</h2>
          <p className="text-text-secondary mb-4">Register a VPS to start deploying your projects.</p>
          <Button onClick={() => setShowAdd(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Server
          </Button>
        </Card>
      )}

      {!loading && servers.map((s) => (
        <Card key={s.id} className="p-4 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-text-secondary" />
                <span className="font-medium text-text-primary">{s.name}</span>
                <Badge variant={s.status === 'online' ? 'success' : 'warning'}>
                  {s.status}
                </Badge>
                {s.pool && <Badge variant="neutral">pool</Badge>}
                {s.bootstrapped && (
                  <Badge variant="success">
                    <Shield className="w-3 h-3 mr-1 inline" />bootstrapped
                  </Badge>
                )}
              </div>
              <div className="text-sm text-text-secondary mt-1">
                {s.username}@{s.host}:{s.port}
                {s.domain && <span> &middot; {s.domain}</span>}
                {s.assignedProjects.length > 0 && (
                  <span> &middot; {s.assignedProjects.length} project(s)</span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => testConnection(s.id)} disabled={testing === s.id}>
                {testing === s.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteServer(s.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
