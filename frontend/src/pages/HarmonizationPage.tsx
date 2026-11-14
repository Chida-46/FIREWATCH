import React, { useEffect, useState } from 'react';
import { TrendChart } from '../charts/TrendChart';
import { CalibrationScatter } from '../charts/CalibrationScatter';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import { HarmonizationDiagnostics, ScatterPoint } from '../types';
import {
  Sliders,
  CheckCircle,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  Scale
} from 'lucide-react';

interface HarmonizationPageProps {
  currentRegion: string;
  currentSubdivision?: string;
}

export const HarmonizationPage: React.FC<HarmonizationPageProps> = ({ currentRegion, currentSubdivision }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [diagnostics, setDiagnostics] = useState<HarmonizationDiagnostics | null>(null);
  const [scatterPoints, setScatterPoints] = useState<ScatterPoint[]>([]);
  const [comparisonSeries, setComparisonSeries] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const regionParam = currentRegion === 'India (National)' ? 'India' : currentRegion;

    Promise.all([
      api.getHarmonizationDiagnostics(),
      api.getHarmonizationScatter(160),
      api.getHarmonizationComparison(regionParam)
    ])
      .then(([diagRes, scatterRes, compRes]) => {
        if (!isMounted) return;
        setDiagnostics(diagRes);
        setScatterPoints(scatterRes.points || []);
        setComparisonSeries(compRes.series || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading harmonization page:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentRegion]);

  if (loading || !diagnostics) {
    return <LoadingSpinner message="Calibrating cross-sensor regression diagnostics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#090d16] p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <Scale className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-bold tracking-tight text-white">
            MODIS–VIIRS Sensor Harmonization & Calibration Engine
          </h2>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-mono">
            R² = {diagnostics.r_squared}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Because VIIRS 375 m I-bands detect 3 to 4 times more active fire pixels than MODIS 1 km pixels for the same fire complex, raw counts cannot simply be summed. FIREWATCH bridges this multi-decadal record using empirical power-law regression calibrated on concurrent space-time overpasses.
        </p>
      </div>

      {/* Sensor Disparity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MODIS Card */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400 text-sm">MODIS (Terra & Aqua)</span>
            <span className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded font-mono text-[10px]">
              Collection 6.1
            </span>
          </div>
          <div className="space-y-1 text-slate-300">
            <div><b>Spatial Resolution:</b> 1,000 m (1 km) at nadir, expanding to ~2×5 km at scan edge.</div>
            <div><b>Operational Era:</b> 2000–Present (Terra: 10:30 UTC, Aqua: 13:30 UTC).</div>
            <div><b>Detection Threshold:</b> ~50–100 m² flaming fire or FRP &gt; 5–10 MW.</div>
            <div><b>Limitation:</b> Misses small, low-intensity agricultural and understory fires.</div>
          </div>
        </div>

        {/* VIIRS Card */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-orange-400 text-sm">VIIRS (Suomi-NPP, NOAA-20, NOAA-21)</span>
            <span className="bg-orange-950 text-orange-300 px-2 py-0.5 rounded font-mono text-[10px]">
              375 m I-Bands
            </span>
          </div>
          <div className="space-y-1 text-slate-300">
            <div><b>Spatial Resolution:</b> 375 m at nadir, pixel aggregation limits edge growth to ~0.8 km.</div>
            <div><b>Operational Era:</b> 2012–Present (Suomi-NPP: 13:30, NOAA-20: 12:40, NOAA-21: 13:00).</div>
            <div><b>Detection Threshold:</b> ~10–25 m² flaming fire or FRP &gt; 0.5–1 MW.</div>
            <div><b>Behavior:</b> Yields ~3x to 5x higher raw count density over identical burning areas.</div>
          </div>
        </div>
      </div>

      {/* The Artificial Discontinuity Chart */}
      <div className="space-y-2">
        <TrendChart
          data={comparisonSeries}
          title="The Harmonization Imperative: Resolving the 2012 Artificial Count Jump"
          showNaiveDivergence={true}
        />
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p>
            <b>Notice the red dashed curve:</b> If raw MODIS and VIIRS detections are naively summed together without harmonization, an artificial 350% jump appears in 2012 when Suomi-NPP launched. FIREWATCH’s harmonized green curve delivers a scientifically sound, continuous historical baseline.
          </p>
        </div>
      </div>

      {/* Calibration Regression Curve Scatter */}
      <CalibrationScatter
        points={scatterPoints}
        diagnostics={diagnostics}
      />
    </div>
  );
};
