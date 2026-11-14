import pytest
import pandas as pd
from app.services.data_cleaner import DataCleaner
from app.services.firms_client import FIRMSClient

def test_data_cleaner_confidence_normalization():
    assert DataCleaner.standardize_confidence('l') == 25.0
    assert DataCleaner.standardize_confidence('nominal') == 60.0
    assert DataCleaner.standardize_confidence('h') == 90.0
    assert DataCleaner.standardize_confidence(85) == 85.0
    assert DataCleaner.standardize_confidence(None) == 50.0

def test_clean_dataframe_removes_invalid_coordinates():
    raw_data = {
        "latitude": [15.5, 95.0, -12.0], # 95.0 is invalid lat
        "longitude": [75.2, 80.0, 200.0], # 200.0 is invalid lon
        "acq_date": ["2024-03-15", "2024-03-15", "2024-03-15"],
        "confidence": ["h", "l", "n"],
        "frp": [15.2, 10.0, -5.0]
    }
    df = pd.DataFrame(raw_data)
    cleaned = DataCleaner.clean_dataframe(df, source_hint="VIIRS_SNPP_NRT")
    assert len(cleaned) == 1
    assert cleaned.iloc[0]["latitude"] == 15.5
    assert cleaned.iloc[0]["frp"] == 15.2

def test_firms_client_unconfigured_handling():
    client = FIRMSClient(map_key="")
    assert client.is_configured() is False
    availability = client.check_availability("MODIS_NRT")
    assert availability["status"] == "unconfigured"
