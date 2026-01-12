from fastapi import HTTPException, Depends
from sqlmodel import Session, select
from service.models.user import User
from service.dtos.user_dto import UserCreate, UserLogin, UserResponse, LoginResponse
from typing import Optional
from datetime import datetime
import secrets


def create_user(user_data: UserCreate, session: Session) -> User:
    db_user = User(
        name=user_data.name, email=user_data.email, argon_password=user_data.password
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def login_user(email: str, password: str, session: Session) -> tuple[User, str]:
    user = session.exec(select(User).where(User.email == email)).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.argon_password != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = generate_session_token()
    user.session_token = token
    session.add(user)
    session.commit()
    session.refresh(user)

    return user, token


def get_user_by_token(token: str, session: Session) -> User:
    user = session.exec(select(User).where(User.session_token == token)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session token")
    return user


def logout_user(token: str, session: Session):
    user = get_user_by_token(token, session)
    user.session_token = None
    session.add(user)
    session.commit()


def get_current_user(token: str, session: Session) -> User:
    return get_user_by_token(token, session)
