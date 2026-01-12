from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

from .project_media import ProjectMedia

if TYPE_CHECKING:

    from .media_summary import MediaSummary
    from .project import Project
    from .thumbnail import Thumbnail





class Media(SQLModel, table=True):

    id: int | None = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", index=True)

    filename: str

    content_type: str

    size: int

    s3_key: str

    binary_metadata: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))



    thumbnails: List["Thumbnail"] = Relationship(back_populates="media")

    projects: List["Project"] = Relationship(back_populates="medias", link_model=ProjectMedia)

    summary: Optional["MediaSummary"] = Relationship(back_populates="media")


