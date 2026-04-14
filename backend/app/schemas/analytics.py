from pydantic import BaseModel


class AnalyticsOverviewResponse(BaseModel):
    user_id: str
    sessions_count: int
    average_score: float
    latest_score: float | None


class TrendPoint(BaseModel):
    date: str
    score: float


class AnalyticsTrendsResponse(BaseModel):
    user_id: str
    trends: list[TrendPoint]


class AnalyticsBreakdownResponse(BaseModel):
    user_id: str
    averages: dict[str, float]
