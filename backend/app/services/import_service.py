"""
Import pipeline for CSV and JSON conversation uploads.
Implements idempotent imports: same conversation_id → update, not duplicate.
Manual overrides are preserved across reimports.
"""
import hashlib
import json
import io
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.db.models import (
    Conversation, Evidence, Commitment, RiskAssessment,
    RoutingDecision, ImportBatch, ImportError, AuditEvent,
    AuditEventType, CommitmentStatus
)
from app.services.evidence_extractor import extract_evidence, extract_commitments
from app.services.risk_scorer import compute_risk
from app.services.routing_engine import compute_route


def _hash_content(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _parse_date(val: Any) -> Optional[datetime]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%m/%d/%Y", "%d/%m/%Y",
                "%Y-%m-%d %H:%M:%S", "%b %d, %Y", "%B %d, %Y"]:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    return None


def _parse_due_date_from_str(text: Optional[str]) -> Optional[datetime]:
    """Attempt to parse a rough due date string into a datetime."""
    if not text:
        return None
    # Try end of week / eow
    if re.search(r"(?i)\b(eow|end of week)\b", text):
        # Return None — relative date, can't resolve without anchor
        return None
    # Try month day year pattern
    pattern = re.search(
        r"(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?",
        text, re.IGNORECASE
    )
    if pattern:
        day = int(pattern.group(2))
        month_str = pattern.group(1)
        year = int(pattern.group(3)) if pattern.group(3) else datetime.utcnow().year
        try:
            month = datetime.strptime(month_str[:3], "%b").month
            return datetime(year, month, day)
        except Exception:
            pass
    # Try mm/dd/yyyy
    m = re.search(r"(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?", text)
    if m:
        try:
            y = int(m.group(3)) if m.group(3) else datetime.utcnow().year
            if y < 100:
                y += 2000
            return datetime(y, int(m.group(1)), int(m.group(2)))
        except Exception:
            pass
    return None


def _process_conversation(
    db: Session,
    batch: ImportBatch,
    row: Dict[str, Any],
    row_num: int,
) -> str:
    """
    Process one conversation row. Returns 'created' | 'updated' | 'skipped' | 'failed'.
    """
    cid = str(row.get("conversation_id", "")).strip()
    transcript = str(row.get("transcript", "")).strip()

    if not cid:
        _add_error(db, batch, row_num, "conversation_id", "Missing conversation_id", row)
        return "failed"
    if not transcript:
        _add_error(db, batch, row_num, "transcript", "Empty transcript", row)
        return "failed"

    content_hash = _hash_content(transcript)

    existing = db.query(Conversation).filter(
        Conversation.conversation_id == cid
    ).first()

    if existing:
        if existing.content_hash == content_hash:
            return "skipped"
        # Updated transcript — reprocess but preserve manual overrides
        existing.deal_name = str(row.get("deal_name", "")).strip() or existing.deal_name
        existing.account_name = str(row.get("account_name", "")).strip() or existing.account_name
        existing.representative = str(row.get("representative", "")).strip() or existing.representative
        existing.conversation_date = _parse_date(row.get("conversation_date")) or existing.conversation_date
        existing.source = str(row.get("source", "")).strip() or existing.source
        existing.transcript = transcript
        existing.content_hash = content_hash
        existing.updated_at = datetime.utcnow()

        # Remove old auto-generated evidence/commitments/risk/routing
        for ev in existing.evidence:
            db.delete(ev)
        for c in existing.commitments:
            db.delete(c)
        if existing.risk_assessment:
            db.delete(existing.risk_assessment)

        # Note: routing_decision manual override is preserved below
        db.flush()

        _extract_and_save(db, existing, transcript, preserve_route_override=True)

        db.add(AuditEvent(
            event_type=AuditEventType.CONVERSATION_UPDATED,
            entity_type="conversation",
            entity_id=existing.id,
            conversation_id=existing.id,
            summary=f"Conversation {cid} updated with new transcript",
            actor="import",
        ))
        return "updated"

    else:
        conv = Conversation(
            conversation_id=cid,
            deal_name=str(row.get("deal_name", "")).strip() or None,
            account_name=str(row.get("account_name", "")).strip() or None,
            representative=str(row.get("representative", "")).strip() or None,
            conversation_date=_parse_date(row.get("conversation_date")),
            transcript=transcript,
            source=str(row.get("source", "")).strip() or None,
            content_hash=content_hash,
            import_batch_id=batch.id,
            is_synthetic=bool(row.get("is_synthetic", False)),
        )
        db.add(conv)
        db.flush()

        _extract_and_save(db, conv, transcript, preserve_route_override=False)

        db.add(AuditEvent(
            event_type=AuditEventType.CONVERSATION_CREATED,
            entity_type="conversation",
            entity_id=conv.id,
            conversation_id=conv.id,
            summary=f"Conversation {cid} created",
            actor="import",
        ))
        return "created"


