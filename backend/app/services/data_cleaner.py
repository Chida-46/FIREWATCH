import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger("firewatch.cleaner")

class DataCleaner:
    """
    Normalizes, validates, and cleans raw NASA FIRMS active fire hotspot observations
    from MODIS (Terra & Aqua) and VIIRS (Suomi-NPP, NOAA-20, NOAA-21).
    """

    @staticmethod
    def standardize_confidence(val: Any) -> float:
        """
        MODIS produces integer confidence (0-100).
        VIIRS NRT produces string confidence ('l'=low, 'n'=nominal, 'h'=high).
        VIIRS SP produces integer confidence (0-100).
        Standardizes all confidences to a 0-100 scale.
        """
        if pd.isna(val):
            return 50.0
        if isinstance(val, (int, float)):
            return float(np.clip(val, 0.0, 100.0))
        
        str_val = str(val).strip().lower()
        if str_val in ['l', 'low']:
            return 25.0
        elif str_val in ['n', 'nominal']:
            return 60.0
        elif str_val in ['h', 'high']:
            return 90.0
        try:
            return float(np.clip(float(str_val), 0.0, 100.0))
        except ValueError:
            return 50.0

    @classmethod
    def clean_dataframe(cls, df: pd.DataFrame, source_hint: str = "") -> pd.DataFrame:
        """
        Cleans and normalizes a pandas DataFrame of FIRMS observations.
        """
        if df.empty:
            return pd.DataFrame(columns=[
                'latitude', 'longitude', 'acq_date', 'acq_time',
                'satellite', 'instrument', 'confidence', 'brightness',
                'bright_t31', 'frp', 'daynight', 'scan', 'track',
                'source_product', 'timestamp'
            ])

        # Standardize column names to lower case
        df.columns = [c.strip().lower() for c in df.columns]

        # Ensure required coordinate columns exist
        if 'latitude' not in df.columns or 'longitude' not in df.columns:
            raise ValueError("Input dataset lacks 'latitude' or 'longitude' columns.")

        # Filter invalid geographic coordinates
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
        valid_coords = (
            (df['latitude'] >= -90.0) & (df['latitude'] <= 90.0) &
            (df['longitude'] >= -180.0) & (df['longitude'] <= 180.0)
        )
        df = df[valid_coords].copy()

        # Acquisition Date and Time
        if 'acq_date' in df.columns:
            df['acq_date'] = df['acq_date'].astype(str).str.strip()
        else:
            df['acq_date'] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        if 'acq_time' in df.columns:
            # Format time as 4-digit HHMM
            df['acq_time'] = df['acq_time'].astype(str).str.zfill(4)
        else:
            df['acq_time'] = "1200"

        # ISO timestamp
        try:
            df['timestamp'] = pd.to_datetime(
                df['acq_date'] + ' ' + df['acq_time'].str[:2] + ':' + df['acq_time'].str[2:],
                format='%Y-%m-%d %H:%M',
                errors='coerce'
            )
        except Exception:
            df['timestamp'] = pd.to_datetime(df['acq_date'], errors='coerce')

        # Satellite & Instrument Normalization
        if 'satellite' in df.columns:
            sat_map = {
                't': 'Terra', 'terra': 'Terra', '1': 'Terra',
                'a': 'Aqua', 'aqua': 'Aqua', '2': 'Aqua',
                'n': 'Suomi-NPP', 'suomi-npp': 'Suomi-NPP', 'npp': 'Suomi-NPP',
                'j1': 'NOAA-20', 'noaa-20': 'NOAA-20', 'noaa20': 'NOAA-20', '1': 'NOAA-20',
                'j2': 'NOAA-21', 'noaa-21': 'NOAA-21', 'noaa21': 'NOAA-21'
            }
            # Look at source_hint if satellite string is ambiguous
            if 'viirs' in source_hint.lower():
                sat_series = df['satellite'].astype(str).str.strip().str.lower()
                df['satellite'] = sat_series.map(sat_map).fillna(
                    'Suomi-NPP' if 'snpp' in source_hint.lower() else (
                        'NOAA-20' if '20' in source_hint else 'NOAA-21'
                    )
                )
            else:
                sat_series = df['satellite'].astype(str).str.strip().str.lower()
                df['satellite'] = sat_series.map(sat_map).fillna('Terra')
        else:
            if 'modis' in source_hint.lower():
                df['satellite'] = 'Terra'
            elif '20' in source_hint:
                df['satellite'] = 'NOAA-20'
            elif '21' in source_hint:
                df['satellite'] = 'NOAA-21'
            else:
                df['satellite'] = 'Suomi-NPP'

        if 'instrument' in df.columns:
            df['instrument'] = df['instrument'].astype(str).str.strip().str.upper()
        else:
            df['instrument'] = 'MODIS' if 'modis' in source_hint.lower() else 'VIIRS'

        # Confidence standardization
        if 'confidence' in df.columns:
            df['confidence'] = df['confidence'].apply(cls.standardize_confidence)
        else:
            df['confidence'] = 60.0

        # Fire Radiative Power (FRP) in MW
        if 'frp' in df.columns:
            df['frp'] = pd.to_numeric(df['frp'], errors='coerce').fillna(1.0)
            df['frp'] = df['frp'].apply(lambda x: max(0.1, float(x)))
        else:
            df['frp'] = 10.0

        # Brightness Temperatures (Kelvin)
        # VIIRS I-band brightness is ~375m brightness_ti4 (or 'bright_ti4')
        # MODIS 4um brightness is 'brightness'
        if 'bright_ti4' in df.columns:
            df['brightness'] = pd.to_numeric(df['bright_ti4'], errors='coerce')
        elif 'brightness' in df.columns:
            df['brightness'] = pd.to_numeric(df['brightness'], errors='coerce')
        else:
            df['brightness'] = 320.0

        if 'bright_ti5' in df.columns:
            df['bright_t31'] = pd.to_numeric(df['bright_ti5'], errors='coerce')
        elif 'bright_t31' in df.columns:
            df['bright_t31'] = pd.to_numeric(df['bright_t31'], errors='coerce')
        else:
            df['bright_t31'] = 295.0

        # Day/Night
        if 'daynight' in df.columns:
            df['daynight'] = df['daynight'].astype(str).str.upper().str.strip()
            df['daynight'] = df['daynight'].apply(lambda x: 'D' if x.startswith('D') else 'N')
        else:
            df['daynight'] = 'D'

        # Scan & Track
        for col in ['scan', 'track']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(1.0)
            else:
                df[col] = 1.0

        # Source Product tag
        df['source_product'] = source_hint if source_hint else 'FIRMS_STANDARD'

        # Remove duplicate records: exact same sensor, coordinates, date, and time
        # Legitimate multi-sensor detections at same location are PRESERVED!
        df = df.drop_duplicates(
            subset=['latitude', 'longitude', 'acq_date', 'acq_time', 'satellite']
        )

        return df
