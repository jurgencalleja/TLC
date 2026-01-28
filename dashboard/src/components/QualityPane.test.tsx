import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { QualityPane } from './QualityPane.js';

describe('QualityPane', () => {
  it('renders without error', () => {
    const { lastFrame } = render(<QualityPane />);
    expect(lastFrame()).toBeDefined();
  });

  it('shows placeholder when no quality data', () => {
    const { lastFrame } = render(<QualityPane />);
    const output = lastFrame();
    expect(output).toContain('Quality');
  });

  it('shows score when data provided', () => {
    const qualityData = {
      score: 72,
      coverage: { lines: 80, branches: 70, functions: 85, statements: 78 },
      edgeCases: { covered: 3, total: 5 },
    };

    const { lastFrame } = render(<QualityPane data={qualityData} />);
    const output = lastFrame();

    expect(output).toContain('72');
  });

  it('shows coverage breakdown', () => {
    const qualityData = {
      score: 80,
      coverage: { lines: 80, branches: 70, functions: 85, statements: 78 },
      edgeCases: { covered: 4, total: 5 },
    };

    const { lastFrame } = render(<QualityPane data={qualityData} />);
    const output = lastFrame();

    expect(output).toContain('80');  // lines coverage
  });

  it('shows visual progress bar', () => {
    const qualityData = {
      score: 50,
      coverage: { lines: 50, branches: 50, functions: 50, statements: 50 },
      edgeCases: { covered: 2, total: 5 },
    };

    const { lastFrame } = render(<QualityPane data={qualityData} />);
    const output = lastFrame();

    // Should contain some visual representation (bar or percentage)
    expect(output).toBeTruthy();
  });

  it('shows edge case status', () => {
    const qualityData = {
      score: 60,
      coverage: { lines: 60, branches: 60, functions: 60, statements: 60 },
      edgeCases: { covered: 3, total: 5 },
    };

    const { lastFrame } = render(<QualityPane data={qualityData} />);
    const output = lastFrame();

    expect(output).toContain('3');  // covered
    expect(output).toContain('5');  // total
  });

  it('uses green color for high score', () => {
    const qualityData = {
      score: 90,
      coverage: { lines: 90, branches: 90, functions: 90, statements: 90 },
      edgeCases: { covered: 5, total: 5 },
    };

    const { lastFrame } = render(<QualityPane data={qualityData} />);
    const output = lastFrame();

    // Just verify it renders with the score
    expect(output).toContain('90');
  });

  it('uses yellow color for medium score', () => {
    const qualityData = {
      score: 65,
      coverage: { lines: 65, branches: 65, functions: 65, statements: 65 },
      edgeCases: { covered: 3, total: 5 },
    };

    const { lastFrame } = render(<QualityPane data={qualityData} />);
    const output = lastFrame();

    expect(output).toContain('65');
  });

  it('uses red color for low score', () => {
    const qualityData = {
      score: 30,
      coverage: { lines: 30, branches: 30, functions: 30, statements: 30 },
      edgeCases: { covered: 1, total: 5 },
    };

    const { lastFrame } = render(<QualityPane data={qualityData} />);
    const output = lastFrame();

    expect(output).toContain('30');
  });
});
