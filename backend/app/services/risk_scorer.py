"""
Transparent, configurable risk scoring engine.
Rules version: 1.0
Score range: 0-100
Thresholds: Low 0-30, Medium 31-60, High 61-85, Critical 86-100
"""
from typing import List, Dict, Any
from app.db.models import RiskLevel, EvidenceCategory
from app.core.config import settings


RULES_VERSION = "1.0"

# Weight definitions - each adds to score 0-100
RISK_WEIGHTS = {
    "unresolved_objection":       25,
    "pricing_concern":            20,
    "technical_blocker":          20,
    "missing_next_step":          15,
    "overdue_commitment":         25,
    "pending_commitment":         10,
    "decision_maker_concern":     15,
    "deadline_pressure":          10,
}


def compute_risk(
    evidence_items: List[Dict[str, Any]],
    commitments: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Compute a risk score from evidence and commitments.
    Returns a dict with risk_score, risk_level, risk_factors.
    """
    score = 0
    factors: List[Dict[str, Any]] = []
    applied: set = set()

    categories_found = {ev["category"] for ev in evidence_items}

    def add_factor(key: str, desc: str, evidence_quotation: str = ""):
        nonlocal score
        if key in applied:
            return
        applied.add(key)
        weight = RISK_WEIGHTS.get(key, 0)
        score += weight
        factors.append({
            "factor": key,
            "weight": weight,
            "description": desc,
            "evidence": evidence_quotation[:200] if evidence_quotation else "",
        })

    # Objections
    objections = [e for e in evidence_items if e["category"] == EvidenceCategory.OBJECTION]
    if objections:
        add_factor("unresolved_objection",
                   f"{len(objections)} customer objection(s) detected with no resolution evidence.",
                   objections[0]["quotation"])

    # Pricing concern
    pricing = [e for e in evidence_items if e["category"] == EvidenceCategory.PRICING_CONCERN]
    if pricing:
        add_factor("pricing_concern",
                   f"{len(pricing)} pricing concern(s) identified.",
                   pricing[0]["quotation"])

    # Technical blocker
    tech = [e for e in evidence_items if e["category"] == EvidenceCategory.TECHNICAL_BLOCKER]
    if tech:
        add_factor("technical_blocker",
                   f"{len(tech)} technical blocker(s) or integration concern(s) found.",
                   tech[0]["quotation"])

    # Decision maker concern
    dm = [e for e in evidence_items if e["category"] == EvidenceCategory.DECISION_MAKER]
    if dm:
        add_factor("decision_maker_concern",
                   "Decision-maker approval or escalation required.",
                   dm[0]["quotation"])

    # Deadline pressure
    deadlines = [e for e in evidence_items if e["category"] == EvidenceCategory.DEADLINE]
    if deadlines:
        add_factor("deadline_pressure",
                   f"{len(deadlines)} deadline(s) or time pressure mentioned.",
                   deadlines[0]["quotation"])

    # Missing next step
    next_steps = [e for e in evidence_items if e["category"] == EvidenceCategory.NEXT_STEP]
    buying_signals = [e for e in evidence_items if e["category"] == EvidenceCategory.BUYING_SIGNAL]
    commitments_ev = [e for e in evidence_items if e["category"] == EvidenceCategory.COMMITMENT]

    has_forward_momentum = bool(buying_signals or next_steps or commitments_ev)
    if not has_forward_momentum and len(evidence_items) > 0:
        add_factor("missing_next_step",
                   "No buying signals, commitments, or next steps identified. Deal may be stalled.")

    # Commitment status
    overdue = [c for c in commitments if c.get("status") == "overdue"]
    pending = [c for c in commitments if c.get("status") == "pending"]

    if overdue:
        add_factor("overdue_commitment",
                   f"{len(overdue)} overdue commitment(s) requiring immediate attention.")

    if pending and not overdue:
        add_factor("pending_commitment",
                   f"{len(pending)} pending commitment(s) with no overdue items.")

    # Cap at 100
    score = min(100, score)

    # Determine level
    if score <= settings.RISK_LOW_MAX:
        level = RiskLevel.LOW
    elif score <= settings.RISK_MEDIUM_MAX:
        level = RiskLevel.MEDIUM
    elif score <= settings.RISK_HIGH_MAX:
        level = RiskLevel.HIGH
    else:
        level = RiskLevel.CRITICAL

    return {
        "risk_score": score,
        "risk_level": level,
        "risk_factors": factors,
        "rules_version": RULES_VERSION,
    }
