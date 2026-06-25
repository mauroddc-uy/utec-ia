import logging
from functools import lru_cache

import boto3
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    NoCredentialsError,
    PartialCredentialsError,
    ProfileNotFound,
)

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class BedrockConfigurationError(RuntimeError):
    pass


class BedrockInvocationError(RuntimeError):
    pass


@lru_cache
def _bedrock_runtime_client(aws_region: str, aws_profile: str | None):
    try:
        session_kwargs = {}
        if aws_profile:
            session_kwargs["profile_name"] = aws_profile

        session = boto3.Session(**session_kwargs)
        return session.client("bedrock-runtime", region_name=aws_region)
    except ProfileNotFound as exc:
        raise BedrockConfigurationError(
            f"No se encontro el perfil AWS '{aws_profile}'."
        ) from exc
    except (NoCredentialsError, PartialCredentialsError) as exc:
        raise BedrockConfigurationError(
            "No hay credenciales AWS configuradas para Bedrock."
        ) from exc
    except BotoCoreError as exc:
        raise BedrockConfigurationError(
            "No se pudo crear el cliente de AWS Bedrock Runtime."
        ) from exc


def _extract_text(response: dict) -> str:
    message = response.get("output", {}).get("message", {})
    content_blocks = message.get("content", [])
    text_parts = [
        block.get("text", "")
        for block in content_blocks
        if isinstance(block, dict) and block.get("text")
    ]
    return "\n".join(text_parts).strip()


def generate_bedrock_response(message: str, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    prompt = message.strip()

    if not prompt:
        raise ValueError("El mensaje no puede estar vacio.")

    client = _bedrock_runtime_client(settings.aws_region, settings.aws_profile)

    try:
        response = client.converse(
            modelId=settings.bedrock_model_id,
            system=[{"text": settings.bedrock_system_prompt}],
            messages=[
                {
                    "role": "user",
                    "content": [{"text": prompt}],
                }
            ],
            inferenceConfig={
                "maxTokens": settings.bedrock_max_tokens,
                "temperature": settings.bedrock_temperature,
            },
        )
    except (NoCredentialsError, PartialCredentialsError) as exc:
        raise BedrockConfigurationError(
            "No hay credenciales AWS configuradas para Bedrock."
        ) from exc
    except ClientError as exc:
        logger.exception("AWS Bedrock ClientError")
        error = exc.response.get("Error", {})
        message_text = error.get("Message") or error.get("Code") or "Error de AWS Bedrock."
        raise BedrockInvocationError(message_text) from exc
    except BotoCoreError as exc:
        logger.exception("AWS Bedrock BotoCoreError")
        raise BedrockInvocationError(
            "No se pudo invocar el modelo en AWS Bedrock."
        ) from exc

    answer = _extract_text(response)
    if not answer:
        raise BedrockInvocationError("AWS Bedrock no devolvio texto en la respuesta.")

    return answer
