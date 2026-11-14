import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'warning';
  };
  icon?: LucideIcon;
  color?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  color = 'from-slate-800 to-slate-900'
}) => {
  const badgeStyles = {
    positive: 'bg-emerald-950/80 text-emerald-400 border-emerald-800',
    negative: 'bg-rose-950/80 text-rose-400 border-rose-800',
    warning: 'bg-amber-950/80 text-amber-400 border-amber-800',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${color} border border-slate-800/90 shadow-sm relative overflow-hidden flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300">
            <Icon className="w-4 h-4 text-orange-400" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline space-x-2">
        <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyles[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && (
        <span className="mt-1 text-xs text-slate-400 truncate">{subtitle}</span>
      )}
    </div>
  );
};
