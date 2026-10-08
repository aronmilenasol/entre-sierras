from fastapi.testclient import TestClient

from entre_sierras.main import app


client = TestClient(app)


def test_nearby_services_rejects_out_of_range_coordinates():
    response = client.get("/api/nearby-services", params={"lat": 91, "lon": 0})

    assert response.status_code == 422


def test_locality_context_rejects_invalid_department_id():
    response = client.get("/api/locality-context", params={"department_id": "invalid"})

    assert response.status_code == 422


def test_locality_catalog_is_available():
    response = client.get("/data/localities.geojson")

    assert response.status_code == 200
    assert response.json()["type"] == "FeatureCollection"
    assert isinstance(response.json()["features"], list)