from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.db.models import ImportBatch, ImportError
from app.services.import_service import process_csv, process_json
from app.core.config import settings

router = APIRouter()

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {".csv", ".json"}


@router.post("/imports")
async def upload_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Only .csv and .json are accepted."
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB} MB"
        )

    # Never execute uploaded content
    if ext == ".csv":
        batch = process_csv(db, content, file.filename)
    else:
        batch = process_json(db, content, file.filename)

    errors = db.query(ImportError).filter(ImportError.batch_id == batch.id).all()
    error_list = [
        {
            "row_number": e.row_number,
            "field": e.field,
            "message": e.message,
        }
        for e in errors[:50]  # limit error preview
    ]

    return {
        "id": batch.id,
        "filename": batch.filename,
        "status": batch.status,
        "records_total": batch.records_total,
        "records_created": batch.records_created,
        "records_updated": batch.records_updated,
        "records_skipped": batch.records_skipped,
        "records_failed": batch.records_failed,
        "error_summary": batch.error_summary,
        "errors": error_list,
        "created_at": batch.created_at.isoformat(),
        "completed_at": batch.completed_at.isoformat() if batch.completed_at else None,
    }


@router.get("/imports")
def list_imports(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    total = db.query(ImportBatch).count()
    batches = (
        db.query(ImportBatch)
        .order_by(ImportBatch.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [
            {
                "id": b.id,
                "filename": b.filename,
                "file_format": b.file_format,
                "status": b.status,
                "records_total": b.records_total,
                "records_created": b.records_created,
                "records_updated": b.records_updated,
                "records_skipped": b.records_skipped,
                "records_failed": b.records_failed,
                "error_summary": b.error_summary,
                "created_at": b.created_at.isoformat(),
                "completed_at": b.completed_at.isoformat() if b.completed_at else None,
            }
            for b in batches
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/imports/{batch_id}/errors")
def get_import_errors(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")
    errors = db.query(ImportError).filter(ImportError.batch_id == batch_id).all()
    return [
        {
            "id": e.id,
            "row_number": e.row_number,
            "field": e.field,
            "message": e.message,
            "raw_data": e.raw_data,
        }
        for e in errors
    ]
