from fastapi import APIRouter, Body
from typing import Dict, Any, Optional
import os
from app.core.config import settings
from app.services.firms_client import FIRMSClient

router = APIRouter(prefix="/settings", tags=["Application Settings"])

@router.get("")
def get_settings():
    client = FIRMSClient()
    cached_files = list(settings.CACHE_DIR.glob("*.csv"))
    return {
        "firms_map_key_configured": client.is_configured(),
        "firms_map_key_preview": (settings.FIRMS_MAP_KEY[:4] + "..." + settings.FIRMS_MAP_KEY[-4:]) if client.is_configured() else "Not set",
        "demo_mode": not client.is_configured(),
        "default_grid_size_deg": settings.DEFAULT_GRID_SIZE_DEG,
        "default_region": "India (IND)",
        "cached_queries_count": len(cached_files),
        "supported_satellites": [
            "Terra (MODIS)", "Aqua (MODIS)",
            "Suomi-NPP (VIIRS 375m)", "NOAA-20 (VIIRS 375m)", "NOAA-21 (VIIRS 375m)"
        ],
        "project_version": settings.VERSION
    }

@router.post("")
def update_settings(payload: Dict[str, Any] = Body(...)):
    new_key = payload.get("firms_map_key")
    if new_key is not None:
        settings.FIRMS_MAP_KEY = new_key.strip()

    grid_size = payload.get("grid_resolution_deg")
    if grid_size is not None and 0.05 <= grid_size <= 0.5:
        settings.DEFAULT_GRID_SIZE_DEG = float(grid_size)

    clear_cache = payload.get("clear_cache", False)
    if clear_cache:
        for f in settings.CACHE_DIR.glob("*.csv"):
            try:
                f.unlink()
            except Exception:
                pass

    return {
        "status": "updated",
        "settings": get_settings()
    }
