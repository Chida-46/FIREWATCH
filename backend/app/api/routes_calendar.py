from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from app.services.data_seeder import DataSeeder
from app.services.anomaly_detector import AnomalyDetector

router = APIRouter(prefix="/calendar", tags=["Global Burning Activity Calendar"])

@router.get("/monthly")
def get_monthly_calendar(
    country: Optional[str] = Query("Global"),
    state: Optional[str] = Query(None, description="State or subdivision"),
    baseline_years: Optional[int] = Query(None, description="e.g. 5, 10, or None for full baseline")
):
    df_monthly = DataSeeder.generate_historical_monthly_series(
        country=country,
        subdivision=state,
        start_year=2003,
        end_year=2024
    )
    matrix = AnomalyDetector.build_calendar_matrix(df_monthly, baseline_years=baseline_years)
    return {
        "region": state or country or "Global",
        "years_count": 22,
        "total_cells": len(matrix),
        "cells": matrix
    }

@router.get("/annual")
def get_annual_calendar(
    country: Optional[str] = Query("Global"),
    state: Optional[str] = Query(None)
):
    df_monthly = DataSeeder.generate_historical_monthly_series(
        country=country,
        subdivision=state,
        start_year=2003,
        end_year=2024
    )
    annual = df_monthly.groupby("year").agg(
        count_modis=("count_modis", "sum"),
        count_viirs=("count_viirs", "sum"),
        count_harmonized=("count_harmonized", "sum"),
        mean_frp=("mean_frp", "mean"),
        max_frp=("max_frp", "max")
    ).reset_index()

    median_harmonized = annual["count_harmonized"].median()
    annual["anomaly_pct"] = ((annual["count_harmonized"] - median_harmonized) / max(median_harmonized, 1)) * 100.0

    return {
        "region": state or country or "Global",
        "records": annual.round(1).to_dict(orient="records")
    }

@router.get("/cell_details")
def get_cell_details(
    year: int = Query(...),
    month: int = Query(...),
    country: Optional[str] = Query("Global"),
    state: Optional[str] = Query(None)
):
    df_monthly = DataSeeder.generate_historical_monthly_series(
        country=country,
        subdivision=state,
        start_year=2003,
        end_year=2024
    )
    matrix = AnomalyDetector.build_calendar_matrix(df_monthly)
    matching = [c for c in matrix if c["year"] == year and c["month"] == month]
    if not matching:
        return {"error": "Cell not found"}
    return matching[0]
