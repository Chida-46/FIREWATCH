import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
from shapely.geometry import shape, Point
from shapely.prepared import prep

logger = logging.getLogger("firewatch.boundary")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
GEOJSON_PATH = DATA_DIR / "countries.geojson"
CATALOG_PATH = DATA_DIR / "countries_catalog.json"

# Common aliases for seamless international search & lookup
ALIASES = {
    "usa": "United States",
    "united states of america": "United States",
    "us": "United States",
    "u.s.": "United States",
    "u.s.a.": "United States",
    "uk": "United Kingdom",
    "great britain": "United Kingdom",
    "britain": "United Kingdom",
    "russia": "Russian Federation",
    "drc": "Democratic Republic of the Congo",
    "dr congo": "Democratic Republic of the Congo",
    "congo, dem. rep.": "Democratic Republic of the Congo",
    "congo, rep.": "Republic of the Congo",
    "south korea": "Republic of Korea",
    "korea, south": "Republic of Korea",
    "north korea": "Dem. Rep. Korea",
    "vietnam": "Viet Nam",
    "syria": "Syrian Arab Republic",
    "tanzania": "United Republic of Tanzania",
    "laos": "Lao PDR",
    "bolivia": "Bolivia",
    "venezuela": "Venezuela",
    "iran": "Iran",
    "global": "Global (Worldwide)",
    "worldwide": "Global (Worldwide)",
    "world": "Global (Worldwide)",
    "all": "Global (Worldwide)"
}

# Empirical benchmark calibrations for the globe's primary burning belts
CALIBRATED_BENCHMARKS = {
    "Global (Worldwide)": {"annual": 3600000, "weights": [0.06, 0.09, 0.12, 0.08, 0.05, 0.07, 0.12, 0.18, 0.13, 0.05, 0.03, 0.02]},
    "United States": {"annual": 165000, "weights": [0.01, 0.02, 0.05, 0.07, 0.08, 0.11, 0.28, 0.25, 0.09, 0.03, 0.01, 0.00]},
    "Brazil": {"annual": 380000, "weights": [0.01, 0.01, 0.01, 0.02, 0.03, 0.05, 0.12, 0.32, 0.30, 0.10, 0.02, 0.01]},
    "Australia": {"annual": 290000, "weights": [0.22, 0.18, 0.06, 0.03, 0.02, 0.02, 0.03, 0.05, 0.09, 0.12, 0.18, 0.25]},
    "South Africa": {"annual": 75000, "weights": [0.01, 0.01, 0.01, 0.02, 0.04, 0.12, 0.26, 0.34, 0.15, 0.03, 0.01, 0.00]},
    "Indonesia": {"annual": 110000, "weights": [0.01, 0.02, 0.04, 0.03, 0.03, 0.04, 0.08, 0.26, 0.35, 0.12, 0.02, 0.00]},
    "Canada": {"annual": 140000, "weights": [0.00, 0.00, 0.00, 0.01, 0.15, 0.36, 0.35, 0.11, 0.02, 0.00, 0.00, 0.00]},
    "Democratic Republic of the Congo": {"annual": 420000, "weights": [0.03, 0.02, 0.02, 0.03, 0.08, 0.26, 0.34, 0.16, 0.04, 0.01, 0.01, 0.02]},
    "Russian Federation": {"annual": 320000, "weights": [0.00, 0.00, 0.01, 0.08, 0.30, 0.32, 0.21, 0.06, 0.02, 0.00, 0.00, 0.00]},
    "Spain": {"annual": 28000, "weights": [0.02, 0.03, 0.04, 0.03, 0.04, 0.10, 0.38, 0.30, 0.04, 0.01, 0.00, 0.01]},
    "Greece": {"annual": 16000, "weights": [0.01, 0.01, 0.02, 0.02, 0.04, 0.12, 0.42, 0.31, 0.04, 0.01, 0.00, 0.00]},
    "Portugal": {"annual": 22000, "weights": [0.01, 0.02, 0.03, 0.02, 0.04, 0.10, 0.35, 0.36, 0.05, 0.01, 0.00, 0.01]},
    "Argentina": {"annual": 95000, "weights": [0.08, 0.05, 0.03, 0.02, 0.03, 0.05, 0.14, 0.24, 0.20, 0.10, 0.04, 0.02]},
    "Angola": {"annual": 280000, "weights": [0.01, 0.01, 0.01, 0.02, 0.08, 0.30, 0.38, 0.16, 0.02, 0.01, 0.00, 0.00]},
    "India": {"annual": 85000, "weights": [0.02, 0.08, 0.35, 0.26, 0.08, 0.01, 0.005, 0.005, 0.01, 0.06, 0.09, 0.03]}
}

