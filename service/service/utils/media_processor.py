import os
import tempfile

import ffmpeg
from PIL import ExifTags, Image
from sqlmodel import Session

from service.core.storage import Storage, get_storage_client
from service.models.media import Media
from service.models.thumbnail import Thumbnail

ALLOWED_EXTENSIONS = {".webp", ".jpeg", ".jpg", ".png", ".mov", ".mp4", ".mkv"}
IMAGE_EXTENSIONS = {".webp", ".jpeg", ".jpg", ".png"}
VIDEO_EXTENSIONS = {".mov", ".mp4", ".mkv"}


def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()


async def process_media(media_id: int, session: Session):
    try:
        media = session.get(Media, media_id)
        if not media:
            return

        s3 = get_storage_client()
        bucket = Storage.get_bucket_name()
        thumb_bucket = Storage.get_thumbnail_bucket_name()

        # Download file to temp
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            s3.fget_object(bucket, media.s3_key, tmp_file.name)
            tmp_path = tmp_file.name

        ext = get_file_extension(media.filename)
        metadata = {}

        # Validation
        if ext not in ALLOWED_EXTENSIONS:
            # Mark as invalid or just stop?
            # For now just raise or return, controller will handle success/fail based on this?
            # User wants blocking. If it fails here, the request should probably fail or return partial data.
            # Let's clean up and throw/return
            os.remove(tmp_path)
            raise ValueError(f"Invalid file type: {ext}")

        try:
            if ext in IMAGE_EXTENSIONS:
                metadata = process_image(tmp_path, media, session, s3, thumb_bucket)
            elif ext in VIDEO_EXTENSIONS:
                metadata = process_video(tmp_path, media, session, s3, thumb_bucket)

            media.binary_metadata = metadata
            session.add(media)
            session.commit()

        except Exception as e:
            print(f"Processing error: {e}")
            raise e  # Re-raise to be caught by controller
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as e:
        print(f"Critical processing error: {e}")
        raise e


def process_image(path: str, media: Media, session: Session, s3, thumb_bucket: str) -> dict:
    metadata = {}
    with Image.open(path) as img:
        metadata["width"] = img.width
        metadata["height"] = img.height
        metadata["format"] = img.format

        # Extract EXIF
        exif_data = {}
        if hasattr(img, "_getexif") and img._getexif():
            for tag, value in img._getexif().items():
                if tag in ExifTags.TAGS:
                    # Convert non-serializable values
                    try:
                        if isinstance(value, bytes):
                            value = str(value)
                        exif_data[ExifTags.TAGS[tag]] = str(value)
                    except Exception:
                        pass
        metadata["exif"] = exif_data

        # Generate Thumbnails
        # Small
        upload_thumbnail(img.copy(), (300, 300), "small", media, session, s3, thumb_bucket)
        # Large
        upload_thumbnail(img.copy(), (1080, 1080), "large", media, session, s3, thumb_bucket)

    return metadata


def process_video(path: str, media: Media, session: Session, s3, thumb_bucket: str) -> dict:
    metadata = {}
    try:
        probe = ffmpeg.probe(path)
        video_stream = next((stream for stream in probe["streams"] if stream["codec_type"] == "video"), None)
        if video_stream:
            metadata["width"] = int(video_stream["width"])
            metadata["height"] = int(video_stream["height"])
            metadata["duration"] = float(video_stream["duration"])
            metadata["codec"] = video_stream["codec_name"]
    except ffmpeg.Error as e:
        print(f"FFmpeg probe error: {e.stderr}")

    # Generate Thumbnail (frame at 0s or 1s)
    # Extract frame
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_thumb:
        try:
            (
                ffmpeg.input(path, ss=0)
                .filter("scale", 300, -1)
                .output(tmp_thumb.name, vframes=1)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            # Upload extracted frame
            with open(tmp_thumb.name, "rb") as f:
                upload_file_to_s3(f, tmp_thumb.name, "small", media, session, s3, thumb_bucket, "image/jpeg", 300, 0)
        except ffmpeg.Error as e:
            print(f"FFmpeg thumb error: {e.stderr}")
        finally:
            if os.path.exists(tmp_thumb.name):
                os.remove(tmp_thumb.name)

    # Generate GIF (short clip)
    with tempfile.NamedTemporaryFile(suffix=".gif", delete=False) as tmp_gif:
        try:
            (
                ffmpeg.input(path, ss=0, t=3)
                .filter("fps", fps=10)
                .filter("scale", 300, -1)
                .output(tmp_gif.name)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            with open(tmp_gif.name, "rb") as f:
                upload_file_to_s3(f, tmp_gif.name, "gif", media, session, s3, thumb_bucket, "image/gif", 300, 0)
        except ffmpeg.Error as e:
            print(f"FFmpeg gif error: {e.stderr}")
        finally:
            if os.path.exists(tmp_gif.name):
                os.remove(tmp_gif.name)

    return metadata


def upload_thumbnail(img: Image.Image, size: tuple, type_name: str, media: Media, session: Session, s3, bucket: str):
    img.thumbnail(size)

    # Convert RGBA/P/LA to RGB for JPEG
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")

    # Save to bytes
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        img.save(tmp.name, "JPEG", quality=85)
        tmp.seek(0)

        with open(tmp.name, "rb") as f:
            upload_file_to_s3(f, tmp.name, type_name, media, session, s3, bucket, "image/jpeg", img.width, img.height)

    if os.path.exists(tmp.name):
        os.remove(tmp.name)


def upload_file_to_s3(file_obj, filepath, type_name, media, session, s3, bucket, content_type, width, height):
    file_obj.seek(0, 2)
    size = file_obj.tell()
    file_obj.seek(0)

    filename = f"thumb_{type_name}_{os.path.basename(media.s3_key).split('/')[-1]}"
    if not filename.endswith(os.path.splitext(filepath)[1]):
        filename += os.path.splitext(filepath)[1]

    s3_key = f"{media.user_id}/{filename}"

    s3.put_object(bucket, s3_key, file_obj, size, content_type=content_type)

    thumb = Thumbnail(
        media_id=media.id,
        filename=filename,
        content_type=content_type,
        size=size,
        s3_key=s3_key,
        width=width,
        height=height,
        type=type_name,
    )
    session.add(thumb)
    session.commit()
