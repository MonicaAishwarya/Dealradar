"""
API integration tests:
- Conversations, commitments, routing, evidence, audit, exports
"""
import json
import io
import pytest
from tests.conftest import PRICING_TRANSCRIPT, HEALTHY_TRANSCRIPT, BUYING_SIGNAL_TRANSCRIPT


def _import(client, conversations):
    content = json.dumps({"conversations": conversations}).encode()
    return client.post(
        "/api/imports",
        files={"file": ("test.json", io.BytesIO(content), "application/json")},
    )


def _seed(client):
    """Import two sample conversations and return their IDs."""
    _import(client, [
        {
            "conversation_id": "API-001",
            "transcript": PRICING_TRANSCRIPT,
            "deal_name": "Pricing Deal",
            "account_name": "Acme Corp",
            "representative": "Alice Smith",
        },
        {
            "conversation_id": "API-002",
            "transcript": BUYING_SIGNAL_TRANSCRIPT,
            "deal_name": "Hot Deal",
            "account_name": "Globex",
            "representative": "Bob Jones",
        },
    ])
    r = client.get("/api/conversations")
    items = r.json()["items"]
    return {i["conversation_id"]: i["id"] for i in items}


# ── Dashboard ─────────────────────────────────────────────────────────────────

def test_dashboard_empty(client):
    r = client.get("/api/dashboard/summary")
    assert r.status_code == 200
    data = r.json()
    assert data["total_conversations"] == 0
    assert data["high_risk_deals"] == 0


def test_dashboard_populated(client):
    _seed(client)
    r = client.get("/api/dashboard/summary")
    data = r.json()
    assert data["total_conversations"] == 2
    assert isinstance(data["risk_distribution"], dict)
    assert isinstance(data["route_distribution"], dict)
    assert len(data["top_priority_deals"]) >= 1
    assert len(data["recent_activity"]) >= 1


# ── Conversations ─────────────────────────────────────────────────────────────

def test_list_conversations_empty(client):
    r = client.get("/api/conversations")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 0
    assert data["items"] == []


def test_list_conversations_paginated(client):
    _seed(client)
    r = client.get("/api/conversations?page=1&page_size=1")
    data = r.json()
    assert len(data["items"]) == 1
    assert data["total"] == 2
    assert data["total_pages"] == 2


def test_get_conversation_detail(client):
    ids = _seed(client)
    deal_id = ids["API-001"]
    r = client.get(f"/api/conversations/{deal_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["conversation_id"] == "API-001"
    assert "transcript" in data
    assert "evidence" in data
    assert "commitments" in data
    assert "risk_assessment" in data
    assert "routing_decision" in data


def test_get_conversation_not_found(client):
    r = client.get("/api/conversations/nonexistent-id")
    assert r.status_code == 404


def test_search_conversations(client):
    _seed(client)
    r = client.get("/api/conversations?search=Pricing")
    data = r.json()
    assert any(i["deal_name"] == "Pricing Deal" for i in data["items"])


def test_filter_by_risk_level(client):
    _seed(client)
    r = client.get("/api/conversations?risk_level=low")
    assert r.status_code == 200


# ── Commitments ───────────────────────────────────────────────────────────────

def test_list_commitments(client):
    _seed(client)
    r = client.get("/api/commitments")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data["items"], list)


def test_update_commitment_status(client):
    _seed(client)
    commitments = client.get("/api/commitments").json()["items"]
    if not commitments:
        pytest.skip("No commitments extracted from test data")
    cm_id = commitments[0]["id"]

    r = client.patch(f"/api/commitments/{cm_id}", json={"status": "completed"})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


def test_commitment_status_persists(client):
    _seed(client)
    commitments = client.get("/api/commitments").json()["items"]
    if not commitments:
        pytest.skip("No commitments extracted from test data")
    cm_id = commitments[0]["id"]

    client.patch(f"/api/commitments/{cm_id}", json={"status": "overdue"})
    r = client.get("/api/commitments?status=overdue")
    assert any(c["id"] == cm_id for c in r.json()["items"])


def test_commitment_not_found(client):
    r = client.patch("/api/commitments/bad-id", json={"status": "completed"})
    assert r.status_code == 404


def test_unknown_deadline_not_treated_as_overdue(client):
    """Commitments with no due date should never be auto-marked overdue."""
    _seed(client)
    r = client.get("/api/commitments")
    for cm in r.json()["items"]:
        if cm["due_date"] is None:
            assert cm["status"] != "overdue", "Commitment without due date should not be overdue"


