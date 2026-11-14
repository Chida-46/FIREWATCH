import React from 'react';
import {
  BookOpen,
  Scale,
  Activity,
  AlertTriangle,
  Layers,
  Satellite,
  CheckCircle,
  FileText
} from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#090d16] p-6 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-bold tracking-tight text-white">
            Scientific Methodology & Algorithmic Transparency
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          FIREWATCH harmonizes more than two decades of satellite active fire observations from NASA's Moderate Resolution Imaging Spectroradiometer (MODIS) and the Visible Infrared Imaging Radiometer Suite (VIIRS). This document formalizes the mathematics, sensor physics, and calibration procedures.
        </p>
      </div>

      {/* Critical Scientific Distinctions */}
      <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-900/60 text-xs text-amber-200/90 space-y-2 shadow-lg">
        <div className="flex items-center space-x-2 font-bold text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Fundamental Remote Sensing Distinctions</span>
        </div>
        <ul className="list-disc list-inside space-y-1.5 text-slate-300 leading-relaxed">
          <li>
            <b>Hotspot Detections ≠ Individual Wildfires:</b> A single large wildfire complex often triggers dozens of contiguous hotspot detections in one overpass, whereas a small agricultural burn triggers only one.
          </li>
          <li>
            <b>Fire Radiative Power (FRP) ≠ Burned Area:</b> FRP measures the instantaneous rate of radiant heat release in MegaWatts (MW) at the second of satellite overpass. It correlates with fuel consumption and smoke emission rates, but does not equal cumulative burned area (hectares).
          </li>
          <li>
            <b>Statistical Anomalies ≠ Future Fire Prediction:</b> Observed historical anomalies indicate deviation from baseline climatology and do not constitute fire danger forecasts.
          </li>
        </ul>
      </div>

      {/* Sensor Architecture Comparison Table */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 text-xs">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Satellite className="w-4 h-4 text-orange-400" />
          Sensor Architecture Comparison Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Parameter</th>
                <th className="py-2 px-3 text-amber-400 font-bold">MODIS (Terra & Aqua)</th>
                <th className="py-2 px-3 text-orange-400 font-bold">VIIRS (Suomi-NPP, NOAA-20/21)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2 px-3 font-semibold text-white">Nadir Spatial Resolution</td>
                <td className="py-2 px-3 font-mono">1,000 m (1 km)</td>
                <td className="py-2 px-3 font-mono">375 m (I-Bands)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-white">Scan Edge Pixel Growth</td>
                <td className="py-2 px-3">Expands ~5× along scan, ~2× along track (~10 km²)</td>
                <td className="py-2 px-3">Constrained pixel aggregation limits edge size to ~0.8 km</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-white">Operational Constellation</td>
                <td className="py-2 px-3">Terra (2000–present), Aqua (2002–present)</td>
                <td className="py-2 px-3">Suomi-NPP (2012+), NOAA-20 (2018+), NOAA-21 (2023+)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-white">Thermal Anomaly Channels</td>
                <td className="py-2 px-3 font-mono">Channel 21/22 (3.96 µm) & Channel 31 (11.0 µm)</td>
                <td className="py-2 px-3 font-mono">Band I4 (3.74 µm) & Band I5 (11.45 µm)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-white">Detection Threshold</td>
                <td className="py-2 px-3 font-mono">FRP &gt; ~5–10 MW (~100 m² flaming fire)</td>
                <td className="py-2 px-3 font-mono">FRP &gt; ~0.5–1 MW (~20 m² flaming fire)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-white">Nominal Overpass Times</td>
                <td className="py-2 px-3">10:30 & 22:30 (Terra) / 13:30 & 01:30 (Aqua)</td>
                <td className="py-2 px-3">13:30 (S-NPP) / 12:40 (N-20) / 13:00 (N-21) UTC</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* The Harmonization Formulation */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 text-xs">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Scale className="w-4 h-4 text-orange-400" />
          Harmonization Formulation & Regression Mathematics
        </h3>

        <div className="space-y-3 text-slate-300 leading-relaxed">
          <p>
            Because VIIRS resolves smaller sub-pixel fires and covers larger angular fields without excessive distortion, concurrent observation pairs (N_VIIRS, N_MODIS) in overlapping 0.1° grid cells demonstrate a nonlinear power-law scaling relationship:
          </p>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-center text-sm text-orange-400">
            N_MODIS_eq = α · (N_VIIRS)^β
          </div>

          <p>
            Taking natural logarithms converts this into a linear regression model:
          </p>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-center text-xs text-amber-300">
            ln(N_MODIS) = ln(α) + β · ln(N_VIIRS) + ε
          </div>

          <p>
            Where:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><b>α (Alpha = 0.380):</b> Sub-pixel detection density scaling coefficient.</li>
            <li><b>β (Beta = 0.920):</b> Sub-linear saturation index. When β &lt; 1.0, individual VIIRS hotspot clusters coalesce at MODIS 1 km scale.</li>
            <li><b>ε:</b> Calibration residual noise with zero mean and standard error σ = 1.15 counts.</li>
          </ul>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
            <b>Continuous Time Series Construction:</b> For dates prior to 2012, Activity = N_MODIS. For dates from 2012 onwards, Activity = 0.40 · N_MODIS + 0.60 · α · (N_VIIRS)^β, providing a seamless, multi-decadal baseline devoid of artificial instrumental jumps.
          </div>
        </div>
      </div>

      {/* Anomaly Calculation Equations */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-400" />
          Climatological Anomaly Formulation
        </h3>

        <div className="space-y-3 text-slate-300 leading-relaxed">
          <p>
            Monthly anomalies compare observed activity during month $m$ of year $y$ against the multi-decadal historical median for that calendar month:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center font-mono">
              <span className="text-slate-400 text-[11px] block mb-1">Absolute Anomaly:</span>
              <span className="text-white text-xs">Anomaly = Activity_(y,m) - Median_m</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center font-mono">
              <span className="text-slate-400 text-[11px] block mb-1">Percentage Anomaly:</span>
              <span className="text-orange-400 text-xs">Anomaly% = [(Activity - Median) / max(Median, 1)] × 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scientific Citations */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 text-xs text-slate-400">
        <span className="font-bold text-slate-200 block">Key Scientific References:</span>
        <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
          <li>
            Giglio, L., Schroeder, W., & Justice, C. O. (2016). The collection 6 MODIS active fire detection algorithm and fire products. <i>Remote Sensing of Environment</i>, 178, 31-41.
          </li>
          <li>
            Schroeder, W., Oliva, P., Giglio, L., & Csiszar, I. A. (2014). The New VIIRS 375 m active fire detection product—Algorithm description and initial assessment. <i>Remote Sensing of Environment</i>, 143, 85-96.
          </li>
          <li>
            Wooster, M. J., Roberts, G., Freeborn, P. H., et al. (2012). LSA SAF active fire products: Fire Radiative Power (FRP) and fire radiative energy (FRE). <i>Atmospheric Chemistry and Physics</i>.
          </li>
        </ol>
      </div>
    </div>
  );
};
