from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime
from app.db.models import AuditEventType


class AuditEventOut(BaseModel):
    id: str
    event_type: AuditEventType
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    conversation_id: Optional[str] = None
    summary: str
    metadata_: Optional[Dict[str, Any]] = None
    actor: str
    created_at: datetime

    model_config = {"from_attributes": True}
