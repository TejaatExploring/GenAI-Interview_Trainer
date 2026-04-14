import json
from pathlib import Path
from random import choice

class TopicSelector:
    def __init__(self, catalog_dir: str):
        self.catalog_dir = Path(catalog_dir)

    def _normalize_role(self, role: str) -> str:
        return role.strip().lower().replace(" ", "_")

    def load_topics(self, role: str, experience_level: str) -> list[str]:
        role_file = self.catalog_dir / f"{self._normalize_role(role)}.json"
        if not role_file.exists():
            return ["General Fundamentals"]

        data = json.loads(role_file.read_text(encoding="utf-8"))
        return data.get(str(experience_level), ["General Fundamentals"])

    def select_topic(self, role: str, experience_level: str, previous_topics: list[str]) -> str:
        topics = self.load_topics(role, experience_level)
        filtered = [topic for topic in topics if topic not in previous_topics]
        candidate_pool = filtered if filtered else topics
        return choice(candidate_pool)
