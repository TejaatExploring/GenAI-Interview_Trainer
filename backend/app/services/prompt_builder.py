class PromptBuilder:
    @staticmethod
    def _question_type_value(question_type) -> str:
        return question_type.value if hasattr(question_type, "value") else str(question_type)

    @staticmethod
    def build_question_prompt(
        role: str,
        experience_level: str,
        question_type,
        topic: str,
        constraints: list[str],
    ) -> str:
        joined_constraints = (
            "\\n".join([f"- {item}" for item in constraints])
            if constraints
            else "- Keep it realistic and practical"
        )

        return f"""
You are an expert interview question generator.
Return output as STRICT JSON only. No markdown. No prose.

Context:
- role: {role}
- experience_level: {experience_level}
- question_type: {PromptBuilder._question_type_value(question_type)}
- topic: {topic}

Constraints:
{joined_constraints}
- Keep question exactly within the provided topic.
- The question should be answerable in 2 to 5 minutes.
- Generate meaningful expected answer points.

Return exactly this JSON schema:
{{
  "question": "string",
  "topic": "string",
  "question_type": "Technical|Behavioral|HR|System Design",
  "expected_answer_points": ["string", "string"],
  "evaluation_rubric": {{
    "accuracy": "string",
    "clarity": "string",
    "structure": "string",
    "completeness": "string"
  }}
}}
""".strip()

    @staticmethod
    def build_evaluation_prompt(
        role: str,
        experience_level: str,
        question_type,
        topic: str,
        question: str,
        candidate_answer: str,
    ) -> str:
        return f"""
You are a strict interview evaluator.
Return output as STRICT JSON only. No markdown. No prose.

Context:
- role: {role}
- experience_level: {experience_level}
- question_type: {PromptBuilder._question_type_value(question_type)}
- topic: {topic}

Question:
{question}

Candidate Answer:
{candidate_answer}

Scoring rubric dimensions:
- accuracy
- clarity
- structure
- completeness

Rules:
- Each score must be an integer from 0 to 10.
- overall is an integer from 0 to 10.
- Provide concrete strengths and improvements.
- improved_answer must be high-quality and concise.

Return exactly this JSON schema:
{{
  "scores": {{
    "accuracy": 0,
    "clarity": 0,
    "structure": 0,
    "completeness": 0,
    "overall": 0
  }},
  "strengths": ["string"],
  "improvements": ["string"],
  "feedback": "string",
  "improved_answer": "string"
}}
""".strip()
