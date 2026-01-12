from datetime import datetime

from pydantic import BaseModel

from service.dtos.media_dto import MediaResponse


class ProjectMediaResponse(BaseModel):
    project_id: int
    media_id: int
    is_unused: bool
    created_at: datetime
    media: MediaResponse
