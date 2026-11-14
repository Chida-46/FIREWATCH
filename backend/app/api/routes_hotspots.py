from fastapi import APIRouter, Query, Body
from typing import Optional, List, Dict, Any
from app.services.global_firms_service import GlobalFIRMSService
from app.services.spatial_harmonizer import SpatialHarmonizer

router = APIRouter(prefix="/hotspots", tags=["NASA FIRMS Real Hotspots"])

@router.get("")
def get_all_hotspots(
    country: Optional[str] = Query(None, description="Country name or 'Global'"),
    state: Optional[str] = Query(None, description="Subdivision or state"),
    sensor: Optional[str] = Query("ALL", description="ALL, MODIS, VIIRS"),
    min_frp: Optional[float] = Query(0.0),
    min_confidence: Optional[float] = Query(0.0),
    daynight: Optional[str] = Query("ALL", description="ALL, D, N"),
    limit: int = Query(1800, le=5000),
    offset: int = Query(0, ge=0),
    min_lon: Optional[float] = Query(None),
    min_lat: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None)
):
    """
    Retrieves authentic NASA FIRMS active fire hotspots for both:
    1. GLOBAL MODE: Worldwide coverage across all continents with zero country filtering.
    2. COUNTRY MODE: Hotspots geographically filtered strictly within the selected country's boundary.
    """
    bbox = None
    if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]):
        bbox = [min_lon, min_lat, max_lon, max_lat]

    df_page, total, telemetry = GlobalFIRMSService.get_hotspots(
        country=country,
        subdivision=state,
        sensor=sensor,
        min_frp=min_frp or 0.0,
        min_confidence=min_confidence or 0.0,
        daynight=daynight or "ALL",
        limit=limit,
        offset=offset,
        bbox=bbox
    )

    return {
        "mode": telemetry.get("mode", "GLOBAL"),
        "region": state or country or "Global",
        "total": total,
        "offset": offset,
        "limit": limit,
        "telemetry": telemetry,
        "records": df_page.to_dict(orient="records")
    }

@router.get("/modis")
def get_modis_hotspots(
    country: Optional[str] = Query("Global"),
    limit: int = Query(600)
):
    df_page, total, _ = GlobalFIRMSService.get_hotspots(
        country=country,
        sensor="MODIS",
        limit=limit
    )
    return {
        "count": len(df_page),
        "total_available": total,
        "records": df_page.to_dict(orient="records")
    }

@router.get("/viirs")
def get_viirs_hotspots(
    country: Optional[str] = Query("Global"),
    limit: int = Query(1000)
):
    df_page, total, _ = GlobalFIRMSService.get_hotspots(
        country=country,
        sensor="VIIRS",
        limit=limit
    )
    return {
        "count": len(df_page),
        "total_available": total,
        "records": df_page.to_dict(orient="records")
    }

@router.get("/grid")
def get_spatial_grid(
    country: Optional[str] = Query("Global"),
    state: Optional[str] = Query(None),
    grid_size: float = Query(0.25, ge=0.05, le=1.0)
):
    is_global = (not country) or country in ("Global", "Global (Worldwide)")
    g_size = 0.5 if is_global else grid_size
    
    df_page, _, _ = GlobalFIRMSService.get_hotspots(
        country=country,
        subdivision=state,
        limit=3000
    )
    h = SpatialHarmonizer(grid_size_deg=g_size)
    grid_df = h.aggregate_grid(df_page)
    geojson = h.to_geojson_grid(grid_df, limit=400)
    return geojson

@router.post("/aoi")
def query_aoi_hotspots(payload: Dict[str, Any] = Body(...)):
    country = payload.get("country", "Global")
    state = payload.get("state") or payload.get("subdivision")
    bbox = payload.get("bbox")  # [min_lon, min_lat, max_lon, max_lat]
    
    df_page, total, telemetry = GlobalFIRMSService.get_hotspots(
        country=country,
        subdivision=state,
        limit=1500,
        bbox=bbox
    )

    return {
        "count": len(df_page),
        "total": total,
        "telemetry": telemetry,
        "records": df_page.to_dict(orient="records")
    }
