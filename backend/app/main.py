from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import router as api_router
from app.config import get_settings


settings = get_settings()

app = FastAPI(
    title="UTEC_IA Backend",
    description="API backend minima para la demo DevOps de UTEC_IA.",
    version=settings.version,
)
Instrumentator().instrument(app).expose(app)

# CORS amplio solo para desarrollo local. Se restringira cuando existan dominios reales.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.service,
        "mode": settings.mode,
        "version": settings.version,
        "commit": settings.commit,
        "environment": settings.environment,
    }


@app.get("/version")
async def version() -> dict[str, str]:
    return {
        "application": settings.application,
        "version": settings.version,
        "commit": settings.commit,
        "environment": settings.environment,
        "mode": settings.mode,
    }


app.include_router(api_router)
