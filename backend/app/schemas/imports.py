from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ImportBatchOut(BaseModel):
    id: str
    filename: str
    file_format: str
    status: str
    records_total: int
    records_created: int
    records_updated: int
    records_skipped: int
    records_failed: int
    error_summary: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ImportErrorOut(BaseModel):
    id: str
    batch_id: str
    row_number: Optional[int] = None
    field: Optional[str] = None
    message: str
    raw_data: Optional[str] = None

    model_config = {"from_attributes": True}
