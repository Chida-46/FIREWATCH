import React, { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polygon,
  GeoJSON,
  Tooltip,
  useMap,
  useMapEvents
} from 'react-leaflet';
import { HotspotRecord } from '../types';
import { Flame, Layers, Eye, Map, Globe, ZoomIn, Info } from 'lucide-react';

interface FireMapProps {
  hotspots: HotspotRecord[];
  gridGeoJSON?: any;
  boundaryGeoJSON?: any;
  center?: [number, number];
  zoom?: number;
  showHarmonizedGrid?: boolean;
  isGlobalMode?: boolean;
}

// Controller to smoothly fly to new coordinates
const MapViewController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.0 });
  }, [center, zoom, map]);
  return null;
};

// Map Zoom & Pan Tracker
const MapZoomTracker: React.FC<{ onZoomChange: (z: number) => void }> = ({ onZoomChange }) => {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom())
  });
  return null;
};

// Cluster Click Handler to fly into region
const ClusterMarker: React.FC<{
  cluster: { lat: number; lon: number; count: number; meanFrp: number; maxFrp: number; modis: number; viirs: number };
}> = ({ cluster }) => {
  const map = useMap();
  const radius = Math.min(32, Math.max(16, 14 + Math.log2(cluster.count) * 2.5));
  
  const color = cluster.maxFrp > 100 ? '#dc2626' : (cluster.meanFrp > 40 ? '#ea580c' : '#f59e0b');

  return (
    <CircleMarker
      center={[cluster.lat, cluster.lon]}
      radius={radius}
      pathOptions={{
        color: '#ffffff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.88
      }}
      eventHandlers={{
        click: () => {
          map.flyTo([cluster.lat, cluster.lon], 6, { duration: 0.8 });
        }
      }}
    >
      <Tooltip
        permanent
        direction="center"
        className="!bg-transparent !border-0 !shadow-none !p-0"
      >
        <span className="font-mono font-bold text-white text-[11px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] select-none cursor-pointer">
          {cluster.count > 999 ? `${(cluster.count / 1000).toFixed(1)}k` : cluster.count}
        </span>
      </Tooltip>
      <Popup>
        <div className="text-xs space-y-1.5 min-w-[200px]">
          <div className="font-bold text-orange-400 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              Regional Fire Cluster
            </span>
            <span className="text-[10px] text-slate-300 font-mono">Zoom to expand</span>
          </div>
          <div className="text-slate-300 space-y-1 text-[11px]">
            <div>Total Detections: <span className="font-mono font-bold text-white">{cluster.count.toLocaleString()}</span></div>
            <div>MODIS Detections: <span className="font-mono text-amber-400">{cluster.modis}</span></div>
            <div>VIIRS Detections: <span className="font-mono text-orange-400">{cluster.viirs}</span></div>
            <div>Mean FRP: <span className="font-mono text-slate-200">{cluster.meanFrp} MW</span></div>
            <div>Peak FRP: <span className="font-mono text-rose-400 font-bold">{cluster.maxFrp} MW</span></div>
          </div>
          <button
            onClick={() => map.flyTo([cluster.lat, cluster.lon], 6, { duration: 0.8 })}
            className="w-full mt-1 px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-bold text-center"
          >
            🔍 Zoom In to Individual Fires
          </button>
        </div>
      </Popup>
    </CircleMarker>
  );
};

