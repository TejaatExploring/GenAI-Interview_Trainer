from app.schemas.evaluation import EvaluationPayload
from app.services.validator import OutputValidator


def test_evaluation_payload_validation_passes():
    payload = {
        "scores": {
            "accuracy": 8,
            "clarity": 7,
            "structure": 8,
            "completeness": 7,
            "overall": 8,
        },
        "strengths": ["Solid structure"],
        "improvements": ["Add more edge cases"],
        "feedback": "Good response with solid reasoning. Add stronger tradeoff analysis and include performance details.",
        "improved_answer": "This is a stronger model answer with clear assumptions, algorithm choices, complexity analysis, tradeoff discussion, risk handling, and realistic production constraints.",
    }

    validated = OutputValidator.validate_model(payload, EvaluationPayload)
    assert validated.scores.overall == 8


def test_score_out_of_range_fails():
    payload = {
        "scores": {
            "accuracy": 11,
            "clarity": 7,
            "structure": 8,
            "completeness": 7,
            "overall": 8,
        },
        "strengths": ["Solid structure"],
        "improvements": ["Add more edge cases"],
        "feedback": "Good response with solid reasoning. Add stronger tradeoff analysis and include performance details.",
        "improved_answer": "This is a stronger model answer with clear assumptions, algorithm choices, complexity analysis, tradeoff discussion, risk handling, and realistic production constraints.",
    }

    try:
        OutputValidator.validate_model(payload, EvaluationPayload)
        assert False
    except ValueError:
        assert True
