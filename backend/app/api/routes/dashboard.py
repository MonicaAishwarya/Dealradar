from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.db.models import (
    Conversation, RiskAssessment, RoutingDecision,
    Commitment, RiskLevel, RouteType, CommitmentStatus
)

router = APIRouter()


@router.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_conversations = db.query(Conversation).count()

    # Risk distribution
    risk_counts = (
        db.query(RiskAssessment.risk_level, func.count(RiskAssessment.id))
        .group_by(RiskAssessment.risk_level)
        .all()
    )
    risk_dist = {r.value: 0 for r in RiskLevel}
    for level, count in risk_counts:
        risk_dist[level.value] = count

    high_risk = risk_dist.get("high", 0) + risk_dist.get("critical", 0)

    # Commitments
    overdue = db.query(Commitment).filter(
        Commitment.status == CommitmentStatus.OVERDUE
    ).count()
    pending = db.query(Commitment).filter(
        Commitment.status == CommitmentStatus.PENDING
    ).count()

    # Routing distribution
    route_counts = (
        db.query(RoutingDecision.recommended_route, func.count(RoutingDecision.id))
        .group_by(RoutingDecision.recommended_route)
        .all()
    )
    route_dist = {r.value: 0 for r in RouteType}
    for route, count in route_counts:
        route_dist[route.value] = count

    awaiting_rep = route_dist.get("rep_followup", 0)
    needs_manager = route_dist.get("manager_escalation", 0)
    needs_pricing = route_dist.get("pricing_deal_desk", 0)
    needs_tech = route_dist.get("technical_help", 0)

    # Recent activity (last 10 conversations)
    recent = (
        db.query(Conversation)
        .order_by(Conversation.created_at.desc())
        .limit(10)
        .all()
    )
    recent_items = []
    for c in recent:
        risk = c.risk_assessment
        route = c.routing_decision
        recent_items.append({
            "id": c.id,
            "conversation_id": c.conversation_id,
            "deal_name": c.deal_name,
            "account_name": c.account_name,
            "representative": c.representative,
            "risk_level": risk.risk_level.value if risk else "low",
            "risk_score": risk.risk_score if risk else 0,
            "recommended_route": route.recommended_route.value if route else "no_action",
            "created_at": c.created_at.isoformat(),
        })

    # Top priority deals (highest risk)
    top_deals_q = (
        db.query(Conversation, RiskAssessment)
        .join(RiskAssessment, RiskAssessment.conversation_id == Conversation.id)
        .order_by(RiskAssessment.risk_score.desc())
        .limit(5)
        .all()
    )
    top_deals = []
    for conv, risk in top_deals_q:
        route = conv.routing_decision
        top_deals.append({
            "id": conv.id,
            "conversation_id": conv.conversation_id,
            "deal_name": conv.deal_name,
            "account_name": conv.account_name,
            "representative": conv.representative,
            "risk_level": risk.risk_level.value,
            "risk_score": risk.risk_score,
            "recommended_route": route.recommended_route.value if route else "no_action",
        })

    return {
        "total_conversations": total_conversations,
        "total_deals": total_conversations,
        "high_risk_deals": high_risk,
        "overdue_commitments": overdue,
        "pending_commitments": pending,
        "awaiting_rep_followup": awaiting_rep,
        "needs_manager_escalation": needs_manager,
        "needs_pricing_review": needs_pricing,
        "needs_technical_help": needs_tech,
        "risk_distribution": risk_dist,
        "route_distribution": route_dist,
        "recent_activity": recent_items,
        "top_priority_deals": top_deals,
    }
