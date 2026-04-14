from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.repositories.session_repo import SessionRepository
from app.schemas.evaluation import EvaluationResponse
from app.schemas.interview import (
    AnswerSubmitRequest,
    NextQuestionRequest,
    QuestionResponse,
    SessionCompleteResponse,
    SessionCreateRequest,
    SessionResponse,
)
from app.services.interview_controller import InterviewController

router = APIRouter()
controller = InterviewController()


@router.post("/sessions", response_model=SessionResponse)
async def create_session(payload: SessionCreateRequest):
    session = await controller.create_session(payload)
    return SessionResponse(
        session_id=str(session["_id"]),
        user_id=session["user_id"],
        role=session["role"],
        experience_level=session["experience_level"],
        question_type=session["question_type"],
        mode=session["mode"],
        total_questions=session["total_questions"],
        created_at=session["created_at"],
    )


@router.post("/sessions/{session_id}/next-question", response_model=QuestionResponse)
async def next_question(session_id: str, payload: NextQuestionRequest):
    session = await SessionRepository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    question = await controller.next_question(session, payload.constraints)
    return QuestionResponse(
        question_id=str(question["_id"]),
        session_id=question["session_id"],
        sequence_number=question["sequence_number"],
        payload=question["payload"],
        created_at=question["created_at"],
    )


@router.post("/sessions/{session_id}/answers", response_model=EvaluationResponse)
async def submit_answer(session_id: str, payload: AnswerSubmitRequest):
    session = await SessionRepository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = await SessionRepository.get_session_questions(session_id)
    question = next((item for item in questions if str(item["_id"]) == payload.question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    evaluation = await controller.evaluate_answer(session, question, payload.answer_text)
    return EvaluationResponse(
        evaluation_id=str(evaluation["_id"]),
        session_id=evaluation["session_id"],
        question_id=evaluation["question_id"],
        payload=evaluation["payload"],
        created_at=evaluation["created_at"],
    )


@router.post("/sessions/{session_id}/complete", response_model=SessionCompleteResponse)
async def complete_session(session_id: str):
    session = await SessionRepository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    evaluations = await SessionRepository.get_session_evaluations(session_id)
    if not evaluations:
        raise HTTPException(status_code=400, detail="No evaluations found for session")

    averages = {
        "accuracy": round(sum(e["payload"]["scores"]["accuracy"] for e in evaluations) / len(evaluations), 2),
        "clarity": round(sum(e["payload"]["scores"]["clarity"] for e in evaluations) / len(evaluations), 2),
        "structure": round(sum(e["payload"]["scores"]["structure"] for e in evaluations) / len(evaluations), 2),
        "completeness": round(sum(e["payload"]["scores"]["completeness"] for e in evaluations) / len(evaluations), 2),
        "overall": round(sum(e["payload"]["scores"]["overall"] for e in evaluations) / len(evaluations), 2),
    }

    await SessionRepository.complete_session(session_id)
    return SessionCompleteResponse(
        session_id=session_id,
        overall_score=averages["overall"],
        averages=averages,
        total_questions_answered=len(evaluations),
        completed_at=datetime.now(timezone.utc),
    )
