import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.api.routes_firms import router as firms_router
from app.api.routes_hotspots import router as hotspots_router
from app.api.routes_calendar import router as calendar_router
from app.api.routes_analytics import router as analytics_router
from app.api.routes_harmonization import router as harmonization_router
from app.api.routes_aoi import router as aoi_router
from app.api.routes_exports import router as exports_router
from app.api.routes_settings import router as settings_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Satellite Fire Intelligence & Burning Activity Calendar. Harmonizes 20+ years of MODIS and VIIRS active fire observations.",
    version=settings.VERSION
)

# CORS Middleware - Allows production Vercel frontend, local dev, and custom domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All API Routers
app.include_router(firms_router, prefix=settings.API_PREFIX)
app.include_router(hotspots_router, prefix=settings.API_PREFIX)
app.include_router(calendar_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(harmonization_router, prefix=settings.API_PREFIX)
app.include_router(aoi_router, prefix=settings.API_PREFIX)
app.include_router(exports_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "tagline": settings.TAGLINE
    }

# Production Static File Mounting for Full-Stack unified hosting (Docker / Render)
DIST_CANDIDATES = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path(__file__).resolve().parent.parent / "frontend" / "dist",
    Path("/app/frontend/dist"),
]

dist_dir = None
for candidate in DIST_CANDIDATES:
    if candidate.exists() and (candidate / "index.html").exists():
        dist_dir = candidate
        break

if dist_dir:
    # Mount static assets
    assets_dir = dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    data_dir = dist_dir / "data"
    if data_dir.exists():
        app.mount("/data", StaticFiles(directory=str(data_dir)), name="data")
    textures_dir = dist_dir / "textures"
    if textures_dir.exists():
        app.mount("/textures", StaticFiles(directory=str(textures_dir)), name="textures")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        file_path = dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/", tags=["Root"])
    def root():
        return {
            "message": "Welcome to FIREWATCH API",
            "docs_url": "/docs",
            "health_url": "/api/health"
        }
