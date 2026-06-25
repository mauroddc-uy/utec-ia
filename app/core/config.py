import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _int_from_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _float_from_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return float(value)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    aws_region: str
    aws_profile: str | None
    bedrock_model_id: str
    bedrock_max_tokens: int
    bedrock_temperature: float
    bedrock_system_prompt: str


@lru_cache
def get_settings() -> Settings:
    return Settings(
        aws_region=os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1",
        aws_profile=os.getenv("AWS_PROFILE") or None,
        bedrock_model_id=os.getenv("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0"),
        bedrock_max_tokens=_int_from_env("BEDROCK_MAX_TOKENS", 512),
        bedrock_temperature=_float_from_env("BEDROCK_TEMPERATURE", 0.4),
        bedrock_system_prompt=os.getenv(
            "BEDROCK_SYSTEM_PROMPT",
            "Responde en espanol, con tono claro y util, como asistente de UTECia.",
        ),
    )
