# FIREWATCH
## Global Satellite Fire Intelligence & Burning Activity Calendar
**Tagline:** *Understand Fire Patterns. Detect Anomalies. Protect Our Planet.*

[![Live Production Website](https://img.shields.io/badge/Live%20Website-firewatch--1.vercel.app-22c55e?style=for-the-badge&logo=vercel&logoColor=white)](https://firewatch-1.vercel.app/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Chida--46%2FFIREWATCH-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Chida-46/FIREWATCH)
[![NASA FIRMS Integration](https://img.shields.io/badge/NASA%20FIRMS-MODIS%20%7C%20VIIRS-e05d44?style=for-the-badge&logo=nasa&logoColor=white)](https://firms.modaps.eosdis.nasa.gov/)
[![Production Status](https://img.shields.io/badge/Production%20Status-Verified%20%26%20Active-brightgreen?style=for-the-badge)](https://firewatch-1.vercel.app/)

---

### 🌐 Live Production Deployment
- **Public Web Application:** [https://firewatch-1.vercel.app/](https://firewatch-1.vercel.app/)
- **GitHub Repository:** [https://github.com/Chida-46/FIREWATCH](https://github.com/Chida-46/FIREWATCH)
- **Deployment Platform:** Vercel (Global Edge CDN) + Render / Docker (FastAPI Geospatial Backend)

---

## 🛰️ 1. Executive Overview

**FIREWATCH** is an operational geospatial fire intelligence platform engineered to solve the NASA Earth observation challenge of harmonizing historical **MODIS** (Terra & Aqua, 2000–present) and **VIIRS** (Suomi-NPP, NOAA-20, NOAA-21, 2012–present) active fire hotspot records into a unified, continuous multi-decadal time series with **worldwide global coverage across all 250+ countries and territories**.

Due to physical differences in sensor architecture, detector resolution (1 km nominal vs. 375 m I-bands), and scan geometry, raw hotspot counts from MODIS and VIIRS cannot simply be added together without creating an artificial 300%–400% step discontinuity in 2012. **FIREWATCH** implements an empirical, peer-reviewed cross-sensor calibration methodology, enabling emergency responders, scientists, environmental researchers, land managers, and policymakers to recognize seasonal burning patterns, detect statistical anomalies against 20+ year baselines, and evaluate fire regimes across any country, continent, or administrative boundary worldwide.

---

## ✨ 2. Key Capabilities & Innovations

- **🌍 Worldwide Global Coverage (250+ Countries & Territories):**
  Dynamic Natural Earth administrative boundary catalog covering every country and territory worldwide. Automatic boundary lookup, bounding box calculation, and continent aggregation.
- **🗺️ Interactive Geospatial Active Fire Map (2D):**
  High-performance Leaflet viewer featuring crisp Esri World Imagery satellite basemaps, dynamic hotspot clustering, 0.1° harmonized polygon grid overlays, telemetry popups, confidence filtering, and FRP-based color gradients.
- **🌐 3D Earth Explorer with Ultra-HD Satellite Detail (Google Earth Quality):**
  - **Photorealistic WebGL 3D Globe:** Realistic spherical Earth with detailed daytime satellite surfaces, atmospheric Rayleigh scattering limb glow, night city lights, dynamic clouds, and international boundary outlines.
  - **Multi-Level Detail (LOD 1–5+) Satellite Tile Pyramid:** Progressively loads sharper satellite imagery as the user zooms in, from global view (LOD 1) down to sub-meter local terrain (LOD 5+).
  - **Selectable Satellite Layers:** Ultra-HD Satellite (Esri World Imagery), NASA Blue Marble (Relief & Bathymetry), NASA MODIS TrueColor (Terra daily capture), and Topographic Terrain.
  - **Free 360° 3-Axis Virtual Trackball:** Natural mouse and touch controls with full rotational freedom around X, Y, and Z axes, natural inertia momentum, double-click focus & zoom, and automatic polar rotation.
  - **Stop Spinning / Resume Rotation:** Pauses rotation cleanly without affecting fire hotspot visibility, marker rendering, or satellite data layers.
  - **Physical 3D Terrain Relief:** Dynamic topography normal and bump maps with live exaggeration controls (0x Flat, 1x Natural, 2x Mountain Relief, 3x High Peaks).
  - **Planetary Search Bar:** Autocomplete search matching 240+ countries and 40 curated world landmarks (Mt. Everest, Kilimanjaro, Alps, Andes, Tokyo, London, etc.) with smooth quaternion SLERP flight.
- **📅 Signature Feature — Historical Year × Month Burning Calendar:**
  A continuous multi-decadal matrix (2003–2024) revealing annual burning climaxes, seasonal transitions, and historical anomalies with per-cell tooltips showing counts, historical medians, percentage deviations, and satellite constellation coverage.
- **🔬 Scientifically Defensible MODIS–VIIRS Harmonization:**
  Cross-sensor calibration using concurrent overpasses, 0.1° spatial binning, and nonlinear power-law regression ($N_{\text{MODIS\_eq}} = \alpha \cdot N_{\text{VIIRS}}^\beta$) with full uncertainty diagnostics ($R^2$, RMSE, 95% confidence intervals).
- **📈 Climatological Anomaly Detection Engine:**
  Calculates anomalies against selectable baselines (5-year, 10-year, or full 22-year record) with standardized tiers (*Below Normal*, *Normal*, *Above Normal*, *Significantly Above Normal*, *Extreme Activity*).
- **📑 Enterprise Reporting & Export Engine:**
  Direct downloads of filtered CSV datasets, GIS-ready GeoJSON features, and publication-grade PDF analytical dossiers generated via ReportLab with live in-app preview.
- **🛰️ Real NASA FIRMS API Integration:**
  Secure backend client supporting the FIRMS Area API, Country API, data availability checks, date chunking, and local disk caching, paired with a validated offline demonstration mode.

---

## 📐 3. System Architecture

```
nasa_space_app/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints
│   │   │   ├── routes_firms.py         # NASA FIRMS API ingestion & availability
│   │   │   ├── routes_hotspots.py      # Hotspots & spatial grid
│   │   │   ├── routes_calendar.py      # Year x Month calendar matrix
│   │   │   ├── routes_analytics.py     # Climatology, trends & FRP distribution
│   │   │   ├── routes_harmonization.py # Calibration curve & diagnostics
│   │   │   ├── routes_aoi.py           # AOI statistics & global countries catalog
│   │   │   ├── routes_exports.py       # CSV, GeoJSON & PDF exports
│   │   │   └── routes_settings.py      # MAP_KEY & cache configuration
│   │   ├── core/            # Configuration & environment settings
│   │   ├── models/          # Pydantic schemas
│   │   ├── services/        # Scientific processing pipelines
│   │   │   ├── firms_client.py         # NASA FIRMS API client with chunking
│   │   │   ├── boundary_service.py     # Global administrative boundaries & catalog
│   │   │   ├── spatial_harmonizer.py   # 0.1° spatial aggregation
│   │   │   ├── sensor_calibrator.py    # Cross-sensor regression model
│   │   │   ├── anomaly_detector.py     # Historical climatology & anomalies
│   │   │   ├── data_seeder.py          # NASA-calibrated baseline datasets
│   │   │   └── pdf_generator.py        # Publication-grade PDF generator
│   │   └── main.py          # Application entrypoint, CORS & static SPA mounting
│   ├── tests/               # Automated pytest suite
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Sidebar, KPICard, RegionSelector
│   │   ├── charts/          # CalendarHeatmap, ClimatologyChart, TrendChart, Scatter
│   │   ├── maps/            # Earth3DGlobe (Three.js 3D), FireMapComponent (Leaflet)
│   │   ├── pages/           # 11 navigation modules (including 3D Earth Explorer)
│   │   ├── services/        # Typed API service with VITE_API_URL support
│   │   ├── types/           # TypeScript interfaces
│   │   └── App.tsx          # Main routing & state
│   ├── public/
│   │   ├── data/            # Global country catalog & international borders
│   │   └── textures/        # NASA Blue Marble, topography normal & bump maps
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile               # Multi-stage production container
├── docker-compose.yml       # Full stack container orchestration
├── render.yaml              # Render Infrastructure-as-Code deployment blueprint
├── vercel.json              # Vercel production edge routing & rewrites
├── .env.example             # Environment variable template
└── README.md
```

---

## 🚀 4. Quick Start & Setup Instructions

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.11, 3.12, 3.13)
- **Node.js**: v18+ (tested on Node v20, v22, v24)
- **NASA FIRMS MAP_KEY** (optional for live queries, free at [firms.modaps.eosdis.nasa.gov/api/map_key/](https://firms.modaps.eosdis.nasa.gov/api/map_key/))

### 1. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run automated test suite
python -m pytest tests -v

# Start FastAPI backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will run at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
# In a separate terminal, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Build production bundle to verify
npm run build

# Start Vite development server
npm run dev
```
The FIREWATCH web application will open at `http://localhost:5173` (or `http://localhost:5174`).

---

## ☁️ 5. Production Deployment

### Option A: Vercel (Frontend) + Render (Backend)
- **Frontend on Vercel:**
  - Import `Chida-46/FIREWATCH` into Vercel.
  - Set Root Directory to `frontend`.
  - Build command: `npm run build`.
  - Output directory: `dist`.
  - Environment Variable: `VITE_API_URL` pointing to the Render backend URL.
- **Backend on Render:**
  - Create a Web Service from `Chida-46/FIREWATCH`.
  - Root directory: `backend`.
  - Build command: `pip install -r requirements.txt`.
  - Start command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

### Option B: Unified Full-Stack Docker Deployment
Deploy as a single container using the included multi-stage `Dockerfile`:
```bash
docker build -t firewatch .
docker run -p 8000:8000 firewatch
```
Or via Docker Compose:
```bash
docker-compose up --build
```
Access the application at `http://localhost:8000`.

---

## 📊 6. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and uptime verification |
| `GET` | `/api/firms/availability` | Check NASA FIRMS product availability |
| `POST` | `/api/firms/fetch` | Trigger chunked live NASA FIRMS retrieval |
| `GET` | `/api/hotspots` | Filter active fire records (sensor, FRP, confidence, country) |
| `GET` | `/api/hotspots/grid` | Retrieve 0.1° aggregated spatial polygons in GeoJSON |
| `GET` | `/api/calendar/monthly` | Full Year × Month matrix with climatological anomalies |
| `GET` | `/api/calendar/annual` | Annual time series for MODIS, VIIRS, and Harmonized counts |
| `GET` | `/api/analytics/global_overview` | Global summary, top burning countries, and continental totals |
| `GET` | `/api/analytics/climatology`| Monthly baseline curves (median, mean, IQR bands) |
| `GET` | `/api/analytics/anomalies` | Ranked extreme monthly anomalies |
| `GET` | `/api/analytics/trends` | Linear trend slope and trajectory direction |
| `GET` | `/api/analytics/frp` | Fire Radiative Power (FRP) histogram distribution |
| `GET` | `/api/harmonization/diagnostics` | Regression parameters ($\alpha, \beta, R^2$, RMSE) |
| `GET` | `/api/harmonization/comparison` | Multi-sensor divergence vs harmonized time series |
| `GET` | `/api/harmonization/scatter` | Paired co-located overpass observations for regression plot |
| `GET` | `/api/aoi/countries` | Complete global administrative catalog of 250+ countries |
| `POST` | `/api/aoi/analyze` | Regional intelligence report with natural language summary |
| `POST` | `/api/aoi/compare` | Dual AOI comparative analysis |
| `POST` | `/api/export/csv` | Download CSV datasets (calendar, trends, raw hotspots) |
| `POST` | `/api/export/geojson` | Download GeoJSON layers (0.1° grid or points) |
| `POST` | `/api/export/pdf` | Generate publication-grade PDF intelligence report |
| `GET/POST`| `/api/settings` | Configure NASA MAP_KEY, spatial grid size, and cache |

---

## 🔬 7. Scientific Attribution & Citations

- **NASA Earthdata FIRMS:** Fire Information for Resource Management System. NASA Goddard Space Flight Center. [https://firms.modaps.eosdis.nasa.gov/](https://firms.modaps.eosdis.nasa.gov/)
- **MODIS Collection 6.1:** Giglio, L., Schroeder, W., & Justice, C. O. (2016). *The collection 6 MODIS active fire detection algorithm and fire products.* Remote Sensing of Environment, 178, 31-41.
- **VIIRS 375 m:** Schroeder, W., Oliva, P., Giglio, L., & Csiszar, I. A. (2014). *The New VIIRS 375 m active fire detection product—Algorithm description and initial assessment.* Remote Sensing of Environment, 143, 85-96.
- **Fire Radiative Power:** Wooster, M. J., et al. (2005). *Retrieval of biomass combustion rates and totals from fire radiative power observations.* Journal of Geophysical Research.
- **Satellite Tile Providers:** Esri World Imagery, NASA GIBS (Global Imagery Browse Services), OpenTopoMap, OpenStreetMap contributors.
