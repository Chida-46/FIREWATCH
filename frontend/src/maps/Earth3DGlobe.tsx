import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HotspotRecord } from '../types';
import {
  Flame,
  Layers,
  Eye,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Info,
  ShieldCheck,
  Globe,
  Compass,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Satellite,
  Zap,
  Mountain,
  Moon,
  MapPin,
  Search,
  Check,
  Loader2
} from 'lucide-react';

interface Earth3DGlobeProps {
  hotspots: HotspotRecord[];
  boundaryGeoJSON?: any;
  selectedHotspot: HotspotRecord | null;
  onSelectHotspot: (hotspot: HotspotRecord | null) => void;
  targetLatLon?: [number, number];
  isGlobalMode?: boolean;
}

/**
 * Mathematically convert Latitude and Longitude to 3D Cartesian coordinates on the sphere.
 * Aligned 1:1 with Three.js SphereGeometry (rotated -90deg Y) so that:
 * - Latitude: [-90 S, +90 N] maps to Y [-R, +R]
 * - Longitude 0 (Prime Meridian, Greenwich): maps to +Z (directly facing camera at identity orientation)
 * - Positive Longitude (East, e.g. India, Asia): maps to +X (Right)
 * - Negative Longitude (West, e.g. Americas): maps to -X (Left)
 */
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const x = radius * Math.cos(latRad) * Math.sin(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.cos(lonRad);
  return new THREE.Vector3(x, y, z);
}

// Color scale based on NASA FIRMS Fire Radiative Power (MW)
function getFRPColor(frp: number): THREE.Color {
  if (frp > 100) return new THREE.Color(0xdc2626); // Extreme red (>100 MW)
  if (frp > 40) return new THREE.Color(0xea580c);  // High orange (40-100 MW)
  if (frp > 15) return new THREE.Color(0xf59e0b);  // Moderate amber (15-40 MW)
  return new THREE.Color(0xfde047);                // Low yellow (<15 MW)
}

// 10 Quick Navigation Presets
export const NAVIGATION_PRESETS = [
  { id: 'default', label: 'Default View', icon: '🌍', lat: 20, lon: 0 },
  { id: 'north_pole', label: 'North Pole', icon: '❄️', lat: 90, lon: 0 },
  { id: 'south_pole', label: 'South Pole', icon: '🧊', lat: -90, lon: 0 },
  { id: 'africa', label: 'Africa', icon: '🌍', lat: 5, lon: 20 },
  { id: 'asia', label: 'Asia', icon: '🌏', lat: 35, lon: 95 },
  { id: 'europe', label: 'Europe', icon: '🌍', lat: 50, lon: 15 },
  { id: 'north_america', label: 'North America', icon: '🌎', lat: 40, lon: -100 },
  { id: 'south_america', label: 'South America', icon: '🌎', lat: -15, lon: -60 },
  { id: 'australia', label: 'Australia', icon: '🦘', lat: -25, lon: 135 },
  { id: 'india', label: 'India', icon: '🇮🇳', lat: 20.5, lon: 78.9 },
];

export interface SatelliteProvider {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  attribution: string;
  maxZoom: number;
  minZoom: number;
  getUrl: (z: number, x: number, y: number) => string;
}

export const SATELLITE_PROVIDERS: Record<string, SatelliteProvider> = {
  esri_satellite: {
    id: 'esri_satellite',
    name: 'Ultra-HD Satellite (Esri World Imagery)',
    shortName: 'Ultra-HD Sat',
    icon: '🛰️',
    attribution: 'Esri, Maxar, Earthstar Geographics, CNES/Airbus DS',
    maxZoom: 18,
    minZoom: 1,
    getUrl: (z, x, y) => `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
  },
  nasa_bluemarble: {
    id: 'nasa_bluemarble',
    name: 'NASA Blue Marble (Relief & Bathymetry)',
    shortName: 'NASA Marble',
    icon: '🌍',
    attribution: 'NASA Earth Observatory / GIBS',
    maxZoom: 8,
    minZoom: 1,
    getUrl: (z, x, y) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/default/GoogleMapsCompatible_Level8/${z}/${y}/${x}.jpeg`
  },
  nasa_modis: {
    id: 'nasa_modis',
    name: 'NASA MODIS TrueColor (Terra Daily)',
    shortName: 'NASA MODIS',
    icon: '🌐',
    attribution: 'NASA EOSDIS GIBS (Terra)',
    maxZoom: 9,
    minZoom: 1,
    getUrl: (z, x, y) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-05-01/GoogleMapsCompatible_Level9/${z}/${y}/${x}.jpg`
  },
  osm_topo: {
    id: 'osm_topo',
    name: 'Topographic Terrain & Contours',
    shortName: 'Topo Terrain',
    icon: '🏔️',
    attribution: 'OpenTopoMap / OpenStreetMap contributors',
    maxZoom: 15,
    minZoom: 1,
    getUrl: (z, x, y) => `https://tile.opentopomap.org/${z}/${x}/${y}.png`
  }
};

interface TileEntry {
  mesh: THREE.Mesh;
  texture: THREE.Texture;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  zoom: number;
  key: string;
  providerId: string;
  lastUsed: number;
}

/**
 * Generate a curved spherical patch geometry for Web Mercator tile (z, x, y).
 * Uses exact inverse Web Mercator latitude projection so texture maps without stretching.
 */
