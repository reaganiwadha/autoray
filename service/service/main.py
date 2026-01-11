from service.models import user
from sqlmodel import SQLModel, create_engine, Session, select

engine = create_engine("sqlite:///database.db")

SQLModel.metadata.create_all(engine)

from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from service.controllers.user_controller import (
    UserCreate,
    UserLogin,
    UserResponse,
    LoginResponse,
    create_user,
    login_user,
    logout_user,
    get_current_user,
    get_session,
)
from pydantic import BaseModel

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


@app.post("/users/register", response_model=UserResponse)
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(
        select(user.User).where(user.User.email == user_data.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = create_user(user_data, session)
    return UserResponse.from_db_user(db_user)


@app.post("/users/login", response_model=LoginResponse)
def login(user_data: UserLogin, session: Session = Depends(get_session)):
    db_user, token = login_user(user_data.email, user_data.password, session)
    return LoginResponse(user=UserResponse.from_db_user(db_user), token=token)


@app.post("/users/logout")
def logout(Authorization: str = Header(...), session: Session = Depends(get_session)):
    logout_user(Authorization, session)
    return {"message": "Logged out successfully"}


@app.get("/users/me", response_model=UserResponse)
def get_me(Authorization: str = Header(...), session: Session = Depends(get_session)):
    db_user = get_current_user(Authorization, session)
    return UserResponse.from_db_user(db_user)


def run():
    uvicorn.run(
        "service.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
