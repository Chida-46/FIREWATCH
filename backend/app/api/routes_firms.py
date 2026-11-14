from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from app.services.firms_client import FIRMSClient
from app.services.data_cleaner import DataCleaner
from app.core.config import settings

router = APIRouter(prefix="/firms", tags=["NASA FIRMS Ingestion"])

@router.get("/availability")
def get_availability(source: str = Query("MODIS_NRT", description="Product source, e.g. MODIS_NRT, VIIRS_SNPP_NRT")):
    client = FIRMSClient()
    return client.check_availability(source)

@router.post("/fetch")
def fetch_firms_data(
    source: str = Query("MODIS_NRT", description="Product source"),
    west: float = Query(68.0),
    south: float = Query(6.0),
    east: float = Query(97.5),
    north: float = Query(37.0),
    days: int = Query(3, ge=1, le=10),
    date: Optional[str] = Query(None, description="YYYY-MM-DD")
):
    client = FIRMSClient()
    if not client.is_configured():
        return {
            "status": "unconfigured",
            "message": "FIRMS MAP_KEY is not configured in backend settings. To fetch live data directly from NASA, add your free key in Settings.",
            "data_count": 0,
            "observations": []
        }

    df = client.fetch_area_chunk(
        source=source,
        bbox=[west, south, east, north],
        day_range=days,
        date_str=date
    )

    if df.empty:
        return {
            "status": "empty_or_failed",
            "message": "No active fires detected in specified area or NASA request failed.",
            "data_count": 0,
            "observations": []
        }

    cleaned = DataCleaner.clean_dataframe(df, source_hint=source)
    return {
        "status": "success",
        "data_count": len(cleaned),
        "source": source,
        "observations": cleaned.head(500).to_dict(orient="records")
    }
