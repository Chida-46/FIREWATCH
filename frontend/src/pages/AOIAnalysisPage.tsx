import React, { useEffect, useState } from 'react';
import { RegionSelector } from '../components/RegionSelector';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { KPICard } from '../components/KPICard';
import { api } from '../services/api';
import { AOIAnalysisSummary, CountryCatalogItem } from '../types';
import {
  Crop,
  ArrowRightLeft,
  Flame,
  Activity,
  Calendar,
  Zap,
  Globe,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface AOIPageProps {
  currentRegion: string;
  currentSubdivision?: string;
  onSelectRegion: (country: string, subdivision?: string) => void;
}

export const AOIAnalysisPage: React.FC<AOIPageProps> = ({
  currentRegion,
  currentSubdivision,
  onSelectRegion
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<AOIAnalysisSummary | null>(null);
  const [countriesList, setCountriesList] = useState<string[]>([]);

  // Dual AOI comparison state
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareRegionB, setCompareRegionB] = useState<string>('Brazil');
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  useEffect(() => {
    fetch('/data/countries_catalog.json')
      .then((res) => res.json())
      .then((data: CountryCatalogItem[]) => {
        if (Array.isArray(data)) {
          setCountriesList(data.map((c) => c.name).filter((n) => n !== 'Global (Worldwide)'));
        }
      })
      .catch((e) => console.warn('Could not load countries for comparison:', e));
  }, []);

  const displayName = currentSubdivision ? `${currentSubdivision}, ${currentRegion}` : currentRegion;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.analyzeAOI(currentRegion, currentSubdivision)
      .then((res) => {
        if (!isMounted) return;
        setSummary(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading AOI stats:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentRegion, currentSubdivision]);

  const handleRunComparison = () => {
    const regionA = currentRegion === 'Global' ? 'United States' : currentRegion;
    setLoading(true);
    api.compareAOI(regionA, compareRegionB)
      .then((res) => {
        setComparisonResult(res);
        setIsComparing(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Comparison error:', err);
        setLoading(false);
      });
  };

  if (loading && !summary) {
    return <LoadingSpinner message={`Calculating comprehensive statistics and seasonal profile for ${displayName}...`} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#090d16] p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Crop className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Global Area of Interest (AOI) Deep Analysis ({displayName})
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Targeted regional analytics, seasonal burning climax, multi-sensor detection shares, and international comparative analysis.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <RegionSelector
            selectedRegion={currentRegion}
            selectedSubdivision={currentSubdivision}
            onSelectRegion={onSelectRegion}
          />
        </div>
      </div>

      {summary && (
        <>
          {/* Natural Language Synthesis Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-orange-950/40 via-slate-900 to-slate-900 border border-orange-900/60 text-xs text-slate-200 leading-relaxed flex items-start space-x-3 shadow-lg">
            <div className="p-2 rounded-lg bg-orange-600/30 text-orange-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-white text-sm block">
                Regional Intelligence Report ({summary.region_name}):
              </span>
              <p className="text-slate-300">{summary.natural_language_summary}</p>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Observations"
              value={summary.total_detections.toLocaleString()}
              subtitle={`MODIS: ${summary.modis_detections.toLocaleString()} | VIIRS: ${summary.viirs_detections.toLocaleString()}`}
              icon={Flame}
            />
            <KPICard
              title="Harmonized Activity"
              value={Math.round(summary.harmonized_activity_index).toLocaleString()}
              subtitle="Calibrated joint baseline"
              badge={{ text: 'Calibrated', variant: 'positive' }}
              icon={Activity}
            />
            <KPICard
              title="Peak Burning Season"
              value={summary.highest_month}
              subtitle={`Historical record peak: Year ${summary.highest_year}`}
              icon={Calendar}
            />
            <KPICard
              title="Mean / Max FRP"
              value={`${summary.mean_frp} / ${summary.max_frp} MW`}
              subtitle="Radiative heat release intensity"
              icon={Zap}
            />
          </div>

          {/* Monthly Climatology Bar Chart */}
          <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <h3 className="text-sm font-bold text-slate-100">
              Monthly Burning Distribution Baseline ({summary.region_name})
            </h3>
            <p className="text-xs text-slate-400">
              Historical median and average hotspot detections across January–December.
            </p>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.monthly_averages} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month_name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="median_count" name="Historical Median" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mean_count" name="Historical Average" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Dual Country Comparison Section */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-100">International Dual-Country Comparison</h3>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Compare with:</span>
            <select
              value={compareRegionB}
              onChange={(e) => setCompareRegionB(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none max-w-[200px]"
            >
              {(countriesList.length > 0 ? countriesList : ["United States", "Brazil", "Australia", "Canada", "Germany", "France", "Japan", "South Africa", "Indonesia", "India", "Nigeria", "Argentina"]).filter((r) => r !== currentRegion).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={handleRunComparison}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded font-medium shadow-sm transition-colors"
            >
              Compare
            </button>
          </div>
        </div>

        {isComparing && comparisonResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="font-bold text-base text-orange-400 block">
                {comparisonResult.region_a.region_name}
              </span>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span>Harmonized Activity:</span>
                  <span className="font-mono font-bold text-white">
                    {Math.round(comparisonResult.region_a.harmonized_activity_index).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Peak Month:</span>
                  <span className="font-mono">{comparisonResult.region_a.highest_month}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mean FRP:</span>
                  <span className="font-mono">{comparisonResult.region_a.mean_frp} MW</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Anomaly:</span>
                  <span className="font-mono text-rose-400 font-bold">
                    {comparisonResult.region_a.current_month_anomaly_pct}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="font-bold text-base text-amber-400 block">
                {comparisonResult.region_b.region_name}
              </span>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span>Harmonized Activity:</span>
                  <span className="font-mono font-bold text-white">
                    {Math.round(comparisonResult.region_b.harmonized_activity_index).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Peak Month:</span>
                  <span className="font-mono">{comparisonResult.region_b.highest_month}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mean FRP:</span>
                  <span className="font-mono">{comparisonResult.region_b.mean_frp} MW</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Anomaly:</span>
                  <span className="font-mono text-rose-400 font-bold">
                    {comparisonResult.region_b.current_month_anomaly_pct}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
