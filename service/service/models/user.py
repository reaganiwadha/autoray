from datetime import datetime

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True, nullable=False)
    argon_password: str
    session_token: str | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
