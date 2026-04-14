from statistics import mean

from app.core.database import get_database


class AnalyticsRepository:
    @staticmethod
    async def get_user_evaluations(user_id: str, question_type: str | None = None) -> list[dict]:
        db = get_database()
        session_query: dict[str, str] = {"user_id": user_id}
        if question_type and question_type != "All Types":
            session_query["question_type"] = question_type

        sessions_cursor = db.sessions.find(session_query, {"_id": 1})
        sessions = await sessions_cursor.to_list(length=1000)
        if not sessions:
            return []

        session_ids = [str(item["_id"]) for item in sessions]
        cursor = db.evaluations.find({"session_id": {"$in": session_ids}}).sort("created_at", 1)
        return await cursor.to_list(length=1000)

    @staticmethod
    def compute_averages(evaluations: list[dict]) -> dict[str, float]:
        if not evaluations:
            return {"accuracy": 0.0, "clarity": 0.0, "structure": 0.0, "completeness": 0.0, "overall": 0.0}

        def avg(metric: str) -> float:
            return round(mean(item["payload"]["scores"][metric] for item in evaluations), 2)

        return {
            "accuracy": avg("accuracy"),
            "clarity": avg("clarity"),
            "structure": avg("structure"),
            "completeness": avg("completeness"),
            "overall": avg("overall"),
        }
