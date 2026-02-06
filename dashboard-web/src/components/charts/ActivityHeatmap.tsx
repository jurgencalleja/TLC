/**
 * ActivityHeatmap Component
 *
 * GitHub-style activity heatmap showing contribution intensity over time.
 */

interface ActivityDataPoint {
  date: string;
  count: number;
}

export interface ActivityHeatmapProps {
  data: ActivityDataPoint[];
  className?: string;
}

/** Map a count to intensity level 0-4 based on the max count in the dataset */
function getLevel(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const LEVEL_COLORS = [
  '#ebedf0', // 0 - no activity
  '#9be9a8', // 1 - low
  '#40c463', // 2 - medium
  '#30a14e', // 3 - high
  '#216e39', // 4 - highest
];

export function ActivityHeatmap({ data, className = '' }: ActivityHeatmapProps) {
  if (data.length === 0) {
    return (
      <div data-testid="activity-heatmap" className={`activity-heatmap ${className}`.trim()}>
        <h3>Activity</h3>
        <p>No activity data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div data-testid="activity-heatmap" className={`activity-heatmap ${className}`.trim()}>
      <h3>Activity</h3>
      <div className="heatmap-grid" style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {data.map((point) => {
          const level = getLevel(point.count, maxCount);
          return (
            <div
              key={point.date}
              data-testid={`heatmap-cell-${point.date}`}
              data-level={String(level)}
              title={`${point.date}: ${point.count} contributions`}
              style={{
                width: 12,
                height: 12,
                backgroundColor: LEVEL_COLORS[level],
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
      <div data-testid="heatmap-legend" className="heatmap-legend" style={{ display: 'flex', gap: 2, marginTop: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12 }}>Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        ))}
        <span style={{ fontSize: 12 }}>More</span>
      </div>
    </div>
  );
}

export default ActivityHeatmap;
