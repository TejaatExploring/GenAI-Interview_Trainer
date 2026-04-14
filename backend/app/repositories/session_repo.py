from datetime import datetime, timezone

from bson import ObjectId

from app.core.database import get_database


class SessionRepository:
    @staticmethod
    async def create_session(payload: dict) -> dict:
        db = get_database()
        document = {**payload, "created_at": datetime.now(timezone.utc), "status": "active"}
        result = await db.sessions.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    @staticmethod
    async def get_session(session_id: str) -> dict | None:
        db = get_database()
        if not ObjectId.is_valid(session_id):
            return None
        return await db.sessions.find_one({"_id": ObjectId(session_id)})

    @staticmethod
    async def complete_session(session_id: str) -> None:
        db = get_database()
        await db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}},
        )

    @staticmethod
    async def create_question(payload: dict) -> dict:
        db = get_database()
        document = {**payload, "created_at": datetime.now(timezone.utc)}
        result = await db.questions.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    @staticmethod
    async def create_evaluation(payload: dict) -> dict:
        db = get_database()
        document = {**payload, "created_at": datetime.now(timezone.utc)}
        result = await db.evaluations.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    @staticmethod
    async def get_session_questions(session_id: str) -> list[dict]:
        db = get_database()
        cursor = db.questions.find({"session_id": session_id}).sort("sequence_number", 1)
        return await cursor.to_list(length=200)

    @staticmethod
    async def get_session_evaluations(session_id: str) -> list[dict]:
        db = get_database()
        cursor = db.evaluations.find({"session_id": session_id}).sort("created_at", 1)
        return await cursor.to_list(length=200)
