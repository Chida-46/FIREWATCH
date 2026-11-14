from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
import numpy as np
from app.services.data_seeder import DataSeeder
from app.services.anomaly_detector import AnomalyDetector

router = APIRouter(prefix="/analytics", tags=["Global Analytics"])

@router.get("/global_overview")
def get_global_overview():
    rankings = DataSeeder.get_global_rankings()
    continents = DataSeeder.get_continents_summary()
    return {
        "global_annual_estimate": 3600000,
        "active_satellites_count": 5,
        "satellites": ["Terra (MODIS)", "Aqua (MODIS)", "Suomi-NPP (VIIRS)", "NOAA-20 (VIIRS)", "NOAA-21 (VIIRS)"],
        "top_countries": rankings[:8],
        "continents": continents
    }

@router.get("/climatology")
def get_climatology(
    country: Optional[str] = Query("Global"),
    state: Optional[str] = Query(None),
    baseline_years: Optional[int] = Query(None)
):
    df_monthly = DataSeeder.generate_historical_monthly_series(
        country=country,
        subdivision=state,
        start_year=2003,
        end_year=2024
    )
    climatology = AnomalyDetector.calculate_climatology(df_monthly, baseline_years=baseline_years)
    return {
        "region": state or country or "Global",
        "climatology": climatology
    }

@router.get("/anomalies")
def get_anomalies(
    country: Optional[str] = Query("Global"),
    state: Optional[str] = Query(None),
    limit: int = Query(10)
):
    df_monthly = DataSeeder.generate_historical_monthly_series(
        country=country,
        subdivision=state,
        start_year=2003,
        end_year=2024
    )
    matrix = AnomalyDetector.build_calendar_matrix(df_monthly)
    sorted_anomalies = sorted(matrix, key=lambda x: abs(x["anomaly_pct"]), reverse=True)
    return {
        "region": state or country or "Global",
        "top_anomalies": sorted_anomalies[:limit]
    }

@router.get("/trends")
def get_trends(
    country: Optional[str] = Query("Global"),
    state: Optional[str] = Query(None)
):
    df_monthly = DataSeeder.generate_historical_monthly_series(
        country=country,
        subdivision=state,
        start_year=2003,
        end_year=2024
    )
    annual = df_monthly.groupby("year")["count_harmonized"].sum().reset_index()

    x = annual["year"].values
    y = annual["count_harmonized"].values
    slope, intercept = np.polyfit(x, y, 1)

    annual["yoy_change_pct"] = annual["count_harmonized"].pct_change() * 100.0

    return {
        "region": state or country or "Global",
        "trend_slope_per_year": round(float(slope), 2),
        "trend_direction": "increasing" if slope > 50 else ("decreasing" if slope < -50 else "stable"),
        "annual_data": annual.fillna(0).to_dict(orient="records")
    }

@router.get("/frp")
def get_frp_analytics(
    country: Optional[str] = Query("Global"),
    state: Optional[str] = Query(None)
):
    df_points = DataSeeder.generate_point_hotspots(country=country, subdivision=state, days_back=14, n_points=500)
    frps = df_points["frp"].values

    bins = [0, 10, 25, 50, 100, 250, 1000]
    hist, _ = np.histogram(frps, bins=bins)

    distribution = [
        {"range": f"{bins[i]}-{bins[i+1]} MW", "count": int(hist[i])}
        for i in range(len(hist))
    ]

    return {
        "region": state or country or "Global",
        "mean_frp": round(float(np.mean(frps)), 1),
        "median_frp": round(float(np.median(frps)), 1),
        "max_frp": round(float(np.max(frps)), 1),
        "distribution": distribution,
        "scientific_note": "FRP (Fire Radiative Power) quantifies instantaneous radiant heat output (in MegaWatts) emitted by burning biomass at satellite overpass. It reflects combustion intensity, not cumulative burned area."
    }