def _extract_and_save(
    db: Session,
    conv: Conversation,
    transcript: str,
    preserve_route_override: bool = False,
):
    """Run extraction, risk scoring, routing and persist results."""
    evidence_dicts = extract_evidence(transcript)

    saved_evidence = []
    for ev_dict in evidence_dicts:
        ev = Evidence(
            conversation_id=conv.id,
            **{k: v for k, v in ev_dict.items() if k != "due_date_str"},
        )
        db.add(ev)
        db.flush()
        ev_dict["id"] = ev.id
        saved_evidence.append(ev_dict)

    # Commitments
    commitment_dicts = extract_commitments(transcript, saved_evidence)
    for c_dict in commitment_dicts:
        due_date = _parse_due_date_from_str(c_dict.get("due_date_str"))
        cm = Commitment(
            conversation_id=conv.id,
            description=c_dict["description"],
            responsible_person=c_dict.get("responsible_person"),
            due_date=due_date,
            status=CommitmentStatus.PENDING,
            source_quotation=c_dict.get("source_quotation"),
        )
        db.add(cm)

    db.flush()

    # Get saved commitments for risk scoring
    db.refresh(conv)
    commitment_dicts_for_risk = [
        {"status": c.status.value, "description": c.description, "due_date": c.due_date}
        for c in conv.commitments
    ]

    # Risk scoring
    risk_result = compute_risk(saved_evidence, commitment_dicts_for_risk)
    risk = RiskAssessment(
        conversation_id=conv.id,
        **risk_result,
    )
    db.add(risk)

    # Routing
    route_result = compute_route(
        risk_result["risk_level"],
        risk_result["risk_score"],
        saved_evidence,
        commitment_dicts_for_risk,
    )

    existing_route = db.query(RoutingDecision).filter(
        RoutingDecision.conversation_id == conv.id
    ).first()

    if existing_route:
        if preserve_route_override:
            # Update recommendation but keep manual override
            existing_route.recommended_route = route_result["recommended_route"]
            existing_route.recommendation_reason = route_result["recommendation_reason"]
            existing_route.recommendation_evidence = route_result["recommendation_evidence"]
            existing_route.rules_version = route_result["rules_version"]
            existing_route.recommended_at = datetime.utcnow()
        else:
            db.delete(existing_route)
            db.flush()
            db.add(RoutingDecision(conversation_id=conv.id, **route_result))
    else:
        db.add(RoutingDecision(conversation_id=conv.id, **route_result))


def _add_error(db: Session, batch: ImportBatch, row_num: int, field: str, message: str, raw: Any):
    err = ImportError(
        batch_id=batch.id,
        row_number=row_num,
        field=field,
        message=message,
        raw_data=json.dumps(raw, default=str)[:2000],
    )
    db.add(err)


def process_csv(db: Session, content: bytes, filename: str) -> ImportBatch:
    import pandas as pd

    batch = ImportBatch(filename=filename, file_format="csv", status="processing")
    db.add(batch)
    db.flush()

    db.add(AuditEvent(
        event_type=AuditEventType.IMPORT_STARTED,
        entity_type="import_batch",
        entity_id=batch.id,
        summary=f"CSV import started: {filename}",
        actor="system",
    ))

    try:
        df = pd.read_csv(io.BytesIO(content))
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        rows = df.to_dict("records")
    except Exception as e:
        batch.status = "failed"
        batch.error_summary = str(e)
        batch.completed_at = datetime.utcnow()
        db.add(AuditEvent(
            event_type=AuditEventType.IMPORT_FAILED,
            entity_type="import_batch",
            entity_id=batch.id,
            summary=f"CSV parse failed: {e}",
            actor="system",
        ))
        db.commit()
        return batch

    return _process_rows(db, batch, rows)


def process_json(db: Session, content: bytes, filename: str) -> ImportBatch:
    batch = ImportBatch(filename=filename, file_format="json", status="processing")
    db.add(batch)
    db.flush()

    db.add(AuditEvent(
        event_type=AuditEventType.IMPORT_STARTED,
        entity_type="import_batch",
        entity_id=batch.id,
        summary=f"JSON import started: {filename}",
        actor="system",
    ))

    try:
        data = json.loads(content.decode("utf-8"))
        if isinstance(data, dict):
            rows = data.get("conversations", [data])
        else:
            rows = data
    except Exception as e:
        batch.status = "failed"
        batch.error_summary = str(e)
        batch.completed_at = datetime.utcnow()
        db.add(AuditEvent(
            event_type=AuditEventType.IMPORT_FAILED,
            entity_type="import_batch",
            entity_id=batch.id,
            summary=f"JSON parse failed: {e}",
            actor="system",
        ))
        db.commit()
        return batch

    return _process_rows(db, batch, rows)


def _process_rows(db: Session, batch: ImportBatch, rows: List[Dict]) -> ImportBatch:
    batch.records_total = len(rows)
    created = updated = skipped = failed = 0

    for i, row in enumerate(rows):
        try:
            result = _process_conversation(db, batch, row, i + 1)
            if result == "created":
                created += 1
            elif result == "updated":
                updated += 1
            elif result == "skipped":
                skipped += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
            _add_error(db, batch, i + 1, "unknown", str(e), row)
            db.rollback()
            # Re-add batch reference after rollback
            db.add(batch)

    batch.records_created = created
    batch.records_updated = updated
    batch.records_skipped = skipped
    batch.records_failed = failed
    batch.status = "completed"
    batch.completed_at = datetime.utcnow()

    db.add(AuditEvent(
        event_type=AuditEventType.IMPORT_COMPLETED,
        entity_type="import_batch",
        entity_id=batch.id,
        summary=(
            f"Import completed: {created} created, {updated} updated, "
            f"{skipped} skipped, {failed} failed"
        ),
        metadata_={"created": created, "updated": updated, "skipped": skipped, "failed": failed},
        actor="system",
    ))

    db.commit()
    return batch
