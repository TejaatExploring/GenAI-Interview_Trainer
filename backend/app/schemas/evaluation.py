from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ScoreBlock(BaseModel):
    accuracy: int = Field(ge=0, le=10)
    clarity: int = Field(ge=0, le=10)
    structure: int = Field(ge=0, le=10)
    completeness: int = Field(ge=0, le=10)
    overall: int = Field(ge=0, le=10)


class EvaluationPayload(BaseModel):
    scores: ScoreBlock
    strengths: list[str] = Field(min_length=1)
    improvements: list[str] = Field(min_length=1)
    feedback: str = Field(min_length=20)
    improved_answer: str = Field(min_length=20)

    @model_validator(mode="after")
    def validate_length(self):
        if len(self.improved_answer.split()) < 20:
            raise ValueError("improved_answer is too short")
        return self


class EvaluationResponse(BaseModel):
    evaluation_id: str
    session_id: str
    question_id: str
    payload: EvaluationPayload
    source: Literal["ai", "fallback"] = "ai"
    created_at: datetime
