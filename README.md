# FIREWATCH
## Satellite Fire Intelligence & Burning Activity Calendar
**Tagline:** *Understand Fire Patterns. Detect Anomalies. Protect Our Planet.*

---

## 🛰️ 1. Executive Overview

**FIREWATCH** is an operational geospatial fire intelligence platform engineered to solve the NASA Earth observation challenge of harmonizing historical **MODIS** (Terra & Aqua, 2000–present) and **VIIRS** (Suomi-NPP, NOAA-20, NOAA-21, 2012–present) active fire hotspot records into a unified, continuous multi-decadal time series.

Due to physical differences in sensor architecture, detector resolution (1 km nominal vs. 375 m I-bands), and scan geometry, raw hotspot counts from MODIS and VIIRS cannot simply be added together without creating an artificial 300%–400% step discontinuity in 2012. **FIREWATCH** implements an empirical, peer-reviewed cross-sensor calibration methodology, enabling emergency responders, scientists, environmental researchers, land managers, and policymakers to recognize seasonal burning patterns, detect statistical anomalies against 20+ year baselines, and evaluate fire regimes globally with India as the primary demonstration region.

---

## ✨ 2. Key Capabilities & Innovations

- **Signature Feature: Historical Year × Month Burning Calendar:**
  A continuous multi-decadal matrix (2003–2024) revealing annual burning climaxes, seasonal transitions, and historical anomalies with per-cell tooltips showing counts, historical medians, percentage deviations, and satellite constellation coverage.
- **Scientifically Defensible MODIS–VIIRS Harmonization:**
  Cross-sensor calibration using concurrent overpasses, 0.1° spatial binning, and nonlinear power-law regression ($N_{\text{MODIS\_eq}} = \alpha \cdot N_{\text{VIIRS}}^\beta$) with full uncertainty diagnostics ($R^2$, RMSE, 95% confidence intervals).
- **Interactive Geospatial Active Fire Map:**
  Leaflet-based viewer with CartoDB Dark Matter and NASA satellite imagery, 0.1° harmonized polygon grid overlays, telemetry popups, confidence filtering, and FRP-based color gradients.
- **Climatological Anomaly Detection Engine:**
  Calculates anomalies against selectable baselines (5-year, 10-year, or full 22-year record) with standardized tiers (*Below Normal*, *Normal*, *Above Normal*, *Significantly Above Normal*, *Extreme Activity*).
- **Area of Interest (AOI) Deep Analysis & Dual AOI Comparison:**
  Dedicated regional analytics for Indian states (Karnataka, Maharashtra, Madhya Pradesh, Odisha, Chhattisgarh, Andhra Pradesh, etc.) and dual-region comparative benchmarking.
- **Enterprise Reporting & Export Engine:**
  Direct downloads of filtered CSV datasets, GIS-ready GeoJSON features, and publication-grade PDF analytical dossiers generated via ReportLab with live in-app preview.
- **Real NASA FIRMS API Integration:**
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
│   │   │   ├── routes_aoi.py           # AOI statistics & dual comparison
│   │   │   ├── routes_exports.py       # CSV, GeoJSON & PDF exports
│   │   │   └── routes_settings.py      # MAP_KEY & cache configuration
│   │   ├── core/            # Configuration & environment settings
│   │   ├── models/          # Pydantic schemas
│   │   ├── services/        # Scientific processing pipelines
│   │   │   ├── firms_client.py         # NASA FIRMS API client with chunking
│   │   │   ├── data_cleaner.py         # Coordinate cleaning & normalization
│   │   │   ├── spatial_harmonizer.py   # 0.1° spatial aggregation
│   │   │   ├── sensor_calibrator.py    # Cross-sensor regression model
│   │   │   ├── anomaly_detector.py     # Historical climatology & anomalies
│   │   │   ├── data_seeder.py          # NASA-calibrated baseline datasets
│   │   │   └── pdf_generator.py        # Publication-grade PDF generator
│   │   └── main.py          # Application entrypoint & CORS middleware
│   ├── tests/               # Automated pytest suite (14 tests)
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Sidebar, KPICard, RegionSelector
│   │   ├── charts/          # CalendarHeatmap, ClimatologyChart, TrendChart, Scatter
│   │   ├── maps/            # FireMapComponent (React-Leaflet)
│   │   ├── pages/           # 10 core navigation views
│   │   ├── services/        # Typed API service
│   │   ├── types/           # TypeScript interfaces
│   │   ├── App.tsx          # Main routing & state
│   │   └── index.css        # Tailwind CSS & theme definitions
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile               # Multi-stage production container
├── docker-compose.yml       # Full stack + PostGIS orchestration
├── .env.example             # Environment variable template
└── README.md
```

---

## 🚀 4. Quick Start & Setup Instructions

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.13)
- **Node.js**: v18+ (tested on Node v24)
- **NASA FIRMS MAP_KEY** (optional for live queries, free at [firms.modaps.eosdis.nasa.gov/api/map_key/](https://firms.modaps.eosdis.nasa.gov/api/map_key/))

### 1. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run automated tests
python -m pytest tests -v

# Start FastAPI backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is now running at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

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
The FIREWATCH web application will open at `http://localhost:5173`.

---

## 🐳 5. Docker Deployment

Deploy the complete full-stack platform with optional PostGIS:
```bash
docker-compose up --build
```
Access the application on `http://localhost:8000`.

---

## 📊 6. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/firms/availability` | Check NASA FIRMS product availability |
| `POST` | `/api/firms/fetch` | Trigger chunked live NASA FIRMS retrieval |
| `GET` | `/api/hotspots` | Filter active fire records (sensor, FRP, confidence, state) |
| `GET` | `/api/hotspots/grid` | Retrieve 0.1° aggregated spatial polygons in GeoJSON |
| `GET` | `/api/calendar/monthly` | Full Year × Month matrix with climatological anomalies |
| `GET` | `/api/calendar/annual` | Annual time series for MODIS, VIIRS, and Harmonized counts |
| `GET` | `/api/analytics/climatology`| Monthly baseline curves (median, mean, IQR bands) |
| `GET` | `/api/analytics/anomalies` | Ranked extreme monthly anomalies |
| `GET` | `/api/analytics/trends` | Linear trend slope and trajectory direction |
| `GET` | `/api/analytics/frp` | Fire Radiative Power (FRP) histogram distribution |
| `GET` | `/api/harmonization/diagnostics` | Regression parameters ($\alpha, \beta, \gamma, R^2$, RMSE) |
| `GET` | `/api/harmonization/comparison` | Multi-sensor divergence vs harmonized time series |
| `GET` | `/api/harmonization/scatter` | Paired co-located overpass observations for regression plot |
| `POST` | `/api/aoi/analyze` | Automated regional intelligence report with natural language summary |
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
