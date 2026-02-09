import asyncio
import os

import uvicorn
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from service.controllers.project_controller import (
    create_project,
    delete_asset_from_project,
    delete_project,
    enrich_project_response,
    get_project_by_id,
    get_project_jobs,
    get_user_projects,
    submit_job,
    update_project,
    upload_to_project,
    _load_agv_project,
    _save_project,
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
from service.dtos.project_dto import ProjectCreate, ProjectResponse, ProjectUpdate
from service.dtos.user_dto import LoginResponse, UserCreate, UserLogin, UserResponse
from service.models.user import User


async def verify_token(Authorization: str = Header(...), session: Session = Depends(get_session)):
    try:
        return get_user_by_token(Authorization, session)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid token")


app = FastAPI()

if not os.getenv("OPENROUTER_API_KEY"):
    print("FATAL: OPENROUTER_API_KEY not found in environment")
    raise RuntimeError("OPENROUTER_API_KEY not found in environment")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────── Health ────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "ok"}


@app.get("/status")
def read_status():
    return {"alives": {"service": True, "editor": True}}


# ──────────────────────────────── WebSocket ────────────────────────────────

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
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)


# ──────────────────────────────── Users ────────────────────────────────

@app.post("/users/register", response_model=UserResponse)
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
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


# ──────────────────────────────── Projects ────────────────────────────────

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
    enrich_project_response(project)
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


# ──────────────────────────────── Assets ────────────────────────────────

@app.post("/projects/{project_id}/assets/upload")
async def upload_asset(
    project_id: int,
    file: UploadFile = File(...),
    user: User = Depends(verify_token),
    session: Session = Depends(get_session),
):
    asset_dict = await upload_to_project(project_id, file, user, session)
    return asset_dict


@app.delete("/projects/{project_id}/assets/{asset_id}")
def delete_asset(
    project_id: int,
    asset_id: str,
    user: User = Depends(verify_token),
    session: Session = Depends(get_session),
):
    delete_asset_from_project(project_id, asset_id, user, session)
    return {"status": "ok"}


# ──────────────────────────────── Jobs / SSE ────────────────────────────────

class JobRequest(BaseModel):
    instruction: str


@app.post("/projects/{project_id}/jobs")
async def create_job(
    project_id: int,
    request: JobRequest,
    user: User = Depends(verify_token),
    session: Session = Depends(get_session),
):
    db_project, agv, job = submit_job(project_id, request.instruction, user, session)

    async def run_and_save():
        try:
            await agv.run_job(job)
        finally:
            # Re-fetch project from DB to avoid stale state, then save
            from service.core.database import engine
            with Session(engine) as save_session:
                db_proj = save_session.get(type(db_project), db_project.id)
                if db_proj:
                    _save_project(db_proj, agv, save_session)

            # Notify via WebSocket
            await manager.send_personal_message(
                {"type": "JOB_COMPLETED", "job_id": job.id, "project_id": project_id},
                user.id,
            )

    asyncio.create_task(run_and_save())

    async def event_stream():
        async for event in job.stream():
            yield f"event: {event.type}\ndata: {event.to_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/projects/{project_id}/jobs")
def list_jobs(
    project_id: int,
    user: User = Depends(verify_token),
    session: Session = Depends(get_session),
):
    return get_project_jobs(project_id, user, session)


@app.get("/projects/{project_id}/jobs/{job_id}/stream")
async def stream_job(
    project_id: int,
    job_id: str,
    user: User = Depends(verify_token),
    session: Session = Depends(get_session),
):
    db_project = get_project_by_id(project_id, user, session)
    agv = _load_agv_project(db_project)

    job = next((j for j in agv.jobs if j.id == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_stream():
        async for event in job.stream():
            yield f"event: {event.type}\ndata: {event.to_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ──────────────────────────────── Entrypoint ────────────────────────────────

def run():
    uvicorn.run(
        "service.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
