from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.db.models import RiskLevel, RouteType, CommitmentStatus, EvidenceCategory


class EvidenceOut(BaseModel):
    id: str
    conversation_id: str
    category: EvidenceCategory
    quotation: str
    speaker: Optional[str] = None
    position_start: Optional[int] = None
    position_end: Optional[int] = None
    context_before: Optional[str] = None
    context_after: Optional[str] = None
    extraction_method: str
    validation_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CommitmentOut(BaseModel):
    id: str
    conversation_id: str
    description: str
    responsible_person: Optional[str] = None
    due_date: Optional[datetime] = None
    status: CommitmentStatus
    source_quotation: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommitmentUpdate(BaseModel):
    status: CommitmentStatus
    reason: Optional[str] = None


class RiskFactor(BaseModel):
    factor: str
    weight: int
    description: str


class RiskAssessmentOut(BaseModel):
    id: str
    conversation_id: str
    risk_score: int
    risk_level: RiskLevel
    risk_factors: List[dict]
    rules_version: str
    computed_at: datetime

    model_config = {"from_attributes": True}


class RoutingDecisionOut(BaseModel):
    id: str
    conversation_id: str
    recommended_route: RouteType
    recommendation_reason: Optional[str] = None
    recommendation_evidence: List[dict]
    rules_version: str
    recommended_at: datetime
    manual_route: Optional[RouteType] = None
    override_reason: Optional[str] = None
    overridden_at: Optional[datetime] = None
    overridden_by: Optional[str] = None

    model_config = {"from_attributes": True}


class RouteOverrideCreate(BaseModel):
    manual_route: RouteType
    override_reason: Optional[str] = None
    overridden_by: Optional[str] = None


class ConversationOut(BaseModel):
    id: str
    conversation_id: str
    deal_name: Optional[str] = None
    account_name: Optional[str] = None
    representative: Optional[str] = None
    conversation_date: Optional[datetime] = None
    source: Optional[str] = None
    is_synthetic: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationOut):
    transcript: str
    evidence: List[EvidenceOut] = []
    commitments: List[CommitmentOut] = []
    risk_assessment: Optional[RiskAssessmentOut] = None
    routing_decision: Optional[RoutingDecisionOut] = None


class ConversationListItem(ConversationOut):
    risk_level: Optional[RiskLevel] = None
    risk_score: Optional[int] = None
    recommended_route: Optional[RouteType] = None
    manual_route: Optional[RouteType] = None
    overdue_commitments: int = 0
    pending_commitments: int = 0


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int
    total_pages: int