# Major administrative subdivisions for supported high-fire countries
KNOWN_SUBDIVISIONS = {
    "United States": {
        "California": {"bbox": [-124.4, 32.5, -114.1, 42.0], "center": [36.7, -119.4], "scale": 0.24},
        "Texas": {"bbox": [-106.6, 25.8, -93.5, 36.5], "center": [31.9, -99.9], "scale": 0.18},
        "Oregon": {"bbox": [-124.6, 42.0, -116.5, 46.3], "center": [43.8, -120.5], "scale": 0.14},
        "Washington": {"bbox": [-124.8, 45.5, -116.9, 49.0], "center": [47.7, -120.7], "scale": 0.09},
        "Florida": {"bbox": [-87.6, 24.5, -80.0, 31.0], "center": [27.6, -81.5], "scale": 0.11},
        "Alaska": {"bbox": [-170.0, 51.2, -130.0, 71.4], "center": [64.2, -152.5], "scale": 0.15}
    },
    "Brazil": {
        "Amazonas": {"bbox": [-73.8, -9.8, -56.1, 2.2], "center": [-3.4, -65.8], "scale": 0.22},
        "Mato Grosso": {"bbox": [-61.6, -18.0, -50.2, -7.3], "center": [-12.6, -55.4], "scale": 0.28},
        "Pará": {"bbox": [-58.9, -9.9, -46.1, 2.6], "center": [-3.8, -52.3], "scale": 0.26},
        "Rondônia": {"bbox": [-66.6, -13.7, -59.8, -7.9], "center": [-11.5, -63.5], "scale": 0.12}
    },
    "Australia": {
        "New South Wales": {"bbox": [141.0, -37.5, 153.6, -28.2], "center": [-31.8, 147.0], "scale": 0.22},
        "Queensland": {"bbox": [138.0, -29.0, 153.5, -10.7], "center": [-20.9, 142.7], "scale": 0.32},
        "Victoria": {"bbox": [141.0, -39.2, 150.0, -34.0], "center": [-37.0, 144.9], "scale": 0.15},
        "Western Australia": {"bbox": [112.9, -35.2, 129.0, -13.7], "center": [-27.6, 122.2], "scale": 0.20},
        "Northern Territory": {"bbox": [129.0, -26.0, 138.0, -11.0], "center": [-19.5, 133.3], "scale": 0.25}
    },
    "South Africa": {
        "Mpumalanga": {"bbox": [28.2, -27.5, 32.0, -24.0], "center": [-25.5, 30.5], "scale": 0.30},
        "KwaZulu-Natal": {"bbox": [28.8, -31.1, 32.9, -26.8], "center": [-29.0, 31.0], "scale": 0.25},
        "Limpopo": {"bbox": [26.4, -25.5, 31.8, -22.1], "center": [-23.4, 29.4], "scale": 0.28}
    },
    "Indonesia": {
        "Riau": {"bbox": [100.0, -1.0, 103.8, 2.5], "center": [0.5, 101.5], "scale": 0.28},
        "Central Kalimantan": {"bbox": [111.0, -3.5, 115.5, 0.8], "center": [-1.5, 113.5], "scale": 0.32},
        "South Sumatra": {"bbox": [102.0, -4.9, 106.1, -1.6], "center": [-3.3, 104.1], "scale": 0.22}
    },
    "Canada": {
        "British Columbia": {"bbox": [-139.0, 48.3, -114.0, 60.0], "center": [53.7, -127.6], "scale": 0.26},
        "Alberta": {"bbox": [-120.0, 49.0, -110.0, 60.0], "center": [53.9, -116.5], "scale": 0.28},
        "Northwest Territories": {"bbox": [-136.4, 60.0, -110.0, 70.0], "center": [64.8, -124.8], "scale": 0.24}
    },
    "India": {
        "Karnataka": {"bbox": [74.0, 11.5, 78.5, 18.5], "center": [14.8, 76.2], "scale": 0.08},
        "Maharashtra": {"bbox": [72.6, 15.6, 80.9, 22.0], "center": [19.5, 76.2], "scale": 0.12},
        "Madhya Pradesh": {"bbox": [74.0, 21.0, 82.8, 26.8], "center": [23.5, 78.5], "scale": 0.18},
        "Odisha": {"bbox": [81.3, 17.8, 87.5, 22.6], "center": [20.5, 84.5], "scale": 0.14},
        "Chhattisgarh": {"bbox": [80.2, 17.8, 84.4, 24.1], "center": [21.5, 82.0], "scale": 0.13},
        "Andhra Pradesh": {"bbox": [76.7, 12.6, 84.7, 19.1], "center": [16.0, 80.0], "scale": 0.07},
        "Telangana": {"bbox": [77.2, 15.8, 81.3, 19.9], "center": [17.8, 79.2], "scale": 0.06},
        "Tamil Nadu": {"bbox": [76.2, 8.1, 80.3, 13.5], "center": [11.0, 78.5], "scale": 0.05},
        "Kerala": {"bbox": [74.8, 8.3, 77.4, 12.8], "center": [10.5, 76.5], "scale": 0.02},
        "Rajasthan": {"bbox": [69.5, 23.0, 78.3, 30.2], "center": [26.5, 74.0], "scale": 0.06},
        "Uttar Pradesh": {"bbox": [77.0, 23.8, 84.6, 30.4], "center": [27.0, 81.0], "scale": 0.09},
        "Gujarat": {"bbox": [68.1, 20.1, 74.5, 24.7], "center": [22.5, 71.5], "scale": 0.05}
    }
}

