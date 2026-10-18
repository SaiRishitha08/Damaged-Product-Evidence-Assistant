from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_version: str = "0.1.0"
    analyzer_mode: str = "auto"
    gemini_api_key: str = ""
    database_url: str = "sqlite:///./c12.db"
    storage_backend: str = "local"
    local_storage_dir: str = "./storage"
    supabase_url: str = ""
    supabase_secret_key: str = ""
    supabase_bucket: str = "case-evidence"
    reviewer_confirmation_required: bool = True
    uncertainty_flags_enabled: bool = True
    frontend_origin: str = "http://localhost:5173"
    auth_mode: str = "demo-header"


@lru_cache
def get_settings() -> Settings:
    return Settings()
