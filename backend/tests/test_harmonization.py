import pytest
import pandas as pd
import numpy as np
from app.services.sensor_calibrator import SensorCalibrator
from app.services.spatial_harmonizer import SpatialHarmonizer

def test_spatial_harmonizer_grid_binning():
    harmonizer = SpatialHarmonizer(grid_size_deg=0.1)
    df = pd.DataFrame({
        "latitude": [15.312, 15.318, 16.550],
        "longitude": [75.711, 75.719, 76.220],
        "instrument": ["MODIS", "VIIRS", "MODIS"],
        "frp": [25.0, 12.0, 30.0]
    })
    
    grid = harmonizer.aggregate_grid(df)
    assert len(grid) == 2
    # The first two points fall within the same 0.1 deg cell
    cell_1 = grid[grid["modis_count"] > 0]
    assert len(cell_1) >= 1

def test_sensor_calibrator_diagnostics():
    calibrator = SensorCalibrator(alpha=0.38, beta=0.92)
    diag = calibrator.get_diagnostics()
    assert diag["alpha"] == 0.38
    assert diag["beta"] == 0.92
    assert "N_MODIS_eq" in diag["formula"]

def test_sensor_calibrator_fitting():
    calibrator = SensorCalibrator()
    # Mock paired observations where VIIRS has ~3x count
    np.random.seed(42)
    v = np.array([5, 10, 20, 40, 80, 120])
    m = np.round(0.4 * (v ** 0.9)).astype(int)
    paired_df = pd.DataFrame({"modis_count": m, "viirs_count": v})
    
    diag = calibrator.fit_from_matched_observations(paired_df)
    assert diag["alpha"] > 0
    assert diag["beta"] > 0
    assert diag["r_squared"] > 0.8
