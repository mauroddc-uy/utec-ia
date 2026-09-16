from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field, field_validator

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="UTEC IA - Preview",
    description="Preview simplificada de UTEC_IA para demostrar una aplicacion web FastAPI con interfaz HTML, archivos estaticos y endpoints basicos.",
    version="1.0.0",
)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "templates")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    user_email: str | None = Field(default=None, max_length=254)

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        message = value.strip()
        if not message:
            raise ValueError("El mensaje no puede estar vacio.")
        return message

    @field_validator("user_email")
    @classmethod
    def normalize_user_email(cls, value: str | None) -> str | None:
        if value is None:
            return None

        email = value.strip()
        return email or None


class ChatResponse(BaseModel):
    answer: str


@app.get("/", response_class=HTMLResponse)
async def home(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "utec-ia-preview",
    }


@app.post("/api/chat", response_model=ChatResponse)
async def demo_chat(payload: ChatRequest) -> ChatResponse:
    return ChatResponse(
        answer="Consulta recibida correctamente por la preview de UTEC_IA. Esta respuesta demuestra el flujo Navegador -> JavaScript -> FastAPI -> JSON -> Navegador."
    )
