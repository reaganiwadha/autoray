import os
import tempfile

from minio import Minio


class MinioStorageBackend:
    """openagv StorageBackend implementation backed by MinIO/S3."""

    def __init__(self, minio_client: Minio, bucket: str, project_id: str):
        self.minio_client = minio_client
        self.bucket = bucket
        self.project_id = project_id
        self._temp_files: list[str] = []

    def _object_name(self, key: str) -> str:
        return f"{self.project_id}/{key}"

    def store(self, source_path: str, dest_key: str) -> str:
        object_name = self._object_name(dest_key)
        self.minio_client.fput_object(self.bucket, object_name, source_path)
        return dest_key

    def retrieve(self, key: str) -> str:
        return self._object_name(key)

    def load_to_temp(self, key: str) -> str:
        object_name = self._object_name(key)
        _, ext = os.path.splitext(key)
        tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
        tmp.close()
        self.minio_client.fget_object(self.bucket, object_name, tmp.name)
        self._temp_files.append(tmp.name)
        return tmp.name

    def exists(self, key: str) -> bool:
        try:
            self.minio_client.stat_object(self.bucket, self._object_name(key))
            return True
        except Exception:
            return False

    def delete(self, key: str) -> None:
        self.minio_client.remove_object(self.bucket, self._object_name(key))

    def cleanup_temp(self) -> None:
        for path in self._temp_files:
            if os.path.exists(path):
                os.remove(path)
        self._temp_files.clear()

    def get_url(self, key: str) -> str:
        object_name = self._object_name(key)
        return self.minio_client.presigned_get_object(self.bucket, object_name)
