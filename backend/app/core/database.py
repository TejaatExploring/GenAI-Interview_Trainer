from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient | None = None


db = MongoDB()


async def connect_to_mongo() -> None:
    db.client = AsyncIOMotorClient(settings.mongodb_uri)


async def close_mongo_connection() -> None:
    if db.client:
        db.client.close()


def get_database():
    if db.client is None:
        raise RuntimeError("MongoDB is not connected")
    return db.client[settings.mongodb_db_name]
