from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from app.services.sensor_calibrator import SensorCalibrator
from app.services.data_seeder import DataSeeder

router = APIRouter(prefix="/harmonization", tags=["Global MODIS–VIIRS Harmonization"])

calibrator = SensorCalibrator()

@router.get("/diagnostics")
def get_diagnostics():
    return calibrator.get_diagnostics()

@router.get("/comparison")
def get_comparison(
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
        raw_modis=("count_modis", "sum"),
        raw_viirs=("count_viirs", "sum"),
        harmonized_activity=("count_harmonized", "sum")
    ).reset_index()

    annual["raw_combined_naive"] = annual["raw_modis"] + annual["raw_viirs"]

    return {
        "region": state or country or "Global",
        "explanation": "Demonstrates the critical artificial discontinuity created when raw MODIS and VIIRS counts are naively summed together without spatial-temporal harmonization.",
        "series": annual.to_dict(orient="records")
    }

@router.get("/scatter")
def get_calibration_scatter(n_points: int = Query(160, ge=50, le=500)):
    points = calibrator.generate_scatter_sample(n_points=n_points)
    diagnostics = calibrator.get_diagnostics()
    return {
        "diagnostics": diagnostics,
        "points": points
    }
