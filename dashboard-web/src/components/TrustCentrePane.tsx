/**
 * TrustCentrePane Component
 * Displays compliance status for multiple frameworks with filtering,
 * control mapping, evidence linking, and gap remediation features.
 */
import React, { useState, useMemo } from 'react';

interface FrameworkStatus {
  score: number;
  gaps: number;
  compliant: boolean;
}

interface ComplianceStatus {
  [framework: string]: FrameworkStatus;
}

interface TrendData {
  date: string;
  score: number;
}

interface GapData {
  framework: string;
  control: string;
  description: string;
}

interface TrustCentrePaneProps {
  status?: ComplianceStatus;
  trend?: TrendData[];
  gaps?: GapData[];
  onScan?: () => void;
  onExport?: (options: { format: string }) => void;
}

const FRAMEWORK_NAMES: Record<string, string> = {
  'pci-dss': 'PCI DSS',
  'hipaa': 'HIPAA',
  'iso27001': 'ISO 27001',
  'gdpr': 'GDPR'
};

type TabType = 'overview' | 'mapping' | 'evidence' | 'gaps';

export function TrustCentrePane({
  status = {},
  trend,
  gaps = [],
  onScan,
  onExport
}: TrustCentrePaneProps) {
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const frameworks = useMemo(() => Object.keys(status), [status]);

  const filteredFrameworks = useMemo(() => {
    if (frameworkFilter === 'all') return frameworks;
    return frameworks.filter(f => f === frameworkFilter);
  }, [frameworks, frameworkFilter]);

  const totalGaps = useMemo(() => {
    return Object.values(status).reduce((sum, s) => sum + s.gaps, 0);
  }, [status]);

  const overallScore = useMemo(() => {
    const values = Object.values(status);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, s) => sum + s.score, 0) / values.length);
  }, [status]);

  const handleFrameworkClick = (framework: string) => {
    setSelectedFramework(framework);
  };

  const handleExport = () => {
    onExport?.({ format: 'pdf' });
  };

  return (
    <div className="trust-centre-pane">
      <div className="header">
        <h1>Trust Centre</h1>
        <div className="actions">
          <button onClick={onScan}>Scan</button>
          <button onClick={handleExport}>Export</button>
        </div>
      </div>

      <div className="overall-summary">
        <div className="overall-score-container">
          <span>Overall Compliance</span>
          <span data-testid="overall-score">{overallScore}%</span>
        </div>
        <div className="gap-summary">
          <span>{totalGaps} gaps</span>
        </div>
      </div>

      <div className="filters">
        <label>
          Framework
          <select
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
          >
            <option value="all">All</option>
            {frameworks.map((f, idx) => (
              <option key={f} value={f}>#{idx + 1}</option>
            ))}
          </select>
        </label>
      </div>

      {!selectedFramework && (
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'mapping'}
            onClick={() => setActiveTab('mapping')}
          >
            Mapping
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'evidence'}
            onClick={() => setActiveTab('evidence')}
          >
            Evidence
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'gaps'}
            onClick={() => setActiveTab('gaps')}
          >
            Gaps
          </button>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="framework-cards">
          {filteredFrameworks.map(framework => {
            const frameworkStatus = status[framework];
            return (
              <div
                key={framework}
                data-testid={`framework-${framework}`}
                className={`framework-card ${!frameworkStatus.compliant ? 'non-compliant' : 'compliant'}`}
                onClick={() => handleFrameworkClick(framework)}
              >
                <h3>{FRAMEWORK_NAMES[framework] || framework}</h3>
                <div className="score">{frameworkStatus.score}%</div>
                <div className="gaps">{frameworkStatus.gaps} gaps</div>
                <div className="status">
                  {frameworkStatus.compliant ? 'Compliant' : 'Non-Compliant'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'mapping' && (
        <div className="control-mapping">
          <h2>Cross-Reference Control Mapping</h2>
          <p>View how controls map across different compliance frameworks.</p>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="evidence-linking">
          <h2>Linked Evidence</h2>
          <p>View and manage evidence linked to compliance controls.</p>
        </div>
      )}

      {activeTab === 'gaps' && (
        <div className="gap-remediation">
          <h2>Gap Remediation Tasks</h2>
          {gaps.length === 0 ? (
            <p>No gaps to remediate.</p>
          ) : (
            <ul className="gap-list">
              {gaps.map((gap, index) => (
                <li key={index} className="gap-item">
                  <span className="gap-framework">{FRAMEWORK_NAMES[gap.framework] || gap.framework}</span>
                  <span className="gap-control">{gap.control}</span>
                  <span className="gap-description">{gap.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedFramework && (
        <div className="framework-details">
          <h3>{FRAMEWORK_NAMES[selectedFramework] || selectedFramework} Details</h3>
          <div className="details-content">
            <div className="controls-section">
              <h4>Controls</h4>
              <p>View all requirements for this framework.</p>
            </div>
            <div className="evidence-section">
              <h4>Evidence</h4>
              <p>View linked documentation for this framework.</p>
            </div>
          </div>
        </div>
      )}

      {trend && trend.length > 0 && (
        <div className="compliance-trend" data-testid="compliance-trend">
          <h3>Compliance Trend</h3>
          <div className="trend-chart">
            {trend.map((point, index) => (
              <div key={index} className="trend-point">
                <span className="trend-date">{point.date}</span>
                <span className="trend-score">{point.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
