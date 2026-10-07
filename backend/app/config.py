import os
from dataclasses import dataclass
from functools import lru_cache


def _env(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


def _csv_env(name: str, default: str) -> list[str]:
    raw_value = _env(name, default)
    values = [item.strip() for item in raw_value.split(",")]
    return [item for item in values if item]


@dataclass(frozen=True)
class Settings:
    application: str
    service: str
    version: str
    commit: str
    environment: str
    mode: str
    cors_allow_origins: list[str]


@lru_cache
def get_settings() -> Settings:
    return Settings(
        application="UTEC_IA",
        service="utec-ia-backend",
        version=_env("UTEC_IA_VERSION", "0.1.0"),
        commit=_env("UTEC_IA_COMMIT_SHA", "local"),
        environment=_env("UTEC_IA_ENVIRONMENT", "local"),
        mode=_env("UTEC_IA_MODE", "demo"),
        cors_allow_origins=_csv_env("CORS_ALLOW_ORIGINS", "*"),
    )
