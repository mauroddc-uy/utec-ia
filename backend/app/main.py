from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import router as api_router

app = FastAPI(
    title="UTEC_IA Backend",
    description="API backend minima para la demo DevOps de UTEC_IA.",
    version="0.1.0",
)
Instrumentator().instrument(app).expose(app)

# CORS amplio solo para desarrollo local. Se restringira cuando existan dominios reales.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "utec-ia-backend",
    }


@app.get("/version")
async def version() -> dict[str, str]:
    return {
        "application": "UTEC_IA",
        "version": "0.1.0",
    }


app.include_router(api_router)
