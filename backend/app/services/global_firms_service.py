import os
import io
import logging
import urllib.request
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
from app.services.boundary_service import BoundaryService

logger = logging.getLogger("firewatch.firms.global")

CACHE_DIR = Path(__file__).resolve().parent.parent / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

PARQUET_FILE = CACHE_DIR / "firms_global_standardized.parquet"
MODIS_CSV = CACHE_DIR / "firms_global_modis.csv"
VIIRS_CSV = CACHE_DIR / "firms_global_viirs.csv"

NASA_FIRMS_URLS = {
    "modis": "https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv",
    "viirs": "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv"
}

class GlobalFIRMSService:
    """
    Direct NASA FIRMS Real-Time Global Hotspot Ingestion & Processing Engine.
    Manages worldwide satellite active fire observations across all continents,
    standardizes MODIS and VIIRS telemetry, and provides fast spatial querying
    for both GLOBAL (worldwide) and COUNTRY-specific modes.
    """
    _cached_df: Optional[pd.DataFrame] = None
    _last_loaded: Optional[datetime] = None

    @classmethod
    def _clean_modis(cls, df: pd.DataFrame) -> pd.DataFrame:
        sat_map = {'T': 'Terra (MODIS)', 'A': 'Aqua (MODIS)', 'Terra': 'Terra (MODIS)', 'Aqua': 'Aqua (MODIS)'}
        conf = pd.to_numeric(df['confidence'], errors='coerce').fillna(60).astype(float)
        return pd.DataFrame({
            'latitude': df['latitude'].astype(float).round(4),
            'longitude': df['longitude'].astype(float).round(4),
            'acq_date': df['acq_date'].astype(str),
            'acq_time': df['acq_time'].astype(str).str.zfill(4),
            'satellite': df['satellite'].map(sat_map).fillna('Terra (MODIS)'),
            'instrument': 'MODIS',
            'confidence': conf,
            'brightness': pd.to_numeric(df.get('brightness', 320.0), errors='coerce').fillna(320.0).round(1),
            'bright_t31': pd.to_numeric(df.get('bright_t31', 295.0), errors='coerce').fillna(295.0).round(1),
            'frp': pd.to_numeric(df.get('frp', 25.0), errors='coerce').fillna(25.0).round(1),
            'daynight': df.get('daynight', 'D').fillna('D').astype(str).str.upper(),
            'scan': pd.to_numeric(df.get('scan', 1.0), errors='coerce').fillna(1.0).round(2),
            'track': pd.to_numeric(df.get('track', 1.0), errors='coerce').fillna(1.0).round(2),
            'source_product': 'NASA FIRMS MODIS C6.1 (NRT)',
            'harmonized_weight': 1.0
        })

    @classmethod
    def _clean_viirs(cls, df: pd.DataFrame) -> pd.DataFrame:
        sat_map = {'N20': 'NOAA-20 (VIIRS)', 'J1': 'NOAA-20 (VIIRS)', 'N': 'Suomi-NPP (VIIRS)', 'J2': 'NOAA-21 (VIIRS)'}
        conf_map = {'l': 35.0, 'low': 35.0, 'n': 70.0, 'nominal': 70.0, 'h': 95.0, 'high': 95.0}
        confs = df['confidence'].astype(str).str.lower().map(conf_map).fillna(65.0)
        return pd.DataFrame({
            'latitude': df['latitude'].astype(float).round(4),
            'longitude': df['longitude'].astype(float).round(4),
            'acq_date': df['acq_date'].astype(str),
            'acq_time': df['acq_time'].astype(str).str.zfill(4),
            'satellite': df['satellite'].astype(str).map(sat_map).fillna('NOAA-20 (VIIRS)'),
            'instrument': 'VIIRS',
            'confidence': confs.astype(float),
            'brightness': pd.to_numeric(df.get('bright_ti4', 335.0), errors='coerce').fillna(335.0).round(1),
            'bright_t31': pd.to_numeric(df.get('bright_ti5', 298.0), errors='coerce').fillna(298.0).round(1),
            'frp': pd.to_numeric(df.get('frp', 12.0), errors='coerce').fillna(12.0).round(1),
            'daynight': df.get('daynight', 'D').fillna('D').astype(str).str.upper(),
            'scan': pd.to_numeric(df.get('scan', 0.4), errors='coerce').fillna(0.4).round(2),
            'track': pd.to_numeric(df.get('track', 0.4), errors='coerce').fillna(0.4).round(2),
            'source_product': 'NASA FIRMS VIIRS 375m (NRT)',
            'harmonized_weight': 0.38
        })

    @classmethod
    def load_dataset(cls, force_refresh: bool = False) -> pd.DataFrame:
        """
        Loads the standardized real NASA FIRMS global active fire dataset into memory.
        """
        if cls._cached_df is not None and not force_refresh:
            return cls._cached_df

        if PARQUET_FILE.exists() and not force_refresh:
            try:
                cls._cached_df = pd.read_parquet(PARQUET_FILE)
                cls._last_loaded = datetime.now(timezone.utc)
                logger.info(f"Loaded {len(cls._cached_df)} real global FIRMS records from cache.")
                return cls._cached_df
            except Exception as e:
                logger.warning(f"Failed to read parquet cache: {e}")

        # Check if raw CSVs exist or download them
        dfs = []
        headers = {'User-Agent': 'FIREWATCH/1.0 (NASA Space Apps Challenge; Global Fire Intelligence)'}

        for key, url in NASA_FIRMS_URLS.items():
            dest = CACHE_DIR / f"firms_global_{key}.csv"
            if not dest.exists() or force_refresh:
                try:
                    req = urllib.request.Request(url, headers=headers)
                    with urllib.request.urlopen(req, timeout=20) as resp:
                        content = resp.read()
                        with open(dest, "wb") as f:
                            f.write(content)
                    logger.info(f"Downloaded latest NASA FIRMS {key} data ({len(content)} bytes).")
                except Exception as ex:
                    logger.warning(f"Could not download FIRMS {key}: {ex}")

            if dest.exists():
                try:
                    raw_df = pd.read_csv(dest)
                    if key == "modis":
                        dfs.append(cls._clean_modis(raw_df))
                    else:
                        dfs.append(cls._clean_viirs(raw_df))
                except Exception as ex:
                    logger.error(f"Error parsing {dest}: {ex}")

        if dfs:
            combined = pd.concat(dfs, ignore_index=True)
            # Remove any invalid coordinates
            valid = combined[
                (combined["latitude"].between(-90, 90)) &
                (combined["longitude"].between(-180, 180))
            ].copy()
            cls._cached_df = valid
            try:
                valid.to_parquet(PARQUET_FILE, index=False)
            except Exception:
                pass
            return valid

        # Fallback empty dataframe with standard columns
        cls._cached_df = pd.DataFrame(columns=[
            'latitude', 'longitude', 'acq_date', 'acq_time', 'satellite',
            'instrument', 'confidence', 'brightness', 'bright_t31', 'frp',
            'daynight', 'scan', 'track', 'source_product', 'harmonized_weight'
        ])
        return cls._cached_df

    @classmethod
    def get_hotspots(
        cls,
        country: Optional[str] = None,
        subdivision: Optional[str] = None,
        sensor: Optional[str] = "ALL",
        min_frp: float = 0.0,
        min_confidence: float = 0.0,
        daynight: Optional[str] = "ALL",
        limit: int = 1500,
        offset: int = 0,
        bbox: Optional[List[float]] = None
    ) -> Tuple[pd.DataFrame, int, Dict[str, Any]]:
        """
        Retrieves real NASA FIRMS active fire hotspots for GLOBAL or COUNTRY mode.
        Returns (df_page, total_matching, telemetry_metadata).
        """
        full_df = cls.load_dataset()
        if full_df.empty:
            return pd.DataFrame(), 0, {"mode": "EMPTY", "records_received": 0}

        df = full_df

        # Instrument Filter
        if sensor and sensor.upper() != "ALL":
            s_up = sensor.upper()
            df = df[df["instrument"] == s_up]

        # FRP & Confidence Filters
        if min_frp > 0:
            df = df[df["frp"] >= min_frp]
        if min_confidence > 0:
            df = df[df["confidence"] >= min_confidence]
        if daynight and daynight.upper() in ("D", "N"):
            df = df[df["daynight"] == daynight.upper()]

        is_global = (not country) or country in ("Global", "Global (Worldwide)", "worldwide", "world")

        # 1. GLOBAL MODE
        if is_global and not subdivision:
            if bbox and len(bbox) == 4:
                w, s, e, n = bbox
                df = df[
                    (df["latitude"] >= s) & (df["latitude"] <= n) &
                    (df["longitude"] >= w) & (df["longitude"] <= e)
                ]

            total_matching = len(df)

            # Spatially stratified worldwide sampling across all 6 continents
            # to guarantee that low zoom world map displays visible detections across every fire belt
            if total_matching > limit:
                # Stratify across latitude bands:
                # Band 1: North America & Boreal (Lat > 25, Lon < -30)
                # Band 2: South America (Lat < 15, -100 <= Lon <= -30)
                # Band 3: Europe & Mediterranean (35 <= Lat <= 70, -15 <= Lon <= 45)
                # Band 4: Africa (Lat <= 35, -20 <= Lon <= 55)
                # Band 5: Asia (Lat >= 0, 55 <= Lon <= 180)
                # Band 6: Australia & Oceania (Lat < 0, 110 <= Lon <= 180)
                strata = [
                    df[(df["latitude"] > 25) & (df["longitude"] < -30)],
                    df[(df["latitude"] < 15) & (df["longitude"].between(-100, -30))],
                    df[(df["latitude"].between(35, 70)) & (df["longitude"].between(-15, 45))],
                    df[(df["latitude"] <= 35) & (df["longitude"].between(-20, 55))],
                    df[(df["latitude"] >= 0) & (df["longitude"].between(55, 180))],
                    df[(df["latitude"] < 0) & (df["longitude"].between(110, 180))]
                ]

                samples = []
                per_stratum = max(100, limit // len(strata))
                for s_df in strata:
                    if len(s_df) > per_stratum:
                        samples.append(s_df.sample(per_stratum, random_state=42))
                    elif len(s_df) > 0:
                        samples.append(s_df)

                if samples:
                    sampled_df = pd.concat(samples, ignore_index=True)
                    # Fill any remaining slots
                    rem = limit - len(sampled_df)
                    if rem > 0:
                        rem_candidates = df.loc[~df.index.isin(sampled_df.index)]
                        if len(rem_candidates) > rem:
                            sampled_df = pd.concat([sampled_df, rem_candidates.sample(rem, random_state=42)])
                        else:
                            sampled_df = pd.concat([sampled_df, rem_candidates])
                    df_page = sampled_df.iloc[offset: offset + limit].copy()
                else:
                    df_page = df.sample(min(limit, len(df)), random_state=42).copy()
            else:
                df_page = df.iloc[offset: offset + limit].copy()

            telemetry = {
                "mode": "GLOBAL",
                "extent": "Worldwide",
                "total_available_in_dataset": total_matching,
                "rendered_count": len(df_page),
                "continents_represented": 6,
                "data_source": "NASA FIRMS NRT (MODIS C6.1 + NOAA-20 VIIRS 375m)",
                "valid_coordinates": True
            }
            return df_page, total_matching, telemetry

        # 2. COUNTRY MODE
        resolved_country = BoundaryService.resolve_country_name(country)
        info = BoundaryService.get_country_info(resolved_country)
        c_bbox = info["bbox"]

        # Fast Bounding Box pre-filter
        df_box = df[
            (df["latitude"] >= c_bbox[1]) & (df["latitude"] <= c_bbox[3]) &
            (df["longitude"] >= c_bbox[0]) & (df["longitude"] <= c_bbox[2])
        ]

        # True Polygon boundary filter
        df_country = BoundaryService.filter_dataframe_by_polygon(df_box, resolved_country)

        # Subdivision filter if provided
        if subdivision and not df_country.empty:
            subs = info.get("subdivisions", [])
            # If subdivision has known bbox
            from app.services.boundary_service import KNOWN_SUBDIVISIONS
            sub_dict = KNOWN_SUBDIVISIONS.get(resolved_country, {}).get(subdivision)
            if sub_dict:
                sw, ss, se, sn = sub_dict["bbox"]
                df_country = df_country[
                    (df_country["latitude"] >= ss) & (df_country["latitude"] <= sn) &
                    (df_country["longitude"] >= sw) & (df_country["longitude"] <= se)
                ]

        total_country = len(df_country)
        df_page = df_country.iloc[offset: offset + limit].copy()

        telemetry = {
            "mode": "COUNTRY",
            "country": resolved_country,
            "subdivision": subdivision,
            "iso3": info.get("iso3", ""),
            "continent": info.get("continent", ""),
            "bbox": c_bbox,
            "total_available_in_boundary": total_country,
            "rendered_count": len(df_page),
            "data_source": "NASA FIRMS NRT (MODIS C6.1 + NOAA-20 VIIRS 375m)",
            "valid_coordinates": True,
            "has_data": total_country > 0
        }

        return df_page, total_country, telemetry
