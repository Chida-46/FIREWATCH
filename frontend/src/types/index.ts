export interface HotspotRecord {
  latitude: number;
  longitude: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: number;
  brightness?: number;
  bright_t31?: number;
  frp: number;
  daynight: string;
  scan?: number;
  track?: number;
  source_product: string;
  harmonized_weight?: number;
}

export interface CalendarCell {
  year: number;
  month: number;
  month_name: string;
  count_modis: number;
  count_viirs: number;
  count_harmonized: number;
  mean_frp: number;
  max_frp: number;
  historical_median: number;
  historical_avg: number;
  anomaly_abs: number;
  anomaly_pct: number;
  anomaly_class: string;
  completeness: number;
  active_sensors: string[];
}

export interface ClimatologyPoint {
  month: number;
  month_name: string;
  median_count: number;
  mean_count: number;
  iqr_low: number;
  iqr_high: number;
  min_count: number;
  max_count: number;
  mean_frp: number;
}

export interface AnnualTrendPoint {
  year: number;
  count_modis: number;
  count_viirs: number;
  count_harmonized: number;
  mean_frp: number;
  anomaly_pct: number;
}

export interface HarmonizationDiagnostics {
  alpha: number;
  beta: number;
  gamma_linear: number;
  r_squared: number;
  rmse: number;
  residual_std: number;
  n_matched_cells: number;
  model_name: string;
  formula: string;
  linear_formula: string;
  summary: string;
}

export interface ScatterPoint {
  viirs_count: number;
  modis_count: number;
  predicted_modis: number;
  residual: number;
}

export interface AOIAnalysisSummary {
  region_name: string;
  country?: string;
  subdivision?: string;
  iso3?: string;
  continent?: string;
  total_detections: number;
  modis_detections: number;
  viirs_detections: number;
  harmonized_activity_index: number;
  mean_frp: number;
  max_frp: number;
  highest_month: string;
  highest_year: number;
  current_month_anomaly_pct: number;
  current_anomaly_class: string;
  historical_median_current_month: number;
  natural_language_summary: string;
  monthly_averages: ClimatologyPoint[];
  data_availability?: {
    has_data: boolean;
    status: string;
    message: string;
  };
  data_provenance: {
    satellite_sources: string[];
    calibration_model: string;
    baseline_window: string;
  };
}

export interface CountryCatalogItem {
  name: string;
  official_name?: string;
  iso3: string;
  iso2?: string;
  continent: string;
  bbox: [number, number, number, number];
  center: [number, number];
  zoom: number;
  subdivisions?: string[];
  base_annual?: number;
  peak_season?: string;
}

export interface SettingsStatus {
  firms_map_key_configured: boolean;
  firms_map_key_preview: string;
  demo_mode: boolean;
  default_grid_size_deg: number;
  default_region: string;
  cached_queries_count: number;
  supported_satellites: string[];
  project_version: string;
}
