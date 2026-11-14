import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
import math

class SpatialHarmonizer:
    """
    Aggregates point hotspot detections into a harmonized geographic grid
    to resolve sub-pixel spatial disparities between MODIS (1 km) and VIIRS (375 m).
    """

    def __init__(self, grid_size_deg: float = 0.1):
        self.grid_size = grid_size_deg

    def assign_grid_cells(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Assigns spatial grid cell IDs and center coordinates to each hotspot observation.
        """
        if df.empty:
            df['cell_id'] = None
            df['cell_lat'] = None
            df['cell_lon'] = None
            return df

        # Snapping coordinates to grid centers
        df = df.copy()
        inv_grid = 1.0 / self.grid_size
        cell_lat = (np.round(df['latitude'] * inv_grid) / inv_grid).round(4)
        cell_lon = (np.round(df['longitude'] * inv_grid) / inv_grid).round(4)

        df['cell_lat'] = cell_lat
        df['cell_lon'] = cell_lon
        df['cell_id'] = cell_lat.astype(str) + "_" + cell_lon.astype(str)
        return df

    def aggregate_grid(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregates observations across spatial cells.
        Calculates separate MODIS and VIIRS counts, FRP aggregates, and mean coordinates.
        """
        if df.empty:
            return pd.DataFrame(columns=[
                'cell_id', 'cell_lat', 'cell_lon', 'modis_count',
                'viirs_count', 'total_count', 'mean_frp', 'max_frp', 'sum_frp'
            ])

        if 'cell_id' not in df.columns:
            df = self.assign_grid_cells(df)

        is_modis = df['instrument'] == 'MODIS'
        is_viirs = df['instrument'] == 'VIIRS'

        df_modis = df[is_modis].groupby('cell_id').size().rename('modis_count')
        df_viirs = df[is_viirs].groupby('cell_id').size().rename('viirs_count')

        stats = df.groupby('cell_id').agg(
            cell_lat=('cell_lat', 'first'),
            cell_lon=('cell_lon', 'first'),
            total_count=('latitude', 'count'),
            mean_frp=('frp', 'mean'),
            max_frp=('frp', 'max'),
            sum_frp=('frp', 'sum')
        )

        grid = stats.join(df_modis, how='left').join(df_viirs, how='left').fillna(0)
        grid['modis_count'] = grid['modis_count'].astype(int)
        grid['viirs_count'] = grid['viirs_count'].astype(int)
        grid = grid.reset_index()

        return grid

    def to_geojson_grid(self, grid_df: pd.DataFrame, limit: int = 500) -> Dict[str, Any]:
        """
        Converts top active grid cells to GeoJSON FeatureCollection of polygons for map rendering.
        """
        features = []
        half = self.grid_size / 2.0
        
        # Sort by total activity and take top cells for crisp rendering
        top_cells = grid_df.sort_values(by='total_count', ascending=False).head(limit)

        for _, row in top_cells.iterrows():
            lat = row['cell_lat']
            lon = row['cell_lon']
            poly = [
                [round(lon - half, 4), round(lat - half, 4)],
                [round(lon + half, 4), round(lat - half, 4)],
                [round(lon + half, 4), round(lat + half, 4)],
                [round(lon - half, 4), round(lat + half, 4)],
                [round(lon - half, 4), round(lat - half, 4)]
            ]
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [poly]
                },
                "properties": {
                    "cell_id": str(row['cell_id']),
                    "modis_count": int(row['modis_count']),
                    "viirs_count": int(row['viirs_count']),
                    "total_count": int(row['total_count']),
                    "mean_frp": round(float(row['mean_frp']), 1),
                    "max_frp": round(float(row['max_frp']), 1),
                    "sum_frp": round(float(row['sum_frp']), 1)
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }
