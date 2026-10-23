from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.db.models import (
    Conversation, RoutingDecision, AuditEvent, AuditEventType, RouteType
)
from app.schemas.conversation import RouteOverrideCreate

router = APIRouter()


@router.get("/deals/{deal_id}/risk")
def get_deal_risk(deal_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == deal_id).first()
    if not conv or not conv.risk_assessment:
        raise HTTPException(status_code=404, detail="Deal or risk assessment not found")
    r = conv.risk_assessment
    return {
        "id": r.id,
        "conversation_id": r.conversation_id,
        "risk_score": r.risk_score,
        "risk_level": r.risk_level.value,
        "risk_factors": r.risk_factors,
        "rules_version": r.rules_version,
        "computed_at": r.computed_at.isoformat(),
    }


@router.get("/deals/{deal_id}/routing")
def get_deal_routing(deal_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == deal_id).first()
    if not conv or not conv.routing_decision:
        raise HTTPException(status_code=404, detail="Deal or routing decision not found")
    rd = conv.routing_decision
    return {
        "id": rd.id,
        "conversation_id": rd.conversation_id,
        "recommended_route": rd.recommended_route.value,
        "recommendation_reason": rd.recommendation_reason,
        "recommendation_evidence": rd.recommendation_evidence,
        "rules_version": rd.rules_version,
        "recommended_at": rd.recommended_at.isoformat(),
        "manual_route": rd.manual_route.value if rd.manual_route else None,
        "override_reason": rd.override_reason,
        "overridden_at": rd.overridden_at.isoformat() if rd.overridden_at else None,
        "overridden_by": rd.overridden_by,
    }


@router.post("/deals/{deal_id}/route-override")
def override_deal_route(
    deal_id: str,
    payload: RouteOverrideCreate,
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == deal_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Deal not found")

    rd = conv.routing_decision
    if not rd:
        raise HTTPException(status_code=404, detail="No routing decision found for this deal")

    old_route = rd.manual_route.value if rd.manual_route else rd.recommended_route.value

    rd.manual_route = payload.manual_route
    rd.override_reason = payload.override_reason
    rd.overridden_at = datetime.utcnow()
    rd.overridden_by = payload.overridden_by or "user"

    db.add(AuditEvent(
        event_type=AuditEventType.ROUTE_OVERRIDE_CREATED,
        entity_type="routing_decision",
        entity_id=rd.id,
        conversation_id=conv.id,
        summary=(
            f"Route override: {old_route} → {payload.manual_route.value}"
            + (f" — {payload.override_reason}" if payload.override_reason else "")
        ),
        metadata_={
            "old_route": old_route,
            "new_route": payload.manual_route.value,
            "reason": payload.override_reason,
        },
        actor=payload.overridden_by or "user",
    ))

    db.commit()
    db.refresh(rd)

    return {
        "id": rd.id,
        "conversation_id": rd.conversation_id,
        "recommended_route": rd.recommended_route.value,
        "recommendation_reason": rd.recommendation_reason,
        "recommendation_evidence": rd.recommendation_evidence,
        "manual_route": rd.manual_route.value if rd.manual_route else None,
        "override_reason": rd.override_reason,
        "overridden_at": rd.overridden_at.isoformat() if rd.overridden_at else None,
        "overridden_by": rd.overridden_by,
    }
