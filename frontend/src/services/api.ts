import {
  HotspotRecord,
  CalendarCell,
  ClimatologyPoint,
  AnnualTrendPoint,
  HarmonizationDiagnostics,
  ScatterPoint,
  AOIAnalysisSummary,
  SettingsStatus
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return res.json();
  },

  // Global Overview & Rankings
  async getGlobalOverview(): Promise<{
    global_annual_estimate: number;
    active_satellites_count: number;
    satellites: string[];
    top_countries: Array<{ country: string; iso3: string; continent: string; annual_hotspots: number; peak_season: string }>;
    continents: Array<{ continent: string; hotspots: number; peak: string }>;
  }> {
    const res = await fetch(`${BASE_URL}/analytics/global_overview`);
    return res.json();
  },

  async getGlobalRankings() {
    const res = await fetch(`${BASE_URL}/aoi/rankings`);
    return res.json();
  },

  async getContinents() {
    const res = await fetch(`${BASE_URL}/aoi/continents`);
    return res.json();
  },

  // Hotspots
  async getHotspots(params?: {
    country?: string;
    state?: string;
    sensor?: string;
    min_frp?: number;
    min_confidence?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; region: string; records: HotspotRecord[] }> {
    const query = new URLSearchParams();
    if (params?.country) query.set('country', params.country);
    if (params?.state) query.set('state', params.state);
    if (params?.sensor) query.set('sensor', params.sensor);
    if (params?.min_frp !== undefined) query.set('min_frp', params.min_frp.toString());
    if (params?.min_confidence !== undefined) query.set('min_confidence', params.min_confidence.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const res = await fetch(`${BASE_URL}/hotspots?${query.toString()}`);
    return res.json();
  },

  async getSpatialGrid(country?: string, state?: string, grid_size: number = 0.25) {
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    if (state) query.set('state', state);
    query.set('grid_size', grid_size.toString());
    const res = await fetch(`${BASE_URL}/hotspots/grid?${query.toString()}`);
    return res.json();
  },

  // Calendar
  async getMonthlyCalendar(country?: string, state?: string, baseline_years?: number): Promise<{
    region: string;
    years_count: number;
    total_cells: number;
    cells: CalendarCell[];
  }> {
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    if (state) query.set('state', state);
    if (baseline_years) query.set('baseline_years', baseline_years.toString());
    const res = await fetch(`${BASE_URL}/calendar/monthly?${query.toString()}`);
    return res.json();
  },

  async getAnnualCalendar(country?: string, state?: string): Promise<{
    region: string;
    records: AnnualTrendPoint[];
  }> {
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    if (state) query.set('state', state);
    const res = await fetch(`${BASE_URL}/calendar/annual?${query.toString()}`);
    return res.json();
  },

  // Analytics
  async getClimatology(country?: string, state?: string, baseline_years?: number): Promise<{
    region: string;
    climatology: ClimatologyPoint[];
  }> {
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    if (state) query.set('state', state);
    if (baseline_years) query.set('baseline_years', baseline_years.toString());
    const res = await fetch(`${BASE_URL}/analytics/climatology?${query.toString()}`);
    return res.json();
  },

  async getAnomalies(country?: string, state?: string, limit: number = 10): Promise<{
    region: string;
    top_anomalies: CalendarCell[];
  }> {
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    if (state) query.set('state', state);
    query.set('limit', limit.toString());
    const res = await fetch(`${BASE_URL}/analytics/anomalies?${query.toString()}`);
    return res.json();
  },

  async getTrends(country?: string, state?: string) {
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    if (state) query.set('state', state);
    const res = await fetch(`${BASE_URL}/analytics/trends?${query.toString()}`);
    return res.json();
  },

  async getFRPAnalytics(country?: string, state?: string) {
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    if (state) query.set('state', state);
    const res = await fetch(`${BASE_URL}/analytics/frp?${query.toString()}`);
    return res.json();
  },

  // Harmonization
  async getHarmonizationDiagnostics(): Promise<HarmonizationDiagnostics> {
    const res = await fetch(`${BASE_URL}/harmonization/diagnostics`);
    return res.json();
  },

  async getHarmonizationComparison(country?: string, state?: string) {
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    if (state) query.set('state', state);
    const res = await fetch(`${BASE_URL}/harmonization/comparison?${query.toString()}`);
    return res.json();
  },

  async getHarmonizationScatter(n_points: number = 160): Promise<{
    diagnostics: HarmonizationDiagnostics;
    points: ScatterPoint[];
  }> {
    const res = await fetch(`${BASE_URL}/harmonization/scatter?n_points=${n_points}`);
    return res.json();
  },

  // AOI
  async getSupportedCountries() {
    const res = await fetch(`${BASE_URL}/aoi/countries`);
    return res.json();
  },

  async searchCountries(query: string) {
    const res = await fetch(`${BASE_URL}/aoi/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  async getCountryBoundary(countryName: string) {
    const res = await fetch(`${BASE_URL}/aoi/boundary/${encodeURIComponent(countryName)}`);
    if (!res.ok) return null;
    return res.json();
  },

  async analyzeAOI(country?: string, subdivision?: string): Promise<AOIAnalysisSummary> {
    const res = await fetch(`${BASE_URL}/aoi/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: country || 'Global', subdivision })
    });
    return res.json();
  },

  async compareAOI(region_a: string, region_b: string): Promise<{
    region_a: AOIAnalysisSummary;
    region_b: AOIAnalysisSummary;
    activity_ratio: number;
  }> {
    const res = await fetch(`${BASE_URL}/aoi/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region_a, region_b })
    });
    return res.json();
  },

  // Settings
  async getSettings(): Promise<SettingsStatus> {
    const res = await fetch(`${BASE_URL}/settings`);
    return res.json();
  },

  async updateSettings(payload: {
    firms_map_key?: string;
    grid_resolution_deg?: number;
    clear_cache?: boolean;
  }): Promise<{ status: string; settings: SettingsStatus }> {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Exports
  async exportPDF(country?: string, subdivision?: string): Promise<Blob> {
    const res = await fetch(`${BASE_URL}/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: country || 'Global', subdivision })
    });
    return res.blob();
  },

  async exportCSV(dataType: string, country?: string, subdivision?: string): Promise<Blob> {
    const res = await fetch(`${BASE_URL}/export/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_type: dataType, country, subdivision })
    });
    return res.blob();
  },

  async exportGeoJSON(dataType: 'grid' | 'points', country?: string, subdivision?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/export/geojson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_type: dataType, country, subdivision })
    });
    return res.json();
  }
};
