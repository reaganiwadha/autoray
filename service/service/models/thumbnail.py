from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .media import Media

class Thumbnail(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    media_id: int = Field(foreign_key="media.id", index=True)
    filename: str
    content_type: str
    size: int
    s3_key: str
    width: Optional[int] = Field(default=None)
    height: Optional[int] = Field(default=None)
    type: str  # 'original', 'large', 'small', 'gif'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    media: "Media" = Relationship(back_populates="thumbnails")
