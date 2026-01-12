import os
from minio import Minio

class Storage:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            s3_endpoint = os.getenv("S3_ENDPOINT", "localhost:9000")
            s3_access_key = os.getenv("S3_ACCESS_KEY", "minioadmin")
            s3_secret_key = os.getenv("S3_SECRET_KEY", "minioadmin")
            s3_secure = os.getenv("S3_SECURE", "false").lower() == "true"
            
            cls._instance = Minio(
                s3_endpoint,
                access_key=s3_access_key,
                secret_key=s3_secret_key,
                secure=s3_secure,
            )
        return cls._instance

    @staticmethod
    def get_bucket_name():
        return os.getenv("S3_BUCKET", "medias")

    @staticmethod
    def get_thumbnail_bucket_name():
         # Using a separate folder or bucket? User said "thumbnail bucket".
         # I'll assume same bucket with prefix or different bucket.
         # "it should be also with the thumbnail bucket to fetch the thumbnail"
         # Let's use a separate bucket to keep it clean, but existing config only has one.
         # For simplicity in this env, I'll use the same bucket but different prefix or just a new bucket env var.
         # Let's default to a new bucket name derived from the main one or explicitly set.
         return os.getenv("S3_THUMBNAIL_BUCKET", "thumbnails")

def get_storage_client():
    return Storage.get_instance()
