"""
Deterministic routing engine.
Rules version: 1.0

Precedence (highest wins):
1. CRITICAL risk + objection/blocker → Manager Escalation
2. Pricing blocker → Pricing / Deal Desk
3. Technical blocker → Technical Help
4. HIGH risk or overdue commitment → Manager Escalation
5. Pending commitment / next step → Rep Follow-up
6. No actionable issue → No Action
"""
from typing import List, Dict, Any, Optional
from app.db.models import RouteType, RiskLevel, EvidenceCategory


RULES_VERSION = "1.0"


def compute_route(
    risk_level: RiskLevel,
    risk_score: int,
    evidence_items: List[Dict[str, Any]],
    commitments: List[Dict[str, Any]],
) -> Dict[str, Any]:

    categories = {ev["category"] for ev in evidence_items}
    overdue = [c for c in commitments if c.get("status") == "overdue"]
    pending = [c for c in commitments if c.get("status") == "pending"]

    has_pricing = EvidenceCategory.PRICING_CONCERN in categories
    has_tech = EvidenceCategory.TECHNICAL_BLOCKER in categories
    has_objection = EvidenceCategory.OBJECTION in categories
    has_next_step = (
        EvidenceCategory.NEXT_STEP in categories
        or EvidenceCategory.COMMITMENT in categories
    )

    route = RouteType.NO_ACTION
    reason = "No actionable issue detected. Deal appears healthy."
    evidence_refs = []

    def first_quote(cat):
        for ev in evidence_items:
            if ev["category"] == cat:
                return ev["quotation"][:200]
        return ""

    # Rule 1: Critical risk with hard blockers
    if risk_level == RiskLevel.CRITICAL and (has_objection or has_tech or has_pricing):
        route = RouteType.MANAGER_ESCALATION
        reason = "Critical risk score with unresolved objections or blockers. Immediate manager escalation required."
        if has_objection:
            evidence_refs.append({"type": "objection", "quote": first_quote(EvidenceCategory.OBJECTION)})

    # Rule 2: Pricing concern (beats tech, loses to manager esc for critical)
    elif has_pricing and risk_level not in (RiskLevel.CRITICAL,):
        route = RouteType.PRICING_DEAL_DESK
        reason = "Pricing concerns or budget objection detected. Route to Pricing / Deal Desk for review."
        evidence_refs.append({"type": "pricing_concern", "quote": first_quote(EvidenceCategory.PRICING_CONCERN)})

    # Rule 3: Technical blocker
    elif has_tech and not has_pricing:
        route = RouteType.TECHNICAL_HELP
        reason = "Technical blocker or integration concern identified. Requires technical team involvement."
        evidence_refs.append({"type": "technical_blocker", "quote": first_quote(EvidenceCategory.TECHNICAL_BLOCKER)})

    # Rule 4: High risk or overdue commitment
    elif risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL) or overdue:
        route = RouteType.MANAGER_ESCALATION
        if overdue:
            reason = f"{len(overdue)} overdue commitment(s). Manager should review and intervene."
        else:
            reason = f"High risk score ({risk_score}). Manager should review this deal."

    # Rule 5: Rep follow-up
    elif pending or has_next_step or risk_level == RiskLevel.MEDIUM:
        route = RouteType.REP_FOLLOWUP
        reason = "Pending commitments or next steps identified. Rep should follow up promptly."
        if pending:
            evidence_refs.append({"type": "commitment", "quote": pending[0].get("description", "")[:200]})

    return {
        "recommended_route": route,
        "recommendation_reason": reason,
        "recommendation_evidence": evidence_refs,
        "rules_version": RULES_VERSION,
    }
