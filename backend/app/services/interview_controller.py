from app.core.config import settings
from app.repositories.session_repo import SessionRepository
from app.schemas.evaluation import EvaluationPayload
from app.schemas.interview import QuestionPayload, SessionCreateRequest
from app.services.llm_client import LLMClient
from app.services.prompt_builder import PromptBuilder
from app.services.topic_selector import TopicSelector
from app.services.validator import OutputValidator


class InterviewController:
    def __init__(self):
        self.llm = LLMClient()
        self.validator = OutputValidator()
        self.topic_selector = TopicSelector("app/topics/catalog")

    async def create_session(self, payload: SessionCreateRequest) -> dict:
        return await SessionRepository.create_session(payload.model_dump())

    async def next_question(self, session: dict, constraints: list[str]) -> dict:
        previous_questions = await SessionRepository.get_session_questions(str(session["_id"]))
        previous_topics = [item["payload"]["topic"] for item in previous_questions]
        topic = self.topic_selector.select_topic(session["role"], session["experience_level"], previous_topics)

        prompt = PromptBuilder.build_question_prompt(
            role=session["role"],
            experience_level=session["experience_level"],
            question_type=session["question_type"],
            topic=topic,
            constraints=constraints,
        )

        payload = await self._generate_validated_payload(prompt, QuestionPayload)
        self.validator.validate_question_quality(payload.question)

        sequence_number = len(previous_questions) + 1
        return await SessionRepository.create_question(
            {
                "session_id": str(session["_id"]),
                "sequence_number": sequence_number,
                "payload": payload.model_dump(),
            }
        )

    async def evaluate_answer(self, session: dict, question: dict, answer_text: str) -> dict:
        prompt = PromptBuilder.build_evaluation_prompt(
            role=session["role"],
            experience_level=session["experience_level"],
            question_type=session["question_type"],
            topic=question["payload"]["topic"],
            question=question["payload"]["question"],
            candidate_answer=answer_text,
        )

        payload = await self._generate_validated_payload(prompt, EvaluationPayload)
        return await SessionRepository.create_evaluation(
            {
                "session_id": str(session["_id"]),
                "question_id": str(question["_id"]),
                "answer_text": answer_text,
                "payload": payload.model_dump(),
            }
        )

    async def _generate_validated_payload(self, prompt: str, schema):
        last_error = None
        for _ in range(settings.max_validation_retries + 1):
            content, _model_used = await self.llm.generate_with_fallback(prompt)
            try:
                parsed = self.validator.parse_json(content)
                return self.validator.validate_model(parsed, schema)
            except Exception as exc:
                last_error = exc
                continue
        raise ValueError(f"Failed to generate valid response: {last_error}")
