from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openrouter_api_key: str
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    primary_model: str = "mistralai/mistral-7b-instruct"
    fallback_model: str = "google/gemma-7b-it"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "genai_interview_trainer"
    whisper_model: str = "base"
    max_validation_retries: int = 2
    request_timeout_seconds: int = 45

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
