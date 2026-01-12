from datetime import datetime, timezone
from typing import List

from pydantic import BaseModel

from service.dtos.media_dto import MediaResponse
from service.dtos.thumbnail_dto import ThumbnailResponse
from service.models.project import Project


class ProjectCreate(BaseModel):
    name: str


class ProjectUpdate(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    created_at: datetime
    updated_at: datetime
    medias: List[MediaResponse] = []

    @classmethod
    def from_db_project(cls, db_project: Project) -> "ProjectResponse":
        assert db_project.id is not None, "Project ID must not be None"

        # Ensure datetimes are timezone-aware (assume UTC if naive from SQLite)
        created_at = db_project.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        updated_at = db_project.updated_at
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)

        return cls(
            id=db_project.id,
            name=db_project.name,
            owner_id=db_project.owner_id,
            created_at=created_at,
            updated_at=updated_at,
            medias=[
                MediaResponse(
                    id=m.id,
                    filename=m.filename,
                    content_type=m.content_type,
                    size=m.size,
                    s3_key=m.s3_key,
                    created_at=m.created_at,
                    binary_metadata=m.binary_metadata,
                    thumbnails=[ThumbnailResponse.model_validate(t) for t in m.thumbnails],
                )
                for m in db_project.medias
            ],
        )