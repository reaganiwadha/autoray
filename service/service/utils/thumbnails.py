import os
import tempfile

import ffmpeg
from minio import Minio
from PIL import Image


def generate_thumbnails(
    local_path: str,
    content_type: str,
    minio_client: Minio,
    bucket: str,
    asset_id: str,
) -> dict[str, str]:
    """Generate thumbnails and upload to MinIO.

    Returns dict of type -> s3_key for storing in asset.metadata["thumbnails"].
    """
    if content_type.startswith("image/"):
        return _generate_image_thumbnails(local_path, minio_client, bucket, asset_id)
    elif content_type.startswith("video/"):
        return _generate_video_thumbnails(local_path, minio_client, bucket, asset_id)
    return {}


def _upload_thumb(
    local_path: str,
    minio_client: Minio,
    bucket: str,
    s3_key: str,
    content_type: str = "image/jpeg",
):
    minio_client.fput_object(bucket, s3_key, local_path, content_type=content_type)


def _generate_image_thumbnails(
    local_path: str,
    minio_client: Minio,
    bucket: str,
    asset_id: str,
) -> dict[str, str]:
    result = {}

    with Image.open(local_path) as img:
        for name, size in [("small", (300, 300)), ("large", (1080, 1080))]:
            thumb = img.copy()
            thumb.thumbnail(size)
            if thumb.mode in ("RGBA", "LA", "P"):
                thumb = thumb.convert("RGB")

            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                thumb.save(tmp.name, "JPEG", quality=85)
                s3_key = f"thumbnails/{asset_id}_{name}.jpg"
                _upload_thumb(tmp.name, minio_client, bucket, s3_key)
                result[name] = s3_key
                os.remove(tmp.name)

    return result


def _generate_video_thumbnails(
    local_path: str,
    minio_client: Minio,
    bucket: str,
    asset_id: str,
) -> dict[str, str]:
    result = {}

    # Small thumbnail (frame at 0s)
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        try:
            (
                ffmpeg.input(local_path, ss=0)
                .filter("scale", 300, -1)
                .output(tmp.name, vframes=1)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            s3_key = f"thumbnails/{asset_id}_small.jpg"
            _upload_thumb(tmp.name, minio_client, bucket, s3_key)
            result["small"] = s3_key
        except ffmpeg.Error as e:
            print(f"FFmpeg thumb error: {e.stderr}")
        finally:
            if os.path.exists(tmp.name):
                os.remove(tmp.name)

    # GIF preview (3s clip)
    with tempfile.NamedTemporaryFile(suffix=".gif", delete=False) as tmp:
        try:
            (
                ffmpeg.input(local_path, ss=0, t=3)
                .filter("fps", fps=10)
                .filter("scale", 300, -1)
                .output(tmp.name)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            s3_key = f"thumbnails/{asset_id}_gif.gif"
            _upload_thumb(tmp.name, minio_client, bucket, s3_key, content_type="image/gif")
            result["gif"] = s3_key
        except ffmpeg.Error as e:
            print(f"FFmpeg gif error: {e.stderr}")
        finally:
            if os.path.exists(tmp.name):
                os.remove(tmp.name)

    return result
