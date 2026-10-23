"""
SQLAlchemy ORM models for DealRadar Intelligence OS.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


def gen_uuid():
    return str(uuid.uuid4())


def now_utc():
    return datetime.utcnow()


# ── Enums ──────────────────────────────────────────────────────────────────

class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RouteType(str, enum.Enum):
    REP_FOLLOWUP = "rep_followup"
    MANAGER_ESCALATION = "manager_escalation"
    PRICING_DEAL_DESK = "pricing_deal_desk"
    TECHNICAL_HELP = "technical_help"
    NO_ACTION = "no_action"


class CommitmentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    UNKNOWN = "unknown"


class EvidenceCategory(str, enum.Enum):
    OBJECTION = "objection"
    BUYING_SIGNAL = "buying_signal"
    COMMITMENT = "commitment"
    DEADLINE = "deadline"
    PRICING_CONCERN = "pricing_concern"
    TECHNICAL_BLOCKER = "technical_blocker"
    DECISION_MAKER = "decision_maker"
    NEXT_STEP = "next_step"


class AuditEventType(str, enum.Enum):
    IMPORT_STARTED = "import_started"
    IMPORT_COMPLETED = "import_completed"
    IMPORT_FAILED = "import_failed"
    CONVERSATION_CREATED = "conversation_created"
    CONVERSATION_UPDATED = "conversation_updated"
    ROUTE_OVERRIDE_CREATED = "route_override_created"
    ROUTE_OVERRIDE_UPDATED = "route_override_updated"
    COMMITMENT_STATUS_CHANGED = "commitment_status_changed"
    EXPORT_GENERATED = "export_generated"
    CONFIG_CHANGED = "config_changed"


# ── Models ─────────────────────────────────────────────────────────────────

class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(String, primary_key=True, default=gen_uuid)
    filename = Column(String, nullable=False)
    file_format = Column(String, nullable=False)  # csv | json
    status = Column(String, default="processing")  # processing | completed | failed
    records_total = Column(Integer, default=0)
    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    error_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_utc)
    completed_at = Column(DateTime, nullable=True)

    errors = relationship("ImportError", back_populates="batch", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="import_batch")


class ImportError(Base):
    __tablename__ = "import_errors"

    id = Column(String, primary_key=True, default=gen_uuid)
    batch_id = Column(String, ForeignKey("import_batches.id"), nullable=False)
    row_number = Column(Integer, nullable=True)
    field = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    raw_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_utc)

    batch = relationship("ImportBatch", back_populates="errors")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, unique=True, nullable=False, index=True)
    deal_name = Column(String, nullable=True)
    account_name = Column(String, nullable=True)
    representative = Column(String, nullable=True)
    conversation_date = Column(DateTime, nullable=True)
    transcript = Column(Text, nullable=False)
    source = Column(String, nullable=True)
    content_hash = Column(String, nullable=True)
    import_batch_id = Column(String, ForeignKey("import_batches.id"), nullable=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)
    is_synthetic = Column(Boolean, default=False)

    import_batch = relationship("ImportBatch", back_populates="conversations")
    evidence = relationship("Evidence", back_populates="conversation", cascade="all, delete-orphan")
    commitments = relationship("Commitment", back_populates="conversation", cascade="all, delete-orphan")
    risk_assessment = relationship("RiskAssessment", back_populates="conversation", uselist=False, cascade="all, delete-orphan")
    routing_decision = relationship("RoutingDecision", back_populates="conversation", uselist=False, cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="conversation")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    category = Column(SAEnum(EvidenceCategory), nullable=False)
    quotation = Column(Text, nullable=False)
    speaker = Column(String, nullable=True)
    position_start = Column(Integer, nullable=True)
    position_end = Column(Integer, nullable=True)
    context_before = Column(Text, nullable=True)
    context_after = Column(Text, nullable=True)
    extraction_method = Column(String, default="rule_based")
    validation_status = Column(String, default="validated")  # validated | flagged | rejected
    created_at = Column(DateTime, default=now_utc)

    conversation = relationship("Conversation", back_populates="evidence")


class Commitment(Base):
    __tablename__ = "commitments"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    description = Column(Text, nullable=False)
    responsible_person = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(SAEnum(CommitmentStatus), default=CommitmentStatus.PENDING)
    source_quotation = Column(Text, nullable=True)
    evidence_id = Column(String, ForeignKey("evidence.id"), nullable=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    conversation = relationship("Conversation", back_populates="commitments")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), unique=True, nullable=False)
    risk_score = Column(Integer, default=0)  # 0-100
    risk_level = Column(SAEnum(RiskLevel), default=RiskLevel.LOW)
    risk_factors = Column(JSON, default=list)  # List of {factor, weight, description}
    rules_version = Column(String, default="1.0")
    computed_at = Column(DateTime, default=now_utc)

    conversation = relationship("Conversation", back_populates="risk_assessment")


class RoutingDecision(Base):
    __tablename__ = "routing_decisions"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), unique=True, nullable=False)
    recommended_route = Column(SAEnum(RouteType), nullable=False)
    recommendation_reason = Column(Text, nullable=True)
    recommendation_evidence = Column(JSON, default=list)
    rules_version = Column(String, default="1.0")
    recommended_at = Column(DateTime, default=now_utc)

    # Manual override
    manual_route = Column(SAEnum(RouteType), nullable=True)
    override_reason = Column(Text, nullable=True)
    overridden_at = Column(DateTime, nullable=True)
    overridden_by = Column(String, nullable=True)

    conversation = relationship("Conversation", back_populates="routing_decision")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    event_type = Column(SAEnum(AuditEventType), nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True)
    summary = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSON, default=dict)
    actor = Column(String, default="system")
    created_at = Column(DateTime, default=now_utc)

    conversation = relationship("Conversation", back_populates="audit_events")


class ExportRecord(Base):
    __tablename__ = "export_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    export_type = Column(String, nullable=False)  # csv | json
    entities = Column(JSON, default=list)
    record_count = Column(Integer, default=0)
    content_hash = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_utc)
    metadata_ = Column("metadata", JSON, default=dict)
