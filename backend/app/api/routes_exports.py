from fastapi import APIRouter, Body, Response
import io
import pandas as pd
from typing import Dict, Any, Optional
from app.services.data_seeder import DataSeeder
from app.services.anomaly_detector import AnomalyDetector
from app.services.sensor_calibrator import SensorCalibrator
from app.services.spatial_harmonizer import SpatialHarmonizer
from app.services.pdf_generator import PDFReportGenerator
from app.api.routes_aoi import compute_aoi_stats

router = APIRouter(prefix="/export", tags=["Global Exports and Reports"])

@router.post("/csv")
def export_csv(payload: Dict[str, Any] = Body(...)):
    export_type = payload.get("data_type", "monthly_calendar")
    country = payload.get("country") or payload.get("region") or payload.get("state") or "Global"
    subdivision = payload.get("subdivision")

    if export_type == "raw_hotspots":
        df = DataSeeder.generate_point_hotspots(country=country, subdivision=subdivision, days_back=14, n_points=600)
    elif export_type == "annual_trends":
        df_monthly = DataSeeder.generate_historical_monthly_series(country=country, subdivision=subdivision)
        df = df_monthly.groupby("year").agg(
            count_modis=("count_modis", "sum"),
            count_viirs=("count_viirs", "sum"),
            count_harmonized=("count_harmonized", "sum"),
            mean_frp=("mean_frp", "mean"),
            max_frp=("max_frp", "max")
        ).reset_index()
    else: # monthly_calendar
        df_monthly = DataSeeder.generate_historical_monthly_series(country=country, subdivision=subdivision)
        matrix = AnomalyDetector.build_calendar_matrix(df_monthly)
        df = pd.DataFrame(matrix)

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    csv_bytes = stream.getvalue().encode("utf-8")

    clean_name = country.lower().replace(" ", "_")
    filename = f"firewatch_{export_type}_{clean_name}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/geojson")
def export_geojson(payload: Dict[str, Any] = Body(...)):
    country = payload.get("country") or payload.get("region") or payload.get("state") or "Global"
    subdivision = payload.get("subdivision")
    export_type = payload.get("data_type", "grid") # 'grid' or 'points'

    df = DataSeeder.generate_point_hotspots(country=country, subdivision=subdivision, days_back=14, n_points=500)

    if export_type == "grid":
        h = SpatialHarmonizer(grid_size_deg=0.25 if country == "Global" else 0.1)
        grid_df = h.aggregate_grid(df)
        geojson = h.to_geojson_grid(grid_df, limit=350)
    else:
        features = []
        for _, row in df.iterrows():
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row["longitude"]), float(row["latitude"])]
                },
                "properties": {
                    "acq_date": str(row["acq_date"]),
                    "acq_time": str(row["acq_time"]),
                    "satellite": str(row["satellite"]),
                    "instrument": str(row["instrument"]),
                    "confidence": float(row["confidence"]),
                    "frp": float(row["frp"]),
                    "daynight": str(row["daynight"])
                }
            })
        geojson = {"type": "FeatureCollection", "features": features}

    return geojson

@router.post("/pdf")
def export_pdf(payload: Dict[str, Any] = Body(...)):
    country = payload.get("country") or payload.get("region_name") or payload.get("state") or "Global"
    subdivision = payload.get("subdivision")
    summary = compute_aoi_stats(country, subdivision)
    calibrator = SensorCalibrator()
    diagnostics = calibrator.get_diagnostics()

    pdf_bytes = PDFReportGenerator.generate_report(summary, diagnostics)
    clean_name = country.lower().replace(" ", "_")
    filename = f"firewatch_intelligence_report_{clean_name}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
