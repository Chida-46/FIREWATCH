from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_global_acceptance_countries():
    test_countries = [
        "Global",
        "India",
        "United States",
        "Brazil",
        "Australia",
        "South Africa",
        "Indonesia",
        # New diverse countries across all continents
        "Canada",
        "Germany",
        "Argentina",
        "Japan",
        "Nigeria",
        "Egypt",
        "France",
        "Mexico",
        "Kazakhstan"
    ]
    for country in test_countries:
        # 1. Hotspots
        res_h = client.get(f"/api/hotspots?country={country}&limit=10")
        assert res_h.status_code == 200
        assert len(res_h.json()["records"]) > 0

        # 2. Monthly Calendar
        res_c = client.get(f"/api/calendar/monthly?country={country}")
        assert res_c.status_code == 200
        assert len(res_c.json()["cells"]) == 22 * 12

        # 3. AOI Analysis
        res_a = client.post("/api/aoi/analyze", json={"country": country})
        assert res_a.status_code == 200
        assert res_a.json()["total_detections"] > 0
        assert len(res_a.json()["natural_language_summary"]) > 20
        assert res_a.json()["data_availability"]["has_data"] is True

def test_dynamic_search_and_boundaries():
    # Test dynamic search
    res_s = client.get("/api/aoi/search?q=Ger")
    assert res_s.status_code == 200
    names = [c["name"] for c in res_s.json()]
    assert "Germany" in names

    # Test boundary retrieval for France and Japan
    res_b = client.get("/api/aoi/boundary/France")
    assert res_b.status_code == 200
    assert res_b.json()["type"] == "Feature"
    assert "coordinates" in res_b.json()["geometry"]

def test_global_rankings_and_continents():
    res_rank = client.get("/api/aoi/rankings")
    assert res_rank.status_code == 200
    ranks = res_rank.json()
    assert len(ranks) >= 5
    assert ranks[0]["annual_hotspots"] > 100000

    res_cont = client.get("/api/aoi/continents")
    assert res_cont.status_code == 200
    assert len(res_cont.json()) == 6

def test_harmonization_comparison_global():
    res = client.get("/api/harmonization/comparison?country=United%20States")
    assert res.status_code == 200
    assert len(res.json()["series"]) == 22
