from sqlmodel import Session, select, col
from fastapi import HTTPException
from service.models.project import Project
from service.models.user import User
from service.dtos.project_dto import ProjectCreate, ProjectUpdate
from datetime import datetime, timezone


def create_project(
    project_data: ProjectCreate, current_user: User, session: Session
) -> Project:
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


def get_user_projects(current_user: User, session: Session) -> list[Project]:
    statement = (
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(col(Project.updated_at).desc())
    )
    results = session.exec(statement)
    return list(results.all())


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

