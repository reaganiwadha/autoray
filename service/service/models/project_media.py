from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class ProjectMedia(SQLModel, table=True):
    __tablename__ = "project_media"

    project_id: int = Field(foreign_key="project.id", primary_key=True)
    media_id: int = Field(foreign_key="media.id", primary_key=True)
    is_unused: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
