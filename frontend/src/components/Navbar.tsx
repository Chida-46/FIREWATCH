import React, { useEffect, useState } from 'react';
import { Flame, Globe, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  currentRegion: string;
  currentSubdivision?: string;
  onRefresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRegion, currentSubdivision, onRefresh }) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [demoMode, setDemoMode] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.getSettings().then(res => {
      setDemoMode(res.demo_mode);
    }).catch(() => {});
  }, []);

  const displayRegion = currentSubdivision ? `${currentSubdivision}, ${currentRegion}` : currentRegion;

  return (
    <header className="h-16 bg-[#090d16] border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-orange-950/40">
          <Flame className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
              FIRE<span className="text-orange-500">WATCH</span>
            </h1>
            <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-2.5 h-2.5 text-orange-400" />
              GLOBAL NASA FIRMS
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Global MODIS–VIIRS Hotspot Harmonization & Worldwide Burning Activity Calendar
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Status Pill */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
          {demoMode ? (
            <>
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-300 font-medium">Global NASA Climatology Baseline</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-medium">NASA FIRMS Global API Active</span>
            </>
          )}
        </div>

        {/* Region & Time */}
        <div className="hidden lg:flex flex-col text-right">
          <span className="text-xs font-semibold text-slate-200">
            Coverage: <span className="text-orange-400 font-bold">{displayRegion}</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">{utcTime}</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
