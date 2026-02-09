from datetime import datetime, timezone

from pydantic import BaseModel

from service.models.project import Project


class ProjectCreate(BaseModel):
    name: str


class ProjectUpdate(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    created_at: str
    updated_at: str
    assets: list[dict] = []
    timeline: dict | None = None
    jobs: list[dict] = []
    chat_history: list[dict] = []
    system_prompt: str | None = None

    @classmethod
    def from_db_project(cls, db_project: Project) -> "ProjectResponse":
        assert db_project.id is not None

        created_at = db_project.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        updated_at = db_project.updated_at
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)

        data = db_project.data or {}

        # Extract assets from the nested asset_bin structure
        asset_bin = data.get("asset_bin", {})
        assets = asset_bin.get("assets", [])

        return cls(
            id=db_project.id,
            name=db_project.name,
            owner_id=db_project.owner_id,
            created_at=created_at.isoformat(),
            updated_at=updated_at.isoformat(),
            assets=assets,
            timeline=data.get("timeline"),
            jobs=data.get("jobs", []),
            chat_history=data.get("chat_history", []),
            system_prompt=data.get("system_prompt"),
        )
