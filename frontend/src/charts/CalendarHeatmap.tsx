import React, { useState } from 'react';
import { CalendarCell } from '../types';
import { Calendar, Info, Layers, CheckCircle } from 'lucide-react';

interface CalendarHeatmapProps {
  cells: CalendarCell[];
  onSelectCell?: (cell: CalendarCell) => void;
  selectedCell?: CalendarCell | null;
}

export type CalendarMetric =
  | 'harmonized'
  | 'modis'
  | 'viirs'
  | 'mean_frp'
  | 'anomaly_pct';

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  cells,
  onSelectCell,
  selectedCell
}) => {
  const [metric, setMetric] = useState<CalendarMetric>('harmonized');
  const [hoveredCell, setHoveredCell] = useState<CalendarCell | null>(null);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Extract unique years sorted in descending order (recent at top)
  const years = Array.from(new Set(cells.map((c) => c.year))).sort((a, b) => b - a);

  // Group cells by `year_month`
  const cellMap: Record<string, CalendarCell> = {};
  cells.forEach((c) => {
    cellMap[`${c.year}_${c.month}`] = c;
  });

  // Calculate dynamic maximums for appropriate color scaling
  const maxVal = Math.max(
    ...cells.map((c) => {
      if (metric === 'harmonized') return c.count_harmonized;
      if (metric === 'modis') return c.count_modis;
      if (metric === 'viirs') return c.count_viirs;
      if (metric === 'mean_frp') return c.mean_frp;
      return Math.abs(c.anomaly_pct);
    }),
    1.0
  );

  const getCellColor = (c?: CalendarCell) => {
    if (!c) return 'bg-slate-900/50';

    if (metric === 'anomaly_pct') {
      const a = c.anomaly_pct;
      if (a > 100) return 'bg-rose-700 text-white';
      if (a > 50) return 'bg-orange-600 text-white';
      if (a > 20) return 'bg-amber-600 text-slate-100';
      if (a >= -20) return 'bg-slate-800 text-slate-300';
      return 'bg-blue-900/70 text-slate-200';
    }

    let val = c.count_harmonized;
    if (metric === 'modis') val = c.count_modis;
    if (metric === 'viirs') val = c.count_viirs;
    if (metric === 'mean_frp') val = c.mean_frp;

    // Handle sensor non-availability before launch date
    if (metric === 'viirs' && c.year < 2012) {
      return 'bg-slate-950 text-slate-700 border border-slate-900/60 pattern-diagonal';
    }

    const ratio = Math.min(1.0, val / maxVal);
    if (ratio > 0.75) return 'bg-red-700 text-white font-semibold';
    if (ratio > 0.45) return 'bg-orange-600 text-white font-medium';
    if (ratio > 0.20) return 'bg-amber-500 text-slate-950 font-medium';
    if (ratio > 0.05) return 'bg-yellow-300 text-slate-950';
    return 'bg-amber-100/20 text-slate-400';
  };

  const getCellValue = (c?: CalendarCell) => {
    if (!c) return '-';
    if (metric === 'viirs' && c.year < 2012) return 'N/A';
    if (metric === 'anomaly_pct') return `${c.anomaly_pct > 0 ? '+' : ''}${Math.round(c.anomaly_pct)}%`;
    if (metric === 'mean_frp') return `${Math.round(c.mean_frp)}`;
    if (metric === 'modis') return `${c.count_modis > 999 ? (c.count_modis / 1000).toFixed(1) + 'k' : c.count_modis}`;
    if (metric === 'viirs') return `${c.count_viirs > 999 ? (c.count_viirs / 1000).toFixed(1) + 'k' : c.count_viirs}`;
    return c.count_harmonized > 999
      ? `${(c.count_harmonized / 1000).toFixed(1)}k`
      : `${Math.round(c.count_harmonized)}`;
  };

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-bold text-slate-100">
            Historical Burning Activity Calendar (Year × Month)
          </h2>
          <span className="text-xs bg-slate-800 text-orange-400 px-2 py-0.5 rounded font-mono">
            2003–2024
          </span>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setMetric('harmonized')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              metric === 'harmonized'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Harmonized Activity
          </button>
          <button
            onClick={() => setMetric('modis')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              metric === 'modis'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MODIS (1 km)
          </button>
          <button
            onClick={() => setMetric('viirs')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              metric === 'viirs'
                ? 'bg-orange-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            VIIRS (375 m)
          </button>
          <button
            onClick={() => setMetric('anomaly_pct')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              metric === 'anomaly_pct'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Anomaly %
          </button>
          <button
            onClick={() => setMetric('mean_frp')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              metric === 'mean_frp'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mean FRP
          </button>
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="overflow-x-auto pb-2">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr>
              <th className="p-1.5 text-xs font-semibold text-slate-400 text-left w-14">Year</th>
              {months.map((m) => (
                <th key={m} className="p-1.5 text-xs font-semibold text-slate-400 min-w-[52px]">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr} className="hover:bg-slate-800/20">
                <td className="py-1 px-1.5 text-xs font-mono font-bold text-slate-300 text-left">
                  {yr}
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => {
                  const cell = cellMap[`${yr}_${mo}`];
                  const isSelected = selectedCell && selectedCell.year === yr && selectedCell.month === mo;
                  return (
                    <td key={`${yr}-${mo}`} className="p-0.5">
                      <button
                        onClick={() => cell && onSelectCell && onSelectCell(cell)}
                        onMouseEnter={() => cell && setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`w-full h-8 rounded text-[11px] font-mono transition-transform duration-100 flex items-center justify-center cursor-pointer select-none ${getCellColor(
                          cell
                        )} ${
                          isSelected
                            ? 'ring-2 ring-white scale-105 z-10'
                            : 'hover:scale-105 hover:ring-1 hover:ring-amber-300'
                        }`}
                      >
                        {getCellValue(cell)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Tooltip & Details Bar */}
      <div className="min-h-[64px] bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between text-xs">
        {hoveredCell || selectedCell ? (
          (() => {
            const c = hoveredCell || selectedCell!;
            return (
              <div className="w-full flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-sm text-white font-mono">
                    {c.month_name} {c.year}
                  </span>
                  <span className="text-orange-400 font-bold font-mono">
                    Harmonized: {c.count_harmonized.toLocaleString()}
                  </span>
                  <span className="text-amber-400 font-mono">
                    MODIS: {c.count_modis.toLocaleString()}
                  </span>
                  <span className="text-orange-300 font-mono">
                    VIIRS: {c.year >= 2012 ? c.count_viirs.toLocaleString() : 'N/A (Pre-2012)'}
                  </span>
                  <span className="text-slate-300 font-mono">
                    FRP: {c.mean_frp} MW (max: {c.max_frp} MW)
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-slate-400">
                    Hist. Median: <b className="text-slate-200">{c.historical_median}</b>
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded ${
                      c.anomaly_pct > 20
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : c.anomaly_pct < -20
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Anomaly: {c.anomaly_pct > 0 ? '+' : ''}
                    {c.anomaly_pct.toFixed(1)}% ({c.anomaly_class})
                  </span>
                  {c.completeness < 1.0 && (
                    <span className="bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                      Partial Month
                    </span>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex items-center space-x-2 text-slate-400">
            <Info className="w-4 h-4 text-orange-400" />
            <span>Hover over any calendar cell to inspect sensor breakdown, median baselines, and historical anomalies. Click to view on map.</span>
          </div>
        )}
      </div>

      {/* Accessible Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span>Relative Activity:</span>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-3 rounded bg-amber-100/20 text-[9px] text-center" />
            <span className="text-[11px]">Very Low</span>
            <span className="w-4 h-3 rounded bg-yellow-300" />
            <span className="w-4 h-3 rounded bg-amber-500" />
            <span className="text-[11px]">Moderate</span>
            <span className="w-4 h-3 rounded bg-orange-600" />
            <span className="w-4 h-3 rounded bg-red-700" />
            <span className="text-[11px]">Extreme Peak</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-slate-950 border border-slate-800 rounded" />
          <span className="text-[11px]">Pre-2012 (VIIRS Not in Orbit)</span>
        </div>
      </div>
    </div>
  );
};
