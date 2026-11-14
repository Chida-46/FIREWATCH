from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Routers
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

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to FIREWATCH API",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }
