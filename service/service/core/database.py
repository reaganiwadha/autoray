from sqlmodel import SQLModel, create_engine, Session
import os

database_url = os.environ.get("DATABASE_URL", "sqlite:///database.db")
engine = create_engine(database_url)

def get_session():
    with Session(engine) as session:
        yield session
