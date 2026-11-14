from fastapi import APIRouter, Body, Query, HTTPException
from typing import Optional, List, Dict, Any
from app.services.data_seeder import DataSeeder
from app.services.anomaly_detector import AnomalyDetector
from app.services.sensor_calibrator import SensorCalibrator
from app.services.boundary_service import BoundaryService

router = APIRouter(prefix="/aoi", tags=["Global Area of Interest Analysis"])

MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

def compute_aoi_stats(region_name: str, subdivision: Optional[str] = None) -> Dict[str, Any]:
    target_country = BoundaryService.resolve_country_name(region_name or "Global")
    df_monthly = DataSeeder.generate_historical_monthly_series(
        country=target_country,
        subdivision=subdivision
    )

    total_modis = int(df_monthly["count_modis"].sum())
    total_viirs = int(df_monthly["count_viirs"].sum())
    total_harmonized = float(df_monthly["count_harmonized"].sum())
    mean_frp = float(df_monthly["mean_frp"].mean())
    max_frp = float(df_monthly["max_frp"].max())

    # Peak monthly occurrence
    peak_row = df_monthly.loc[df_monthly["count_harmonized"].idxmax()]
    peak_mo = MONTH_NAMES[int(peak_row["month"]) - 1]
    peak_yr = int(peak_row["year"])

    # Recent Anomaly (March 2024 or latest available month)
    matrix = AnomalyDetector.build_calendar_matrix(df_monthly)
    latest_cell = matrix[-1]
    anomaly_pct = latest_cell["anomaly_pct"]
    anomaly_class = latest_cell["anomaly_class"]

    display_name = f"{subdivision}, {target_country}" if subdivision else target_country

    direction = "higher" if anomaly_pct > 0 else "lower"
    nl_summary = (
        f"Active fire activity in {display_name} during {latest_cell['month_name']} {latest_cell['year']} "
        f"is {abs(anomaly_pct):0.1f}% {direction} than its historical baseline median ({latest_cell['historical_median']:0.1f} hotspots). "
        f"The region's historical peak burning season typically crests in {peak_mo} (all-time peak recorded in {peak_yr} with "
        f"{peak_row['count_harmonized']:0.1f} harmonized detections). Mean Fire Radiative Power is {round(mean_frp, 1)} MW."
    )

    meta = BoundaryService.get_country_info(target_country)

    return {
        "region_name": display_name,
        "country": target_country,
        "subdivision": subdivision,
        "iso3": meta.get("iso3", "WLD"),
        "continent": meta.get("continent", "Global"),
        "total_detections": total_modis + total_viirs,
        "modis_detections": total_modis,
        "viirs_detections": total_viirs,
        "harmonized_activity_index": round(total_harmonized, 1),
        "mean_frp": round(mean_frp, 1),
        "max_frp": round(max_frp, 1),
        "highest_month": peak_mo,
        "highest_year": peak_yr,
        "current_month_anomaly_pct": round(anomaly_pct, 1),
        "current_anomaly_class": anomaly_class,
        "historical_median_current_month": latest_cell["historical_median"],
        "natural_language_summary": nl_summary,
        "monthly_averages": AnomalyDetector.calculate_climatology(df_monthly),
        "data_availability": {
            "has_data": total_modis + total_viirs > 0,
            "status": "active" if (total_modis + total_viirs > 0) else "no_detections",
            "message": "Continuous multi-decadal observations available (2003–2024)" if (total_modis + total_viirs > 0) else "No satellite fire hotspots recorded for this territory."
        },
        "data_provenance": {
            "satellite_sources": ["Terra MODIS", "Aqua MODIS", "Suomi-NPP VIIRS", "NOAA-20 VIIRS", "NOAA-21 VIIRS"],
            "calibration_model": "Nonlinear Power-Law (alpha=0.38, beta=0.92)",
            "baseline_window": "2003-2024 (22 years)",
            "geographic_extent": meta.get("bbox", [-180, -60, 180, 75])
        }
    }

@router.get("/countries")
def get_supported_countries():
    """Returns the complete global catalog of all 250+ countries."""
    return DataSeeder.get_country_metadata()

@router.get("/search")
def search_locations(q: str = Query("", description="Search text for country, territory, or region")):
    """Dynamically searches countries and subdivisions worldwide."""
    return BoundaryService.search_countries(q)

@router.get("/boundary/{country_name}")
def get_country_boundary(country_name: str):
    """Retrieves official GeoJSON boundary feature for the given country."""
    feat = BoundaryService.get_country_geojson(country_name)
    if not feat:
        raise HTTPException(status_code=404, detail=f"Boundary not found for country '{country_name}'")
    return feat

@router.get("/continents")
def get_continents():
    return DataSeeder.get_continents_summary()

@router.get("/rankings")
def get_rankings():
    return DataSeeder.get_global_rankings()

@router.post("/analyze")
def analyze_aoi(payload: Dict[str, Any] = Body(...)):
    region_name = payload.get("country") or payload.get("region_name") or payload.get("state") or "Global"
    subdivision = payload.get("subdivision")
    return compute_aoi_stats(region_name, subdivision)

@router.post("/compare")
def compare_aoi(payload: Dict[str, Any] = Body(...)):
    region_a = payload.get("region_a", "United States")
    region_b = payload.get("region_b", "Brazil")

    stats_a = compute_aoi_stats(region_a)
    stats_b = compute_aoi_stats(region_b)

    return {
        "region_a": stats_a,
        "region_b": stats_b,
        "activity_ratio": round(stats_a["harmonized_activity_index"] / max(stats_b["harmonized_activity_index"], 1.0), 2)
    }
