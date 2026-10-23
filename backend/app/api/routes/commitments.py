from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime
from app.db.database import get_db
from app.db.models import Commitment, CommitmentStatus, Conversation, AuditEvent, AuditEventType
from app.schemas.conversation import CommitmentUpdate

router = APIRouter()


@router.get("/commitments")
def list_commitments(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    representative: Optional[str] = None,
):
    q = db.query(Commitment).options(
        joinedload(Commitment.conversation)
    )

    if status:
        q = q.filter(Commitment.status == status)

    if search:
        like = f"%{search}%"
        q = q.filter(Commitment.description.ilike(like))

    if representative:
        q = q.join(Conversation).filter(
            Conversation.representative.ilike(f"%{representative}%")
        )

    total = q.count()
    items = q.order_by(Commitment.due_date.asc().nullslast(), Commitment.created_at.desc()) \
             .offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for c in items:
        result.append({
            "id": c.id,
            "conversation_id": c.conversation_id,
            "description": c.description,
            "responsible_person": c.responsible_person,
            "due_date": c.due_date.isoformat() if c.due_date else None,
            "status": c.status.value,
            "source_quotation": c.source_quotation,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
            "deal_name": c.conversation.deal_name if c.conversation else None,
            "account_name": c.conversation.account_name if c.conversation else None,
            "representative": c.conversation.representative if c.conversation else None,
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.patch("/commitments/{commitment_id}")
def update_commitment_status(
    commitment_id: str,
    payload: CommitmentUpdate,
    db: Session = Depends(get_db),
):
    cm = db.query(Commitment).filter(Commitment.id == commitment_id).first()
    if not cm:
        raise HTTPException(status_code=404, detail="Commitment not found")

    old_status = cm.status.value
    cm.status = payload.status
    cm.updated_at = datetime.utcnow()

    db.add(AuditEvent(
        event_type=AuditEventType.COMMITMENT_STATUS_CHANGED,
        entity_type="commitment",
        entity_id=commitment_id,
        conversation_id=cm.conversation_id,
        summary=f"Commitment status changed: {old_status} → {payload.status.value}",
        metadata_={
            "old_status": old_status,
            "new_status": payload.status.value,
            "reason": payload.reason,
            "description": cm.description[:200],
        },
        actor="user",
    ))

    db.commit()
    db.refresh(cm)

    return {
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
