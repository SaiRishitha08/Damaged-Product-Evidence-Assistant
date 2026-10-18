from abc import ABC, abstractmethod
from pathlib import Path

from backend.config import get_settings


class StorageBackend(ABC):
    @abstractmethod
    def put(self, path: str, data: bytes, mime_type: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def get(self, path: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete(self, path: str) -> None:
        raise NotImplementedError


class LocalStorage(StorageBackend):
    def __init__(self, root: str | Path):
        self.root = Path(root)

    def _resolve(self, path: str) -> Path:
        candidate = (self.root / path).resolve()
        root = self.root.resolve()
        if root not in candidate.parents and candidate != root:
            raise ValueError("Storage path escapes the configured root")
        return candidate

    def put(self, path: str, data: bytes, mime_type: str) -> None:
        destination = self._resolve(path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)

    def get(self, path: str) -> bytes:
        return self._resolve(path).read_bytes()

    def delete(self, path: str) -> None:
        self._resolve(path).unlink(missing_ok=True)


class SupabaseStorage(StorageBackend):
    def __init__(self, client, bucket: str):
        self.client = client
        self.bucket = bucket

    def put(self, path: str, data: bytes, mime_type: str) -> None:
        self.client.storage.from_(self.bucket).upload(
            path,
            data,
            {"content-type": mime_type, "upsert": "false"},
        )

    def get(self, path: str) -> bytes:
        return self.client.storage.from_(self.bucket).download(path)

    def delete(self, path: str) -> None:
        self.client.storage.from_(self.bucket).remove([path])


def get_storage() -> StorageBackend:
    settings = get_settings()
    if settings.storage_backend == "supabase":
        if not settings.supabase_url or not settings.supabase_secret_key:
            raise RuntimeError("Supabase storage requires SUPABASE_URL and SUPABASE_SECRET_KEY")
        from supabase import create_client

        return SupabaseStorage(
            create_client(settings.supabase_url, settings.supabase_secret_key),
            settings.supabase_bucket,
        )
    return LocalStorage(getattr(settings, "local_storage_dir", "./storage"))
