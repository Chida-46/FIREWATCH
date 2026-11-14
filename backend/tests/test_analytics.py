import pytest
import pandas as pd
from app.services.anomaly_detector import AnomalyDetector
from app.services.data_seeder import DataSeeder

def test_anomaly_classification():
    assert AnomalyDetector.classify_anomaly(120.0) == "Extreme Activity"
    assert AnomalyDetector.classify_anomaly(65.0) == "Significantly Above Normal"
    assert AnomalyDetector.classify_anomaly(25.0) == "Above Normal"
    assert AnomalyDetector.classify_anomaly(0.0) == "Normal"
    assert AnomalyDetector.classify_anomaly(-35.0) == "Below Normal"
    assert AnomalyDetector.classify_anomaly(50.0, completeness=0.4) == "Incomplete Data"

def test_climatology_and_calendar_matrix():
    df = DataSeeder.generate_historical_monthly_series(state="Karnataka", start_year=2015, end_year=2024)
    climatology = AnomalyDetector.calculate_climatology(df)
    assert len(climatology) == 12
    # Pre-monsoon peak check (March/April should be highest in Karnataka)
    mar_med = climatology[2]["median_count"]
    jul_med = climatology[6]["median_count"]
    assert mar_med > jul_med

    matrix = AnomalyDetector.build_calendar_matrix(df)
    assert len(matrix) == 10 * 12
    assert "anomaly_pct" in matrix[0]
    assert "historical_median" in matrix[0]
