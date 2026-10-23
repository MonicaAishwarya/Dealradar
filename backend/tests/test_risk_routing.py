"""
Tests for risk scoring and routing engine.
"""
import pytest
from app.services.risk_scorer import compute_risk
from app.services.routing_engine import compute_route
from app.services.evidence_extractor import extract_evidence
from app.db.models import RiskLevel, RouteType, EvidenceCategory


# ── Risk scorer ───────────────────────────────────────────────────────────────

def test_empty_evidence_low_risk():
    result = compute_risk([], [])
    assert result["risk_score"] == 0
    assert result["risk_level"] == RiskLevel.LOW


def test_pricing_concern_adds_score():
    evidence = [{"category": EvidenceCategory.PRICING_CONCERN, "quotation": "The price is too high."}]
    result = compute_risk(evidence, [])
    assert result["risk_score"] >= 20
    assert any(f["factor"] == "pricing_concern" for f in result["risk_factors"])


def test_technical_blocker_adds_score():
    evidence = [{"category": EvidenceCategory.TECHNICAL_BLOCKER, "quotation": "Our IT flagged a security issue."}]
    result = compute_risk(evidence, [])
    assert result["risk_score"] >= 20
    assert any(f["factor"] == "technical_blocker" for f in result["risk_factors"])


def test_objection_adds_score():
    evidence = [{"category": EvidenceCategory.OBJECTION, "quotation": "We are not convinced about the ROI."}]
    result = compute_risk(evidence, [])
    assert result["risk_score"] >= 25
    assert any(f["factor"] == "unresolved_objection" for f in result["risk_factors"])


def test_overdue_commitment_adds_score():
    result = compute_risk(
        [{"category": EvidenceCategory.NEXT_STEP, "quotation": "I will follow up next week."}],
        [{"status": "overdue", "description": "Send pricing doc", "due_date": None}],
    )
    assert result["risk_score"] >= 25
    assert any(f["factor"] == "overdue_commitment" for f in result["risk_factors"])


def test_buying_signal_no_missing_next_step_penalty():
    """A deal with a buying signal should NOT get the missing_next_step penalty."""
    evidence = [{"category": EvidenceCategory.BUYING_SIGNAL, "quotation": "We are ready to move forward!"}]
    result = compute_risk(evidence, [])
    assert not any(f["factor"] == "missing_next_step" for f in result["risk_factors"])


def test_score_capped_at_100():
    evidence = [
        {"category": EvidenceCategory.OBJECTION, "quotation": "Too expensive."},
        {"category": EvidenceCategory.PRICING_CONCERN, "quotation": "Budget is a concern."},
        {"category": EvidenceCategory.TECHNICAL_BLOCKER, "quotation": "Integration is blocked."},
        {"category": EvidenceCategory.DECISION_MAKER, "quotation": "Board approval needed."},
        {"category": EvidenceCategory.DEADLINE, "quotation": "Deadline is end of month."},
    ]
    commitments = [
        {"status": "overdue", "description": "Follow up", "due_date": None},
        {"status": "pending", "description": "Send docs", "due_date": None},
    ]
    result = compute_risk(evidence, commitments)
    assert result["risk_score"] <= 100


def test_risk_thresholds():
    # Score 0 → Low
    r = compute_risk([], [])
    assert r["risk_level"] == RiskLevel.LOW

    # Score with buying signal only — should be low
    evidence_good = [{"category": EvidenceCategory.BUYING_SIGNAL, "quotation": "Ready to proceed."}]
    r2 = compute_risk(evidence_good, [])
    assert r2["risk_level"] == RiskLevel.LOW


def test_rules_version_present():
    result = compute_risk([], [])
    assert result["rules_version"] == "1.0"


def test_same_inputs_same_score():
    """Deterministic — same inputs must produce same score."""
    evidence = [{"category": EvidenceCategory.PRICING_CONCERN, "quotation": "Price is high."}]
    r1 = compute_risk(evidence, [])
    r2 = compute_risk(evidence, [])
    assert r1["risk_score"] == r2["risk_score"]
    assert r1["risk_level"] == r2["risk_level"]


# ── Routing engine ────────────────────────────────────────────────────────────

def test_pricing_routes_to_deal_desk():
    evidence = [{"category": EvidenceCategory.PRICING_CONCERN, "quotation": "The price is too high."}]
    result = compute_route(RiskLevel.MEDIUM, 40, evidence, [])
    assert result["recommended_route"] == RouteType.PRICING_DEAL_DESK


