/**
 * SecurityScanPane Component
 * Displays security scan results with filtering, risk score, and export capabilities
 */
import React, { useState, useMemo } from 'react';

interface Finding {
  id: string;
  type: 'sast' | 'dast' | 'deps' | 'secrets';
  rule?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file?: string;
  line?: number;
  url?: string;
  package?: string;
  version?: string;
}

interface GateStatus {
  passed: boolean;
  reason?: string;
}

interface ExportOptions {
  format: string;
}

interface SecurityScanPaneProps {
  findings?: Finding[];
  riskScore?: number;
  scanning?: boolean;
  scanProgress?: number;
  gateStatus?: GateStatus;
  onScan?: () => void;
  onExport?: (options: ExportOptions) => void;
}

export function SecurityScanPane({
  findings = [],
  riskScore,
  scanning = false,
  scanProgress = 0,
  gateStatus,
  onScan,
  onExport,
}: SecurityScanPaneProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const filteredFindings = useMemo(() => {
    return findings.filter((finding) => {
      if (severityFilter !== 'all' && finding.severity !== severityFilter) {
        return false;
      }
      if (typeFilter !== 'all' && finding.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [findings, severityFilter, typeFilter]);

  const severityBreakdown = useMemo(() => {
    const breakdown = { critical: 0, high: 0, medium: 0, low: 0 };
    findings.forEach((finding) => {
      if (finding.severity in breakdown) {
        breakdown[finding.severity]++;
      }
    });
    return breakdown;
  }, [findings]);

  const handleExport = () => {
    if (onExport) {
      onExport({ format: 'json' });
    }
  };

  const renderFindingDetails = (finding: Finding) => {
    if (finding.file && finding.line !== undefined) {
      return `${finding.file}:${finding.line}`;
    }
    if (finding.url) {
      return finding.url;
    }
    if (finding.package && finding.version) {
      return `${finding.package}@${finding.version}`;
    }
    return '';
  };

  return (
    <div className="security-scan-pane">
      <h2>Security Scan</h2>

      {/* Scan Types */}
      <div className="scan-types">
        <span>SAST</span>
        <span>DAST</span>
        <span>Dependencies</span>
        <span>Secrets</span>
      </div>

      {/* Risk Score */}
      {riskScore !== undefined && (
        <div className="risk-score">
          <span>Risk Score</span>
          <span className="score-value">{riskScore}</span>
        </div>
      )}

      {/* Gate Status */}
      {gateStatus && (
        <div className="gate-status">
          <span>Gate: {gateStatus.passed ? 'Passed' : 'Failed'}</span>
          {gateStatus.reason && <span>{gateStatus.reason}</span>}
        </div>
      )}

      {/* Severity Breakdown */}
      {findings.length > 0 && (
        <div className="severity-breakdown">
          <span>Critical: {severityBreakdown.critical}</span>
          <span>High: {severityBreakdown.high}</span>
          <span>Medium: {severityBreakdown.medium}</span>
          <span>Low: {severityBreakdown.low}</span>
        </div>
      )}

      {/* Scan Controls */}
      <div className="scan-controls">
        {onScan && (
          <button onClick={onScan} disabled={scanning}>
            Run Scan
          </button>
        )}
        {onExport && findings.length > 0 && (
          <button onClick={handleExport}>Export</button>
        )}
      </div>

      {/* Scan Progress */}
      {scanning && (
        <div className="scan-progress">
          <progress role="progressbar" value={scanProgress} max={100} />
          <span>{scanProgress}%</span>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <label>
          Severity
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>
          Type
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="sast">Static Analysis</option>
            <option value="dast">Dynamic Analysis</option>
            <option value="deps">Dependency Scan</option>
            <option value="secrets">Secret Detection</option>
          </select>
        </label>
      </div>

      {/* Findings List */}
      <div className="findings-list">
        {filteredFindings.map((finding) => (
          <div
            key={finding.id}
            className={`finding finding-${finding.severity}`}
            onClick={() => setSelectedFinding(selectedFinding?.id === finding.id ? null : finding)}
          >
            <span className="finding-type">{finding.type.toUpperCase()}</span>
            <span className="finding-rule">{finding.rule || finding.package}</span>
            <span className="finding-severity">{finding.severity}</span>
            {selectedFinding?.id === finding.id && (
              <div className="finding-details">
                {renderFindingDetails(finding)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
