# FIREWATCH — Frontend Client

Interactive geospatial fire intelligence application built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Three.js**, and **Leaflet**.

- **Live Production URL:** [https://firewatch-1.vercel.app/](https://firewatch-1.vercel.app/)
- **GitHub Repository:** [https://github.com/Chida-46/FIREWATCH](https://github.com/Chida-46/FIREWATCH)

---

## Features

- **3D Earth Explorer (Three.js WebGL):**
  - Photorealistic 3D Earth globe with NASA Blue Marble, topography normal & bump maps, city night lights, and atmospheric limb scattering.
  - Multi-Level Detail (LOD 1–5+) satellite tile pyramid: Esri Ultra-HD Satellite, NASA Blue Marble, NASA MODIS TrueColor, and Topographic Terrain.
  - Full 360° 3-axis trackball rotation with momentum, smooth zoom, and automatic polar rotation.
  - Planetary autocomplete search bar for 240+ countries and 40 world landmarks.
  - Synchronized MODIS and VIIRS fire hotspot pins, telemetry inspection, and stop/resume spin controls.
- **2D Geospatial Map (Leaflet):**
  - High-resolution Esri World Imagery satellite basemap, dynamic hotspot clustering, and 0.1° harmonized spatial polygon grid overlays.
- **Burning Calendar Matrix:**
  - Multi-decadal Year × Month matrix (2003–2024) revealing annual burning rhythms, peak months, and historical anomalies.
- **Analytics & Harmonization:**
  - Climatology curves, seasonal baseline bands, linear trend projections, and cross-sensor regression diagnostics.

---

## Development

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build for production
npm run build
```

---

## Production Deployment (Vercel)

The frontend is deployed to Vercel with edge caching and SPA client-side routing.
Configured via `vercel.json`:
- Framework: `vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Dynamic API Base URL via `VITE_API_URL` environment variable.