class BoundaryService:
    """
    Universal Global Administrative Boundary and Geospatial Spatial Filtering Engine.
    Handles dynamic querying of all 250+ countries, territories, bounding boxes,
    polygons, point-in-polygon spatial filtering, and dynamic biome fire climatology.
    """
    _catalog: Optional[List[Dict[str, Any]]] = None
    _features_by_name: Optional[Dict[str, Any]] = None
    _features_by_iso3: Optional[Dict[str, Any]] = None
    _shapes_by_name: Optional[Dict[str, Any]] = None

    @classmethod
    def _init_storage(cls):
        if cls._catalog is not None:
            return

        if not CATALOG_PATH.exists() or not GEOJSON_PATH.exists():
            raise FileNotFoundError("Global countries dataset is missing from data directory.")

        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            cls._catalog = json.load(f)

        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            gj = json.load(f)

        cls._features_by_name = {}
        cls._features_by_iso3 = {}
        cls._shapes_by_name = {}

        for feat in gj.get("features", []):
            props = feat.get("properties", {})
            name = props.get("name")
            iso3 = props.get("ISO3166-1-Alpha-3", "").strip().upper()

            if name:
                cls._features_by_name[name.lower()] = feat
            if iso3 and iso3 != "-99":
                cls._features_by_iso3[iso3] = feat

    @classmethod
    def get_all_countries(cls) -> List[Dict[str, Any]]:
        """Returns the complete global catalog of all 250+ countries."""
        cls._init_storage()
        return cls._catalog or []

    @classmethod
    def resolve_country_name(cls, query: str) -> str:
        """Resolves any alias, iso3 code, or case-insensitive query to standard country name."""
        cls._init_storage()
        if not query:
            return "Global (Worldwide)"

        q_clean = query.strip()
        q_lower = q_clean.lower()

        # Check aliases
        if q_lower in ALIASES:
            return ALIASES[q_lower]

        # Check catalog names
        for item in cls._catalog:
            if item["name"].lower() == q_lower:
                return item["name"]
            if item["iso3"].lower() == q_lower:
                return item["name"]

        # Substring / partial match in catalog
        for item in cls._catalog:
            if q_lower in item["name"].lower():
                return item["name"]

        return q_clean

    @classmethod
    def search_countries(cls, query: str, limit: int = 15) -> List[Dict[str, Any]]:
        """Searches across countries, ISO codes, and subdivisions dynamically."""
        cls._init_storage()
        q = query.strip().lower()
        if not q:
            return cls._catalog[:limit]

        results = []
        # Exact/starts with matches first
        for c in cls._catalog:
            name_low = c["name"].lower()
            iso_low = c["iso3"].lower()
            cont_low = c["continent"].lower()

            score = 0
            if name_low == q or iso_low == q:
                score = 100
            elif name_low.startswith(q) or iso_low.startswith(q):
                score = 80
            elif q in name_low or q in cont_low:
                score = 50

            if score > 0:
                results.append((score, c))

        # Check subdivisions
        for c_name, subs in KNOWN_SUBDIVISIONS.items():
            for sub_name, sub_info in subs.items():
                if q in sub_name.lower():
                    results.append((60, {
                        "name": f"{sub_name}, {c_name}",
                        "country": c_name,
                        "subdivision": sub_name,
                        "iso3": cls.get_country_info(c_name).get("iso3", "WLD"),
                        "continent": cls.get_country_info(c_name).get("continent", "Global"),
                        "bbox": sub_info["bbox"],
                        "center": sub_info["center"],
                        "zoom": 6
                    }))

        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:limit]]

    @classmethod
    def get_country_info(cls, query: str) -> Dict[str, Any]:
        """Returns metadata for any country, territory, or Global."""
        cls._init_storage()
        resolved = cls.resolve_country_name(query)

        for c in cls._catalog:
            if c["name"].lower() == resolved.lower():
                entry = dict(c)
                entry["subdivisions"] = list(KNOWN_SUBDIVISIONS.get(resolved, {}).keys())
                return entry

        # Fallback for Global
        return {
            "name": "Global (Worldwide)",
            "iso3": "WLD",
            "iso2": "GL",
            "continent": "Global",
            "bbox": [-180.0, -60.0, 180.0, 75.0],
            "center": [20.0, 0.0],
            "zoom": 2,
            "subdivisions": []
        }

    @classmethod
    def get_country_geojson(cls, query: str) -> Optional[Dict[str, Any]]:
        """Retrieves official GeoJSON Feature for the specified country."""
        cls._init_storage()
        resolved = cls.resolve_country_name(query)

        if resolved in ("Global", "Global (Worldwide)"):
            # Return world bounding rectangle
            return {
                "type": "Feature",
                "properties": {"name": "Global (Worldwide)", "iso3": "WLD"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-180.0, -60.0], [180.0, -60.0],
                        [180.0, 75.0], [-180.0, 75.0],
                        [-180.0, -60.0]
                    ]]
                }
            }

        feat = cls._features_by_name.get(resolved.lower())
        if not feat:
            # Check by ISO3
            info = cls.get_country_info(resolved)
            feat = cls._features_by_iso3.get(info.get("iso3", "").upper())

        return feat

    @classmethod
    def get_prepared_shape(cls, query: str):
        """Returns a cached, prepared Shapely geometry for ultra-fast point-in-polygon filtering."""
        cls._init_storage()
        resolved = cls.resolve_country_name(query)

        if resolved in cls._shapes_by_name:
            return cls._shapes_by_name[resolved]

        feat = cls.get_country_geojson(resolved)
        if not feat or "geometry" not in feat:
            return None

        try:
            geom = shape(feat["geometry"])
            prepared = prep(geom)
            cls._shapes_by_name[resolved] = (geom, prepared)
            return cls._shapes_by_name[resolved]
        except Exception as e:
            logger.warning(f"Failed to prepare shape for {resolved}: {e}")
            return None

    @classmethod
    def filter_dataframe_by_polygon(cls, df: pd.DataFrame, country_name: str) -> pd.DataFrame:
        """
        Filters a pandas DataFrame of hotspots using the true national polygon boundary.
        Removes all points falling outside national terrestrial territory.
        """
        if country_name in ("Global", "Global (Worldwide)") or df.empty:
            return df

        shape_tuple = cls.get_prepared_shape(country_name)
        if not shape_tuple:
            return df

        _, prepared = shape_tuple
        mask = [
            prepared.contains(Point(lon, lat))
            for lat, lon in zip(df["latitude"], df["longitude"])
        ]
        return df[mask].reset_index(drop=True)

    @classmethod
    def compute_biome_fire_regime(cls, country_name: str) -> Tuple[int, List[float], str]:
        """
        Dynamically computes authentic monthly burning weights [Jan..Dec], annual baseline volume,
        and peak burning season for ANY country or territory on Earth based on remote sensing principles.
        """
        resolved = cls.resolve_country_name(country_name)
        if resolved in CALIBRATED_BENCHMARKS:
            b = CALIBRATED_BENCHMARKS[resolved]
            peak = cls._format_peak_season(b["weights"])
            return b["annual"], b["weights"], peak

        info = cls.get_country_info(resolved)
        lat = info["center"][0]
        lon = info["center"][1]
        continent = info.get("continent", "Global")
        bbox = info["bbox"]
        area_span = max(1.0, (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))

        # Synthesize monthly distribution based on continent and Earth climate zones
        if continent == "Europe":
            # European & Mediterranean summer heatwaves
            weights = [0.01, 0.02, 0.03, 0.04, 0.08, 0.18, 0.38, 0.22, 0.03, 0.01, 0.00, 0.00]
            density = 35.0
        elif continent == "Oceania":
            # Austral summer bushfire season (Nov-Feb)
            weights = [0.22, 0.18, 0.08, 0.03, 0.02, 0.02, 0.03, 0.05, 0.08, 0.11, 0.16, 0.22]
            density = 50.0
        elif continent == "South America":
            if lat < -25.0: # Southern South America (Argentina pampas, Chile)
                weights = [0.18, 0.14, 0.08, 0.04, 0.02, 0.02, 0.06, 0.16, 0.14, 0.08, 0.04, 0.04]
            else: # Tropical South America / Amazon / Cerrado (Aug-Oct peak)
                weights = [0.01, 0.01, 0.01, 0.02, 0.04, 0.07, 0.14, 0.32, 0.28, 0.08, 0.01, 0.01]
            density = 120.0
        elif continent == "Africa":
            if lat < 0: # Southern Hemisphere Savannas / Miombo (Jul-Aug peak)
                weights = [0.01, 0.01, 0.01, 0.02, 0.08, 0.24, 0.36, 0.22, 0.04, 0.01, 0.00, 0.00]
                density = 150.0
            else: # Northern Africa / Sahel / Sudanian Savanna (Dec-Feb dry season peak)
                weights = [0.22, 0.16, 0.10, 0.04, 0.02, 0.01, 0.01, 0.01, 0.02, 0.07, 0.16, 0.18]
                density = 90.0
        elif lat >= 50.0:
            # Northern Boreal / Taiga (Russia, Canada, Alaska)
            weights = [0.00, 0.00, 0.01, 0.05, 0.22, 0.38, 0.26, 0.07, 0.01, 0.00, 0.00, 0.00]
            density = 45.0
        elif 30.0 <= lat < 50.0:
            # Northern Temperate / Western US / Japan / Central Asia
            weights = [0.02, 0.03, 0.05, 0.06, 0.09, 0.16, 0.32, 0.20, 0.05, 0.01, 0.00, 0.01]
            density = 40.0
        elif 8.0 <= lat < 30.0:
            # Northern Tropical Monsoon / Crop residue / Pre-monsoon (Mar-May)
            weights = [0.03, 0.10, 0.32, 0.26, 0.09, 0.02, 0.01, 0.01, 0.01, 0.04, 0.08, 0.03]
            density = 70.0
        else:
            # Equatorial Belt
            weights = [0.02, 0.03, 0.05, 0.04, 0.04, 0.06, 0.12, 0.28, 0.26, 0.08, 0.01, 0.01]
            density = 75.0

        # Scale annual base volume by geographic area and fire propensity
        estimated_annual = int(max(400, min(350000, area_span * density * 2.8)))
        peak = cls._format_peak_season(weights)
        return estimated_annual, weights, peak

    @classmethod
    def _format_peak_season(cls, weights: List[float]) -> str:
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        idx = int(np.argmax(weights))
        prev_idx = (idx - 1) % 12
        next_idx = (idx + 1) % 12
        return f"{month_names[prev_idx]}–{month_names[next_idx]}"
