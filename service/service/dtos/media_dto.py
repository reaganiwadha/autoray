from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from .thumbnail_dto import ThumbnailResponse


class MediaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content_type: str
    size: int
    s3_key: str
    created_at: datetime
    url: str | None = None
    binary_metadata: Optional[Dict[str, Any]] = None
    thumbnails: List[ThumbnailResponse] = []
