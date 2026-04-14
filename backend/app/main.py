from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.database import close_mongo_connection, connect_to_mongo


app = FastAPI(title="GenAI Interview Trainer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await close_mongo_connection()


app.include_router(api_router, prefix="/api/v1")
