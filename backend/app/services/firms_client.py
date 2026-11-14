import os
import requests
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import time
import logging
from io import StringIO
from app.core.config import settings

logger = logging.getLogger("firewatch.firms")

class FIRMSClient:
    """
    NASA Earthdata FIRMS API Client.
    Handles Area API, Country API, availability checks, date chunking, and local disk caching.
    """

    def __init__(self, map_key: Optional[str] = None):
        self.map_key = map_key or settings.FIRMS_MAP_KEY
        self.base_url = settings.FIRMS_BASE_URL
        self.cache_dir = settings.CACHE_DIR

    def is_configured(self) -> bool:
        return bool(self.map_key and len(self.map_key.strip()) >= 16)

    def check_availability(self, source: str = "MODIS_NRT") -> Dict[str, Any]:
        """
        Queries NASA FIRMS data availability endpoint for a given product source.
        """
        if not self.is_configured():
            return {
                "status": "unconfigured",
                "message": "NASA FIRMS MAP_KEY is not configured. Running in global scientific baseline mode.",
                "source": source
            }

        url = f"{self.base_url}/api/data_availability/csv/{self.map_key}/{source}"
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200 and "Invalid MAP_KEY" not in resp.text:
                return {
                    "status": "available",
                    "source": source,
                    "details": resp.text.strip().split("\n")[:5]
                }
            else:
                return {
                    "status": "error",
                    "status_code": resp.status_code,
                    "message": resp.text.strip()
                }
        except Exception as e:
            return {
                "status": "network_error",
                "error": str(e)
            }

    def fetch_area_chunk(
        self,
        source: str,
        bbox: List[float],
        day_range: int,
        date_str: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Retrieves a single chunk (<= 10 days) of active fire observations from the FIRMS Area API.
        bbox: [west, south, east, north]
        """
        if not self.is_configured():
            return pd.DataFrame()

        days = min(10, max(1, day_range))
        west, south, east, north = bbox
        coord_str = f"{west},{south},{east},{north}"

        if date_str:
            url = f"{self.base_url}/api/area/csv/{self.map_key}/{source}/{coord_str}/{days}/{date_str}"
            cache_file = self.cache_dir / f"area_{source}_{coord_str}_{date_str}_{days}.csv"
        else:
            url = f"{self.base_url}/api/area/csv/{self.map_key}/{source}/{coord_str}/{days}"
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            cache_file = self.cache_dir / f"area_{source}_{coord_str}_{today_str}_{days}.csv"

        if cache_file.exists():
            try:
                return pd.read_csv(cache_file)
            except Exception:
                pass

        try:
            resp = requests.get(url, timeout=25)
            if resp.status_code == 200:
                text = resp.text.strip()
                if "Invalid MAP_KEY" not in text and "Bad Request" not in text:
                    df = pd.read_csv(StringIO(text))
                    try:
                        df.to_csv(cache_file, index=False)
                    except Exception:
                        pass
                    return df
        except Exception as ex:
            logger.error(f"Error fetching FIRMS Area API: {ex}")

        return pd.DataFrame()

    def fetch_country_chunk(
        self,
        source: str,
        country_iso3: str,
        day_range: int = 5,
        date_str: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Retrieves active fire observations for any country worldwide via the FIRMS Country API.
        """
        if not self.is_configured():
            return pd.DataFrame()

        days = min(10, max(1, day_range))
        iso = country_iso3.upper()

        if date_str:
            url = f"{self.base_url}/api/country/csv/{self.map_key}/{source}/{iso}/{days}/{date_str}"
            cache_file = self.cache_dir / f"country_{source}_{iso}_{date_str}_{days}.csv"
        else:
            url = f"{self.base_url}/api/country/csv/{self.map_key}/{source}/{iso}/{days}"
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            cache_file = self.cache_dir / f"country_{source}_{iso}_{today_str}_{days}.csv"

        if cache_file.exists():
            try:
                return pd.read_csv(cache_file)
            except Exception:
                pass

        try:
            resp = requests.get(url, timeout=25)
            if resp.status_code == 200:
                text = resp.text.strip()
                if "Invalid MAP_KEY" not in text and "Bad Request" not in text:
                    df = pd.read_csv(StringIO(text))
                    try:
                        df.to_csv(cache_file, index=False)
                    except Exception:
                        pass
                    return df
        except Exception as ex:
            logger.error(f"Error fetching FIRMS Country API: {ex}")

        return pd.DataFrame()
