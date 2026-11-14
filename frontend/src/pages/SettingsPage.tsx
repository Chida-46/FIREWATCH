import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SettingsStatus } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  Settings,
  Key,
  Database,
  Grid,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Trash2,
  Save,
  ShieldCheck
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<SettingsStatus | null>(null);
  const [mapKey, setMapKey] = useState<string>('');
  const [gridSize, setGridSize] = useState<number>(0.1);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchSettings = () => {
    setLoading(true);
    api.getSettings()
      .then((data) => {
        setSettings(data);
        setGridSize(data.default_grid_size_deg);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaveStatus('Saving settings...');
      const res = await api.updateSettings({
        firms_map_key: mapKey ? mapKey.trim() : undefined,
        grid_resolution_deg: gridSize
      });
      setSettings(res.settings);
      setSaveStatus('Settings successfully applied!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Failed to update settings.');
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Clear all local FIRMS cached responses?')) return;
    try {
      const res = await api.updateSettings({ clear_cache: true });
      setSettings(res.settings);
      alert('Local cache successfully cleared.');
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  };

  const handleTestKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      // First save if key entered
      if (mapKey) {
        await api.updateSettings({ firms_map_key: mapKey.trim() });
      }
      const res = await fetch('/api/firms/availability?source=MODIS_NRT');
      const data = await res.json();
      setTestResult(data);
      setTestingKey(false);
      fetchSettings();
    } catch (err) {
      setTestResult({ status: 'error', message: String(err) });
      setTestingKey(false);
    }
  };

  if (loading || !settings) {
    return <LoadingSpinner message="Loading configuration..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#090d16] p-6 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2">
          <Settings className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-bold tracking-tight text-white">
            Application Settings & NASA FIRMS Authentication
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Configure your NASA Earthdata FIRMS API credentials, spatial analysis resolution, and local query cache.
        </p>
      </div>

      {/* Operational Mode Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Current Operating Mode
          </span>
          <div className="flex items-center space-x-2">
            {settings.demo_mode ? (
              <>
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-base font-bold text-amber-300">
                  Calibrated Scientific Baseline (NASA Archive)
                </span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-base font-bold text-emerald-300">
                  Live NASA FIRMS API Active
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {settings.demo_mode
              ? 'Running with verified NASA MODIS/VIIRS historical observation datasets. To connect directly to NASA for live near-real-time observations, enter your free MAP_KEY below.'
              : 'Direct authenticated connection to NASA Earthdata FIRMS established.'}
          </p>
        </div>

        <div className="text-right text-xs font-mono text-slate-400">
          <div>Version: {settings.project_version}</div>
          <div>Default: {settings.default_region}</div>
        </div>
      </div>

      {/* NASA FIRMS MAP_KEY Config */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-bold text-slate-100">NASA FIRMS MAP_KEY</h3>
          </div>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/api/map_key/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-400 hover:text-orange-300 flex items-center space-x-1 font-medium"
          >
            <span>Get Free MAP_KEY</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-2 text-xs">
          <label className="text-slate-300 font-medium">
            Enter 32-character FIRMS MAP_KEY:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder={settings.firms_map_key_preview || 'e.g. 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p'}
                value={mapKey}
                onChange={(e) => setMapKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-200 text-[11px]"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <button
              onClick={handleTestKey}
              disabled={testingKey}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingKey ? 'animate-spin' : ''}`} />
              <span>Test Key</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Keys are stored securely in backend server memory/environment variables and are never exposed to browser client scripts.
          </p>

          {/* Key Test Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                testResult.status === 'available'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800 text-amber-300'
              }`}
            >
              <b>Status: {testResult.status}</b> — {testResult.message || 'Key verified with NASA FIRMS availability service.'}
            </div>
          )}
        </div>
      </div>

      {/* Spatial Grid Resolution & Cache */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Grid Size */}
        <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Grid className="w-4 h-4 text-orange-400" />
            <h3 className="font-bold text-slate-100">Spatial Harmonization Grid Size</h3>
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-400">Nominal Geographic Resolution:</label>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none"
            >
              <option value={0.05}>0.05° (~5.5 km) High Resolution</option>
              <option value={0.1}>0.10° (~11.0 km) Recommended Nominal</option>
              <option value={0.25}>0.25° (~27.5 km) Regional Macro Grid</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-400">
            Governs the spatial cell resolution used to match co-located MODIS and VIIRS detections.
          </p>
        </div>

        {/* Cache Management */}
        <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Database className="w-4 h-4 text-orange-400" />
            <h3 className="font-bold text-slate-100">Local Cache Management</h3>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Cached Query Files:</span>
            <span className="font-mono font-bold text-white">
              {settings.cached_queries_count} files
            </span>
          </div>
          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-center space-x-1.5 py-2 bg-slate-900 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 border border-slate-800 text-slate-300 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local FIRMS Cache</span>
          </button>
        </div>
      </div>

      {/* Save Action */}
      <div className="flex items-center justify-between pt-2">
        {saveStatus && (
          <span className="text-xs font-semibold text-emerald-400 animate-pulse">
            {saveStatus}
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-6 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-lg shadow-orange-950/40 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
