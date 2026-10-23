from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.db.models import AuditEvent

router = APIRouter()


@router.get("/audit")
def list_audit_events(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    event_type: Optional[str] = None,
    conversation_id: Optional[str] = None,
    entity_type: Optional[str] = None,
):
    q = db.query(AuditEvent)

    if event_type:
        q = q.filter(AuditEvent.event_type == event_type)

    if conversation_id:
        q = q.filter(AuditEvent.conversation_id == conversation_id)

    if entity_type:
        q = q.filter(AuditEvent.entity_type == entity_type)

    total = q.count()
    items = q.order_by(AuditEvent.created_at.desc()) \
             .offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            {
                "id": a.id,
                "event_type": a.event_type.value,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "conversation_id": a.conversation_id,
                "summary": a.summary,
                "metadata": a.metadata_,
                "actor": a.actor,
                "created_at": a.created_at.isoformat(),
            }
            for a in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }
