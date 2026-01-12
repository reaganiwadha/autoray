from sqlmodel import Field, SQLModel
from datetime import datetime, timezone

class Media(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    filename: str
    content_type: str
    size: int
    s3_key: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
