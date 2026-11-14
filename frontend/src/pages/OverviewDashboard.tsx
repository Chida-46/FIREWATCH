import React, { useEffect, useState } from 'react';
import { KPICard } from '../components/KPICard';
import { RegionSelector } from '../components/RegionSelector';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FireMapComponent } from '../maps/FireMapComponent';
import { TrendChart } from '../charts/TrendChart';
import { api } from '../services/api';
import {
  Flame,
  Satellite,
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Globe,
  ArrowRight,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { HotspotRecord, AOIAnalysisSummary, CountryCatalogItem } from '../types';

interface OverviewProps {
  currentRegion: string;
  currentSubdivision?: string;
  onSelectRegion: (country: string, subdivision?: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const OverviewDashboard: React.FC<OverviewProps> = ({
  currentRegion,
  currentSubdivision,
  onSelectRegion,
  onNavigateToTab
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<AOIAnalysisSummary | null>(null);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [gridGeoJSON, setGridGeoJSON] = useState<any>(null);
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<any>(null);
  const [comparisonSeries, setComparisonSeries] = useState<any[]>([]);
  const [globalOverview, setGlobalOverview] = useState<any>(null);

  // Dynamic coordinates
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.0, 0.0]);
  const [mapZoom, setMapZoom] = useState<number>(2);

  // Fetch coordinates and boundary
  useEffect(() => {
    let isMounted = true;
    const isGlobal = currentRegion === 'Global' || currentRegion === 'Global (Worldwide)';

    if (isGlobal) {
      setMapCenter([20.0, 0.0]);
      setMapZoom(2);
      setBoundaryGeoJSON(null);
      return;
    }

    fetch('/data/countries_catalog.json')
      .then((res) => res.json())
      .then((catalog: CountryCatalogItem[]) => {
        if (!isMounted) return;
        const clean = currentRegion.toLowerCase().trim();
        const found = catalog.find(
          (c) =>
            c.name.toLowerCase() === clean ||
            c.official_name?.toLowerCase() === clean ||
            c.iso3.toLowerCase() === clean
        );
        if (found) {
          setMapCenter(found.center);
          setMapZoom(found.zoom);
        }
      })
      .catch((e) => console.warn('Could not read catalog center in overview:', e));

    api.getCountryBoundary(currentRegion)
      .then((feat) => {
        if (isMounted) {
          setBoundaryGeoJSON(feat);
        }
      })
      .catch((e) => console.warn('Could not load boundary GeoJSON in overview:', e));

    return () => {
      isMounted = false;
    };
  }, [currentRegion]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.analyzeAOI(currentRegion, currentSubdivision),
      api.getHotspots({ country: currentRegion, state: currentSubdivision, limit: 500 }),
      api.getSpatialGrid(currentRegion, currentSubdivision, currentRegion === 'Global' ? 0.5 : 0.25),
      api.getHarmonizationComparison(currentRegion, currentSubdivision),
      api.getGlobalOverview()
    ])
      .then(([summaryRes, hotspotsRes, gridRes, compRes, globalRes]) => {
        if (!isMounted) return;
        setSummary(summaryRes);
        setHotspots(hotspotsRes.records || []);
        setGridGeoJSON(gridRes);
        setComparisonSeries(compRes.series || []);
        setGlobalOverview(globalRes);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load overview data:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentRegion, currentSubdivision]);

  if (loading || !summary) {
    return <LoadingSpinner message="Harmonizing global satellite fire intelligence..." />;
  }

  const isAnomalyElevated = summary.current_month_anomaly_pct > 20;
  const displayName = currentSubdivision ? `${currentSubdivision}, ${currentRegion}` : currentRegion;

  return (
    <div className="space-y-6">
      {/* Top Banner and Global Region Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-500" />
              Global Satellite Fire Intelligence
            </h2>
            <span className="bg-orange-950 text-orange-400 border border-orange-800 text-[11px] px-2 py-0.5 rounded-full font-mono font-medium">
              Worldwide Dynamic Coverage
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Continuous worldwide monitoring harmonizing MODIS (Terra/Aqua) Collection 6.1 and VIIRS 375 m active fire observations across all 250+ countries and territories.
          </p>
        </div>

        <RegionSelector
          selectedRegion={currentRegion}
          selectedSubdivision={currentSubdivision}
          onSelectRegion={onSelectRegion}
        />
      </div>

      {/* 8 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Hotspot Detections"
          value={summary.total_detections.toLocaleString()}
          subtitle="Archive observations in selected extent"
          icon={Flame}
          color="from-slate-900 to-slate-950"
        />

        <KPICard
          title="Harmonized Activity Index"
          value={Math.round(summary.harmonized_activity_index).toLocaleString()}
          subtitle="Cross-sensor calibrated baseline"
          icon={Activity}
          badge={{ text: 'Calibrated', variant: 'positive' }}
          color="from-orange-950/40 via-slate-900 to-slate-950"
        />

        <KPICard
          title="MODIS (1 km) / VIIRS (375m)"
          value={`${(summary.modis_detections / 1000).toFixed(1)}k / ${(summary.viirs_detections / 1000).toFixed(1)}k`}
          subtitle="Detection density ratio ~1:3.2"
          icon={Satellite}
          color="from-slate-900 to-slate-950"
        />

        <KPICard
          title="Current Anomaly vs Median"
          value={`${summary.current_month_anomaly_pct > 0 ? '+' : ''}${summary.current_month_anomaly_pct}%`}
          subtitle={`${summary.current_anomaly_class} (Med: ${summary.historical_median_current_month})`}
          badge={{
            text: summary.current_anomaly_class,
            variant: isAnomalyElevated ? 'warning' : 'neutral'
          }}
          icon={AlertTriangle}
          color={isAnomalyElevated ? 'from-amber-950/30 to-slate-900' : 'from-slate-900 to-slate-950'}
        />

        <KPICard
          title="Average Fire Radiative Power"
          value={`${summary.mean_frp} MW`}
          subtitle="Radiative heat release rate"
          icon={Zap}
          color="from-slate-900 to-slate-950"
        />

        <KPICard
          title="Peak Recorded FRP"
          value={`${summary.max_frp} MW`}
          subtitle="Highest thermal intensity front"
          icon={Flame}
          color="from-slate-900 to-slate-950"
        />

        <KPICard
          title="Historical Climax Month"
          value={summary.highest_month}
          subtitle={`Annual peak burning (Record Yr: ${summary.highest_year})`}
          icon={Calendar}
          color="from-slate-900 to-slate-950"
        />

        <KPICard
          title="Global Baseline Horizon"
          value="2003–2024"
          subtitle="22 Years of satellite records"
          icon={TrendingUp}
          badge={{ text: '22 Years', variant: 'neutral' }}
          color="from-slate-900 to-slate-950"
        />
      </div>

      {/* Synthesis Callout Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start space-x-3 shadow-md">
        <div className="p-1.5 rounded-md bg-orange-600/20 text-orange-400 mt-0.5">
          <Activity className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-slate-100">
              Automated Regional Synthesis ({displayName}):
            </span>
            {summary.data_availability?.has_data && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3" />
                NASA Verified Data Active
              </span>
            )}
          </div>
          {summary.natural_language_summary}
        </div>
      </div>

      {/* Global Hotspot Rankings & Continental Fire Breakdown (if Global Overview available) */}
      {globalOverview && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#090d16] border border-slate-800 rounded-xl p-4 shadow-lg space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-100 flex items-center gap-1.5 text-sm">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                Global Fire Activity Rankings (Top Nations)
              </span>
              <span className="text-[11px] text-slate-400">NASA FIRMS Annual Multi-Satellite Detections</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {globalOverview.top_countries.map((c: any, i: number) => (
                <button
                  key={c.country}
                  onClick={() => onSelectRegion(c.country, undefined)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    currentRegion === c.country
                      ? 'bg-orange-950/70 border-orange-500/80'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate max-w-[90px]">{c.country}</span>
                    <span className="text-[10px] font-mono text-orange-400 font-bold">#{i + 1}</span>
                  </div>
                  <div className="font-mono text-slate-300 font-bold mt-1">
                    {(c.annual_hotspots / 1000).toFixed(0)}k/yr
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Peak: {c.peak_season}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#090d16] border border-slate-800 rounded-xl p-4 shadow-lg space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-100 flex items-center gap-1.5 text-sm">
                <Globe className="w-4 h-4 text-amber-400" />
                Continental Distribution
              </span>
            </div>
            <div className="space-y-1.5">
              {globalOverview.continents.map((cont: any) => (
                <div key={cont.continent} className="flex justify-between items-center p-1.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="font-medium text-slate-300">{cont.continent}</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-orange-400">{(cont.hotspots / 1000).toFixed(0)}k</span>
                    <span className="text-[10px] text-slate-400 block">{cont.peak}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid: Map Preview & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Map Card */}
        <div className="bg-[#090d16] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-slate-100">
                Active Fire Map Preview ({displayName})
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('map')}
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center space-x-1 font-medium"
            >
              <span>Full Interactive Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[360px] rounded-lg overflow-hidden border border-slate-800">
            <FireMapComponent
              hotspots={hotspots}
              gridGeoJSON={gridGeoJSON}
              boundaryGeoJSON={boundaryGeoJSON}
              center={mapCenter}
              zoom={mapZoom}
              isGlobalMode={currentRegion === 'Global' || currentRegion === 'Global (Worldwide)'}
            />
          </div>
        </div>

        {/* Multi-Decadal Trend Chart */}
        <div className="flex flex-col space-y-3">
          <TrendChart
            data={comparisonSeries}
            title={`Multi-Decadal Harmonized Fire Trend (${displayName})`}
          />

          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 flex items-center justify-between text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-200 block">
                Explore the Signature Feature
              </span>
              <p className="text-slate-400">
                Inspect 22 years of monthly fire anomalies, medians, and sensor coverage in the Year × Month Heatmap Calendar.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('calendar')}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold text-xs shadow-md shadow-orange-950/40 hover:opacity-95 transition-opacity flex-shrink-0"
            >
              Open Burning Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
