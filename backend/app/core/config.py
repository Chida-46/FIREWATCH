import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "FIREWATCH"
    TAGLINE: str = "Global Satellite Fire Intelligence & Burning Activity Calendar"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"

    # Base Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    CACHE_DIR: Path = DATA_DIR / "cache"
    RAW_DIR: Path = DATA_DIR / "raw"
    PROCESSED_DIR: Path = DATA_DIR / "processed"

    # NASA FIRMS API Config
    FIRMS_MAP_KEY: str = os.getenv("FIRMS_MAP_KEY", "")
    FIRMS_BASE_URL: str = "https://firms.modaps.eosdis.nasa.gov"
    
    # Supported Satellites & Instruments
    MODIS_SOURCES: list = ["MODIS_NRT", "MODIS_SP"]
    VIIRS_SOURCES: list = [
        "VIIRS_SNPP_NRT", "VIIRS_SNPP_SP",
        "VIIRS_NOAA20_NRT", "VIIRS_NOAA20_SP",
        "VIIRS_NOAA21_NRT"
    ]

    # Geographic Defaults - Global
    DEFAULT_BBOX_GLOBAL: list = [-180.0, -60.0, 180.0, 75.0]  # [west, south, east, north]
    DEFAULT_COUNTRY: str = "Global"

    # Harmonization & Spatial Grid Defaults
    DEFAULT_GRID_SIZE_DEG: float = 0.25  # ~27 km nominal cell for global aggregation (0.1 deg for local)
    CALIBRATION_START_YEAR: int = 2012  # Suomi-NPP launch / overlap begin
    DEFAULT_ALPHA: float = 0.38  # Default power-law coefficient (MODIS = alpha * VIIRS^beta)
    DEFAULT_BETA: float = 0.92   # Default power-law exponent

    def __init__(self):
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self.RAW_DIR.mkdir(parents=True, exist_ok=True)
        self.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
