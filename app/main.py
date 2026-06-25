from fastapi import FastAPI, HTTPException, Request, status
from pydantic import BaseModel, Field
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.services.bedrock import (
    BedrockConfigurationError,
    BedrockInvocationError,
    generate_bedrock_response,
)

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")

templates = Jinja2Templates(directory="app/templates")

FEDERATED_LOGIN_URL = "https://mi-testing.iduruguay.gub.uy/"


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=12000)
    user_email: str | None = None


class ChatResponse(BaseModel):
    answer: str
    provider: str
    model_id: str


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )


@app.get("/login")
async def login():
    return RedirectResponse(FEDERATED_LOGIN_URL)


@app.get("/api/bedrock/config")
async def bedrock_config():
    settings = get_settings()
    return {
        "provider": "aws-bedrock",
        "region": settings.aws_region,
        "profile": settings.aws_profile,
        "model_id": settings.bedrock_model_id,
        "max_tokens": settings.bedrock_max_tokens,
        "temperature": settings.bedrock_temperature,
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    settings = get_settings()

    try:
        answer = await run_in_threadpool(generate_bedrock_response, payload.message, settings)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except BedrockConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except BedrockInvocationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return ChatResponse(
        answer=answer,
        provider="aws-bedrock",
        model_id=settings.bedrock_model_id,
    )


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
