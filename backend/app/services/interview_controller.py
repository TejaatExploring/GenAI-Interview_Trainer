from fastapi import HTTPException

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

        generation_source = "ai"
        try:
            payload = await self._generate_validated_payload(prompt, QuestionPayload)
        except HTTPException as exc:
            if self._is_provider_unavailable(exc):
                payload = self._build_fallback_question(session=session, topic=topic)
                generation_source = "fallback"
            else:
                raise

        self.validator.validate_question_quality(payload.question)

        sequence_number = len(previous_questions) + 1
        return await SessionRepository.create_question(
            {
                "session_id": str(session["_id"]),
                "sequence_number": sequence_number,
                "source": generation_source,
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

        generation_source = "ai"
        try:
            payload = await self._generate_validated_payload(prompt, EvaluationPayload)
        except HTTPException as exc:
            if self._is_provider_unavailable(exc):
                payload = self._build_fallback_evaluation(question=question, answer_text=answer_text)
                generation_source = "fallback"
            else:
                raise

        return await SessionRepository.create_evaluation(
            {
                "session_id": str(session["_id"]),
                "question_id": str(question["_id"]),
                "answer_text": answer_text,
                "source": generation_source,
                "payload": payload.model_dump(),
            }
        )

    @staticmethod
    def _is_provider_unavailable(exc: HTTPException) -> bool:
        return exc.status_code in {502, 503}

    @staticmethod
    def _normalize_question_type(raw: object) -> str:
        value = str(raw or "Technical")
        if "." in value:
            value = value.split(".")[-1]
        mapping = {
            "technical": "Technical",
            "behavioral": "Behavioral",
            "hr": "HR",
            "system design": "System Design",
            "system_design": "System Design",
        }
        return mapping.get(value.strip().lower(), "Technical")

    def _build_fallback_question(self, session: dict, topic: str) -> QuestionPayload:
        question_type = self._normalize_question_type(session.get("question_type"))
        role = str(session.get("role", "Software Engineer"))
        experience = str(session.get("experience_level", "Intermediate"))

        prompt_by_type = {
            "Technical": (
                f"You are interviewing for a {experience} {role} role. Explain a real-world scenario about {topic}, "
                "describe your approach step-by-step, and discuss trade-offs, edge cases, and how you would validate the solution."
            ),
            "Behavioral": (
                f"Tell me about a specific {topic}-related situation from your experience as a {role}. "
                "What was the challenge, what actions did you take, and what measurable result did you achieve?"
            ),
            "HR": (
                f"For a {role} interview, how would you communicate your strengths and growth areas around {topic} "
                "to demonstrate both confidence and coachability?"
            ),
            "System Design": (
                f"Design a scalable system related to {topic} for a {role} use case. "
                "Cover architecture components, scaling strategy, data model choices, reliability concerns, and trade-offs."
            ),
        }

        return QuestionPayload(
            question=prompt_by_type.get(question_type, prompt_by_type["Technical"]),
            topic=topic,
            question_type=question_type,
            expected_answer_points=[
                "Clear problem framing with assumptions",
                "Structured approach with justified decisions",
                "Trade-offs, risks, and edge cases",
                "Validation strategy and measurable outcome",
            ],
            evaluation_rubric={
                "accuracy": "Technical correctness and relevance to topic",
                "clarity": "Clear explanation with coherent language",
                "structure": "Logical flow from context to solution",
                "completeness": "Coverage of trade-offs, risks, and validation",
            },
        )

    def _build_fallback_evaluation(self, question: dict, answer_text: str) -> EvaluationPayload:
        words = answer_text.split()
        word_count = len(words)
        lower = answer_text.lower()

        structure_markers = ["first", "second", "finally", "because", "for example", "therefore"]
        marker_hits = sum(1 for token in structure_markers if token in lower)

        clarity = 8 if word_count >= 80 else 7 if word_count >= 50 else 5 if word_count >= 25 else 3
        structure = 8 if marker_hits >= 3 else 7 if marker_hits >= 2 else 5 if marker_hits >= 1 else 3
        completeness = 8 if word_count >= 100 else 7 if word_count >= 70 else 5 if word_count >= 35 else 3
        accuracy = 7 if word_count >= 40 else 5 if word_count >= 20 else 3

        overall = int(round((accuracy + clarity + structure + completeness) / 4))
        topic = question["payload"].get("topic", "the topic")

        strengths = [
            "You provided a relevant attempt focused on the question.",
            "Your response shows intent to explain reasoning instead of only giving a final statement.",
        ]
        improvements = [
            "Add a clearer step-by-step structure so the interviewer can follow your thought process quickly.",
            "Include at least one concrete trade-off and one validation or testing point to make the answer complete.",
        ]

        feedback = (
            "Fallback evaluation was used because the AI provider was temporarily unavailable. "
            "This score is heuristic and based on answer clarity, structure signals, and coverage depth."
        )

        improved_answer = (
            f"For {topic}, start by briefly framing the scenario and constraints. Then present your approach in clear stages, "
            "justify key decisions, and discuss one trade-off with mitigation. Add a concrete example with expected impact, "
            "cover edge cases, and end with how you would validate the result using metrics, tests, or monitoring."
        )

        return EvaluationPayload(
            scores={
                "accuracy": max(0, min(10, accuracy)),
                "clarity": max(0, min(10, clarity)),
                "structure": max(0, min(10, structure)),
                "completeness": max(0, min(10, completeness)),
                "overall": max(0, min(10, overall)),
            },
            strengths=strengths,
            improvements=improvements,
            feedback=feedback,
            improved_answer=improved_answer,
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
