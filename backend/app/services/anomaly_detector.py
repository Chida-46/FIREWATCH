import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

class AnomalyDetector:
    """
    Computes multi-decadal fire climatology baselines and statistical anomalies.
    Supports selectable baseline windows (5-year, 10-year, full record).
    """

    MONTH_NAMES = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]

    @staticmethod
    def classify_anomaly(anomaly_pct: float, completeness: float = 1.0) -> str:
        """
        Classifies anomaly percentage into standard scientific tiers.
        """
        if completeness < 0.7:
            return "Incomplete Data"
        if anomaly_pct > 100.0:
            return "Extreme Activity"
        elif anomaly_pct >= 50.0:
            return "Significantly Above Normal"
        elif anomaly_pct >= 20.0:
            return "Above Normal"
        elif anomaly_pct >= -20.0:
            return "Normal"
        else:
            return "Below Normal"

    @classmethod
    def calculate_climatology(
        cls,
        monthly_df: pd.DataFrame,
        baseline_years: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Calculates monthly climatology statistics (median, mean, IQR, min, max).
        monthly_df must have ['year', 'month', 'count_harmonized', 'mean_frp'].
        """
        if monthly_df.empty:
            return [
                {
                    "month": m,
                    "month_name": cls.MONTH_NAMES[m - 1],
                    "median_count": 0.0,
                    "mean_count": 0.0,
                    "iqr_low": 0.0,
                    "iqr_high": 0.0,
                    "min_count": 0.0,
                    "max_count": 0.0,
                    "mean_frp": 0.0
                }
                for m in range(1, 13)
            ]

        df = monthly_df.copy()
        if baseline_years:
            max_yr = df['year'].max()
            df = df[df['year'] >= (max_yr - baseline_years)]

        climatology = []
        for m in range(1, 13):
            sub = df[df['month'] == m]
            if sub.empty:
                counts = [0.0]
                frp = 0.0
            else:
                counts = sub['count_harmonized'].values
                frp = float(sub['mean_frp'].mean())

            med = float(np.median(counts))
            mean = float(np.mean(counts))
            q25 = float(np.percentile(counts, 25))
            q75 = float(np.percentile(counts, 75))
            c_min = float(np.min(counts))
            c_max = float(np.max(counts))

            climatology.append({
                "month": m,
                "month_name": cls.MONTH_NAMES[m - 1],
                "median_count": round(med, 1),
                "mean_count": round(mean, 1),
                "iqr_low": round(q25, 1),
                "iqr_high": round(q75, 1),
                "min_count": round(c_min, 1),
                "max_count": round(c_max, 1),
                "mean_frp": round(frp, 1)
            })

        return climatology

    @classmethod
    def build_calendar_matrix(
        cls,
        monthly_df: pd.DataFrame,
        baseline_years: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Builds the complete Year x Month heatmap matrix with calculated anomalies,
        completeness indicators, and sensor breakdowns.
        """
        if monthly_df.empty:
            return []

        df = monthly_df.copy()
        climatology_map = {
            c['month']: c['median_count']
            for c in cls.calculate_climatology(df, baseline_years)
        }
        mean_map = {
            c['month']: c['mean_count']
            for c in cls.calculate_climatology(df, baseline_years)
        }

        records = []
        current_year = df['year'].max()
        current_month = df[df['year'] == current_year]['month'].max() if not df.empty else 12

        for _, row in df.sort_values(by=['year', 'month']).iterrows():
            yr = int(row['year'])
            mo = int(row['month'])
            h_count = float(row.get('count_harmonized', 0.0))
            m_count = int(row.get('count_modis', 0))
            v_count = int(row.get('count_viirs', 0))
            frp_mean = float(row.get('mean_frp', 0.0))
            frp_max = float(row.get('max_frp', 0.0))

            hist_med = climatology_map.get(mo, 1.0)
            hist_avg = mean_map.get(mo, 1.0)

            # Safeguard against zero historical median
            denom = max(hist_med, 1.0)
            anomaly_abs = h_count - hist_med
            anomaly_pct = (anomaly_abs / denom) * 100.0

            # Completeness check for recent partial months
            is_recent_incomplete = (yr == current_year and mo == current_month)
            completeness = 0.5 if is_recent_incomplete else 1.0

            classification = cls.classify_anomaly(anomaly_pct, completeness)

            active_sensors = []
            if yr >= 2000 and m_count > 0:
                active_sensors.extend(["MODIS Terra", "MODIS Aqua"])
            if yr >= 2012 and v_count > 0:
                active_sensors.append("VIIRS Suomi-NPP")
            if yr >= 2018 and v_count > 0:
                active_sensors.append("VIIRS NOAA-20")
            if yr >= 2023 and v_count > 0:
                active_sensors.append("VIIRS NOAA-21")

            records.append({
                "year": yr,
                "month": mo,
                "month_name": cls.MONTH_NAMES[mo - 1],
                "count_modis": m_count,
                "count_viirs": v_count,
                "count_harmonized": round(h_count, 1),
                "mean_frp": round(frp_mean, 1),
                "max_frp": round(frp_max, 1),
                "historical_median": round(hist_med, 1),
                "historical_avg": round(hist_avg, 1),
                "anomaly_abs": round(anomaly_abs, 1),
                "anomaly_pct": round(anomaly_pct, 1),
                "anomaly_class": classification,
                "completeness": completeness,
                "active_sensors": list(set(active_sensors))
            })

        return records