def test_technical_blocker_routes_to_technical_help():
    evidence = [{"category": EvidenceCategory.TECHNICAL_BLOCKER, "quotation": "SSO is a blocker."}]
    result = compute_route(RiskLevel.MEDIUM, 40, evidence, [])
    assert result["recommended_route"] == RouteType.TECHNICAL_HELP


def test_critical_with_objection_routes_to_manager():
    evidence = [
        {"category": EvidenceCategory.OBJECTION, "quotation": "We are not interested."},
        {"category": EvidenceCategory.PRICING_CONCERN, "quotation": "Too expensive."},
    ]
    result = compute_route(RiskLevel.CRITICAL, 92, evidence, [])
    assert result["recommended_route"] == RouteType.MANAGER_ESCALATION


def test_high_risk_routes_to_manager():
    result = compute_route(RiskLevel.HIGH, 70, [], [])
    assert result["recommended_route"] == RouteType.MANAGER_ESCALATION


def test_overdue_commitment_routes_to_manager():
    result = compute_route(
        RiskLevel.LOW, 10, [],
        [{"status": "overdue", "description": "Send docs", "due_date": None}]
    )
    assert result["recommended_route"] == RouteType.MANAGER_ESCALATION


def test_pending_commitment_routes_to_rep():
    result = compute_route(
        RiskLevel.LOW, 10, [],
        [{"status": "pending", "description": "Follow up call", "due_date": None}]
    )
    assert result["recommended_route"] == RouteType.REP_FOLLOWUP


def test_healthy_deal_no_action():
    result = compute_route(RiskLevel.LOW, 0, [], [])
    assert result["recommended_route"] == RouteType.NO_ACTION


def test_pricing_beats_technical_help():
    """When both pricing and tech blocker present (non-critical), pricing wins."""
    evidence = [
        {"category": EvidenceCategory.PRICING_CONCERN, "quotation": "Too expensive."},
        {"category": EvidenceCategory.TECHNICAL_BLOCKER, "quotation": "SSO issue."},
    ]
    result = compute_route(RiskLevel.MEDIUM, 40, evidence, [])
    assert result["recommended_route"] == RouteType.PRICING_DEAL_DESK


def test_routing_reason_present():
    result = compute_route(RiskLevel.LOW, 0, [], [])
    assert result["recommendation_reason"]
    assert len(result["recommendation_reason"]) > 5


def test_routing_rules_version():
    result = compute_route(RiskLevel.LOW, 0, [], [])
    assert result["rules_version"] == "1.0"


# ── Evidence extractor ────────────────────────────────────────────────────────

def test_extracts_pricing_concern():
    transcript = "Customer: The pricing is out of our budget completely. We need a discount or a lower quote."
    evidence = extract_evidence(transcript)
    categories = [e["category"] for e in evidence]
    assert EvidenceCategory.PRICING_CONCERN in categories


def test_extracts_objection():
    transcript = "Customer: We have concerns about the ROI. We are not convinced this is the right solution."
    evidence = extract_evidence(transcript)
    categories = [e["category"] for e in evidence]
    assert EvidenceCategory.OBJECTION in categories


def test_extracts_buying_signal():
    transcript = "Customer: This is exactly what we need. We are ready to move forward."
    evidence = extract_evidence(transcript)
    categories = [e["category"] for e in evidence]
    assert EvidenceCategory.BUYING_SIGNAL in categories


def test_extracts_technical_blocker():
    transcript = "Customer: Our IT team says the integration is not supported with our current security policy."
    evidence = extract_evidence(transcript)
    categories = [e["category"] for e in evidence]
    assert EvidenceCategory.TECHNICAL_BLOCKER in categories


def test_extracts_commitment():
    transcript = "Rep: I will send the updated proposal by end of week."
    evidence = extract_evidence(transcript)
    categories = [e["category"] for e in evidence]
    assert EvidenceCategory.COMMITMENT in categories or EvidenceCategory.NEXT_STEP in categories


def test_no_evidence_from_empty_transcript():
    evidence = extract_evidence("")
    assert evidence == []


def test_quotation_is_substring_of_transcript():
    transcript = "Customer: The price is too expensive. We cannot proceed at this cost."
    evidence = extract_evidence(transcript)
    for ev in evidence:
        assert ev["quotation"] in transcript, f"Quotation not in transcript: {ev['quotation']}"


def test_no_duplicate_quotations():
    transcript = "Customer: The price is too high. The price is too high."
    evidence = extract_evidence(transcript)
    quotations = [e["quotation"].lower().strip() for e in evidence]
    assert len(quotations) == len(set(quotations)), "Duplicate quotations found"
