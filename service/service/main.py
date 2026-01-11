from service.models import user
from sqlmodel import SQLModel, create_engine

engine = create_engine("sqlite:///database.db")

SQLModel.metadata.create_all(engine)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok"}


@app.get("/status")
def read_status():
    return {"alives": {"service": True, "editor": True}}


def run():
    uvicorn.run(
        "service.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
