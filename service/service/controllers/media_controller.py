import os
import uuid
from datetime import datetime, timezone
from fastapi import UploadFile, HTTPException
from sqlmodel import Session, select
from minio import Minio
from service.models.media import Media
from service.models.user import User

# Initialize MinIO client
s3_endpoint = os.getenv("S3_ENDPOINT", "localhost:9000")
s3_access_key = os.getenv("S3_ACCESS_KEY", "minioadmin")
s3_secret_key = os.getenv("S3_SECRET_KEY", "minioadmin")
s3_bucket = os.getenv("S3_BUCKET", "medias")
s3_secure = os.getenv("S3_SECURE", "false").lower() == "true"

minio_client = Minio(
    s3_endpoint,
    access_key=s3_access_key,
    secret_key=s3_secret_key,
    secure=s3_secure,
)

def upload_media(file: UploadFile, user: User, session: Session) -> Media:
    try:
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
        
        return media

    except Exception as e:
        print(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

def get_user_media(user: User, session: Session) -> list[Media]:
    statement = select(Media).where(Media.user_id == user.id).order_by(Media.created_at.desc())
    return list(session.exec(statement).all())