# ── Risk & Routing ────────────────────────────────────────────────────────────

def test_get_deal_risk(client):
    ids = _seed(client)
    deal_id = ids["API-001"]
    r = client.get(f"/api/deals/{deal_id}/risk")
    assert r.status_code == 200
    data = r.json()
    assert "risk_score" in data
    assert "risk_level" in data
    assert isinstance(data["risk_factors"], list)


def test_get_deal_routing(client):
    ids = _seed(client)
    deal_id = ids["API-001"]
    r = client.get(f"/api/deals/{deal_id}/routing")
    assert r.status_code == 200
    data = r.json()
    assert "recommended_route" in data
    assert "recommendation_reason" in data


def test_route_override_saves(client):
    ids = _seed(client)
    deal_id = ids["API-001"]
    r = client.post(f"/api/deals/{deal_id}/route-override", json={
        "manual_route": "manager_escalation",
        "override_reason": "Test override",
        "overridden_by": "tester",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["manual_route"] == "manager_escalation"
    assert data["override_reason"] == "Test override"
    assert data["overridden_by"] == "tester"
    assert data["overridden_at"] is not None


def test_route_override_not_silently_erased_by_reimport(client):
    ids = _seed(client)
    deal_id = ids["API-001"]

    # Set override
    client.post(f"/api/deals/{deal_id}/route-override", json={
        "manual_route": "pricing_deal_desk",
        "override_reason": "Manual",
    })

    # Reimport same data
    _import(client, [{"conversation_id": "API-001", "transcript": PRICING_TRANSCRIPT}])

    # Check override still present
    r = client.get(f"/api/deals/{deal_id}/routing")
    assert r.json()["manual_route"] == "pricing_deal_desk"


# ── Evidence ──────────────────────────────────────────────────────────────────

def test_list_evidence(client):
    _seed(client)
    r = client.get("/api/evidence")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data["items"], list)
    assert data["total"] >= 0


def test_filter_evidence_by_category(client):
    _seed(client)
    r = client.get("/api/evidence?category=pricing_concern")
    assert r.status_code == 200
    for item in r.json()["items"]:
        assert item["category"] == "pricing_concern"


# ── Audit log ─────────────────────────────────────────────────────────────────

def test_import_creates_audit_events(client):
    _import(client, [{"conversation_id": "AUD-001", "transcript": HEALTHY_TRANSCRIPT}])
    r = client.get("/api/audit")
    assert r.status_code == 200
    events = r.json()["items"]
    event_types = [e["event_type"] for e in events]
    assert "import_completed" in event_types
    assert "conversation_created" in event_types


def test_route_override_creates_audit_event(client):
    ids = _seed(client)
    deal_id = ids["API-001"]
    client.post(f"/api/deals/{deal_id}/route-override", json={
        "manual_route": "technical_help",
    })
    r = client.get(f"/api/audit?conversation_id={deal_id}")
    events = r.json()["items"]
    assert any(e["event_type"] == "route_override_created" for e in events)


def test_commitment_change_creates_audit_event(client):
    _seed(client)
    commitments = client.get("/api/commitments").json()["items"]
    if not commitments:
        pytest.skip("No commitments for audit test")
    cm_id = commitments[0]["id"]
    client.patch(f"/api/commitments/{cm_id}", json={"status": "completed"})

    r = client.get("/api/audit")
    events = r.json()["items"]
    assert any(e["event_type"] == "commitment_status_changed" for e in events)


# ── Exports ───────────────────────────────────────────────────────────────────

def test_export_returns_zip(client):
    _seed(client)
    r = client.post("/api/exports")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"
    # ZIP magic bytes
    assert r.content[:2] == b"PK"


def test_export_creates_audit_event(client):
    _seed(client)
    client.post("/api/exports")
    r = client.get("/api/audit")
    events = r.json()["items"]
    assert any(e["event_type"] == "export_generated" for e in events)


# ── Search ────────────────────────────────────────────────────────────────────

def test_global_search(client):
    _seed(client)
    r = client.get("/api/search?q=Acme")
    assert r.status_code == 200
    data = r.json()
    assert any(c["account_name"] == "Acme Corp" for c in data["conversations"])


def test_search_too_short(client):
    r = client.get("/api/search?q=a")
    assert r.status_code == 422


def test_import_list(client):
    _import(client, [{"conversation_id": "IMP-001", "transcript": HEALTHY_TRANSCRIPT}])
    r = client.get("/api/imports")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert data["items"][0]["filename"] == "test.json"
