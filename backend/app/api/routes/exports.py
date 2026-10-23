import io
import zipfile
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.services.export_service import generate_export_bundle

router = APIRouter()


@router.post("/exports")
def create_export(db: Session = Depends(get_db)):
    """Generate a full ZIP export bundle with all entities and manifest."""
    files = generate_export_bundle(db)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, content in files.items():
            zf.writestr(filename, content)

    zip_buffer.seek(0)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"dealradar_export_{timestamp}.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
