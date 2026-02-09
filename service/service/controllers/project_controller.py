import os
import tempfile
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile
from sqlmodel import Session, select

from openagv import LLMConfig, Project as AgvProject
from openagv.modules.vision import ORVisionAnalyzer

from service.core.minio_storage import MinioStorageBackend
from service.core.storage import Storage, get_storage_client
from service.dtos.project_dto import ProjectCreate, ProjectUpdate
from service.models.project import Project
from service.models.user import User
from service.utils.thumbnails import generate_thumbnails


def _get_llm_config() -> LLMConfig:
    return LLMConfig(
        provider="openrouter",
        model="deepseek/deepseek-r1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
    )


def _make_storage(project_id: int) -> MinioStorageBackend:
    return MinioStorageBackend(
        minio_client=get_storage_client(),
        bucket=Storage.get_bucket_name(),
        project_id=str(project_id),
    )


def _register_modules(agv_project: AgvProject):
    """Register runtime modules that aren't serialized."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if api_key:
        from openai import OpenAI
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )
        analyzer = ORVisionAnalyzer(
            client=client,
            model="openai/gpt-4o-mini",
        )
        agv_project.register_module(analyzer)


def _load_agv_project(db_project: Project) -> AgvProject:
    """Reconstruct openagv Project from DB data."""
    assert db_project.id is not None
    storage = _make_storage(db_project.id)

    if db_project.data:
        agv = AgvProject.from_dict(
            db_project.data,
            api_key=os.getenv("OPENROUTER_API_KEY"),
            storage=storage,
        )
    else:
        agv = AgvProject(
            name=db_project.name,
            llm_config=_get_llm_config(),
            storage=storage,
        )

    _register_modules(agv)
    return agv


def _save_project(db_project: Project, agv_project: AgvProject, session: Session):
    """Persist openagv project state to DB."""
    db_project.data = agv_project.to_dict()
    db_project.updated_at = datetime.now(timezone.utc)
    session.add(db_project)
    session.commit()
    session.refresh(db_project)


def create_project(project_data: ProjectCreate, current_user: User, session: Session) -> Project:
    assert current_user.id is not None
    db_project = Project(
        name=project_data.name,
        owner_id=current_user.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(db_project)
    session.commit()
    session.refresh(db_project)

    # Initialize openagv project and persist
    agv = AgvProject(
        name=project_data.name,
        llm_config=_get_llm_config(),
        storage=_make_storage(db_project.id),
    )
    _register_modules(agv)
    _save_project(db_project, agv, session)

    return db_project


def get_user_projects(user: User, session: Session) -> list[Project]:
    statement = (
        select(Project)
        .where(Project.owner_id == user.id)
        .order_by(Project.created_at.desc())
    )
    return list(session.exec(statement).all())


def get_project_by_id(project_id: int, current_user: User, session: Session) -> Project:
    statement = select(Project).where(
        Project.id == project_id, Project.owner_id == current_user.id
    )
    project = session.exec(statement).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User,
    session: Session,
) -> Project:
    project = get_project_by_id(project_id, current_user, session)
    project.name = project_data.name
    project.updated_at = datetime.now(timezone.utc)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def delete_project(project_id: int, current_user: User, session: Session) -> None:
    project = get_project_by_id(project_id, current_user, session)
    session.delete(project)
    session.commit()


async def upload_to_project(
    project_id: int,
    file: UploadFile,
    current_user: User,
    session: Session,
) -> dict:
    """Upload a file into a project's AssetBin."""
    db_project = get_project_by_id(project_id, current_user, session)
    agv = _load_agv_project(db_project)

    # Save upload to temp file
    ext = os.path.splitext(file.filename or "file")[1]
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        asset = agv.asset_bin.add(tmp_path)

        # Generate thumbnails and store keys in asset metadata
        minio_client = get_storage_client()
        thumb_bucket = Storage.get_thumbnail_bucket_name()
        thumbs = generate_thumbnails(
            tmp_path, file.content_type or "", minio_client, thumb_bucket, asset.id
        )
        if thumbs:
            asset.metadata["thumbnails"] = thumbs

        # Save back to DB
        _save_project(db_project, agv, session)

        # Return the asset dict with presigned thumbnail URLs
        asset_dict = asset.to_dict()
        _enrich_thumbnail_urls(asset_dict, minio_client, thumb_bucket)
        return asset_dict
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def delete_asset_from_project(
    project_id: int,
    asset_id: str,
    current_user: User,
    session: Session,
):
    """Remove an asset from a project's AssetBin."""
    db_project = get_project_by_id(project_id, current_user, session)
    agv = _load_agv_project(db_project)

    asset = next((a for a in agv.asset_bin.assets if a.id == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Delete thumbnails from MinIO
    minio_client = get_storage_client()
    thumb_bucket = Storage.get_thumbnail_bucket_name()
    thumbs = asset.metadata.get("thumbnails", {})
    for s3_key in thumbs.values():
        try:
            minio_client.remove_object(thumb_bucket, s3_key)
        except Exception:
            pass

    # Delete asset file from storage
    if agv.storage:
        try:
            agv.storage.delete(asset.storage_key)
        except Exception:
            pass

    agv.asset_bin.assets.remove(asset)
    _save_project(db_project, agv, session)


def submit_job(
    project_id: int,
    instruction: str,
    current_user: User,
    session: Session,
) -> tuple[Project, AgvProject, "openagv.Job"]:
    """Submit an edit job to the project. Returns (db_project, agv_project, job)."""
    db_project = get_project_by_id(project_id, current_user, session)
    agv = _load_agv_project(db_project)

    job = agv.submit(instruction, author=f"user:{current_user.email}")
    _save_project(db_project, agv, session)

    return db_project, agv, job


def get_project_jobs(project_id: int, current_user: User, session: Session) -> list[dict]:
    """List job history for a project."""
    db_project = get_project_by_id(project_id, current_user, session)
    data = db_project.data or {}
    return data.get("jobs", [])


def _enrich_thumbnail_urls(asset_dict: dict, minio_client, thumb_bucket: str):
    """Replace thumbnail s3 keys with presigned URLs in an asset dict."""
    thumbs = asset_dict.get("metadata", {}).get("thumbnails", {})
    if thumbs:
        url_thumbs = {}
        for name, s3_key in thumbs.items():
            try:
                url_thumbs[name] = minio_client.presigned_get_object(thumb_bucket, s3_key)
            except Exception:
                url_thumbs[name] = s3_key
        asset_dict.setdefault("metadata", {})["thumbnails"] = url_thumbs


def enrich_project_response(db_project: Project):
    """Add presigned thumbnail URLs to all assets in the project response."""
    data = db_project.data or {}
    asset_bin = data.get("asset_bin", {})
    assets = asset_bin.get("assets", [])

    if not assets:
        return

    minio_client = get_storage_client()
    thumb_bucket = Storage.get_thumbnail_bucket_name()

    for asset_dict in assets:
        _enrich_thumbnail_urls(asset_dict, minio_client, thumb_bucket)
