from fastapi import APIRouter

from app.api.v1.routes.analytics import router as analytics_router
from app.api.v1.routes.interviews import router as interviews_router
from app.api.v1.routes.speech import router as speech_router

api_router = APIRouter()
api_router.include_router(interviews_router, prefix="/interviews", tags=["interviews"])
api_router.include_router(speech_router, prefix="/speech", tags=["speech"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
