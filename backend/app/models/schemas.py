from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class HotspotRecord(BaseModel):
    latitude: float
    longitude: float
    acq_date: str
    acq_time: str
    satellite: str
    instrument: str
    confidence: float
    brightness: Optional[float] = None
    bright_t31: Optional[float] = None
    frp: float
    daynight: str
    scan: Optional[float] = None
    track: Optional[float] = None
    source_product: str
    harmonized_weight: Optional[float] = 1.0

class GridCell(BaseModel):
    cell_id: str
    lat: float
    lon: float
    modis_count: int
    viirs_count: int
    harmonized_count: float
    mean_frp: float
    max_frp: float

class CalendarCell(BaseModel):
    year: int
    month: int
    count_modis: int
    count_viirs: int
    count_harmonized: float
    mean_frp: float
    max_frp: float
    historical_median: float
    historical_avg: float
    anomaly_abs: float
    anomaly_pct: float
    anomaly_class: str  # Extreme, Significantly Above Normal, Above Normal, Normal, Below Normal, Incomplete
    completeness: float # 0.0 to 1.0
    active_sensors: List[str]

class ClimatologyPoint(BaseModel):
    month: int
    month_name: str
    median_count: float
    mean_count: float
    iqr_low: float
    iqr_high: float
    min_count: float
    max_count: float
    mean_frp: float

class AnnualTrendPoint(BaseModel):
    year: int
    modis_count: int
    viirs_count: int
    harmonized_count: float
    mean_frp: float
    anomaly_pct: float

class HarmonizationDiagnostics(BaseModel):
    alpha: float
    beta: float
    gamma_linear: float
    r_squared: float
    rmse: float
    n_matched_cells: int
    residual_std: float
    model_name: str
    formula: str
    summary: str

class AOIQuery(BaseModel):
    country: Optional[str] = "IND"
    state: Optional[str] = None
    bbox: Optional[List[float]] = None # [min_lon, min_lat, max_lon, max_lat]
    polygon_geojson: Optional[Dict[str, Any]] = None
    start_date: Optional[str] = "2003-01-01"
    end_date: Optional[str] = None
    sensor_filter: Optional[str] = "ALL"  # ALL, MODIS_ONLY, VIIRS_ONLY, HARMONIZED
    min_confidence: Optional[float] = 0.0
    min_frp: Optional[float] = 0.0

class AOIAnalysisSummary(BaseModel):
    region_name: str
    total_detections: int
    modis_detections: int
    viirs_detections: int
    harmonized_activity_index: float
    mean_frp: float
    max_frp: float
    highest_month: str
    highest_year: int
    current_month_anomaly_pct: float
    current_anomaly_class: str
    historical_median_current_month: float
    natural_language_summary: str
    data_provenance: Dict[str, Any]

class SettingsUpdate(BaseModel):
    firms_map_key: Optional[str] = None
    grid_resolution_deg: Optional[float] = None
    demo_mode: Optional[bool] = None
