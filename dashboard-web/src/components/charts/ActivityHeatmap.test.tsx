/**
 * ActivityHeatmap Tests
 *
 * GitHub-style activity heatmap showing contribution intensity over time
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityHeatmap } from './ActivityHeatmap';

describe('ActivityHeatmap', () => {
  const sampleData = [
    { date: '2025-01-13', count: 5 },
    { date: '2025-01-14', count: 0 },
    { date: '2025-01-15', count: 12 },
    { date: '2025-01-16', count: 3 },
    { date: '2025-01-17', count: 8 },
    { date: '2025-01-18', count: 1 },
    { date: '2025-01-19', count: 0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('renders with sample data', () => {
    it('renders the heatmap container', () => {
      render(<ActivityHeatmap data={sampleData} />);

      expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument();
    });

    it('renders cells for each data point', () => {
      render(<ActivityHeatmap data={sampleData} />);

      const cells = screen.getAllByTestId(/^heatmap-cell-/);
      expect(cells.length).toBe(sampleData.length);
    });

    it('renders a title', () => {
      render(<ActivityHeatmap data={sampleData} />);

      expect(screen.getByText(/activity/i)).toBeInTheDocument();
    });
  });

  describe('intensity levels', () => {
    it('assigns no-activity level to zero count cells', () => {
      render(<ActivityHeatmap data={sampleData} />);

      const zeroCell = screen.getByTestId('heatmap-cell-2025-01-14');
      expect(zeroCell).toHaveAttribute('data-level', '0');
    });

    it('assigns higher level to higher count cells', () => {
      render(<ActivityHeatmap data={sampleData} />);

      const lowCell = screen.getByTestId('heatmap-cell-2025-01-18');
      const highCell = screen.getByTestId('heatmap-cell-2025-01-15');

      const lowLevel = Number(lowCell.getAttribute('data-level'));
      const highLevel = Number(highCell.getAttribute('data-level'));

      expect(highLevel).toBeGreaterThan(lowLevel);
    });

    it('uses 5 intensity levels (0-4)', () => {
      const wideRange = [
        { date: '2025-01-01', count: 0 },
        { date: '2025-01-02', count: 2 },
        { date: '2025-01-03', count: 5 },
        { date: '2025-01-04', count: 8 },
        { date: '2025-01-05', count: 15 },
      ];

      render(<ActivityHeatmap data={wideRange} />);

      const cells = screen.getAllByTestId(/^heatmap-cell-/);
      const levels = cells.map((c) => Number(c.getAttribute('data-level')));

      expect(Math.min(...levels)).toBe(0);
      expect(Math.max(...levels)).toBe(4);
    });
  });

  describe('handles empty data gracefully', () => {
    it('renders empty state when data is empty array', () => {
      render(<ActivityHeatmap data={[]} />);

      expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument();
      expect(screen.getByText(/no activity/i)).toBeInTheDocument();
    });

    it('does not render cells when data is empty', () => {
      render(<ActivityHeatmap data={[]} />);

      expect(screen.queryAllByTestId(/^heatmap-cell-/)).toHaveLength(0);
    });
  });

  describe('styling and layout', () => {
    it('accepts className prop', () => {
      render(<ActivityHeatmap data={sampleData} className="custom-heatmap" />);

      const heatmap = screen.getByTestId('activity-heatmap');
      expect(heatmap).toHaveClass('custom-heatmap');
    });

    it('cells have background color based on level', () => {
      render(<ActivityHeatmap data={sampleData} />);

      const cell = screen.getByTestId('heatmap-cell-2025-01-15');
      expect(cell.style.backgroundColor).toBeTruthy();
    });

    it('renders a legend showing intensity levels', () => {
      render(<ActivityHeatmap data={sampleData} />);

      expect(screen.getByTestId('heatmap-legend')).toBeInTheDocument();
    });
  });

  describe('tooltip', () => {
    it('cells have title attribute with date and count', () => {
      render(<ActivityHeatmap data={sampleData} />);

      const cell = screen.getByTestId('heatmap-cell-2025-01-13');
      const title = cell.getAttribute('title');
      expect(title).toContain('2025-01-13');
      expect(title).toContain('5');
    });
  });

  describe('handles various data scenarios', () => {
    it('handles single day data', () => {
      const singleDay = [{ date: '2025-01-13', count: 3 }];

      render(<ActivityHeatmap data={singleDay} />);

      const cells = screen.getAllByTestId(/^heatmap-cell-/);
      expect(cells).toHaveLength(1);
    });

    it('handles all zero counts', () => {
      const allZero = [
        { date: '2025-01-13', count: 0 },
        { date: '2025-01-14', count: 0 },
        { date: '2025-01-15', count: 0 },
      ];

      render(<ActivityHeatmap data={allZero} />);

      const cells = screen.getAllByTestId(/^heatmap-cell-/);
      cells.forEach((cell) => {
        expect(cell).toHaveAttribute('data-level', '0');
      });
    });

    it('handles 30 days of data', () => {
      const thirtyDays = Array.from({ length: 30 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        count: Math.floor(Math.random() * 20),
      }));

      render(<ActivityHeatmap data={thirtyDays} />);

      const cells = screen.getAllByTestId(/^heatmap-cell-/);
      expect(cells).toHaveLength(30);
    });

    it('handles very high counts', () => {
      const highCounts = [
        { date: '2025-01-13', count: 500 },
        { date: '2025-01-14', count: 1000 },
      ];

      render(<ActivityHeatmap data={highCounts} />);

      const cells = screen.getAllByTestId(/^heatmap-cell-/);
      expect(cells).toHaveLength(2);
      // Highest should be level 4
      expect(cells[1]).toHaveAttribute('data-level', '4');
    });
  });
});
