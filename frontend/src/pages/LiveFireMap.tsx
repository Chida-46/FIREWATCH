import React, { useEffect, useState, useMemo } from 'react';
import { FireMapComponent } from '../maps/FireMapComponent';
import { RegionSelector } from '../components/RegionSelector';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import { HotspotRecord, CountryCatalogItem } from '../types';
import {
  SlidersHorizontal,
  Flame,
  Globe,
  RotateCcw,
  ShieldCheck,
  Info,
  CheckCircle,
  Activity,
  Layers,
  MapPin
} from 'lucide-react';

interface LiveFireMapProps {
  currentRegion: string;
  currentSubdivision?: string;
  onSelectRegion: (country: string, subdivision?: string) => void;
}

export const LiveFireMap: React.FC<LiveFireMapProps> = ({
  currentRegion,
  currentSubdivision,
  onSelectRegion
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [gridGeoJSON, setGridGeoJSON] = useState<any>(null);
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);

  // Filters
  const [sensorFilter, setSensorFilter] = useState<string>('ALL');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [minFRP, setMinFRP] = useState<number>(0);
  const [dayNightFilter, setDayNightFilter] = useState<string>('ALL');
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Dynamic coordinates
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.0, 0.0]);
  const [mapZoom, setMapZoom] = useState<number>(2);

  const isGlobalMode = useMemo(() => {
    return (
      !currentRegion ||
      currentRegion === 'Global' ||
      currentRegion === 'Global (Worldwide)' ||
      currentRegion.toLowerCase() === 'world'
    );
  }, [currentRegion]);

  // Handle region changes, coordinates, and boundaries
  useEffect(() => {
    let isMounted = true;

    if (isGlobalMode) {
      setMapCenter([20.0, 0.0]);
      setMapZoom(2);
      setBoundaryGeoJSON(null);
      return;
    }

    // COUNTRY MODE: Look up coordinates from catalog
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
      .catch((e) => console.warn('Could not read catalog center:', e));

    // Fetch official boundary GeoJSON
    api.getCountryBoundary(currentRegion)
      .then((feat) => {
        if (isMounted) {
          setBoundaryGeoJSON(feat);
        }
      })
      .catch((e) => console.warn('Could not load boundary GeoJSON:', e));

    return () => {
      isMounted = false;
    };
  }, [currentRegion, isGlobalMode]);

  // Load real NASA FIRMS hotspots
  const loadData = () => {
    setLoading(true);

    const countryParam = isGlobalMode ? 'Global' : currentRegion;
    const subParam = isGlobalMode ? undefined : currentSubdivision;

    console.log(`[FIREWATCH] Querying NASA FIRMS: mode=${isGlobalMode ? 'GLOBAL' : 'COUNTRY'}, country=${countryParam}, sub=${subParam}`);

    Promise.all([
      api.getHotspots({
        country: countryParam,
        state: subParam,
        sensor: sensorFilter !== 'ALL' ? sensorFilter : undefined,
        min_confidence: minConfidence > 0 ? minConfidence : undefined,
        min_frp: minFRP > 0 ? minFRP : undefined,
        limit: isGlobalMode ? 2500 : 1200
      }),
      api.getSpatialGrid(countryParam, subParam, isGlobalMode ? 0.5 : 0.25)
    ])
      .then(([hotspotsRes, gridRes]) => {
        let records = hotspotsRes.records || [];
        if (dayNightFilter !== 'ALL') {
          records = records.filter((r) => r.daynight === dayNightFilter);
        }

        console.log(`[FIREWATCH] Received ${records.length} real hotspots for ${countryParam}. Total available: ${hotspotsRes.total}`);

        setHotspots(records);
        setGridGeoJSON(gridRes);
        setTelemetry((hotspotsRes as any).telemetry || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching map data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [currentRegion, currentSubdivision, sensorFilter, minConfidence, minFRP, dayNightFilter, isGlobalMode]);

  const handleSwitchToGlobal = () => {
    onSelectRegion('Global', undefined);
    setSensorFilter('ALL');
    setMinConfidence(0);
    setMinFRP(0);
    setDayNightFilter('ALL');
  };

  const displayName = isGlobalMode
    ? 'Global (Worldwide)'
    : currentSubdivision
    ? `${currentSubdivision}, ${currentRegion}`
    : currentRegion;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#090d16] p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              NASA FIRMS Active Fire Map
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isGlobalMode
                  ? 'bg-orange-950 text-orange-400 border border-orange-800'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}
            >
              {isGlobalMode ? '🌍 GLOBAL MODE (WORLDWIDE)' : `📍 COUNTRY MODE: ${currentRegion.toUpperCase()}`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time satellite active fire observations from NASA MODIS (Terra & Aqua Collection 6.1) and VIIRS (NOAA-20 375m).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Global Mode Switcher Pill */}
          <button
            onClick={handleSwitchToGlobal}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              isGlobalMode
                ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-950/40'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Worldwide View</span>
          </button>

          <RegionSelector
            selectedRegion={currentRegion}
            selectedSubdivision={currentSubdivision}
            onSelectRegion={onSelectRegion}
          />
        </div>
      </div>

      {/* Main Map + Filter Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[640px]">
        {/* Left Filter & Controls Panel */}
        <div className="lg:col-span-1 bg-[#090d16] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-lg text-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                Observation Filters
              </span>
              <button
                onClick={handleSwitchToGlobal}
                title="Reset to Global World Map"
                className="text-slate-400 hover:text-slate-200 p-1 flex items-center gap-1 text-[11px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset World</span>
              </button>
            </div>

            {/* Mode & Extent Banner */}
            <div
              className={`p-2.5 rounded-lg border space-y-1 ${
                isGlobalMode
                  ? 'bg-orange-950/20 border-orange-800/60'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Active Extent
                </span>
                <span className="text-[10px] font-mono text-orange-400 font-bold">
                  {isGlobalMode ? 'All Continents' : 'Country Polygon'}
                </span>
              </div>
              <div className="font-bold text-orange-400 text-sm flex items-center gap-1.5 truncate">
                {isGlobalMode ? <Globe className="w-4 h-4 text-orange-400 flex-shrink-0" /> : <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                <span className="truncate">{displayName}</span>
              </div>
              {!isGlobalMode && boundaryGeoJSON && (
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 pt-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Geographically filtered inside boundary</span>
                </div>
              )}
            </div>

            {/* Sensor Selection */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium">Satellite Instrument:</label>
              <select
                value={sensorFilter}
                onChange={(e) => setSensorFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none"
              >
                <option value="ALL">All Sensors (MODIS + VIIRS)</option>
                <option value="MODIS">MODIS (Terra & Aqua 1 km)</option>
                <option value="VIIRS">VIIRS (NOAA-20 375 m)</option>
              </select>
            </div>

            {/* Day / Night Filter */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium">Orbit Overpass:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['ALL', 'D', 'N'].map((dn) => (
                  <button
                    key={dn}
                    onClick={() => setDayNightFilter(dn)}
                    className={`p-1.5 rounded-lg border font-medium text-center ${
                      dayNightFilter === dn
                        ? 'bg-orange-600 text-white border-orange-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {dn === 'ALL' ? 'All Orbits' : dn === 'D' ? '☀️ Day' : '🌙 Night'}
                  </button>
                ))}
              </div>
            </div>

            {/* Min FRP Threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Minimum FRP:</span>
                <span className="font-mono text-amber-400 font-bold">{minFRP} MW</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minFRP}
                onChange={(e) => setMinFRP(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 MW</span>
                <span>50 MW</span>
                <span>100 MW+</span>
              </div>
            </div>

            {/* Min Confidence Threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Min Confidence:</span>
                <span className="font-mono text-orange-400 font-bold">{minConfidence}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="10"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Hotspot Count Summary & Telemetry Log */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
            <span className="font-semibold text-slate-300 block">NASA FIRMS Telemetry:</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-white">
                {hotspots.length.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">rendered</span>
            </div>
            {telemetry?.total_available_in_dataset && (
              <p className="text-[10px] text-slate-400">
                Available in feed: <span className="font-mono text-orange-400">{telemetry.total_available_in_dataset.toLocaleString()}</span> fires
              </p>
            )}
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              MODIS: <span className="text-amber-400 font-mono">{hotspots.filter((h) => h.instrument === 'MODIS').length}</span> | VIIRS:{' '}
              <span className="text-orange-400 font-mono">{hotspots.filter((h) => h.instrument === 'VIIRS').length}</span>
            </div>
            {isGlobalMode ? (
              <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Worldwide real NASA observations active (6 continents)</span>
              </div>
            ) : hotspots.length === 0 ? (
              <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>No active hotspots recorded inside boundary in the past 24-48 hours.</span>
              </div>
            ) : (
              <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{hotspots.length} detections inside {currentRegion} boundary</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Map Canvas */}
        <div className="lg:col-span-3 h-[640px] rounded-xl overflow-hidden border border-slate-800 relative">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-[#090d16]">
              <LoadingSpinner message={isGlobalMode ? "Retrieving worldwide NASA FIRMS active fire hotspots..." : `Filtering NASA FIRMS observations within ${displayName}...`} />
            </div>
          ) : (
            <FireMapComponent
              hotspots={hotspots}
              gridGeoJSON={gridGeoJSON}
              boundaryGeoJSON={boundaryGeoJSON}
              center={mapCenter}
              zoom={mapZoom}
              showHarmonizedGrid={showGrid}
              isGlobalMode={isGlobalMode}
            />
          )}
        </div>
      </div>
    </div>
  );
};
