import React, { useEffect, useState } from 'react';
import { TrendChart } from '../charts/TrendChart';
import { RegionSelector } from '../components/RegionSelector';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import { CalendarCell } from '../types';
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  Globe,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface AnalyticsProps {
  currentRegion: string;
  currentSubdivision?: string;
  onSelectRegion: (country: string, subdivision?: string) => void;
}

export const HistoricalAnalyticsPage: React.FC<AnalyticsProps> = ({
  currentRegion,
  currentSubdivision,
  onSelectRegion
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [trends, setTrends] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<CalendarCell[]>([]);
  const [frpData, setFRPData] = useState<any>(null);

  const displayName = currentSubdivision ? `${currentSubdivision}, ${currentRegion}` : currentRegion;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getTrends(currentRegion, currentSubdivision),
      api.getAnomalies(currentRegion, currentSubdivision, 12),
      api.getFRPAnalytics(currentRegion, currentSubdivision)
    ])
      .then(([trendsRes, anomaliesRes, frpRes]) => {
        if (!isMounted) return;
        setTrends(trendsRes);
        setAnomalies(anomaliesRes.top_anomalies || []);
        setFRPData(frpRes);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading analytics:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentRegion, currentSubdivision]);

  if (loading || !trends || !frpData) {
    return <LoadingSpinner message={`Calculating climatological anomalies and statistical baselines for ${displayName}...`} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#090d16] p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Historical Climatological Analytics & Anomaly Detection ({displayName})
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Statistical comparisons against multi-decadal historical medians, trend regression, and radiative energy distribution.
          </p>
        </div>

        <RegionSelector
          selectedRegion={currentRegion}
          selectedSubdivision={currentSubdivision}
          onSelectRegion={onSelectRegion}
        />
      </div>

      {/* Annual Trend with Direction Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TrendChart
            data={trends.annual_data}
            title={`Long-Term Annual Fire Trajectory (${displayName})`}
            showNaiveDivergence={false}
          />
        </div>

        <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-lg text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-2">Trend Direction & Slope</h3>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Trajectory:</span>
                <span className="font-bold text-orange-400 uppercase tracking-wide">
                  {trends.trend_direction}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slope per Year:</span>
                <span className="font-mono text-white font-bold">
                  {trends.trend_slope_per_year > 0 ? '+' : ''}
                  {trends.trend_slope_per_year} hotspots/yr
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Baseline Window:</span>
                <span className="font-mono text-slate-300">2003–2024 (22 yrs)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-200">Anomaly Classification Standards</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between p-1.5 rounded bg-rose-950/60 border border-rose-900/60 text-rose-300">
                <span>Extreme Activity:</span>
                <span className="font-mono font-bold">&gt; +100% of median</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-orange-950/60 border border-orange-900/60 text-orange-300">
                <span>Significantly Above Normal:</span>
                <span className="font-mono font-bold">+50% to +100%</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-amber-950/60 border border-amber-900/60 text-amber-300">
                <span>Above Normal:</span>
                <span className="font-mono font-bold">+20% to +50%</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                <span>Normal Fluctuation:</span>
                <span className="font-mono font-bold">-20% to +20%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Extreme Anomalies Table */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-100">
              Highest Recorded Monthly Anomalies ({displayName})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Ranked by Deviation from Historical Median</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Period</th>
                <th className="py-2 px-3">Harmonized Activity</th>
                <th className="py-2 px-3">Historical Median</th>
                <th className="py-2 px-3">Deviation (%)</th>
                <th className="py-2 px-3">Classification</th>
                <th className="py-2 px-3">Mean FRP</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a, i) => (
                <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white font-mono">
                    {a.month_name} {a.year}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-200">
                    {a.count_harmonized.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {a.historical_median.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span
                      className={
                        a.anomaly_pct > 50
                          ? 'text-rose-400'
                          : a.anomaly_pct > 20
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }
                    >
                      {a.anomaly_pct > 0 ? '+' : ''}
                      {a.anomaly_pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                      {a.anomaly_class}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{a.mean_frp} MW</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fire Radiative Power (FRP) Energy Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-100">
                Fire Radiative Power (FRP) Distribution ({displayName})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Mean: {frpData.mean_frp} MW | Max: {frpData.max_frp} MW
            </span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frpData.distribution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]}>
                  {frpData.distribution.map((_item: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0
                          ? '#fde047'
                          : index === 1
                          ? '#f59e0b'
                          : index === 2
                          ? '#ea580c'
                          : '#dc2626'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scientific Note */}
        <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-3 text-xs">
          <div className="flex items-center space-x-2 text-orange-400 font-bold">
            <Info className="w-4 h-4" />
            <span>FRP vs Burned Area Principle</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {frpData.scientific_note}
          </p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 text-[11px] leading-normal">
            <b>Global Sensor Differences:</b> MODIS typically detects fires with FRP &gt; 5–10 MW. VIIRS 375 m I-bands can resolve smaller, cooler flaming fires down to 0.5–1 MW, explaining VIIRS's higher count frequency in low-FRP bins globally.
          </div>
        </div>
      </div>
    </div>
  );
};
