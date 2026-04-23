from statistics import mean

from bson import ObjectId

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

    @staticmethod
    async def get_user_history(user_id: str, question_type: str | None = None, limit: int = 25) -> list[dict]:
        db = get_database()
        session_query: dict[str, str] = {"user_id": user_id}
        if question_type and question_type != "All Types":
            session_query["question_type"] = question_type

        sessions_cursor = db.sessions.find(session_query, {"_id": 1})
        sessions = await sessions_cursor.to_list(length=1000)
        if not sessions:
            return []

        session_ids = [str(item["_id"]) for item in sessions]
        evaluations_cursor = db.evaluations.find({"session_id": {"$in": session_ids}}).sort("created_at", -1).limit(limit)
        evaluations = await evaluations_cursor.to_list(length=limit)
        if not evaluations:
            return []

        question_object_ids: list[ObjectId] = []
        question_id_order: list[str] = []
        for item in evaluations:
            qid = item.get("question_id")
            if isinstance(qid, str) and ObjectId.is_valid(qid):
                question_object_ids.append(ObjectId(qid))
                question_id_order.append(qid)

        questions_map: dict[str, dict] = {}
        if question_object_ids:
            question_docs = await db.questions.find({"_id": {"$in": question_object_ids}}).to_list(length=len(question_object_ids))
            questions_map = {str(doc["_id"]): doc for doc in question_docs}

        history: list[dict] = []
        for item in evaluations:
            question_id = item.get("question_id", "")
            question_doc = questions_map.get(question_id, {})
            payload = item.get("payload", {})
            score_payload = payload.get("scores", {})
            question_payload = question_doc.get("payload", {}) if question_doc else {}

            history.append(
                {
                    "evaluation_id": str(item["_id"]),
                    "session_id": item.get("session_id", ""),
                    "question_id": question_id,
                    "created_at": item["created_at"],
                    "date": item["created_at"].strftime("%Y-%m-%d"),
                    "score": score_payload.get("overall", 0),
                    "source": item.get("source", "ai"),
                    "question": question_payload.get("question", "Question text unavailable"),
                    "topic": question_payload.get("topic", "Unknown Topic"),
                    "question_type": question_payload.get("question_type", "Technical"),
                    "answer_text": item.get("answer_text", ""),
                    "feedback": payload.get("feedback", ""),
                    "improved_answer": payload.get("improved_answer", ""),
                    "scores": {
                        "accuracy": score_payload.get("accuracy", 0),
                        "clarity": score_payload.get("clarity", 0),
                        "structure": score_payload.get("structure", 0),
                        "completeness": score_payload.get("completeness", 0),
                        "overall": score_payload.get("overall", 0),
                    },
                    "strengths": payload.get("strengths", []),
                    "improvements": payload.get("improvements", []),
                }
            )

        return history