function createTileGeometry(z: number, x: number, y: number, radius: number, segs = 12): THREE.BufferGeometry {
  const n = Math.pow(2, z);
  const lonMin = (x / n) * 360.0 - 180.0;
  const lonMax = ((x + 1) / n) * 360.0 - 180.0;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segs; j++) {
    const v = j / segs;
    const yMerc = y + v;
    // Standard Web Mercator inverse projection to latitude
    const latRad = Math.atan(Math.sinh(Math.PI * (1.0 - (2.0 * yMerc) / n)));

    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const lon = lonMin + u * (lonMax - lonMin);
      const lonRad = (lon * Math.PI) / 180.0;

      const x3d = radius * Math.cos(latRad) * Math.sin(lonRad);
      const y3d = radius * Math.sin(latRad);
      const z3d = radius * Math.cos(latRad) * Math.cos(lonRad);

      positions.push(x3d, y3d, z3d);
      uvs.push(u, 1.0 - v);
    }
  }

  for (let j = 0; j < segs; j++) {
    for (let i = 0; i < segs; i++) {
      const v1 = j * (segs + 1) + i;
      const v2 = j * (segs + 1) + (i + 1);
      const v3 = (j + 1) * (segs + 1) + i;
      const v4 = (j + 1) * (segs + 1) + (i + 1);
      indices.push(v1, v3, v2, v2, v3, v4);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Maps camera altitude and current zoom to descriptive multi-level LOD information.
 */
function getLODInfo(altitude: number, activeZoom: number) {
  let level = 1;
  let label = 'LOD 1 · Global Earth (NASA Blue Marble)';

  if (altitude > 7.5) {
    level = 1;
    label = 'LOD 1 · Global View (Base 2K)';
  } else if (altitude > 4.2) {
    level = 2;
    label = `LOD 2 · Continental (Level ${activeZoom})`;
  } else if (altitude > 2.2) {
    level = 3;
    label = `LOD 3 · Country (Level ${activeZoom})`;
  } else if (altitude > 1.0) {
    level = 4;
    label = `LOD 4 · Regional Terrain (Level ${activeZoom})`;
  } else if (altitude > 0.4) {
    level = 5;
    label = `LOD 5 · Local Detail (Level ${activeZoom})`;
  } else {
    level = 5;
    label = `LOD 5+ · Ultra-HD Surface (Level ${activeZoom})`;
  }

  return { level, label };
}

export const Earth3DGlobe: React.FC<Earth3DGlobeProps> = ({
  hotspots,
  boundaryGeoJSON,
  selectedHotspot,
  onSelectHotspot,
  targetLatLon,
  isGlobalMode = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotRecord | null>(null);
  const [hoveredLandmark, setHoveredLandmark] = useState<any | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Separate state variables for rotation, hotspot visibility, satellite layers
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [showFireHotspots, setShowFireHotspots] = useState<boolean>(true);
  const [showMODIS, setShowMODIS] = useState<boolean>(true);
  const [showVIIRS, setShowVIIRS] = useState<boolean>(true);
  const [showClouds, setShowClouds] = useState<boolean>(true);
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(true);
  const [showBorders, setShowBorders] = useState<boolean>(true);

  // Google Earth-Style Visual Quality Upgrade States
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1.5); // 0x (Flat), 1x (Natural), 2x (3D Mountain), 3x (Peak)
  const [showNightLights, setShowNightLights] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);

  // Ultra-High-Resolution Multi-Level Tiled Satellite Imagery States
  const [showUltraHDTiles, setShowUltraHDTiles] = useState<boolean>(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('esri_satellite');
  const [showProviderMenu, setShowProviderMenu] = useState<boolean>(false);
  const [currentLODInfo, setCurrentLODInfo] = useState<{
    lodLevel: number;
    lodLabel: string;
    zoom: number;
    activeCount: number;
    loadingCount: number;
  }>({
    lodLevel: 1,
    lodLabel: 'LOD 1 · Global Earth (NASA Blue Marble)',
    zoom: 1,
    activeCount: 0,
    loadingCount: 0
  });

  const [activePreset, setActivePreset] = useState<string>('default');
  const [webGLError, setWebGLError] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState<boolean>(false);

  // Dedicated Ref for animation loop so toggling rotation NEVER tears down Three.js scene
  const isAutoRotatingRef = useRef<boolean>(true);

  // Ref to hold currently visible hotspots for fast, accurate raycasting lookup
  const visibleHotspotsRef = useRef<HotspotRecord[]>([]);

  // Ref for landmarks list and Three.js landmark group
  const landmarksListRef = useRef<any[]>([]);
  const landmarksGroupRef = useRef<THREE.Group | null>(null);

  // Track target coordinate key to prevent redundant orientations
  const lastTargetLatLonRef = useRef<string>('');

  // Cycle Terrain Relief Exaggeration (0x -> 1x -> 2x -> 3x -> 0x)
  const cycleTerrainExaggeration = () => {
    setTerrainExaggeration((prev) => {
      if (prev === 0) return 1.0;
      if (prev === 1.0) return 2.0;
      if (prev === 2.0) return 3.0;
      return 0;
    });
  };

  // Satellite counts for independent layer badges
  const modisCount = useMemo(() => {
    return hotspots.filter((h) => h.instrument === 'MODIS').length;
  }, [hotspots]);

  const viirsCount = useMemo(() => {
    return hotspots.filter((h) => h.instrument === 'VIIRS' || h.instrument !== 'MODIS').length;
  }, [hotspots]);

  // Filter visible hotspots based on independent satellite layers
  const visibleHotspots = useMemo(() => {
    if (!showFireHotspots) return [];
    return hotspots.filter((h) => {
      const isModis = h.instrument === 'MODIS';
      if (isModis && !showMODIS) return false;
      if (!isModis && !showVIIRS) return false;
      return true;
    });
  }, [hotspots, showFireHotspots, showMODIS, showVIIRS]);

  useEffect(() => {
    visibleHotspotsRef.current = visibleHotspots;
  }, [visibleHotspots]);

  // Stop Spinning / Resume Rotation Handler (Section 1 & 6)
  const toggleAutoRotation = useCallback(() => {
    setIsAutoRotating((prev) => {
      const next = !prev;
      isAutoRotatingRef.current = next;

      // Diagnostic logging explicitly requested in Section 6:
      console.log('[FIREWATCH 3D DIAGNOSTIC] Rotation Toggled:', {
        isAutoRotating: next,
        totalFireDetections: hotspots.length,
        visibleMarkersCount: visibleHotspots.length,
        modisMarkerCount: modisCount,
        viirsMarkerCount: viirsCount,
        satelliteLayerVisibility: {
          showFireHotspots,
          showMODIS,
          showVIIRS
        },
        threeSceneChildCount: sceneRef.current ? sceneRef.current.children.length : 0,
        globeGroupChildCount: globeGroupRef.current ? globeGroupRef.current.children.length : 0
      });

      return next;
    });
  }, [hotspots.length, visibleHotspots.length, modisCount, viirsCount, showFireHotspots, showMODIS, showVIIRS]);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const bordersGroupRef = useRef<THREE.Group | null>(null);
  const beaconMeshRef = useRef<THREE.Mesh | null>(null);
  const tilesGroupRef = useRef<THREE.Group | null>(null);

  // Ultra-High Resolution Satellite Tile Caching & Management Refs
  const showUltraHDTilesRef = useRef<boolean>(true);
  const selectedProviderRef = useRef<string>('esri_satellite');
  const tileMeshCacheRef = useRef<Map<string, TileEntry>>(new Map());
  const pendingTilesRef = useRef<Set<string>>(new Set());
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);
  const normalTextureRef = useRef<THREE.Texture | null>(null);
  const bumpTextureRef = useRef<THREE.Texture | null>(null);
  const terrainExaggerationRef = useRef<number>(1.5);
  const lastTileUpdateTimeRef = useRef<number>(0);
  const currentLODInfoRef = useRef({
    lodLevel: 1,
    lodLabel: 'LOD 1 · Global Earth (NASA Blue Marble)',
    zoom: 1,
    activeCount: 0,
    loadingCount: 0
  });

  // Direct 3-Axis Virtual Trackball Drag & Inertia Tracking
  const isPointerDownRef = useRef<boolean>(false);
  const hasDraggedRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isInteractingRef = useRef<boolean>(false);
  const autoRotateResumeTimeoutRef = useRef<number | null>(null);

  // Smooth Quaternion SLERP Animation Refs
  const isSlerpingRef = useRef<boolean>(false);
  const slerpStartQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const slerpTargetQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const slerpProgressRef = useRef<number>(0);

  const GLOBE_RADIUS = 5.0;

  // Smoothly rotate the Earth to center any target latitude and longitude in front of camera
  const flyToLatLon = useCallback((lat: number, lon: number) => {
    const globe = globeGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!globe || !camera || !controls) return;

    // Vector in globe's local coordinate space for this lat/lon
    const pLocal = latLonToVector3(lat, lon, 1.0).normalize();

    // Direction vector from controls target towards camera in world space
    const vCam = camera.position.clone().sub(controls.target).normalize();

    // Compute rotation quaternion that aligns local lat/lon vector directly with camera view
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(pLocal, vCam);

    slerpStartQuatRef.current.copy(globe.quaternion);
    slerpTargetQuatRef.current.copy(targetQuat);
    slerpProgressRef.current = 0;
    isSlerpingRef.current = true;
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  // Smoothly rotate and zoom toward a clicked 3D world position
  const flyToWorldPoint = useCallback((worldPoint: THREE.Vector3) => {
    const globe = globeGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!globe || !camera || !controls) return;

    const vCam = camera.position.clone().sub(controls.target).normalize();
    const hitDir = worldPoint.clone().sub(globe.position).normalize();

    const qStep = new THREE.Quaternion().setFromUnitVectors(hitDir, vCam);
    const targetQuat = qStep.multiply(globe.quaternion);

    slerpStartQuatRef.current.copy(globe.quaternion);
    slerpTargetQuatRef.current.copy(targetQuat);
    slerpProgressRef.current = 0;
    isSlerpingRef.current = true;
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  // LRU cleanup to prune oldest invisible tile meshes when cache exceeds 100 entries
  const cleanOldTiles = useCallback(() => {
    if (tileMeshCacheRef.current.size <= 100) return;
    const entries = Array.from(tileMeshCacheRef.current.values())
      .filter((e) => !e.mesh.visible)
      .sort((a, b) => a.lastUsed - b.lastUsed);

    const toEvict = entries.slice(0, 20);
    for (const item of toEvict) {
      if (tilesGroupRef.current) {
        tilesGroupRef.current.remove(item.mesh);
      }
      item.geometry.dispose();
      item.texture.dispose();
      item.material.dispose();
      tileMeshCacheRef.current.delete(item.key);
    }
  }, []);

  // Asynchronously load single satellite tile with texture caching and mipmapping
  const loadTile = useCallback((z: number, x: number, y: number, provider: SatelliteProvider) => {
    const key = `${provider.id}_${z}_${x}_${y}`;
    if (pendingTilesRef.current.has(key)) return;
    pendingTilesRef.current.add(key);

    const url = provider.getUrl(z, x, y);

    if (!textureLoaderRef.current) {
      textureLoaderRef.current = new THREE.TextureLoader();
      textureLoaderRef.current.setCrossOrigin('anonymous');
    }

    textureLoaderRef.current.load(
      url,
      (texture) => {
        pendingTilesRef.current.delete(key);
        if (!tilesGroupRef.current || !rendererRef.current) return;

        texture.colorSpace = THREE.SRGBColorSpace;
        try {
          const maxAniso = rendererRef.current.capabilities.getMaxAnisotropy();
          texture.anisotropy = Math.min(16, maxAniso);
        } catch {}
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;

        // Curved spherical patch geometry placed at GLOBE_RADIUS + 0.003
        const geometry = createTileGeometry(z, x, y, GLOBE_RADIUS + 0.003, 12);

        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.78,
          metalness: 0.05,
          normalMap: normalTextureRef.current || undefined,
          normalScale: new THREE.Vector2(0.85 * terrainExaggerationRef.current, 0.85 * terrainExaggerationRef.current),
          bumpMap: bumpTextureRef.current || undefined,
          bumpScale: 0.08 * terrainExaggerationRef.current,
          depthWrite: true,
          depthTest: true,
          transparent: true,
          opacity: 1.0
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = showUltraHDTilesRef.current && selectedProviderRef.current === provider.id;
        tilesGroupRef.current.add(mesh);

        tileMeshCacheRef.current.set(key, {
          mesh,
          texture,
          geometry,
          material,
          zoom: z,
          key,
          providerId: provider.id,
          lastUsed: Date.now()
        });

        cleanOldTiles();
      },
      undefined,
      () => {
        pendingTilesRef.current.delete(key);
        // Resilient fallback: base Earth texture is always rendering underneath without black holes
      }
    );
  }, [cleanOldTiles, GLOBE_RADIUS]);

  // Compute camera viewpoint, altitude, and load visible multi-level LOD tiles
  const updateTiles = useCallback(() => {
    if (!showUltraHDTilesRef.current) {
      if (tilesGroupRef.current && tilesGroupRef.current.visible) {
        tilesGroupRef.current.visible = false;
      }
      return;
    }
    if (tilesGroupRef.current && !tilesGroupRef.current.visible) {
      tilesGroupRef.current.visible = true;
    }

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const globe = globeGroupRef.current;
    const tilesGroup = tilesGroupRef.current;
    if (!camera || !controls || !globe || !tilesGroup) return;

    const camPos = camera.position;
    const target = controls.target;
    const dist = camPos.distanceTo(target);
    const altitude = Math.max(0.01, dist - GLOBE_RADIUS);

    // Multi-level detail (LOD) zoom mapping
    let targetZoom = 1;
    if (altitude > 7.5) {
      targetZoom = 1; // Global Earth (Base 2K)
    } else if (altitude > 4.2) {
      targetZoom = 2; // Continental
    } else if (altitude > 2.2) {
      targetZoom = 4; // Country
    } else if (altitude > 1.0) {
      targetZoom = 6; // Regional
    } else if (altitude > 0.4) {
      targetZoom = 8; // High-detail local
    } else if (altitude > 0.18) {
      targetZoom = 10; // Ultra-HD local surface
    } else {
      targetZoom = 12; // Maximum satellite zoom
    }

    const provider = SATELLITE_PROVIDERS[selectedProviderRef.current] || SATELLITE_PROVIDERS.esri_satellite;
    const activeZoom = Math.min(targetZoom, provider.maxZoom);

    // Sub-camera point on globe surface
    const vCam = camPos.clone().sub(target).normalize();
    const qInv = globe.quaternion.clone().invert();
    const pLocal = vCam.clone().applyQuaternion(qInv).normalize();

    const latRad = Math.asin(Math.max(-1, Math.min(1, pLocal.y)));
    const lonRad = Math.atan2(pLocal.x, pLocal.z);
    const centerLat = (latRad * 180) / Math.PI;
    const centerLon = (lonRad * 180) / Math.PI;

    const n = Math.pow(2, activeZoom);
    const centerTileX = Math.floor(((centerLon + 180) / 360) * n);
    const clampedLat = Math.max(-85.0511, Math.min(85.0511, centerLat));
    const cLatRad = (clampedLat * Math.PI) / 180;
    const centerTileY = Math.floor(
      ((1 - Math.log(Math.tan(cLatRad) + 1 / Math.cos(cLatRad)) / Math.PI) / 2) * n
    );

    const span = activeZoom <= 1 ? 1 : 2;
    const neededKeys = new Set<string>();
    const tilesToLoad: { z: number; x: number; y: number; key: string; dot: number }[] = [];

    for (let dy = -span; dy <= span; dy++) {
      for (let dx = -span; dx <= span; dx++) {
        const tx = ((centerTileX + dx) % n + n) % n;
        const ty = centerTileY + dy;
        if (ty < 0 || ty >= n) continue;

        const key = `${provider.id}_${activeZoom}_${tx}_${ty}`;
        neededKeys.add(key);

        const tileMidLon = ((tx + 0.5) / n) * 360 - 180;
        const yMerc = ty + 0.5;
        const tLatRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * yMerc) / n)));
        const tLat = (tLatRad * 180) / Math.PI;

        const pTileLocal = latLonToVector3(tLat, tileMidLon, 1.0).normalize();
        const pTileWorld = pTileLocal.clone().applyQuaternion(globe.quaternion);
        const dot = pTileWorld.dot(vCam);

        if (dot >= -0.15) {
          tilesToLoad.push({ z: activeZoom, x: tx, y: ty, key, dot });
        }
      }
    }

    // Prioritize tiles closest to camera center
    tilesToLoad.sort((a, b) => b.dot - a.dot);

    // Update active visibility in cache
    let activeVisibleCount = 0;
    for (const [key, entry] of tileMeshCacheRef.current.entries()) {
      if (entry.providerId === provider.id && neededKeys.has(key)) {
        entry.mesh.visible = true;
        entry.lastUsed = Date.now();
        activeVisibleCount++;
      } else {
        entry.mesh.visible = false;
      }
    }

    // Load missing tiles in priority order
    for (const tile of tilesToLoad) {
      if (!tileMeshCacheRef.current.has(tile.key)) {
        loadTile(tile.z, tile.x, tile.y, provider);
      }
    }

    // Update UI LOD info (throttled to avoid state churn)
    const lod = getLODInfo(altitude, activeZoom);
    if (
      currentLODInfoRef.current.zoom !== activeZoom ||
      currentLODInfoRef.current.activeCount !== activeVisibleCount ||
      currentLODInfoRef.current.loadingCount !== pendingTilesRef.current.size
    ) {
      const updated = {
        lodLevel: lod.level,
        lodLabel: lod.label,
        zoom: activeZoom,
        activeCount: activeVisibleCount,
        loadingCount: pendingTilesRef.current.size
      };
      currentLODInfoRef.current = updated;
      setCurrentLODInfo(updated);
    }
  }, [loadTile, GLOBE_RADIUS]);

  // Handle Switching Satellite Imagery Providers
  const handleSelectProvider = useCallback((provId: string) => {
    setSelectedProvider(provId);
    selectedProviderRef.current = provId;
    setShowProviderMenu(false);

    for (const entry of tileMeshCacheRef.current.values()) {
      if (entry.providerId !== provId) {
        entry.mesh.visible = false;
      }
    }
    pendingTilesRef.current.clear();
    lastTileUpdateTimeRef.current = 0;
    updateTiles();
  }, [updateTiles]);

  // Toggle HD Tiles Layer
  const toggleUltraHDTiles = useCallback(() => {
    setShowUltraHDTiles((prev) => {
      const next = !prev;
      showUltraHDTilesRef.current = next;
      if (tilesGroupRef.current) {
        tilesGroupRef.current.visible = next;
      }
      if (next) {
        lastTileUpdateTimeRef.current = 0;
        updateTiles();
      }
      return next;
    });
  }, [updateTiles]);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLError('WebGL is not supported or enabled in your browser.');
        return;
      }
    } catch {
      setWebGLError('WebGL check failed.');
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 1000);
    camera.position.set(0, 2.5, 14);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls: Configured exclusively for smooth camera pan and zoom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = false; // Left drag is handled by natural virtual trackball on the globe
    controls.enableZoom = true;    // Wheel and pinch zooming
    controls.enablePan = true;     // Right-click and middle-click panning
    controls.minDistance = 5.08;   // Ultra-close zoom to inspect surface features and high-resolution tiles directly
    controls.maxDistance = 35.0;
    controls.zoomSpeed = 1.1;
    controls.panSpeed = 0.8;
    controls.mouseButtons = {
      LEFT: null as any,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN
    };
    controls.touches = {
      ONE: null as any,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sunLight.position.set(12, 8, 15);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-15, -5, -10);
    scene.add(rimLight);

    // Deep Space Starfield Background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 80 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);

      const color = Math.random() > 0.8 ? new THREE.Color(0x93c5fd) : (Math.random() > 0.8 ? new THREE.Color(0xfde047) : new THREE.Color(0xffffff));
      starColors[i] = color.r;
      starColors[i + 1] = color.g;
      starColors[i + 2] = color.b;
    }

    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starsMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.85 });
    const starField = new THREE.Points(starsGeo, starsMat);
    scene.add(starField);

    // Parent Globe Group (Rotates Earth, clouds, borders, and hotspots in perfect synchronization)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Texture Loader - Photorealistic NASA Blue Marble, Topography & Night Lights
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    textureLoaderRef.current = textureLoader;
    const dayTexture = textureLoader.load('/textures/earth_atmos_2048.jpg');
    const normalTexture = textureLoader.load('/textures/earth_normal_2048.jpg');
    const bumpTexture = textureLoader.load('/textures/earth_bump_2048.jpg');
    const specularTexture = textureLoader.load('/textures/earth_specular_2048.jpg');
    const lightsTexture = textureLoader.load('/textures/earth_lights_2048.png');
    const cloudsTexture = textureLoader.load('/textures/earth_clouds.png');

    normalTextureRef.current = normalTexture;
    bumpTextureRef.current = bumpTexture;

    dayTexture.colorSpace = THREE.SRGBColorSpace;
    lightsTexture.colorSpace = THREE.SRGBColorSpace;

    // High-Resolution 128x128 Geoid Sphere: Rotate -90deg Y so texture Prime Meridian (Lon 0) aligns with +Z
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);
    earthGeo.rotateY(-Math.PI / 2);
    const earthMat = new THREE.MeshStandardMaterial({
      map: dayTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.85 * terrainExaggeration, 0.85 * terrainExaggeration),
      bumpMap: bumpTexture,
      bumpScale: 0.08 * terrainExaggeration,
      roughnessMap: specularTexture,
      roughness: 0.72,
      metalness: 0.08,
      emissiveMap: lightsTexture,
      emissive: new THREE.Color(0xffe29a),
      emissiveIntensity: showNightLights ? 0.75 : 0.0,
      depthWrite: true,
      depthTest: true
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // Group for Multi-Level High-Resolution Satellite Tile Patches
    const tilesGroup = new THREE.Group();
    globeGroup.add(tilesGroup);
    tilesGroupRef.current = tilesGroup;

    // Dynamic Cloud Layer: Smooth differential drift with realistic transparency
    const cloudsGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.008, 128, 128);
    cloudsGeo.rotateY(-Math.PI / 2);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    globeGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // Atmospheric Rayleigh Scattering Outer Glow Rim Shader
    const atmosphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.18, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          // Exponential Rayleigh scattering gradient at planetary limb
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          vec3 corona = mix(vec3(0.18, 0.58, 1.0), vec3(0.35, 0.75, 1.0), vNormal.y * 0.5 + 0.5);
          gl_FragColor = vec4(corona, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // Borders Group for 3D Country Boundaries
    const bordersGroup = new THREE.Group();
    globeGroup.add(bordersGroup);
    bordersGroupRef.current = bordersGroup;

    // Landmarks & Mountain Summits Group
    const landmarksGroup = new THREE.Group();
    globeGroup.add(landmarksGroup);
    landmarksGroupRef.current = landmarksGroup;

    // Selected Fire Beacon Ring
    const beaconGeo = new THREE.RingGeometry(0.04, 0.08, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthTest: true
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.visible = false;
    globeGroup.add(beaconMesh);
    beaconMeshRef.current = beaconMesh;

    // Signal that scene and globeGroup are fully mounted and ready for markers/borders
    setSceneReady(true);

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop with Natural Inertia Deceleration
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // 1. Smooth SLERP Preset / Focus Animation
      if (isSlerpingRef.current && globeGroupRef.current) {
        slerpProgressRef.current += delta * 2.5; // ~0.4s smooth transition
        if (slerpProgressRef.current >= 1.0) {
          slerpProgressRef.current = 1.0;
          isSlerpingRef.current = false;
        }
        const t = 1 - Math.pow(1 - slerpProgressRef.current, 3);
        globeGroupRef.current.quaternion.slerpQuaternions(
          slerpStartQuatRef.current,
          slerpTargetQuatRef.current,
          t
        );
      }
      // 2. Natural Inertia Deceleration after Dragging
      else if (!isPointerDownRef.current && (Math.abs(velocityRef.current.x) > 0.02 || Math.abs(velocityRef.current.y) > 0.02)) {
        if (globeGroupRef.current && cameraRef.current) {
          const ROT_SPEED = 0.005;
          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion).normalize();
          const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraRef.current.quaternion).normalize();

          const qY = new THREE.Quaternion().setFromAxisAngle(camUp, velocityRef.current.x * ROT_SPEED);
          const qX = new THREE.Quaternion().setFromAxisAngle(camRight, velocityRef.current.y * ROT_SPEED);
          const qDelta = new THREE.Quaternion().multiplyQuaternions(qY, qX);

          globeGroupRef.current.quaternion.premultiply(qDelta);
          globeGroupRef.current.quaternion.normalize();

          // Smooth natural friction factor
          velocityRef.current.x *= 0.94;
          velocityRef.current.y *= 0.94;
        }
      }
      // 3. Gentle Polar Auto-Rotation around Earth's True Axis (uses isAutoRotatingRef)
      else if (isAutoRotatingRef.current && !isInteractingRef.current && globeGroupRef.current) {
        const qSpin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0012);
        globeGroupRef.current.quaternion.multiply(qSpin);
      }

      // Gentle cloud differential rotation
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.0003;
      }

      // Pulsing beacon animation on selected fire marker
      if (beaconMeshRef.current && beaconMeshRef.current.visible) {
        const time = clock.getElapsedTime();
        const scale = 1.0 + Math.sin(time * 5.0) * 0.25;
        beaconMeshRef.current.scale.set(scale, scale, scale);
      }

      // 4. Multi-Level LOD Satellite Imagery Tile Update (throttled ~200ms)
      const now = performance.now();
      if (now - lastTileUpdateTimeRef.current > 200) {
        lastTileUpdateTimeRef.current = now;
        updateTiles();
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();

      // Dispose all cached satellite tile geometries, textures and materials
      for (const item of tileMeshCacheRef.current.values()) {
        item.geometry.dispose();
        item.texture.dispose();
        item.material.dispose();
      }
      tileMeshCacheRef.current.clear();
      pendingTilesRef.current.clear();

      setSceneReady(false);
    };
  }, []); // Mounted ONCE - Never torn down by autoRotate, layer toggles, or filter changes!

  // Update Cloud & Atmosphere visibility
  useEffect(() => {
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.visible = showClouds;
    }
  }, [showClouds]);

  useEffect(() => {
    if (atmosphereMeshRef.current) {
      atmosphereMeshRef.current.visible = showAtmosphere;
    }
  }, [showAtmosphere]);

  // Update Terrain Relief Elevation Exaggeration in Real-time
  useEffect(() => {
    terrainExaggerationRef.current = terrainExaggeration;
    if (earthMeshRef.current) {
      const mat = earthMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.bumpScale = 0.08 * terrainExaggeration;
        mat.normalScale.set(0.85 * terrainExaggeration, 0.85 * terrainExaggeration);
        mat.needsUpdate = true;
      }
    }
    // Synchronize 3D mountain relief across all loaded satellite tiles
    for (const item of tileMeshCacheRef.current.values()) {
      if (item.material) {
        item.material.bumpScale = 0.08 * terrainExaggeration;
        item.material.normalScale.set(0.85 * terrainExaggeration, 0.85 * terrainExaggeration);
        item.material.needsUpdate = true;
      }
    }
  }, [terrainExaggeration]);

  // Update Night Lights in Real-time
  useEffect(() => {
    if (earthMeshRef.current) {
      const mat = earthMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = showNightLights ? 0.75 : 0.0;
        mat.needsUpdate = true;
      }
    }
  }, [showNightLights]);

  // Global Country Boundaries Layer (Natural Earth GeoJSON)
  useEffect(() => {
    const bordersGroup = bordersGroupRef.current;
    if (!bordersGroup || !sceneReady) return;

    while (bordersGroup.children.length > 0) {
      const obj = bordersGroup.children[0];
      bordersGroup.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) (obj as any).material.dispose();
    }

    if (!showBorders) return;

    // 1. Render all global international borders from world_borders_lines.json
    fetch('/data/world_borders_lines.json')
      .then((res) => res.json())
      .then((rings: number[][][]) => {
        if (!bordersGroupRef.current) return;

        let totalSegments = 0;
        for (const ring of rings) {
          totalSegments += Math.max(0, ring.length - 1);
        }

        const positions = new Float32Array(totalSegments * 2 * 3);
        let ptr = 0;

        for (const ring of rings) {
          for (let i = 0; i < ring.length - 1; i++) {
            const p1 = latLonToVector3(ring[i][1], ring[i][0], GLOBE_RADIUS * 1.0028);
            const p2 = latLonToVector3(ring[i + 1][1], ring[i + 1][0], GLOBE_RADIUS * 1.0028);

            positions[ptr++] = p1.x;
            positions[ptr++] = p1.y;
            positions[ptr++] = p1.z;
            positions[ptr++] = p2.x;
            positions[ptr++] = p2.y;
            positions[ptr++] = p2.z;
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.LineBasicMaterial({
          color: 0x38bdf8, // Crisp cyan international borders
          transparent: true,
          opacity: 0.42,
          depthTest: true
        });

        const lineSegments = new THREE.LineSegments(geo, mat);
        bordersGroup.add(lineSegments);
      })
      .catch((e) => console.warn('Could not load global borders:', e));

    // 2. Highlight active selected country boundary if in country mode
    if (!isGlobalMode && boundaryGeoJSON) {
      try {
        const coordsList: number[][][] = [];
        const geom = boundaryGeoJSON.geometry;

        if (geom.type === 'Polygon') {
          coordsList.push(geom.coordinates[0]);
        } else if (geom.type === 'MultiPolygon') {
          for (const poly of geom.coordinates) {
            coordsList.push(poly[0]);
          }
        }

        const activeLineMat = new THREE.LineBasicMaterial({
          color: 0xf97316,
          linewidth: 2,
          transparent: true,
          opacity: 0.95,
          depthTest: true
        });

        for (const ring of coordsList) {
          const points: THREE.Vector3[] = [];
          for (const coord of ring) {
            points.push(latLonToVector3(coord[1], coord[0], GLOBE_RADIUS * 1.0035));
          }
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          bordersGroup.add(new THREE.Line(lineGeo, activeLineMat));
        }
      } catch (err) {
        console.warn('Error rendering active country boundary:', err);
      }
    }
  }, [boundaryGeoJSON, showBorders, isGlobalMode, sceneReady]);

  // Major World Landmarks & Mountain Summits Layer (LOD)
  useEffect(() => {
    const landmarksGroup = landmarksGroupRef.current;
    if (!landmarksGroup || !sceneReady) return;

    while (landmarksGroup.children.length > 0) {
      const obj = landmarksGroup.children[0];
      landmarksGroup.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) (obj as any).material.dispose();
    }

    if (!showLandmarks) return;

    fetch('/data/world_landmarks.json')
      .then((res) => res.json())
      .then((items: any[]) => {
        if (!landmarksGroupRef.current) return;
        landmarksListRef.current = items;

        const summitGeo = new THREE.OctahedronGeometry(0.045, 0);
        const summitMat = new THREE.MeshBasicMaterial({
          color: 0x10b981, // Emerald green for mountain summits
          toneMapped: false,
          depthTest: true
        });

        const cityGeo = new THREE.SphereGeometry(0.035, 8, 8);
        const cityMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8, // Sky cyan for major cities
          toneMapped: false,
          depthTest: true
        });

        items.forEach((lm, idx) => {
          const pos = latLonToVector3(lm.lat, lm.lon, GLOBE_RADIUS * 1.004);
          const isMountain = lm.type === 'mountain' || lm.type === 'plateau';
          const mesh = new THREE.Mesh(isMountain ? summitGeo : cityGeo, isMountain ? summitMat : cityMat);
          mesh.position.copy(pos);
          mesh.userData = { landmarkIndex: idx, landmark: lm };
          landmarksGroup.add(mesh);
        });
      })
      .catch((e) => console.warn('Could not load landmarks:', e));
  }, [showLandmarks, sceneReady]);

  // Smoothly orient globe to target Lat/Lon when country or landmark changes
  useEffect(() => {
    if (!targetLatLon) return;
    const key = `${targetLatLon[0].toFixed(2)}_${targetLatLon[1].toFixed(2)}`;
    if (lastTargetLatLonRef.current === key) return;
    lastTargetLatLonRef.current = key;
    flyToLatLon(targetLatLon[0], targetLatLon[1]);

    // Smoothly zoom closer to regional scale to reveal high-resolution satellite tiles
    if (cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current;
      const target = controlsRef.current.target;
      const currentDist = cam.position.distanceTo(target);
      if (currentDist > 10.0) {
        const dir = cam.position.clone().sub(target).normalize();
        cam.position.copy(target).addScaledVector(dir, 7.8);
        controlsRef.current.update();
        lastTileUpdateTimeRef.current = 0;
      }
    }
  }, [targetLatLon, flyToLatLon]);

  // RENDER REAL NASA FIRMS HOTSPOTS ON 3D GLOBE
  // Mathematically anchored directly to the Earth's surface at authentic coordinates
  // Completely isolated from auto-rotation so stopping rotation NEVER affects hotspots!
  useEffect(() => {
    const globeGroup = globeGroupRef.current;
    if (!globeGroup) return;

    if (instancedMeshRef.current) {
      globeGroup.remove(instancedMeshRef.current);
      instancedMeshRef.current.geometry.dispose();
      (instancedMeshRef.current.material as THREE.Material).dispose();
      instancedMeshRef.current = null;
    }

    if (!visibleHotspots || visibleHotspots.length === 0) return;

    // Small, crisp, luminous spherical marker
    const markerGeo = new THREE.SphereGeometry(0.022, 10, 10);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      depthTest: true,
      depthWrite: true
    });

    const count = visibleHotspots.length;
    const instancedMesh = new THREE.InstancedMesh(markerGeo, markerMat, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const h = visibleHotspots[i];
      // Anchored directly on surface (GLOBE_RADIUS * 1.002 to prevent z-fighting)
      const pos = latLonToVector3(h.latitude, h.longitude, GLOBE_RADIUS * 1.002);
      dummy.position.copy(pos);

      // Subtle, proportional scaling based on FRP (Fire Radiative Power)
      const scale = Math.min(1.8, Math.max(0.7, 0.65 + Math.log10(Math.max(1, h.frp)) * 0.45));
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);
      const color = getFRPColor(h.frp);
      instancedMesh.setColorAt(i, color);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    globeGroup.add(instancedMesh);
    instancedMeshRef.current = instancedMesh;
  }, [visibleHotspots, sceneReady]);

  // Update Selected Beacon position
  useEffect(() => {
    if (!beaconMeshRef.current) return;
    if (!selectedHotspot) {
      beaconMeshRef.current.visible = false;
      return;
    }

    const pos = latLonToVector3(selectedHotspot.latitude, selectedHotspot.longitude, GLOBE_RADIUS * 1.006);
    beaconMeshRef.current.position.copy(pos);
    beaconMeshRef.current.lookAt(new THREE.Vector3(0, 0, 0));
    beaconMeshRef.current.visible = true;
  }, [selectedHotspot]);

  // NATURAL 3-AXIS VIRTUAL TRACKBALL ROTATION
  const rotateGlobeByDelta = (dx: number, dy: number) => {
    const globe = globeGroupRef.current;
    const camera = cameraRef.current;
    if (!globe || !camera) return;

    const ROT_SPEED = 0.005;
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

    // Rotate horizontally around camera's up axis
    const qY = new THREE.Quaternion().setFromAxisAngle(camUp, dx * ROT_SPEED);
    // Rotate vertically around camera's right axis (allows complete 360° rotation past poles and upside down)
    const qX = new THREE.Quaternion().setFromAxisAngle(camRight, dy * ROT_SPEED);

    const qDelta = new THREE.Quaternion().multiplyQuaternions(qY, qX);
    globe.quaternion.premultiply(qDelta);
    globe.quaternion.normalize();
  };

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current || !globeGroupRef.current) return;
    cameraRef.current.position.set(0, 2.5, 14);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();

    slerpStartQuatRef.current.copy(globeGroupRef.current.quaternion);
    slerpTargetQuatRef.current.set(0, 0, 0, 1); // Identity orientation (Prime Meridian at +Z)
    slerpProgressRef.current = 0;
    isSlerpingRef.current = true;
    velocityRef.current = { x: 0, y: 0 };
    setActivePreset('default');
    lastTargetLatLonRef.current = '';
  };

  // DIRECT MOUSE & TOUCH EVENT HANDLERS
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return; // Only primary button rotates globe; right/middle pan view

    isPointerDownRef.current = true;
    hasDraggedRef.current = false;
    pointerStartPosRef.current = { x: event.clientX, y: event.clientY };
    lastPointerPosRef.current = { x: event.clientX, y: event.clientY };
    velocityRef.current = { x: 0, y: 0 };

    isSlerpingRef.current = false; // Stop any ongoing preset animation immediately
    isInteractingRef.current = true; // Pause auto-rotation during manual interaction
    if (autoRotateResumeTimeoutRef.current) {
      window.clearTimeout(autoRotateResumeTimeoutRef.current);
      autoRotateResumeTimeoutRef.current = null;
    }

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    setMousePos({ x: event.clientX, y: event.clientY });

    if (isPointerDownRef.current) {
      const dx = event.clientX - pointerStartPosRef.current.x;
      const dy = event.clientY - pointerStartPosRef.current.y;
      if (Math.hypot(dx, dy) > 4) {
        hasDraggedRef.current = true;
        lastTargetLatLonRef.current = ''; // Clear target cache so clicking any preset re-orients
      }

      if (hasDraggedRef.current) {
        const stepX = event.clientX - lastPointerPosRef.current.x;
        const stepY = event.clientY - lastPointerPosRef.current.y;
        lastPointerPosRef.current = { x: event.clientX, y: event.clientY };

        // Free 360° 3-axis rotation
        rotateGlobeByDelta(stepX, stepY);

        // Track velocity for natural inertia deceleration
        velocityRef.current.x = stepX * 0.5 + velocityRef.current.x * 0.5;
        velocityRef.current.y = stepY * 0.5 + velocityRef.current.y * 0.5;
      }
    } else {
      // Hover Raycasting: only check front-facing markers not occluded by Earth
      if (!rendererRef.current || !cameraRef.current || !instancedMeshRef.current || !globeGroupRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObject(instancedMeshRef.current);
      let found: HotspotRecord | null = null;

      for (const hit of intersects) {
        if (hit.instanceId !== undefined) {
          // Verify marker is on the visible front hemisphere (not hidden behind Earth)
          const hitWorld = hit.point;
          const normal = hitWorld.clone().sub(globeGroupRef.current.position).normalize();
          const toCamera = cameraRef.current.position.clone().sub(hitWorld).normalize();
          if (normal.dot(toCamera) > 0.05) {
            found = visibleHotspotsRef.current[hit.instanceId] || null;
            break;
          }
        }
      }
      setHoveredHotspot(found);

      // Check landmarks hover
      let foundLm: any | null = null;
      if (landmarksGroupRef.current && showLandmarks && landmarksGroupRef.current.children.length > 0) {
        const lmHits = raycaster.intersectObjects(landmarksGroupRef.current.children);
        for (const hit of lmHits) {
          const hitWorld = hit.point;
          const normal = hitWorld.clone().sub(globeGroupRef.current.position).normalize();
          const toCamera = cameraRef.current.position.clone().sub(hitWorld).normalize();
          if (normal.dot(toCamera) > 0.05) {
            foundLm = hit.object.userData?.landmark || null;
            break;
          }
        }
      }
      setHoveredLandmark(foundLm);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    isPointerDownRef.current = false;

    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // Ignore if released
    }

    // Auto-rotation resumes smoothly after 1.8s ONLY if user has NOT paused rotation!
    if (isAutoRotatingRef.current) {
      autoRotateResumeTimeoutRef.current = window.setTimeout(() => {
        isInteractingRef.current = false;
      }, 1800);
    }

    // If mouse was clicked without dragging, inspect front-facing fire hotspot or landmark
    if (!hasDraggedRef.current) {
      if (!rendererRef.current || !cameraRef.current || !instancedMeshRef.current || !globeGroupRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check if landmark was clicked to fly smoothly to it
      if (landmarksGroupRef.current && showLandmarks && landmarksGroupRef.current.children.length > 0) {
        const lmHits = raycaster.intersectObjects(landmarksGroupRef.current.children);
        for (const hit of lmHits) {
          const hitWorld = hit.point;
          const normal = hitWorld.clone().sub(globeGroupRef.current.position).normalize();
          const toCamera = cameraRef.current.position.clone().sub(hitWorld).normalize();
          if (normal.dot(toCamera) > 0.05) {
            const lm = hit.object.userData?.landmark;
            if (lm) {
              flyToLatLon(lm.lat, lm.lon);
              return;
            }
          }
        }
      }

      const intersects = raycaster.intersectObject(instancedMeshRef.current);
      let selected: HotspotRecord | null = null;

      for (const hit of intersects) {
        if (hit.instanceId !== undefined) {
          // Occlusion test: ensure marker is on the visible front hemisphere
          const hitWorld = hit.point;
          const normal = hitWorld.clone().sub(globeGroupRef.current.position).normalize();
          const toCamera = cameraRef.current.position.clone().sub(hitWorld).normalize();
          if (normal.dot(toCamera) > 0.05) {
            selected = visibleHotspotsRef.current[hit.instanceId] || null;
            break;
          }
        }
      }

      if (selected) {
        onSelectHotspot(selected);
        flyToLatLon(selected.latitude, selected.longitude);
      }
    }
  };

  // Double-Click: Smoothly center and zoom towards the clicked geographic location
  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !globeGroupRef.current || !controlsRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // Raycast against the Earth mesh surface
    const intersects = raycaster.intersectObject(earthMeshRef.current || globeGroupRef.current, true);
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      flyToWorldPoint(hitPoint);

      // Smoothly zoom in closer
      const cam = cameraRef.current;
      const target = controlsRef.current.target;
      const dir = cam.position.clone().sub(target).normalize();
      const newDist = Math.max(controlsRef.current.minDistance, cam.position.distanceTo(target) - 2.5);
      cam.position.copy(target).addScaledVector(dir, newDist);
      controlsRef.current.update();
    }
  };

  if (webGLError) {
    return (
      <div className="w-full h-full min-h-[550px] flex flex-col items-center justify-center bg-[#070b14] border border-slate-800 rounded-2xl p-8 text-center text-slate-300 space-y-4">
        <Info className="w-12 h-12 text-rose-500 animate-bounce" />
        <h3 className="text-lg font-bold text-white">WebGL 3D Acceleration Required</h3>
        <p className="text-xs text-slate-400 max-w-md">
          {webGLError} Please check your browser settings to ensure hardware acceleration is enabled.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[580px] bg-[#05070d] rounded-2xl overflow-hidden border border-slate-800 select-none flex flex-col">
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Side: Layer Toggles & Fire Counter */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl pointer-events-auto">
          {/* Stop Spinning / Resume Rotation Button (Section 1) */}
          <button
            onClick={toggleAutoRotation}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-all shadow-sm ${
              isAutoRotating
                ? 'bg-orange-600/30 text-orange-300 border-orange-500/60 hover:bg-orange-600/40'
                : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 hover:bg-emerald-600/40'
            }`}
            title={isAutoRotating ? 'Click to Stop Spinning (Pauses only automatic rotation, keeps all fire markers visible)' : 'Click to Resume Rotation'}
          >
            {isAutoRotating ? (
              <>
                <Pause className="w-3.5 h-3.5 text-orange-400" />
                <span>Stop Spinning</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold">Resume Spin</span>
              </>
            )}
          </button>

          {/* Master Hotspots Layer Toggle */}
          <button
            onClick={() => setShowFireHotspots((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1 transition-all shadow-sm ${
              showFireHotspots
                ? 'bg-red-600/30 text-red-300 border-red-500/60 hover:bg-red-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={showFireHotspots ? 'Hide All Fire Hotspots' : 'Show All Fire Hotspots'}
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>{showFireHotspots ? 'Fires ON' : 'Fires OFF'}</span>
          </button>

          {/* Independent MODIS Satellite Layer Toggle */}
          <button
            onClick={() => setShowMODIS((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1 transition-all shadow-sm ${
              showMODIS
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/60 hover:bg-amber-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle MODIS satellite observations (Terra & Aqua 1 km)"
          >
            <Satellite className="w-3.5 h-3.5 text-amber-400" />
            <span>MODIS ({modisCount.toLocaleString()})</span>
          </button>

          {/* Independent VIIRS Satellite Layer Toggle */}
          <button
            onClick={() => setShowVIIRS((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1 transition-all shadow-sm ${
              showVIIRS
                ? 'bg-orange-600/30 text-orange-300 border-orange-500/60 hover:bg-orange-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle VIIRS satellite observations (Suomi-NPP & NOAA-20 375 m)"
          >
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span>VIIRS ({viirsCount.toLocaleString()})</span>
          </button>

          {/* Multi-Level High-Resolution Satellite Tiles Layer Toggle */}
          <button
            onClick={toggleUltraHDTiles}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1 transition-all shadow-sm ${
              showUltraHDTiles
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 hover:bg-blue-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Ultra-High-Resolution Multi-Level Satellite Imagery Tiles"
          >
            <Satellite className="w-3.5 h-3.5 text-blue-400" />
            <span>{showUltraHDTiles ? 'HD Tiles ON' : 'HD Tiles OFF'}</span>
          </button>

          {/* Satellite Imagery Provider Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProviderMenu((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 flex items-center space-x-1.5 transition-all shadow-sm"
              title="Switch High-Resolution Satellite Imagery Layer"
            >
              <span>{SATELLITE_PROVIDERS[selectedProvider]?.icon || '🛰️'}</span>
              <span>{SATELLITE_PROVIDERS[selectedProvider]?.shortName || 'Satellite'}</span>
              <Layers className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {showProviderMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider border-b border-slate-800">
                  Select Satellite Imagery Layer
                </div>
                {Object.values(SATELLITE_PROVIDERS).map((p) => {
                  const isSel = p.id === selectedProvider;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProvider(p.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSel
                          ? 'bg-orange-600/30 text-orange-200 font-semibold border border-orange-500/50'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span>{p.icon}</span>
                        <div className="truncate">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="text-[9px] text-slate-400 truncate">{p.attribution}</div>
                        </div>
                      </div>
                      {isSel && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Multi-Level LOD Resolution Badge */}
          {showUltraHDTiles && (
            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950/80 border border-slate-700/60 rounded-lg text-[11px] font-mono text-sky-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate max-w-[210px]">{currentLODInfo.lodLabel}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 shrink-0">{currentLODInfo.activeCount} tiles</span>
              {currentLODInfo.loadingCount > 0 && (
                <span className="flex items-center text-amber-400 font-medium shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin ml-1 mr-0.5" />
                  {currentLODInfo.loadingCount} load
                </span>
              )}
            </div>
          )}

          {/* 3D Terrain Elevation Relief Toggle */}
          <button
            onClick={cycleTerrainExaggeration}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1 transition-all shadow-sm ${
              terrainExaggeration > 0
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 hover:bg-emerald-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Cycle 3D Terrain Elevation Relief: 0x (Flat) → 1x (Natural) → 2x (Mountain Relief) → 3x (High Peaks)"
          >
            <Mountain className="w-3.5 h-3.5 text-emerald-400" />
            <span>3D Relief: {terrainExaggeration === 0 ? 'Off' : `${terrainExaggeration}x`}</span>
          </button>

          {/* Night Lights Toggle */}
          <button
            onClick={() => setShowNightLights((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1 transition-all shadow-sm ${
              showNightLights
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/60 hover:bg-amber-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Earth City Night Lights on dark hemisphere"
          >
            <Moon className="w-3.5 h-3.5 text-amber-300" />
            <span>Lights</span>
          </button>

          {/* World Landmarks & Mountain Summits Toggle */}
          <button
            onClick={() => setShowLandmarks((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1 transition-all shadow-sm ${
              showLandmarks
                ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 hover:bg-sky-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle major world mountain summits, natural wonders, and capital pins"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Landmarks</span>
          </button>

          {/* Clouds Toggle */}
          <button
            onClick={() => setShowClouds(!showClouds)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-sm ${
              showClouds
                ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 hover:bg-sky-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            ☁️ Clouds
          </button>

          {/* Atmosphere Glow Toggle */}
          <button
            onClick={() => setShowAtmosphere(!showAtmosphere)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-sm ${
              showAtmosphere
                ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 hover:bg-sky-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            ✨ Glow
          </button>

          {/* Borders Toggle */}
          <button
            onClick={() => setShowBorders(!showBorders)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-sm ${
              showBorders
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/60 hover:bg-amber-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle international country boundaries"
          >
            🗺️ Borders
          </button>

          {/* Reset View Button */}
          <button
            onClick={handleResetCamera}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-orange-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-1 shadow-sm"
            title="Reset to Default Orientation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>

          <span className="text-[11px] font-mono text-slate-300 pl-1 font-bold hidden sm:inline">
            {visibleHotspots.length.toLocaleString()} active points
          </span>
        </div>

        {/* Right Side: Quick-View Presets Bar */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl pointer-events-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 flex items-center gap-1 hidden md:flex">
            <Compass className="w-3 h-3 text-amber-400" /> Presets:
          </span>
          <div className="flex items-center gap-1 overflow-x-auto max-w-[420px] scrollbar-none">
            {NAVIGATION_PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setActivePreset(preset.id);
                    flyToLatLon(preset.lat, preset.lon);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-orange-600 text-white font-semibold shadow-sm shadow-orange-950/60'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`Smoothly orient Earth to ${preset.label}`}
                >
                  {preset.icon} {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredHotspot && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-orange-500/80 rounded-xl p-2.5 shadow-2xl text-xs space-y-1"
          style={{ left: `${mousePos.x + 15}px`, top: `${mousePos.y - 45}px` }}
        >
          <div className="font-bold text-orange-400 flex items-center gap-1 border-b border-slate-800 pb-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>{hoveredHotspot.satellite} ({hoveredHotspot.instrument})</span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-0.5">
            <div>FRP: <span className="font-mono text-amber-400 font-bold">{hoveredHotspot.frp} MW</span></div>
            <div>Coordinates: <span className="font-mono text-slate-200">{hoveredHotspot.latitude.toFixed(4)}°, {hoveredHotspot.longitude.toFixed(4)}°</span></div>
            <div>Confidence: <span className="font-mono text-slate-200">{hoveredHotspot.confidence}%</span></div>
            <div className="text-[10px] text-slate-400 pt-0.5">Click marker to lock full telemetry</div>
          </div>
        </div>
      )}

      {/* Floating Landmark / Summit Hover Tooltip */}
      {hoveredLandmark && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-sky-500/80 rounded-xl p-2.5 shadow-2xl text-xs space-y-1"
          style={{ left: `${mousePos.x + 15}px`, top: `${mousePos.y - 45}px` }}
        >
          <div className="font-bold text-sky-300 flex items-center gap-1.5 border-b border-slate-800 pb-1">
            {hoveredLandmark.type === 'mountain' || hoveredLandmark.type === 'plateau' ? (
              <Mountain className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>{hoveredLandmark.name}</span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-0.5">
            {hoveredLandmark.elevation && (
              <div>Elevation: <span className="font-mono text-emerald-300 font-bold">{hoveredLandmark.elevation}</span></div>
            )}
            {hoveredLandmark.country && (
              <div>Country: <span className="text-white font-medium">{hoveredLandmark.country}</span></div>
            )}
            <div className="text-[10px] text-slate-400 pt-0.5 font-mono">
              Position: {hoveredLandmark.lat.toFixed(2)}°, {hoveredLandmark.lon.toFixed(2)}°
            </div>
            <div className="text-[10px] text-sky-400 pt-0.5">Click marker to smoothly focus camera</div>
          </div>
        </div>
      )}

      {/* Bottom Floating Legend & Natural Gesture Instructions Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 text-[11px] shadow-xl pointer-events-none">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-300">FRP Scale:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] shadow-sm shadow-red-500/50" />
            <span className="text-slate-300">&gt; 100 MW (Extreme)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c] shadow-sm shadow-orange-500/50" />
            <span className="text-slate-300">40 – 100 MW (High)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300">15 – 40 MW (Moderate)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#fde047] shadow-sm shadow-yellow-500/50" />
            <span className="text-slate-300">&lt; 15 MW (Low)</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center space-x-3 text-[10px] text-slate-400">
          <span><strong className="text-slate-200">Tiles:</strong> {SATELLITE_PROVIDERS[selectedProvider]?.attribution}</span>
          <span>•</span>
          <span><strong className="text-slate-200">Scroll:</strong> Zoom (LOD 1–5+)</span>
          <span>•</span>
          <span><strong className="text-slate-200">Double-Click:</strong> Focus & Zoom</span>
          <span>•</span>
          <span><strong className="text-slate-200">Click Fire:</strong> Inspect Telemetry</span>
        </div>
      </div>
    </div>
  );
};
