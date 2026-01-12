from datetime import datetime, timezone
from typing import List

from sqlmodel import Field, Relationship, SQLModel

from .project_media import ProjectMedia


class Project(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    owner_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    medias: List["Media"] = Relationship(back_populates="projects", link_model=ProjectMedia)


from .media import Media  # noqa: E402
