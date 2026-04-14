from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ExperienceLevel(str, Enum):
    beginner = "Beginner"
    intermediate = "Intermediate"
    advanced = "Advanced"


class QuestionType(str, Enum):
    technical = "Technical"
    behavioral = "Behavioral"
    hr = "HR"
    system_design = "System Design"


class InterviewMode(str, Enum):
    practice = "Practice"
    mock = "Mock"


class SessionCreateRequest(BaseModel):
    user_id: str = Field(min_length=1)
    role: str = Field(min_length=2)
    experience_level: ExperienceLevel
    question_type: QuestionType
    mode: InterviewMode
    total_questions: int = Field(default=1, ge=1, le=20)


class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    role: str
    experience_level: ExperienceLevel
    question_type: QuestionType
    mode: InterviewMode
    total_questions: int
    created_at: datetime


class NextQuestionRequest(BaseModel):
    constraints: list[str] = []


class QuestionPayload(BaseModel):
    question: str = Field(min_length=10)
    topic: str = Field(min_length=2)
    question_type: QuestionType
    expected_answer_points: list[str] = Field(min_length=2)
    evaluation_rubric: dict[str, str]


class QuestionResponse(BaseModel):
    question_id: str
    session_id: str
    sequence_number: int
    payload: QuestionPayload
    created_at: datetime


class AnswerSubmitRequest(BaseModel):
    question_id: str
    answer_text: str = Field(min_length=5)


class SessionCompleteResponse(BaseModel):
    session_id: str
    overall_score: float
    averages: dict[str, float]
    total_questions_answered: int
    completed_at: datetime
