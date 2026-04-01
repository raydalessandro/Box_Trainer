/**
 * BOX TRAINER — Calendar Heatmap Component
 * Pure CSS grid heatmap showing last 90 days activity
 */

import { CalendarDay } from '@core/types';

interface CalendarHeatmapProps {
  data: CalendarDay[];
  onDayClick?: (day: CalendarDay) => void;
}

export function CalendarHeatmap({ data, onDayClick }: CalendarHeatmapProps) {
  // Group by week (7 days per row)
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  // Month labels (show when month changes)
  const monthLabels: { index: number; label: string }[] = [];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  let lastMonth = -1;
  data.forEach((day, index) => {
    const date = new Date(day.date);
    const month = date.getMonth();

    if (month !== lastMonth && index % 7 === 0) {
      monthLabels.push({ index: Math.floor(index / 7), label: months[month] });
      lastMonth = month;
    }
  });

  return (
    <div className="calendar-heatmap">
      {/* Month labels */}
      <div className="calendar-months">
        {monthLabels.map(({ index, label }) => (
          <div
            key={index}
            className="calendar-month-label"
            style={{ gridColumn: index + 1 }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="calendar-grid">
        {data.map((day) => (
          <div
            key={day.date}
            className={`calendar-day intensity-${day.intensity}`}
            onClick={() => onDayClick?.(day)}
            title={`${day.date}: ${day.sessionCount} ${day.sessionCount === 1 ? 'sessione' : 'sessioni'}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <span className="calendar-legend-label">Meno</span>
        <div className="calendar-legend-item intensity-none" />
        <div className="calendar-legend-item intensity-low" />
        <div className="calendar-legend-item intensity-medium" />
        <div className="calendar-legend-item intensity-high" />
        <span className="calendar-legend-label">Più</span>
      </div>
    </div>
  );
}
