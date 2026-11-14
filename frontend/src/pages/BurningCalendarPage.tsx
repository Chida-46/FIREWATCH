import React, { useEffect, useState } from 'react';
import { CalendarHeatmap } from '../charts/CalendarHeatmap';
import { ClimatologyChart } from '../charts/ClimatologyChart';
import { RegionSelector } from '../components/RegionSelector';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import { CalendarCell, ClimatologyPoint } from '../types';
import { Calendar, Globe, X, Flame } from 'lucide-react';

interface BurningCalendarPageProps {
  currentRegion: string;
  currentSubdivision?: string;
  onSelectRegion: (country: string, subdivision?: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const BurningCalendarPage: React.FC<BurningCalendarPageProps> = ({
  currentRegion,
  currentSubdivision,
  onSelectRegion,
  onNavigateToTab
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [cells, setCells] = useState<CalendarCell[]>([]);
  const [climatology, setClimatology] = useState<ClimatologyPoint[]>([]);
  const [selectedCell, setSelectedCell] = useState<CalendarCell | null>(null);
  const [baselineYears, setBaselineYears] = useState<number | undefined>(undefined);

  const displayName = currentSubdivision ? `${currentSubdivision}, ${currentRegion}` : currentRegion;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getMonthlyCalendar(currentRegion, currentSubdivision, baselineYears),
      api.getClimatology(currentRegion, currentSubdivision, baselineYears)
    ])
      .then(([calRes, climRes]) => {
        if (!isMounted) return;
        setCells(calRes.cells || []);
        setClimatology(climRes.climatology || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load burning calendar:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentRegion, currentSubdivision, baselineYears]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-orange-950/30 via-[#0f172a] to-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Global Historical Burning Activity Calendar ({displayName})
            </h2>
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
              Signature Innovation
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            A continuous multi-decadal Year × Month fire climatology matrix harmonizing more than 20 years of MODIS and VIIRS satellite active fire records.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Baseline Window Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 font-medium">Baseline:</span>
            <select
              value={baselineYears || 'all'}
              onChange={(e) => {
                const val = e.target.value;
                setBaselineYears(val === 'all' ? undefined : Number(val));
              }}
              className="bg-transparent text-xs font-semibold text-orange-400 outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                Full Record (2003–2024)
              </option>
              <option value="10" className="bg-slate-900 text-slate-200">
                Previous 10 Years
              </option>
              <option value="5" className="bg-slate-900 text-slate-200">
                Previous 5 Years
              </option>
            </select>
          </div>

          <RegionSelector
            selectedRegion={currentRegion}
            selectedSubdivision={currentSubdivision}
            onSelectRegion={onSelectRegion}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message={`Synthesizing multi-decadal historical calendar matrix for ${displayName}...`} />
      ) : (
        <>
          {/* Main Year x Month Heatmap Matrix */}
          <CalendarHeatmap
            cells={cells}
            selectedCell={selectedCell}
            onSelectCell={(cell) => setSelectedCell(cell)}
          />

          {/* Monthly Climatology Baseline Curve */}
          <ClimatologyChart
            climatology={climatology}
            regionName={displayName}
          />
        </>
      )}

      {/* Selected Cell Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setSelectedCell(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <Flame className="w-6 h-6 text-orange-500" />
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedCell.month_name} {selectedCell.year} Fire Intelligence
                </h3>
                <span className="text-xs text-orange-400 font-mono">
                  Region: {displayName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Harmonized Activity:</span>
                <span className="text-xl font-bold font-mono text-white">
                  {selectedCell.count_harmonized.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Historical Median:</span>
                <span className="text-xl font-bold font-mono text-slate-300">
                  {selectedCell.historical_median.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">MODIS Detections (1 km):</span>
                <span className="text-base font-bold font-mono text-amber-400">
                  {selectedCell.count_modis.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">VIIRS Detections (375 m):</span>
                <span className="text-base font-bold font-mono text-orange-400">
                  {selectedCell.year >= 2012
                    ? selectedCell.count_viirs.toLocaleString()
                    : 'Pre-operational'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Mean / Max FRP:</span>
                <span className="text-base font-bold font-mono text-slate-200">
                  {selectedCell.mean_frp} / {selectedCell.max_frp} MW
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Calculated Anomaly:</span>
                <span
                  className={`text-base font-bold font-mono ${
                    selectedCell.anomaly_pct > 0 ? 'text-rose-400' : 'text-blue-400'
                  }`}
                >
                  {selectedCell.anomaly_pct > 0 ? '+' : ''}
                  {selectedCell.anomaly_pct.toFixed(1)}% ({selectedCell.anomaly_class})
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
              <b>Satellite Constellation:</b>{' '}
              {selectedCell.active_sensors && selectedCell.active_sensors.length > 0
                ? selectedCell.active_sensors.join(', ')
                : 'MODIS Terra & Aqua'}
              . Observations harmonized using NASA power-law sub-pixel calibration.
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setSelectedCell(null);
                  if (onNavigateToTab) onNavigateToTab('map');
                }}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-md shadow-orange-950/40"
              >
                Inspect on Live Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
