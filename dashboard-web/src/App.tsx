import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout';

function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
      <p className="text-text-secondary mt-2">Welcome to TLC Dashboard v2.0</p>
    </div>
  );
}

function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Dashboard />} />
        <Route path="/tasks" element={<Dashboard />} />
        <Route path="/logs" element={<Dashboard />} />
        <Route path="/settings" element={<Dashboard />} />
      </Routes>
    </Shell>
  );
}

export default App;
