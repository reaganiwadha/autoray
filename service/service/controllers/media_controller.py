import os
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from service.core.storage import Storage, get_storage_client
from service.models.media import Media
from service.models.user import User
from service.utils.media_processor import process_media


async def upload_media(file: UploadFile, user: User, session: Session) -> Media:
    try:
        minio_client = get_storage_client()
        s3_bucket = Storage.get_bucket_name()

        # Generate a unique object name
        file_ext = os.path.splitext(file.filename)[1]
        object_name = f"{user.id}/{uuid.uuid4()}{file_ext}"

        # Get file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        # Upload to MinIO
        minio_client.put_object(
            s3_bucket,
            object_name,
            file.file,
            file_size,
            content_type=file.content_type,
        )

        # Create DB record
        media = Media(
            user_id=user.id,
            filename=file.filename,
            content_type=file.content_type,
            size=file_size,
            s3_key=object_name,
            created_at=datetime.now(timezone.utc),
        )
        session.add(media)
        session.commit()
        session.refresh(media)

        # Trigger blocking processing
        await process_media(media.id, session)

        # Refresh to get updated metadata
        session.refresh(media)

        return media

    except Exception as e:
        print(f"Upload/Processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload/process file: {str(e)}") from e


def get_user_media(user: User, session: Session) -> list[Media]:
    statement = (
        select(Media)
        .where(Media.user_id == user.id)
        .options(selectinload(Media.thumbnails))
        .order_by(Media.created_at.desc())
    )
    return list(session.exec(statement).all())
