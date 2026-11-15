import React, { useEffect, useState, useMemo } from 'react';
import { Earth3DGlobe, NAVIGATION_PRESETS } from '../maps/Earth3DGlobe';
import { RegionSelector } from '../components/RegionSelector';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import { HotspotRecord, CountryCatalogItem } from '../types';
import { TabType } from '../components/Sidebar';
import {
  Globe,
  SlidersHorizontal,
  Flame,
  RotateCcw,
  ShieldCheck,
  Info,
  CheckCircle,
  Activity,
  Layers,
  MapPin,
  ArrowLeft,
  X,
  Compass,
  Satellite,
  Clock,
  Thermometer,
  Zap,
  Search,
  Mountain
} from 'lucide-react';

interface Earth3DPageProps {
  currentRegion: string;
  currentSubdivision?: string;
  onSelectRegion: (country: string, subdivision?: string) => void;
  onNavigateToTab: (tab: TabType) => void;
}

export const Earth3DPage: React.FC<Earth3DPageProps> = ({
  currentRegion,
  currentSubdivision,
  onSelectRegion,
  onNavigateToTab
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotRecord | null>(null);

  // Filters
  const [sensorFilter, setSensorFilter] = useState<string>('ALL');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [minFRP, setMinFRP] = useState<number>(0);
  const [dayNightFilter, setDayNightFilter] = useState<string>('ALL');

  // Dynamic 3D Camera Target
  const [targetLatLon, setTargetLatLon] = useState<[number, number] | undefined>(undefined);

  // Google Earth-Style Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [catalogList, setCatalogList] = useState<CountryCatalogItem[]>([]);
  const [landmarksList, setLandmarksList] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Load catalog and landmarks datasets for instant planetary search
  useEffect(() => {
    fetch('/data/countries_catalog.json')
      .then((res) => res.json())
      .then((data) => setCatalogList(data))
      .catch((e) => console.warn('Catalog load err:', e));

    fetch('/data/world_landmarks.json')
      .then((res) => res.json())
      .then((data) => setLandmarksList(data))
      .catch((e) => console.warn('Landmarks load err:', e));
  }, []);

  // Filter search results across all countries and mountain/city landmarks
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    const matches: any[] = [];
    for (const c of catalogList) {
      if (c.name.toLowerCase().includes(q) || c.official_name?.toLowerCase().includes(q)) {
        matches.push({
          type: 'country',
          name: c.name,
          sub: c.continent,
          lat: c.center[0],
          lon: c.center[1]
        });
        if (matches.length >= 6) break;
      }
    }

    for (const lm of landmarksList) {
      if (lm.name.toLowerCase().includes(q) || (lm.country && lm.country.toLowerCase().includes(q))) {
        matches.push({
          type: lm.type === 'mountain' || lm.type === 'plateau' ? 'mountain' : 'city',
          name: lm.name,
          sub: lm.elevation ? `Elevation: ${lm.elevation}` : (lm.country || 'Metropolis'),
          lat: lm.lat,
          lon: lm.lon
        });
        if (matches.length >= 8) break;
      }
    }

    return matches;
  }, [searchQuery, catalogList, landmarksList]);

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
      setTargetLatLon(undefined);
      setBoundaryGeoJSON(null);
      return;
    }

    // COUNTRY MODE: Look up coordinates from catalog to rotate 3D globe
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
          setTargetLatLon(found.center);
        }
      })
      .catch((e) => console.warn('Could not read catalog center:', e));

    // Fetch official boundary GeoJSON for 3D outline
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
    setSelectedHotspot(null);

    const countryParam = isGlobalMode ? 'Global' : currentRegion;
    const subParam = isGlobalMode ? undefined : currentSubdivision;

    console.log(`[FIREWATCH 3D] Querying NASA FIRMS: mode=${isGlobalMode ? 'GLOBAL' : 'COUNTRY'}, country=${countryParam}`);

    api.getHotspots({
      country: countryParam,
      state: subParam,
      sensor: sensorFilter !== 'ALL' ? sensorFilter : undefined,
      min_confidence: minConfidence > 0 ? minConfidence : undefined,
      min_frp: minFRP > 0 ? minFRP : undefined,
      limit: isGlobalMode ? 2500 : 1200
    })
      .then((hotspotsRes) => {
        let records = hotspotsRes.records || [];
        if (dayNightFilter !== 'ALL') {
          records = records.filter((r) => r.daynight === dayNightFilter);
        }

        console.log(`[FIREWATCH 3D] Loaded ${records.length} real hotspots for 3D Earth Globe.`);

        setHotspots(records);
        setTelemetry((hotspotsRes as any).telemetry || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching 3D globe data:', err);
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

  // Aggregate Stats
  const peakFRP = useMemo(() => {
    if (hotspots.length === 0) return 0;
    return Math.max(...hotspots.map((h) => h.frp || 0));
  }, [hotspots]);

  const avgFRP = useMemo(() => {
    if (hotspots.length === 0) return 0;
    const sum = hotspots.reduce((acc, h) => acc + (h.frp || 0), 0);
    return Math.round((sum / hotspots.length) * 10) / 10;
  }, [hotspots]);

  const intenseFiresCount = useMemo(() => {
    return hotspots.filter((h) => (h.frp || 0) >= 40).length;
  }, [hotspots]);

  const modisCount = useMemo(() => {
    return hotspots.filter((h) => h.instrument === 'MODIS').length;
  }, [hotspots]);

  const viirsCount = useMemo(() => {
    return hotspots.filter((h) => h.instrument === 'VIIRS').length;
  }, [hotspots]);

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#090d16] border border-slate-800 p-4 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-gradient-to-br from-orange-600 to-amber-600 rounded-lg text-white shadow-md shadow-orange-950/40">
              <Globe className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-wide">3D Earth Explorer</h1>
                <span className="text-[10px] bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  Interactive Globe
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authentic NASA FIRMS active fire hotspots (MODIS & VIIRS) visualized on a photorealistic 3D Earth
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Google Earth-Style Planetary Search */}
          <div className="relative">
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus-within:border-orange-500 transition-all shadow-inner w-52 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search Earth (e.g. Everest, Brazil, Tokyo)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="bg-transparent border-0 outline-none text-xs text-white placeholder-slate-400 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Instant Search Autocomplete Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 text-xs">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (res.type === 'country') {
                        onSelectRegion(res.name);
                      }
                      setTargetLatLon([res.lat, res.lon]);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800/80 transition-colors flex items-center justify-between text-slate-200 hover:text-white"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {res.type === 'mountain' ? (
                        <Mountain className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : res.type === 'city' ? (
                        <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      )}
                      <span className="font-semibold truncate">{res.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono ml-2 flex-shrink-0">{res.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Back to Dashboard Button */}
          <button
            onClick={() => onNavigateToTab('overview')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          {/* Global Mode Switcher */}
          <button
            onClick={handleSwitchToGlobal}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm ${
              isGlobalMode
                ? 'bg-orange-600 text-white border-orange-500 shadow-orange-900/40'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Worldwide View</span>
          </button>

          {/* Region Selector */}
          <RegionSelector
            selectedRegion={currentRegion}
            selectedSubdivision={currentSubdivision}
            onSelectRegion={onSelectRegion}
          />
        </div>
      </div>

      {/* Main 3-Column Layout: Left Controls, Center 3D Globe, Right Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Controls & Filters Panel (3 cols) */}
        <div className="lg:col-span-3 bg-[#090d16] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-lg text-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                Planetary Filters
              </span>
              <button
                onClick={handleSwitchToGlobal}
                title="Reset to Worldwide"
                className="text-slate-400 hover:text-slate-200 p-1 flex items-center gap-1 text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Extent Banner */}
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
                {isGlobalMode ? (
                  <Globe className="w-4 h-4 text-orange-400 flex-shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                <span className="truncate">{displayName}</span>
              </div>
              {!isGlobalMode && boundaryGeoJSON && (
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 pt-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span>3D National boundary outline active</span>
                </div>
              )}
            </div>

            {/* Satellite Instrument Filter */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium">Satellite Instrument:</label>
              <select
                value={sensorFilter}
                onChange={(e) => setSensorFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-orange-500 font-medium"
              >
                <option value="ALL">All Sensors (MODIS + VIIRS)</option>
                <option value="MODIS">MODIS Terra & Aqua (1 km)</option>
                <option value="VIIRS">VIIRS NOAA-20 & S-NPP (375 m)</option>
              </select>
            </div>

            {/* Day / Night Filter */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium">Overpass Orbit:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'ALL', label: 'All Orbits' },
                  { id: 'D', label: '☀️ Day' },
                  { id: 'N', label: '🌙 Night' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDayNightFilter(item.id)}
                    className={`py-1.5 rounded-lg font-medium text-[11px] transition-colors border ${
                      dayNightFilter === item.id
                        ? 'bg-orange-600 border-orange-500 text-white font-semibold'
                        : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Min FRP Filter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Minimum FRP:</span>
                <span className="font-mono text-orange-400 font-bold">{minFRP} MW</span>
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
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 MW (All)</span>
                <span>50 MW</span>
                <span>100 MW+</span>
              </div>
            </div>

            {/* Min Confidence Filter */}
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

            {/* 10 Quick Navigation Presets */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-slate-400 font-medium flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Quick-View Presets (10):
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {NAVIGATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setTargetLatLon([preset.lat, preset.lon])}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 active:bg-orange-600 text-slate-300 hover:text-white rounded border border-slate-800 text-[11px] font-medium text-left truncate transition-colors flex items-center space-x-1"
                    title={`Orient globe to ${preset.label}`}
                  >
                    <span>{preset.icon}</span>
                    <span className="truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Planetary Controls Instructions */}
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300 block flex items-center justify-between">
              <span>3D Navigation Controls</span>
              <Compass className="w-3 h-3 text-orange-400" />
            </span>
            <div>• <span className="text-slate-200">Left Click + Drag:</span> Free 360° Rotate (Any axis)</div>
            <div>• <span className="text-slate-200">Right Click + Drag:</span> Pan Camera View</div>
            <div>• <span className="text-slate-200">Mouse Wheel:</span> Smooth Zoom In / Out</div>
            <div>• <span className="text-slate-200">Double-Click:</span> Smoothly Center & Zoom In</div>
            <div>• <span className="text-slate-200">Click Fire Marker:</span> Lock Telemetry & Focus View</div>
          </div>
        </div>

        {/* Center 3D Globe Container (6 cols) */}
        <div className="lg:col-span-6 h-[720px] rounded-xl overflow-hidden border border-slate-800 relative bg-[#05070d] shadow-2xl">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-[#05070d]">
              <LoadingSpinner
                message={
                  isGlobalMode
                    ? "Rendering worldwide NASA FIRMS active fire hotspots in 3D..."
                    : `Orienting 3D Earth towards ${displayName}...`
                }
              />
            </div>
          ) : (
            <Earth3DGlobe
              hotspots={hotspots}
              boundaryGeoJSON={boundaryGeoJSON}
              selectedHotspot={selectedHotspot}
              onSelectHotspot={setSelectedHotspot}
              targetLatLon={targetLatLon}
              isGlobalMode={isGlobalMode}
            />
          )}
        </div>

        {/* Right Telemetry & Hotspot Inspector (3 cols) */}
        <div className="lg:col-span-3 bg-[#090d16] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-lg text-xs">
          <div className="space-y-4">
            {/* Inspector Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                Fire Telemetry Inspector
              </span>
              {selectedHotspot && (
                <button
                  onClick={() => setSelectedHotspot(null)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  title="Deselect Hotspot"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selected Hotspot Detailed Card */}
            {selectedHotspot ? (
              <div className="bg-slate-900 border border-orange-500/50 rounded-xl p-3 space-y-2.5 shadow-xl animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                    <span className="font-bold text-white text-sm">
                      {selectedHotspot.satellite}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800/80 font-bold">
                    {selectedHotspot.instrument}
                  </span>
                </div>

                {/* FRP Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">Fire Radiative Power:</span>
                    <span className="font-mono text-base font-bold text-amber-400">
                      {selectedHotspot.frp} MW
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        selectedHotspot.frp > 100
                          ? 'bg-red-500'
                          : selectedHotspot.frp > 40
                          ? 'bg-orange-500'
                          : selectedHotspot.frp > 15
                          ? 'bg-amber-400'
                          : 'bg-yellow-300'
                      }`}
                      style={{ width: `${Math.min(selectedHotspot.frp, 150) / 1.5}%` }}
                    />
                  </div>
                </div>

                {/* Coordinates & Physical Measurements */}
                <div className="space-y-1.5 pt-1 text-[11px] text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Latitude:</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {selectedHotspot.latitude.toFixed(4)}° {selectedHotspot.latitude >= 0 ? 'N' : 'S'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Longitude:</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {selectedHotspot.longitude.toFixed(4)}° {selectedHotspot.longitude >= 0 ? 'E' : 'W'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Detection Confidence:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {selectedHotspot.confidence}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Acquisition Date:</span>
                    <span className="font-mono text-slate-200">
                      {selectedHotspot.acq_date}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Acquisition Time:</span>
                    <span className="font-mono text-slate-200">
                      {selectedHotspot.acq_time} UTC
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Overpass Orbit:</span>
                    <span className="font-semibold text-amber-300">
                      {selectedHotspot.daynight === 'D' ? '☀️ Daytime' : '🌙 Nighttime'}
                    </span>
                  </div>
                  {selectedHotspot.brightness && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Brightness Temp:</span>
                      <span className="font-mono text-slate-200">
                        {selectedHotspot.brightness} K
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-orange-400">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="text-slate-300 font-medium block">No Fire Selected</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Hover over any glowing fire marker to preview details, or click on a marker to lock and inspect its complete NASA FIRMS telemetry here.
                </p>
              </div>
            )}

            {/* Active View Aggregation Stats */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5">
              <span className="font-semibold text-slate-300 block border-b border-slate-800 pb-1.5 flex items-center justify-between">
                <span>3D Scene Statistics</span>
                <Activity className="w-3.5 h-3.5 text-orange-400" />
              </span>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Rendered Fires</div>
                  <div className="text-lg font-bold font-mono text-orange-400">
                    {hotspots.length.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Peak FRP</div>
                  <div className="text-lg font-bold font-mono text-red-400">
                    {peakFRP} <span className="text-[10px] text-slate-400 font-sans">MW</span>
                  </div>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Mean FRP</div>
                  <div className="text-lg font-bold font-mono text-amber-400">
                    {avgFRP} <span className="text-[10px] text-slate-400 font-sans">MW</span>
                  </div>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Intense (&gt;40MW)</div>
                  <div className="text-lg font-bold font-mono text-white">
                    {intenseFiresCount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                <span>MODIS: <strong className="text-amber-400 font-mono">{modisCount}</strong></span>
                <span>VIIRS: <strong className="text-orange-400 font-mono">{viirsCount}</strong></span>
              </div>
            </div>

            {/* Scientific Harmonization Note */}
            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-300 flex items-center gap-1">
                <Satellite className="w-3.5 h-3.5 text-sky-400" />
                <span>Geospatial Spherical Projection</span>
              </div>
              <p className="leading-relaxed text-[10px]">
                Latitude/Longitude coordinates from NASA FIRMS are mathematically projected to WGS84 3D Cartesian coordinates \((x, y, z)\) on the rotating planetary geoid.
              </p>
            </div>
          </div>

          {/* Extent Status Pill */}
          {isGlobalMode ? (
            <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Worldwide authentic FIRMS active detections (6 continents)</span>
            </div>
          ) : (
            <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{hotspots.length} detections inside {currentRegion} polygon</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
