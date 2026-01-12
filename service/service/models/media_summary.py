from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .media import Media

class MediaSummary(SQLModel, table=True):
    __tablename__ = "media_summary"

    id: Optional[int] = Field(default=None, primary_key=True)
    media_id: int = Field(foreign_key="media.id", index=True)
    type: str = Field(index=True) # visual, transcription, audio, video
    summary: str
    model_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    media: "Media" = Relationship(back_populates="summaries")
