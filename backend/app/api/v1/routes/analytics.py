from fastapi import APIRouter, Query

from app.repositories.analytics_repo import AnalyticsRepository

router = APIRouter()


@router.get("/users/{user_id}/overview")
async def overview(user_id: str, question_type: str = Query(default="All Types")):
    evaluations = await AnalyticsRepository.get_user_evaluations(user_id, question_type)
    averages = AnalyticsRepository.compute_averages(evaluations)
    latest_score = evaluations[-1]["payload"]["scores"]["overall"] if evaluations else None
    session_ids = {item["session_id"] for item in evaluations}

    return {
        "user_id": user_id,
        "question_type": question_type,
        "sessions_count": len(session_ids),
        "average_score": averages["overall"],
        "latest_score": latest_score,
    }


@router.get("/users/{user_id}/trends")
async def trends(user_id: str, question_type: str = Query(default="All Types")):
    evaluations = await AnalyticsRepository.get_user_evaluations(user_id, question_type)
    trend_points = [
        {"date": item["created_at"].strftime("%Y-%m-%d"), "score": item["payload"]["scores"]["overall"]}
        for item in evaluations
    ]
    return {"user_id": user_id, "question_type": question_type, "trends": trend_points}


@router.get("/users/{user_id}/breakdown")
async def breakdown(user_id: str, question_type: str = Query(default="All Types")):
    evaluations = await AnalyticsRepository.get_user_evaluations(user_id, question_type)
    averages = AnalyticsRepository.compute_averages(evaluations)
    return {"user_id": user_id, "question_type": question_type, "averages": averages}
