import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Globe,
  Calendar,
  TrendingUp,
  Crop,
  Sliders,
  Database,
  FileDown,
  BookOpen,
  Settings
} from 'lucide-react';

export type TabType =
  | 'overview'
  | 'map'
  | 'earth3d'
  | 'calendar'
  | 'analytics'
  | 'aoi'
  | 'harmonization'
  | 'explorer'
  | 'reports'
  | 'methodology'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'overview' as TabType, label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'map' as TabType, label: 'Live Fire Map', icon: MapPin },
    { id: 'earth3d' as TabType, label: '3D Earth Explorer 🌍', icon: Globe, highlight: true },
    { id: 'calendar' as TabType, label: 'Burning Calendar', icon: Calendar, highlight: true },
    { id: 'analytics' as TabType, label: 'Historical Analytics', icon: TrendingUp },
    { id: 'aoi' as TabType, label: 'AOI Analysis', icon: Crop },
    { id: 'harmonization' as TabType, label: 'MODIS–VIIRS Harmonizer', icon: Sliders },
    { id: 'explorer' as TabType, label: 'Data Explorer', icon: Database },
    { id: 'reports' as TabType, label: 'Reports & Exports', icon: FileDown },
    { id: 'methodology' as TabType, label: 'Methodology & Science', icon: BookOpen },
    { id: 'settings' as TabType, label: 'Settings & API', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#090d16] border-r border-slate-800 flex flex-col justify-between p-3 select-none flex-shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Navigation Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-950/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {item.highlight && !isActive && (
                <span className="ml-auto text-[10px] bg-orange-950 text-orange-400 border border-orange-800/60 px-1.5 py-0.2 rounded font-mono">
                  Key
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sensor Legend Footer */}
      <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-2 text-xs">
        <span className="font-semibold text-slate-300 block">Sensor Harmonization</span>
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>MODIS (1 km):</span>
          <span className="font-mono text-amber-400">2000–Present</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>VIIRS (375 m):</span>
          <span className="font-mono text-orange-400">2012–Present</span>
        </div>
        <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 leading-tight">
          Standardized UTC Climatology Baseline
        </div>
      </div>
    </aside>
  );
};
