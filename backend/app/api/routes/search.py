from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.database import get_db
from app.db.models import Conversation, Evidence

router = APIRouter()


@router.get("/search")
def global_search(
    q: str = Query(..., min_length=2, max_length=200),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=30),
):
    like = f"%{q}%"

    convs = (
        db.query(Conversation)
        .filter(
            or_(
                Conversation.deal_name.ilike(like),
                Conversation.account_name.ilike(like),
                Conversation.conversation_id.ilike(like),
                Conversation.representative.ilike(like),
            )
        )
        .limit(limit)
        .all()
    )

    evidence = (
        db.query(Evidence)
        .filter(Evidence.quotation.ilike(like))
        .limit(limit)
        .all()
    )

    return {
        "conversations": [
            {
                "id": c.id,
                "conversation_id": c.conversation_id,
                "deal_name": c.deal_name,
                "account_name": c.account_name,
                "representative": c.representative,
                "type": "conversation",
            }
            for c in convs
        ],
        "evidence": [
            {
                "id": e.id,
                "conversation_id": e.conversation_id,
                "category": e.category.value,
                "quotation": e.quotation[:200],
                "type": "evidence",
            }
            for e in evidence
        ],
    }
