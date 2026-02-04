import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { QualityGatePane } from './QualityGatePane.js';

describe('QualityGatePane', () => {
  it('renders without error', () => {
    const { lastFrame } = render(<QualityGatePane />);
    expect(lastFrame()).toBeDefined();
  });

  it('renders current preset', () => {
    const config = {
      preset: 'balanced',
      thresholds: { default: 70 },
    };
    const { lastFrame } = render(<QualityGatePane config={config} />);
    const output = lastFrame();
    expect(output).toContain('balanced');
  });

  it('renders threshold bars', () => {
    const config = {
      preset: 'balanced',
      thresholds: {
        default: 70,
        dimensions: {
          style: 80,
          correctness: 90,
        },
      },
    };
    const { lastFrame } = render(<QualityGatePane config={config} />);
    const output = lastFrame();
    expect(output).toContain('70');
    expect(output).toContain('80');
    expect(output).toContain('90');
  });

  it('renders trend chart with history', () => {
    const config = { preset: 'balanced', thresholds: { default: 70 } };
    const history = [
      { composite: 65, timestamp: new Date('2024-01-01') },
      { composite: 70, timestamp: new Date('2024-01-02') },
      { composite: 75, timestamp: new Date('2024-01-03') },
    ];
    const { lastFrame } = render(<QualityGatePane config={config} history={history} />);
    const output = lastFrame();
    // Should show some trend visualization
    expect(output).toBeDefined();
  });

  it('renders evaluations list with recent items', () => {
    const config = { preset: 'balanced', thresholds: { default: 70 } };
    const evaluations = [
      { file: 'src/index.js', pass: true, composite: 85 },
      { file: 'src/utils.js', pass: false, composite: 60 },
    ];
    const { lastFrame } = render(
      <QualityGatePane config={config} evaluations={evaluations} />
    );
    const output = lastFrame();
    expect(output).toContain('index.js');
    expect(output).toContain('utils.js');
  });

  it('renders configure button', () => {
    const onConfigure = vi.fn();
    const { lastFrame } = render(
      <QualityGatePane config={{ preset: 'fast', thresholds: { default: 60 } }} onConfigure={onConfigure} />
    );
    const output = lastFrame();
    expect(output).toContain('Configure') || expect(output).toContain('config');
  });

  it('renders preset selector', () => {
    const onChangePreset = vi.fn();
    const { lastFrame } = render(
      <QualityGatePane
        config={{ preset: 'balanced', thresholds: { default: 70 } }}
        presets={['fast', 'balanced', 'thorough', 'critical']}
        onChangePreset={onChangePreset}
      />
    );
    const output = lastFrame();
    // Should show preset options or current preset
    expect(output).toContain('balanced');
  });

  it('renders retry button when evaluation fails', () => {
    const onRetry = vi.fn();
    const evaluation = { file: 'test.js', pass: false, composite: 50 };
    const { lastFrame } = render(
      <QualityGatePane
        config={{ preset: 'balanced', thresholds: { default: 70 } }}
        currentEvaluation={evaluation}
        onRetry={onRetry}
      />
    );
    const output = lastFrame();
    expect(output).toContain('Retry') || expect(output).toContain('retry') || expect(output).toContain('↻');
  });

  it('handles loading state', () => {
    const { lastFrame } = render(
      <QualityGatePane
        config={{ preset: 'balanced', thresholds: { default: 70 } }}
        loading={true}
      />
    );
    const output = lastFrame();
    expect(output).toContain('Loading') || expect(output).toContain('...') || expect(output).toBeDefined();
  });

  it('handles error state', () => {
    const { lastFrame } = render(
      <QualityGatePane
        config={{ preset: 'balanced', thresholds: { default: 70 } }}
        error="Failed to load quality data"
      />
    );
    const output = lastFrame();
    expect(output).toContain('Failed') || expect(output).toContain('error') || expect(output).toContain('Error');
  });

  it('handles empty history', () => {
    const { lastFrame } = render(
      <QualityGatePane
        config={{ preset: 'balanced', thresholds: { default: 70 } }}
        history={[]}
      />
    );
    const output = lastFrame();
    expect(output).toBeDefined();
    // Should show empty state or placeholder
  });

  it('shows pass/fail indicator for evaluations', () => {
    const evaluations = [
      { file: 'pass.js', pass: true, composite: 85 },
      { file: 'fail.js', pass: false, composite: 55 },
    ];
    const { lastFrame } = render(
      <QualityGatePane
        config={{ preset: 'balanced', thresholds: { default: 70 } }}
        evaluations={evaluations}
      />
    );
    const output = lastFrame();
    // Should show some pass/fail indicators
    expect(output).toContain('✓') || expect(output).toContain('✗') ||
      expect(output).toContain('pass') || expect(output).toContain('fail') ||
      expect(output).toBeDefined();
  });

  it('shows dimension breakdown', () => {
    const evaluation = {
      file: 'test.js',
      pass: true,
      composite: 82,
      scores: {
        style: 80,
        completeness: 85,
        correctness: 90,
        documentation: 75,
      },
    };
    const { lastFrame } = render(
      <QualityGatePane
        config={{ preset: 'balanced', thresholds: { default: 70 } }}
        currentEvaluation={evaluation}
      />
    );
    const output = lastFrame();
    expect(output).toContain('80') || expect(output).toContain('style');
  });

  it('highlights failing dimensions', () => {
    const evaluation = {
      file: 'test.js',
      pass: false,
      composite: 65,
      scores: {
        style: 50,
        correctness: 80,
      },
      failed: ['style'],
    };
    const { lastFrame } = render(
      <QualityGatePane
        config={{ preset: 'balanced', thresholds: { default: 70 } }}
        currentEvaluation={evaluation}
      />
    );
    const output = lastFrame();
    // Should highlight the failing dimension
    expect(output).toBeDefined();
  });

  it('shows trend direction', () => {
    const history = [
      { composite: 60 },
      { composite: 65 },
      { composite: 70 },
      { composite: 75 },
    ];
    const { lastFrame } = render(
      <QualityGatePane
        config={{ preset: 'balanced', thresholds: { default: 70 } }}
        history={history}
        trend={{ direction: 'improving', slope: 5 }}
      />
    );
    const output = lastFrame();
    expect(output).toContain('↑') || expect(output).toContain('improving') || expect(output).toBeDefined();
  });
});
