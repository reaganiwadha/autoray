from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ThumbnailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    filename: str
    content_type: str
    size: int
    s3_key: str
    width: Optional[int]
    height: Optional[int]
    type: str
    created_at: datetime
