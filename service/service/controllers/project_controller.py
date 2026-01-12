from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from service.dtos.project_dto import ProjectCreate, ProjectUpdate
from service.models.media import Media
from service.models.project import Project
from service.models.project_media import ProjectMedia
from service.models.user import User


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
    return db_project


def get_user_projects(user: User, session: Session) -> list[Project]:
    statement = (
        select(Project)
        .where(Project.owner_id == user.id)
        .options(selectinload(Project.medias).selectinload(Media.thumbnails))
        .order_by(Project.created_at.desc())
    )
    return list(session.exec(statement).all())


def add_media_to_project(project_id: int, media_id: int, user: User, session: Session):
    get_project_by_id(project_id, user, session)
    # Check if media exists and belongs to user
    media = session.exec(select(Media).where(Media.id == media_id, Media.user_id == user.id)).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Check if already associated
    existing = session.exec(
        select(ProjectMedia).where(ProjectMedia.project_id == project_id, ProjectMedia.media_id == media_id)
    ).first()
    if existing:
        return existing

    assoc = ProjectMedia(project_id=project_id, media_id=media_id)
    session.add(assoc)
    session.commit()
    session.refresh(assoc)
    return assoc


def update_project_media_status(project_id: int, media_id: int, is_unused: bool, user: User, session: Session):
    get_project_by_id(project_id, user, session)
    assoc = session.exec(
        select(ProjectMedia).where(ProjectMedia.project_id == project_id, ProjectMedia.media_id == media_id)
    ).first()
    if not assoc:
        raise HTTPException(status_code=404, detail="Media not associated with project")

    assoc.is_unused = is_unused
    session.add(assoc)
    session.commit()
    session.refresh(assoc)
    return assoc


def get_project_media(project_id: int, user: User, session: Session):
    get_project_by_id(project_id, user, session)
    # This is tricky because we want the assoc data (is_unused) too.
    # Let's join ProjectMedia and Media
    statement = (
        select(ProjectMedia, Media)
        .join(Media, ProjectMedia.media_id == Media.id)
        .where(ProjectMedia.project_id == project_id)
        .options(selectinload(Media.thumbnails))
    )
    return session.exec(statement).all()


def get_project_by_id(project_id: int, current_user: User, session: Session) -> Project:
    statement = (
        select(Project)
        .where(Project.id == project_id, Project.owner_id == current_user.id)
        .options(selectinload(Project.medias).selectinload(Media.thumbnails))
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