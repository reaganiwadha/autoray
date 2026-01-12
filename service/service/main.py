from service.models import user, project
from sqlmodel import SQLModel, create_engine, Session, select
import os

database_url = os.environ.get("DATABASE_URL", "sqlite:///database.db")
engine = create_engine(database_url)

from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from service.dtos.user_dto import UserCreate, UserLogin, UserResponse, LoginResponse
from service.controllers.user_controller import (
    create_user,
    login_user,
    logout_user,
    get_current_user,
    get_session,
)
from service.dtos.project_dto import ProjectCreate, ProjectResponse, ProjectUpdate
from service.controllers.project_controller import (
    create_project,
    get_user_projects,
    update_project,
    delete_project,
)
from service.dtos.media_dto import MediaResponse
from service.controllers.media_controller import upload_media, get_user_media
from fastapi import UploadFile, File
import random
import string
import io
import os


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


@app.post("/projects", response_model=ProjectResponse)
def create_new_project(
    project_data: ProjectCreate,
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    project = create_project(project_data, user, session)
    return ProjectResponse.from_db_project(project)


@app.get("/projects", response_model=list[ProjectResponse])
def list_projects(
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    projects = get_user_projects(user, session)
    return [ProjectResponse.from_db_project(p) for p in projects]


@app.put("/projects/{project_id}", response_model=ProjectResponse)
def update_existing_project(
    project_id: int,
    project_data: ProjectUpdate,
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    project = update_project(project_id, project_data, user, session)
    return ProjectResponse.from_db_project(project)


@app.delete("/projects/{project_id}")
def delete_existing_project(
    project_id: int,
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    delete_project(project_id, user, session)
    return {"status": "ok"}


@app.post("/media/upload", response_model=MediaResponse)
def upload_file(
    file: UploadFile = File(...),
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    media = upload_media(file, user, session)
    return MediaResponse(
        id=media.id,
        filename=media.filename,
        content_type=media.content_type,
        size=media.size,
        s3_key=media.s3_key,
        created_at=media.created_at,
    )


@app.get("/media", response_model=list[MediaResponse])
def list_media(
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    medias = get_user_media(user, session)
    return [
        MediaResponse(
            id=m.id,
            filename=m.filename,
            content_type=m.content_type,
            size=m.size,
            s3_key=m.s3_key,
            created_at=m.created_at,
        )
        for m in medias
    ]


@app.post("/debug/upload", response_model=MediaResponse)
def debug_upload_random_file(
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    """
    Generates a random 1MB file and uploads it.
    """
    user = get_current_user(Authorization, session)
    
    # Generate random content (1MB)
    size = 1024 * 1024
    content = os.urandom(size)
    
    # Generate random filename
    random_name = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    filename = f"debug_{random_name}.bin"
    
    # Create UploadFile-like object
    file_object = io.BytesIO(content)
    from starlette.datastructures import Headers
    headers = Headers({"content-type": "application/octet-stream"})
    upload_file = UploadFile(file=file_object, filename=filename, size=size, headers=headers)
    
    media = upload_media(upload_file, user, session)
    
    return MediaResponse(
        id=media.id,
        filename=media.filename,
        content_type=media.content_type,
        size=media.size,
        s3_key=media.s3_key,
        created_at=media.created_at,
    )


def run():
    uvicorn.run(
        "service.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