export const FireMapComponent: React.FC<FireMapProps> = ({
  hotspots,
  gridGeoJSON,
  boundaryGeoJSON,
  center = [20.0, 0.0],
  zoom = 2,
  showHarmonizedGrid = true,
  isGlobalMode = false
}) => {
  const [selectedSensor, setSelectedSensor] = useState<string>('ALL');
  const [showGrid, setShowGrid] = useState<boolean>(showHarmonizedGrid);
  const [baseMap, setBaseMap] = useState<'dark' | 'satellite' | 'osm'>('dark');
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [forceIndividualPoints, setForceIndividualPoints] = useState<boolean>(false);

  // Filter hotspots by sensor
  const filteredHotspots = useMemo(() => {
    return hotspots.filter((h) => {
      if (selectedSensor === 'ALL') return true;
      if (selectedSensor === 'MODIS') return h.instrument === 'MODIS';
      if (selectedSensor === 'VIIRS') return h.instrument === 'VIIRS';
      return h.satellite.includes(selectedSensor);
    });
  }, [hotspots, selectedSensor]);

  // Spatial clustering for low zoom levels
  const clusters = useMemo(() => {
    if (forceIndividualPoints || currentZoom >= 5) return [];
    const gridSize = currentZoom <= 2 ? 8.0 : (currentZoom === 3 ? 5.0 : 3.0);
    const groups: Record<string, { latSum: number; lonSum: number; count: number; maxFrp: number; frpSum: number; modis: number; viirs: number }> = {};

    for (const h of filteredHotspots) {
      const gLat = Math.floor(h.latitude / gridSize) * gridSize;
      const gLon = Math.floor(h.longitude / gridSize) * gridSize;
      const key = `${gLat}_${gLon}`;
      if (!groups[key]) {
        groups[key] = { latSum: 0, lonSum: 0, count: 0, maxFrp: 0, frpSum: 0, modis: 0, viirs: 0 };
      }
      groups[key].latSum += h.latitude;
      groups[key].lonSum += h.longitude;
      groups[key].count += 1;
      groups[key].frpSum += h.frp;
      groups[key].maxFrp = Math.max(groups[key].maxFrp, h.frp);
      if (h.instrument === 'MODIS') groups[key].modis += 1;
      else groups[key].viirs += 1;
    }

    return Object.values(groups).map((g) => ({
      lat: g.latSum / g.count,
      lon: g.lonSum / g.count,
      count: g.count,
      meanFrp: Math.round((g.frpSum / g.count) * 10) / 10,
      maxFrp: g.maxFrp,
      modis: g.modis,
      viirs: g.viirs
    }));
  }, [filteredHotspots, currentZoom, forceIndividualPoints]);

  const getMarkerColor = (frp: number, inst: string) => {
    if (frp > 100) return '#dc2626'; // Extreme
    if (frp > 40) return '#ea580c';  // High
    if (frp > 15) return '#f59e0b';  // Moderate
    return inst === 'MODIS' ? '#fbbf24' : '#fde047'; // Low
  };

  const isClusteredView = !forceIndividualPoints && currentZoom < 5 && clusters.length > 0;

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-slate-800 bg-[#090d16] flex flex-col">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 shadow-xl max-w-[95%]">
        {/* Sensor selector */}
        <div className="flex items-center space-x-1 border-r border-slate-700 pr-2">
          <Layers className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-semibold text-slate-300">Sensor:</span>
          <select
            value={selectedSensor}
            onChange={(e) => setSelectedSensor(e.target.value)}
            className="bg-slate-800 text-xs font-medium text-slate-200 rounded px-1.5 py-1 border border-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Hotspots ({hotspots.length})</option>
            <option value="MODIS">MODIS (Terra/Aqua 1 km)</option>
            <option value="VIIRS">VIIRS (375m I-band)</option>
            <option value="Terra">Terra MODIS</option>
            <option value="Aqua">Aqua MODIS</option>
            <option value="NOAA-20">NOAA-20 VIIRS</option>
            <option value="Suomi-NPP">Suomi-NPP VIIRS</option>
          </select>
        </div>

        {/* View Mode Indicator / Clustering Toggle */}
        <button
          onClick={() => setForceIndividualPoints(!forceIndividualPoints)}
          className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
            isClusteredView
              ? 'bg-amber-600/30 text-amber-300 border-amber-500/60'
              : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60'
          }`}
          title="Toggle between clustered view and individual hotspot markers"
        >
          {isClusteredView ? (
            <>
              <ZoomIn className="w-3 h-3 text-amber-400" />
              <span>Clustered ({clusters.length} regions)</span>
            </>
          ) : (
            <>
              <Flame className="w-3 h-3 text-emerald-400" />
              <span>Individual Pins ({filteredHotspots.length})</span>
            </>
          )}
        </button>

        {/* Harmonized Grid Toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-md font-medium border transition-colors ${
            showGrid
              ? 'bg-orange-600/30 text-orange-400 border-orange-500/60'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>Grid</span>
        </button>

        {/* Base Map Switcher */}
        <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 p-0.5 text-xs font-mono">
          <button
            onClick={() => setBaseMap('dark')}
            className={`px-2 py-0.5 rounded transition-colors ${
              baseMap === 'dark' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => setBaseMap('satellite')}
            className={`px-2 py-0.5 rounded transition-colors ${
              baseMap === 'satellite' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
            }`}
          >
            🛰️ Sat
          </button>
          <button
            onClick={() => setBaseMap('osm')}
            className={`px-2 py-0.5 rounded transition-colors ${
              baseMap === 'osm' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
            }`}
          >
            OSM
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-300 pl-1 font-bold">
          {filteredHotspots.length.toLocaleString()} real FIRMS points
        </span>
      </div>

      {/* FRP Legend Bottom Right */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md p-2.5 rounded-lg border border-slate-700 text-[11px] space-y-1 shadow-lg pointer-events-none">
        <span className="font-semibold text-slate-300 block">Fire Radiative Power (MW)</span>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
          <span className="text-slate-300">&gt; 100 MW (Extreme)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" />
          <span className="text-slate-300">40 – 100 MW (High)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
          <span className="text-slate-300">15 – 40 MW (Moderate)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#fde047]" />
          <span className="text-slate-300">&lt; 15 MW (Low)</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full flex-1"
        scrollWheelZoom={true}
      >
        <MapViewController center={center} zoom={zoom} />
        <MapZoomTracker onZoomChange={(z) => setCurrentZoom(z)} />

        {/* Clean, Watermark-Free Esri Base Layers */}
        {baseMap === 'dark' && (
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; NASA FIRMS'
              url="https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
            <TileLayer
              attribution='&copy; Esri labels'
              url="https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
          </>
        )}

        {baseMap === 'satellite' && (
          <TileLayer
            attribution='&copy; Esri World Imagery & NASA Worldview'
            url="https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={17}
          />
        )}

        {baseMap === 'osm' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={18}
          />
        )}

        {/* Official Country Boundary Outline (Only when in Country Mode) */}
        {!isGlobalMode && boundaryGeoJSON && (
          <GeoJSON
            key={`boundary-${boundaryGeoJSON.properties?.name || 'country'}`}
            data={boundaryGeoJSON}
            style={{
              color: '#ea580c',
              weight: 2,
              fillColor: '#f97316',
              fillOpacity: 0.05,
              dashArray: '4, 4'
            }}
          />
        )}

        {/* Harmonized Grid Polygons */}
        {showGrid && gridGeoJSON && gridGeoJSON.features && gridGeoJSON.features.map((f: any, idx: number) => {
          const coords = f.geometry.coordinates[0].map((pt: number[]) => [pt[1], pt[0]]);
          const props = f.properties;
          return (
            <Polygon
              key={`grid-${props.cell_id || idx}`}
              positions={coords}
              pathOptions={{
                color: '#f97316',
                weight: 1,
                fillColor: '#ea580c',
                fillOpacity: Math.min(0.65, 0.12 + (props.total_count / 15.0) * 0.45)
              }}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-orange-400 border-b border-slate-700 pb-1">
                    Harmonized Grid Cell: {props.cell_id}
                  </div>
                  <div>Total Detections: <span className="font-mono font-bold text-white">{props.total_count}</span></div>
                  <div>MODIS Detections: <span className="font-mono text-amber-400">{props.modis_count}</span></div>
                  <div>VIIRS Detections: <span className="font-mono text-orange-400">{props.viirs_count}</span></div>
                  <div>Mean FRP: <span className="font-mono text-slate-200">{props.mean_frp} MW</span></div>
                  <div>Max FRP: <span className="font-mono text-slate-200">{props.max_frp} MW</span></div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 1. CLUSTERED VIEW (Low Zoom Levels in Global / Continental View) */}
        {isClusteredView && clusters.map((c, idx) => (
          <ClusterMarker key={`cluster-${idx}-${c.lat}-${c.lon}`} cluster={c} />
        ))}

        {/* 2. INDIVIDUAL HOTSPOT PINS (Zoomed-in or Force Individual Mode) */}
        {!isClusteredView && filteredHotspots.map((h, i) => {
          const color = getMarkerColor(h.frp, h.instrument);
          const radius = h.instrument === 'MODIS' ? 6 : 4;

          return (
            <CircleMarker
              key={`hotspot-${i}-${h.latitude}-${h.longitude}`}
              center={[h.latitude, h.longitude]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: 1
              }}
            >
              <Popup>
                <div className="text-xs space-y-1.5 min-w-[210px]">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                    <span className="font-bold text-orange-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      {h.satellite} ({h.instrument})
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 px-1 rounded text-slate-300">
                      {h.daynight === 'D' ? '☀️ Day' : '🌙 Night'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300 text-[11px]">
                    <div><b>Date:</b> {h.acq_date}</div>
                    <div><b>Time:</b> {h.acq_time} UTC</div>
                    <div><b>Coordinates:</b></div>
                    <div className="font-mono">{h.latitude.toFixed(3)}, {h.longitude.toFixed(3)}</div>
                    <div><b>FRP:</b></div>
                    <div className="font-mono text-amber-400 font-bold">{h.frp} MW</div>
                    <div><b>Confidence:</b></div>
                    <div className="font-mono">{h.confidence}%</div>
                    <div><b>Brightness:</b></div>
                    <div className="font-mono">{h.brightness || 320} K</div>
                    <div><b>Resolution:</b></div>
                    <div className="font-mono text-slate-400">
                      {h.instrument === 'MODIS' ? '1 km (nominal)' : '375 m (I-band)'}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                    Source: <span className="text-slate-300">{h.source_product}</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};
