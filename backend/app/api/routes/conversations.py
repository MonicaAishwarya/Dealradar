from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional
from app.db.database import get_db
from app.db.models import (
    Conversation, RiskAssessment, RoutingDecision,
    RiskLevel, RouteType, CommitmentStatus
)
from app.schemas.conversation import ConversationDetail, ConversationListItem

router = APIRouter()


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    route: Optional[str] = None,
    representative: Optional[str] = None,
):
    q = db.query(Conversation).options(
        joinedload(Conversation.risk_assessment),
        joinedload(Conversation.routing_decision),
        joinedload(Conversation.commitments),
    )

    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                Conversation.deal_name.ilike(like),
                Conversation.account_name.ilike(like),
                Conversation.conversation_id.ilike(like),
                Conversation.representative.ilike(like),
            )
        )

    if risk_level:
        q = q.join(RiskAssessment).filter(
            RiskAssessment.risk_level == risk_level
        )

    if route:
        q = q.join(RoutingDecision).filter(
            RoutingDecision.recommended_route == route
        )

    if representative:
        q = q.filter(Conversation.representative.ilike(f"%{representative}%"))

    total = q.count()
    items = q.order_by(Conversation.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for c in items:
        risk = c.risk_assessment
        route_dec = c.routing_decision
        overdue = sum(1 for cm in c.commitments if cm.status == CommitmentStatus.OVERDUE)
        pending = sum(1 for cm in c.commitments if cm.status == CommitmentStatus.PENDING)

        result.append({
            "id": c.id,
            "conversation_id": c.conversation_id,
            "deal_name": c.deal_name,
            "account_name": c.account_name,
            "representative": c.representative,
            "conversation_date": c.conversation_date.isoformat() if c.conversation_date else None,
            "source": c.source,
            "is_synthetic": c.is_synthetic,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
            "risk_level": risk.risk_level.value if risk else None,
            "risk_score": risk.risk_score if risk else None,
            "recommended_route": route_dec.recommended_route.value if route_dec else None,
            "manual_route": route_dec.manual_route.value if route_dec and route_dec.manual_route else None,
            "overdue_commitments": overdue,
            "pending_commitments": pending,
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conv = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.evidence),
            joinedload(Conversation.commitments),
            joinedload(Conversation.risk_assessment),
            joinedload(Conversation.routing_decision),
        )
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conv.id,
        "conversation_id": conv.conversation_id,
        "deal_name": conv.deal_name,
        "account_name": conv.account_name,
        "representative": conv.representative,
        "conversation_date": conv.conversation_date.isoformat() if conv.conversation_date else None,
        "source": conv.source,
        "transcript": conv.transcript,
        "is_synthetic": conv.is_synthetic,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
        "evidence": [
            {
                "id": e.id,
                "conversation_id": e.conversation_id,
                "category": e.category.value,
                "quotation": e.quotation,
                "speaker": e.speaker,
                "position_start": e.position_start,
                "position_end": e.position_end,
                "context_before": e.context_before,
                "context_after": e.context_after,
                "extraction_method": e.extraction_method,
                "validation_status": e.validation_status,
                "created_at": e.created_at.isoformat(),
            }
            for e in conv.evidence
        ],
        "commitments": [
            {
                "id": cm.id,
                "conversation_id": cm.conversation_id,
                "description": cm.description,
                "responsible_person": cm.responsible_person,
                "due_date": cm.due_date.isoformat() if cm.due_date else None,
                "status": cm.status.value,
                "source_quotation": cm.source_quotation,
                "created_at": cm.created_at.isoformat(),
                "updated_at": cm.updated_at.isoformat(),
            }
            for cm in conv.commitments
        ],
        "risk_assessment": {
            "id": conv.risk_assessment.id,
            "conversation_id": conv.risk_assessment.conversation_id,
            "risk_score": conv.risk_assessment.risk_score,
            "risk_level": conv.risk_assessment.risk_level.value,
            "risk_factors": conv.risk_assessment.risk_factors,
            "rules_version": conv.risk_assessment.rules_version,
            "computed_at": conv.risk_assessment.computed_at.isoformat(),
        } if conv.risk_assessment else None,
        "routing_decision": {
            "id": conv.routing_decision.id,
            "conversation_id": conv.routing_decision.conversation_id,
            "recommended_route": conv.routing_decision.recommended_route.value,
            "recommendation_reason": conv.routing_decision.recommendation_reason,
            "recommendation_evidence": conv.routing_decision.recommendation_evidence,
            "rules_version": conv.routing_decision.rules_version,
            "recommended_at": conv.routing_decision.recommended_at.isoformat(),
            "manual_route": conv.routing_decision.manual_route.value if conv.routing_decision.manual_route else None,
            "override_reason": conv.routing_decision.override_reason,
            "overridden_at": conv.routing_decision.overridden_at.isoformat() if conv.routing_decision.overridden_at else None,
            "overridden_by": conv.routing_decision.overridden_by,
        } if conv.routing_decision else None,
    }
