"""
Export service: generates CSV and JSON exports with manifest.
"""
import csv
import hashlib
import io
import json
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import (
    Conversation, Evidence, Commitment, RiskAssessment,
    RoutingDecision, AuditEvent, ExportRecord, AuditEventType
)


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def export_conversations_csv(db: Session) -> bytes:
    convs = db.query(Conversation).all()
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=[
        "id", "conversation_id", "deal_name", "account_name",
        "representative", "conversation_date", "source", "is_synthetic",
        "created_at", "updated_at",
    ])
    writer.writeheader()
    for c in convs:
        writer.writerow({
            "id": c.id,
            "conversation_id": c.conversation_id,
            "deal_name": c.deal_name or "",
            "account_name": c.account_name or "",
            "representative": c.representative or "",
            "conversation_date": c.conversation_date.isoformat() if c.conversation_date else "",
            "source": c.source or "",
            "is_synthetic": c.is_synthetic,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        })
    return out.getvalue().encode("utf-8")


def export_evidence_csv(db: Session) -> bytes:
    items = db.query(Evidence).all()
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=[
        "id", "conversation_id", "category", "quotation",
        "speaker", "extraction_method", "validation_status", "created_at",
    ])
    writer.writeheader()
    for e in items:
        writer.writerow({
            "id": e.id,
            "conversation_id": e.conversation_id,
            "category": e.category.value,
            "quotation": e.quotation,
            "speaker": e.speaker or "",
            "extraction_method": e.extraction_method,
            "validation_status": e.validation_status,
            "created_at": e.created_at.isoformat(),
        })
    return out.getvalue().encode("utf-8")


def export_commitments_csv(db: Session) -> bytes:
    items = db.query(Commitment).all()
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=[
        "id", "conversation_id", "description", "responsible_person",
        "due_date", "status", "source_quotation", "created_at", "updated_at",
    ])
    writer.writeheader()
    for c in items:
        writer.writerow({
            "id": c.id,
            "conversation_id": c.conversation_id,
            "description": c.description,
            "responsible_person": c.responsible_person or "",
            "due_date": c.due_date.isoformat() if c.due_date else "",
            "status": c.status.value,
            "source_quotation": c.source_quotation or "",
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        })
    return out.getvalue().encode("utf-8")


def export_risk_csv(db: Session) -> bytes:
    items = db.query(RiskAssessment).all()
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=[
        "id", "conversation_id", "risk_score", "risk_level",
        "risk_factors_count", "rules_version", "computed_at",
    ])
    writer.writeheader()
    for r in items:
        writer.writerow({
            "id": r.id,
            "conversation_id": r.conversation_id,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level.value,
            "risk_factors_count": len(r.risk_factors) if r.risk_factors else 0,
            "rules_version": r.rules_version,
            "computed_at": r.computed_at.isoformat(),
        })
    return out.getvalue().encode("utf-8")


def export_routing_csv(db: Session) -> bytes:
    items = db.query(RoutingDecision).all()
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=[
        "id", "conversation_id", "recommended_route", "recommendation_reason",
        "manual_route", "override_reason", "overridden_at", "overridden_by",
        "rules_version", "recommended_at",
    ])
    writer.writeheader()
    for r in items:
        writer.writerow({
            "id": r.id,
            "conversation_id": r.conversation_id,
            "recommended_route": r.recommended_route.value,
            "recommendation_reason": r.recommendation_reason or "",
            "manual_route": r.manual_route.value if r.manual_route else "",
            "override_reason": r.override_reason or "",
            "overridden_at": r.overridden_at.isoformat() if r.overridden_at else "",
            "overridden_by": r.overridden_by or "",
            "rules_version": r.rules_version,
            "recommended_at": r.recommended_at.isoformat(),
        })
    return out.getvalue().encode("utf-8")


def export_audit_csv(db: Session) -> bytes:
    items = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(5000).all()
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=[
        "id", "event_type", "entity_type", "entity_id",
        "conversation_id", "summary", "actor", "created_at",
    ])
    writer.writeheader()
    for a in items:
        writer.writerow({
            "id": a.id,
            "event_type": a.event_type.value,
            "entity_type": a.entity_type or "",
            "entity_id": a.entity_id or "",
            "conversation_id": a.conversation_id or "",
            "summary": a.summary,
            "actor": a.actor,
            "created_at": a.created_at.isoformat(),
        })
    return out.getvalue().encode("utf-8")


def generate_export_bundle(db: Session) -> dict:
    """Generate all exports and return as a bundle with manifest."""
    now = datetime.utcnow().isoformat()

    files = {
        "conversations.csv": export_conversations_csv(db),
        "evidence.csv": export_evidence_csv(db),
        "commitments.csv": export_commitments_csv(db),
        "risk_assessments.csv": export_risk_csv(db),
        "routing_decisions.csv": export_routing_csv(db),
        "audit_log.csv": export_audit_csv(db),
    }

    manifest = {
        "export_timestamp": now,
        "schema_version": "1.0",
        "files": [],
    }

    for name, content in files.items():
        manifest["files"].append({
            "filename": name,
            "record_count": max(0, content.decode("utf-8").count("\n") - 1),
            "content_hash": _hash(content.decode("utf-8")),
        })

    # Record the export
    export_record = ExportRecord(
        export_type="bundle",
        entities=list(files.keys()),
        record_count=sum(f["record_count"] for f in manifest["files"]),
        metadata_=manifest,
    )
    db.add(export_record)
    db.add(AuditEvent(
        event_type=AuditEventType.EXPORT_GENERATED,
        entity_type="export",
        entity_id=export_record.id,
        summary=f"Export bundle generated: {len(files)} files",
        metadata_=manifest,
        actor="system",
    ))
    db.commit()

    files["manifest.json"] = json.dumps(manifest, indent=2).encode("utf-8")
    return files
