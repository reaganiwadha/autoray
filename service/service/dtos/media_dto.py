from pydantic import BaseModel
from datetime import datetime

class MediaResponse(BaseModel):
    id: int
    filename: str
    content_type: str
    size: int
    s3_key: str
    created_at: datetime
    url: str | None = None
