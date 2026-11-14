import React from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ClimatologyPoint } from '../types';
import { TrendingUp, Info } from 'lucide-react';

interface ClimatologyChartProps {
  climatology: ClimatologyPoint[];
  regionName: string;
}

export const ClimatologyChart: React.FC<ClimatologyChartProps> = ({
  climatology,
  regionName
}) => {
  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-100">
            Monthly Fire Climatology & Seasonal Burning Cycle ({regionName})
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">2003–2024 Baseline</span>
      </div>

      <p className="text-xs text-slate-400">
        Reveals the normal regional burning rhythm. The shaded band indicates the Interquartile Range (IQR, 25th–75th percentiles).
      </p>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={climatology} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="iqrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              formatter={(value: any, name: any) => [
                typeof value === 'number' ? value.toLocaleString() : value,
                name === 'median_count'
                  ? 'Historical Median'
                  : name === 'mean_count'
                  ? 'Historical Average'
                  : name === 'iqr_high'
                  ? '75th Percentile'
                  : name === 'iqr_low'
                  ? '25th Percentile'
                  : name
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(val) => {
                if (val === 'median_count') return 'Historical Median';
                if (val === 'mean_count') return 'Historical Average';
                if (val === 'iqr_high') return 'IQR (25th–75th Percentile)';
                return val;
              }}
            />
            {/* Shaded IQR Band */}
            <Area
              type="monotone"
              dataKey="iqr_high"
              stroke="none"
              fill="url(#iqrGradient)"
              fillOpacity={1}
            />
            <Line
              type="monotone"
              dataKey="median_count"
              stroke="#f97316"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#f97316' }}
            />
            <Line
              type="monotone"
              dataKey="mean_count"
              stroke="#fbbf24"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
