"""Tests for health endpoint."""


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["database"] == "ok"
    assert "app" in data
    assert "version" in data
