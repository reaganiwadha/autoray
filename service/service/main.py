import io
import os
import random
import string

import uvicorn
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from starlette.datastructures import Headers

from service.controllers.media_controller import delete_media, get_user_media, upload_media
from service.controllers.project_controller import (
    add_media_to_project,
    create_project,
    delete_project,
    get_project_by_id,
    get_project_media,
    get_user_projects,
    update_project,
    update_project_media_status,
)
from service.controllers.user_controller import (
    create_user,
    get_current_user,
    get_user_by_token,
    login_user,
    logout_user,
)
from service.core.database import get_session
from service.core.websocket_manager import manager
from service.dtos.media_dto import MediaResponse
from service.dtos.project_dto import ProjectCreate, ProjectResponse, ProjectUpdate
from service.dtos.project_media_dto import ProjectMediaResponse
from service.dtos.thumbnail_dto import ThumbnailResponse
from service.dtos.user_dto import LoginResponse, UserCreate, UserLogin, UserResponse
from service.models import user
from service.models.media import Media
from service.models.project_media import ProjectMedia
from service.utils.analyzer import start_analyzer_job
from service.utils.chat import chat_with_project

app = FastAPI()

if not os.getenv("OPENROUTER_API_KEY"):
    print("FATAL: OPENROUTER_API_KEY not found in environment")
    raise RuntimeError("OPENROUTER_API_KEY not found in environment")

@app.on_event("startup")
async def startup_event():
    start_analyzer_job()

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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None, session: Session = Depends(get_session)):
    if not token:
        await websocket.close(code=1008)
        return
    
    try:
        user = get_user_by_token(token, session)
    except HTTPException:
        await websocket.close(code=1008)
        return

    await manager.connect(user.id, websocket)
    try:
        while True:
            # Just keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)


@app.post("/users/register", response_model=UserResponse)
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(select(user.User).where(user.User.email == user_data.email)).first()
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


@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_single_project(
    project_id: int,
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    project = get_project_by_id(project_id, user, session)
    return ProjectResponse.from_db_project(project)


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


@app.get("/projects/{project_id}/media", response_model=list[ProjectMediaResponse])
def list_project_media(
    project_id: int,
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    results = get_project_media(project_id, user, session)
    return [
        ProjectMediaResponse(
            project_id=assoc.project_id,
            media_id=assoc.media_id,
            is_unused=assoc.is_unused,
            created_at=assoc.created_at,
            media=MediaResponse.model_validate(m),
        )
        for assoc, m in results
    ]


@app.post("/projects/{project_id}/media/{media_id}", response_model=ProjectMediaResponse)
def add_media_to_project_endpoint(
    project_id: int,
    media_id: int,
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    add_media_to_project(project_id, media_id, user, session)

    # Fetch the specific assoc and media
    statement = (
        select(ProjectMedia, Media)
        .join(Media, ProjectMedia.media_id == Media.id)
        .where(ProjectMedia.project_id == project_id, ProjectMedia.media_id == media_id)
        .options(
            selectinload(Media.thumbnails),
            selectinload(Media.summaries)
        )
    )
    result = session.exec(statement).first()
    if not result:
        raise HTTPException(status_code=500, detail="Failed to retrieve added media")

    assoc, m = result
    return ProjectMediaResponse(
        project_id=assoc.project_id,
        media_id=assoc.media_id,
        is_unused=assoc.is_unused,
        created_at=assoc.created_at,
        media=MediaResponse.model_validate(m),
    )


class MediaStatusUpdate(BaseModel):
    is_unused: bool

@app.patch("/projects/{project_id}/media/{media_id}", response_model=ProjectMediaResponse)
def update_project_media(
    project_id: int,
    media_id: int,
    data: MediaStatusUpdate,
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    update_project_media_status(project_id, media_id, data.is_unused, user, session)

    # Fetch the specific assoc and media
    statement = (
        select(ProjectMedia, Media)
        .join(Media, ProjectMedia.media_id == Media.id)
        .where(ProjectMedia.project_id == project_id, ProjectMedia.media_id == media_id)
        .options(
            selectinload(Media.thumbnails),
            selectinload(Media.summaries)
        )
    )
    result = session.exec(statement).first()
    if not result:
        raise HTTPException(status_code=404, detail="Assoc not found after update")

    assoc, m = result
    return ProjectMediaResponse(
        project_id=assoc.project_id,
        media_id=assoc.media_id,
        is_unused=assoc.is_unused,
        created_at=assoc.created_at,
        media=MediaResponse.model_validate(m),
    )


class ChatRequest(BaseModel):
    message: str

@app.post("/projects/{project_id}/chat")
async def project_chat(
    project_id: int,
    request: ChatRequest,
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    # Verify project belongs to user
    get_project_by_id(project_id, user, session)
    
    response = await chat_with_project(user.id, project_id, request.message)
    return {"response": response}


@app.post("/media/upload", response_model=MediaResponse)
async def upload_file(
    file: UploadFile = File(...),
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    media = await upload_media(file, user, session)
    return MediaResponse.model_validate(media)


@app.get("/media", response_model=list[MediaResponse])
def list_media(
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    medias = get_user_media(user, session)
    return [MediaResponse.model_validate(m) for m in medias]


@app.delete("/media/{media_id}")
def delete_media_endpoint(
    media_id: int,
    Authorization: str = Header(...),
    session: Session = Depends(get_session),
):
    user = get_current_user(Authorization, session)
    delete_media(media_id, user, session)
    return {"message": "Media deleted successfully"}


@app.post("/debug/upload", response_model=MediaResponse)
async def debug_upload_random_file(
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
    random_name = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    filename = f"debug_{random_name}.bin"

    # Create UploadFile-like object
    file_object = io.BytesIO(content)
    headers = Headers({"content-type": "application/octet-stream"})
    upload_file = UploadFile(file=file_object, filename=filename, size=size, headers=headers)

    media = await upload_media(upload_file, user, session)

    return MediaResponse.model_validate(media)


def run():
    uvicorn.run(
        "service.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
