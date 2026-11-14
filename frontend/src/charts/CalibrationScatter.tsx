import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';
import { ScatterPoint, HarmonizationDiagnostics } from '../types';
import { Sliders } from 'lucide-react';

interface CalibrationScatterProps {
  points: ScatterPoint[];
  diagnostics: HarmonizationDiagnostics;
}

export const CalibrationScatter: React.FC<CalibrationScatterProps> = ({
  points,
  diagnostics
}) => {
  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-bold text-slate-100">
            Co-Located Sensor Calibration Regression Curve
          </h3>
        </div>
        <div className="text-xs font-mono bg-slate-900 border border-slate-700 px-2 py-1 rounded text-orange-400">
          {diagnostics.formula}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block">R² Variance Explained:</span>
          <span className="text-emerald-400 font-mono font-bold">{diagnostics.r_squared}</span>
        </div>
        <div className="p-2 rounded bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block">Alpha (α) Scale:</span>
          <span className="text-amber-400 font-mono font-bold">{diagnostics.alpha}</span>
        </div>
        <div className="p-2 rounded bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block">Beta (β) Saturation:</span>
          <span className="text-orange-400 font-mono font-bold">{diagnostics.beta}</span>
        </div>
        <div className="p-2 rounded bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block">RMSE:</span>
          <span className="text-slate-200 font-mono font-bold">{diagnostics.rmse} counts</span>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="viirs_count"
              name="VIIRS (375m) Count"
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              label={{ value: 'VIIRS Hotspots per 0.1° Cell', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="modis_count"
              name="MODIS (1km) Count"
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              label={{ value: 'MODIS Hotspots', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(val: any, name: any) => [
                val,
                name === 'modis_count' ? 'MODIS Observed' : 'VIIRS Observed'
              ]}
            />
            <Scatter
              name="Matched Overpass Cells"
              data={points}
              fill="#f97316"
              fillOpacity={0.65}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
        {diagnostics.summary}
      </div>
    </div>
  );
};
