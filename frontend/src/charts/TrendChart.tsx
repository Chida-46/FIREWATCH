import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface TrendChartProps {
  data: any[];
  title?: string;
  showNaiveDivergence?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title = "Multi-Decadal Satellite Fire Activity Trends (2003–2024)",
  showNaiveDivergence = true
}) => {
  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100">{title}</h3>
        <span className="text-xs text-orange-400 font-mono">MODIS vs VIIRS vs Harmonized</span>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: any, name: any) => [
                typeof value === 'number' ? Math.round(value).toLocaleString() : value,
                name === 'raw_modis' || name === 'count_modis'
                  ? 'Raw MODIS (1 km)'
                  : name === 'raw_viirs' || name === 'count_viirs'
                  ? 'Raw VIIRS (375 m)'
                  : name === 'harmonized_activity' || name === 'count_harmonized'
                  ? 'Harmonized Activity'
                  : name === 'raw_combined_naive'
                  ? 'Naive Sum (Unharmonized Discontinuity)'
                  : name
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(val) => {
                if (val === 'raw_modis' || val === 'count_modis') return 'Raw MODIS (1 km)';
                if (val === 'raw_viirs' || val === 'count_viirs') return 'Raw VIIRS (375 m)';
                if (val === 'harmonized_activity' || val === 'count_harmonized') return 'Harmonized Activity (Seamless)';
                if (val === 'raw_combined_naive') return 'Naive Sum (Artificial Discontinuity)';
                return val;
              }}
            />
            {/* Raw MODIS */}
            <Line
              type="monotone"
              dataKey={data[0]?.raw_modis !== undefined ? 'raw_modis' : 'count_modis'}
              stroke="#fbbf24"
              strokeWidth={2}
              dot={{ r: 2.5 }}
            />
            {/* Raw VIIRS */}
            <Line
              type="monotone"
              dataKey={data[0]?.raw_viirs !== undefined ? 'raw_viirs' : 'count_viirs'}
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={{ r: 2.5 }}
            />
            {/* Naive Unharmonized Sum */}
            {showNaiveDivergence && data[0]?.raw_combined_naive !== undefined && (
              <Line
                type="monotone"
                dataKey="raw_combined_naive"
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
            )}
            {/* Harmonized Activity */}
            <Line
              type="monotone"
              dataKey={data[0]?.harmonized_activity !== undefined ? 'harmonized_activity' : 'count_harmonized'}
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 3, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
