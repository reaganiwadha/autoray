from datetime import datetime
from pydantic import BaseModel, ConfigDict

class MediaSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    summary: str
    model_name: str
    created_at: datetime
