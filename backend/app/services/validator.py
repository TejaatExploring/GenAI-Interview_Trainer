import json
from typing import Type

from pydantic import BaseModel, ValidationError


class OutputValidator:
    @staticmethod
    def parse_json(content: str) -> dict:
        stripped = content.strip()
        if stripped.startswith("```"):
            stripped = stripped.strip("`")
            stripped = stripped.replace("json", "", 1).strip()
        return json.loads(stripped)

    @staticmethod
    def validate_model(payload: dict, schema: Type[BaseModel]) -> BaseModel:
        try:
            return schema.model_validate(payload)
        except ValidationError as exc:
            raise ValueError(f"Validation failed: {exc}") from exc

    @staticmethod
    def validate_question_quality(question: str) -> None:
        if len(question.split()) < 8:
            raise ValueError("Question is too short")
        if "???" in question:
            raise ValueError("Question looks malformed")
