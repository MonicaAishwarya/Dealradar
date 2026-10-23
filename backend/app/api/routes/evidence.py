from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from app.db.database import get_db
from app.db.models import Evidence, Conversation, RiskAssessment

router = APIRouter()


@router.get("/evidence")
def list_evidence(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    category: Optional[str] = None,
    conversation_id: Optional[str] = None,
    search: Optional[str] = None,
    validation_status: Optional[str] = None,
):
    q = db.query(Evidence).options(
        joinedload(Evidence.conversation)
    )

    if category:
        q = q.filter(Evidence.category == category)

    if conversation_id:
        q = q.filter(Evidence.conversation_id == conversation_id)

    if search:
        like = f"%{search}%"
        q = q.filter(Evidence.quotation.ilike(like))

    if validation_status:
        q = q.filter(Evidence.validation_status == validation_status)

    total = q.count()
    items = q.order_by(Evidence.created_at.desc()) \
             .offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for e in items:
        result.append({
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
            "deal_name": e.conversation.deal_name if e.conversation else None,
            "account_name": e.conversation.account_name if e.conversation else None,
            "representative": e.conversation.representative if e.conversation else None,
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }
