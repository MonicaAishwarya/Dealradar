"""
DealRadar Intelligence OS — FastAPI Backend
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import init_db
from app.api.routes import (
    health, dashboard, conversations, deals,
    commitments, evidence, imports, audit, exports, search
)

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Sales conversation intelligence platform",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    prefix = "/api"
    app.include_router(health.router, prefix=prefix, tags=["health"])
    app.include_router(dashboard.router, prefix=prefix, tags=["dashboard"])
    app.include_router(conversations.router, prefix=prefix, tags=["conversations"])
    app.include_router(deals.router, prefix=prefix, tags=["deals"])
    app.include_router(commitments.router, prefix=prefix, tags=["commitments"])
    app.include_router(evidence.router, prefix=prefix, tags=["evidence"])
    app.include_router(imports.router, prefix=prefix, tags=["imports"])
    app.include_router(audit.router, prefix=prefix, tags=["audit"])
    app.include_router(exports.router, prefix=prefix, tags=["exports"])
    app.include_router(search.router, prefix=prefix, tags=["search"])

    @app.on_event("startup")
    async def startup():
        logger.info("Initialising database...")
        init_db()
        logger.info("Database ready.")

    return app


app = create_app()
