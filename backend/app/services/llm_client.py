import asyncio

import httpx
from fastapi import HTTPException

from app.core.config import settings


class OpenRouterServiceError(Exception):
    def __init__(self, status_code: int, message: str, model: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.model = model


class LLMClient:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }

    async def _chat(self, model: str, prompt: str) -> str:
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": "You are a precise JSON generator. Output strict JSON only.\n\n" + prompt,
                },
            ],
            "temperature": 0.2,
        }

        timeout = httpx.Timeout(settings.request_timeout_seconds)
        retry_status_codes = {429, 500, 502, 503, 504}

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(3):
                try:
                    response = await client.post(
                        f"{settings.openrouter_base_url}/chat/completions",
                        headers=self.headers,
                        json=payload,
                    )
                except httpx.RequestError as exc:
                    if attempt < 2:
                        await asyncio.sleep(1.5 * (attempt + 1))
                        continue
                    raise OpenRouterServiceError(
                        503,
                        (
                            "OpenRouter network request failed. "
                            f"Please check internet/DNS connectivity and OPENROUTER_BASE_URL. Root cause: {exc}"
                        ),
                        model,
                    ) from exc

                if response.status_code < 400:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]

                try:
                    error_body = response.json()
                except ValueError:
                    error_body = response.text

                if response.status_code in retry_status_codes and attempt < 2:
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue

                detail = f"OpenRouter error {response.status_code} for model '{model}': {error_body}"
                raise OpenRouterServiceError(response.status_code, detail, model)

        raise OpenRouterServiceError(
            503,
            f"OpenRouter request retries exhausted for model '{model}'.",
            model,
        )

    async def generate_with_fallback(self, prompt: str) -> tuple[str, str]:
        primary_error: OpenRouterServiceError | None = None

        try:
            content = await self._chat(settings.primary_model, prompt)
            return content, settings.primary_model
        except OpenRouterServiceError as exc:
            primary_error = exc

        try:
            content = await self._chat(settings.fallback_model, prompt)
            return content, settings.fallback_model
        except OpenRouterServiceError as fallback_exc:
            primary_message = primary_error.message if primary_error else "unknown"
            network_failure = primary_error and primary_error.status_code == 503 and fallback_exc.status_code == 503

            if network_failure:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Unable to reach OpenRouter from backend (network/DNS issue). "
                        "Verify internet connectivity, DNS resolution, and OPENROUTER_BASE_URL in backend/.env. "
                        f"Primary error: {primary_message}. Fallback error: {fallback_exc.message}"
                    ),
                )

            if fallback_exc.status_code == 429:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "OpenRouter rate limit reached for both primary and fallback models. "
                        "Please try again later or configure a different model in backend/.env."
                    ),
                )
            if primary_error and primary_error.status_code == 429:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "OpenRouter rate limit reached for the primary model, and the fallback model failed: "
                        f"{fallback_exc.message}"
                    ),
                )
            raise HTTPException(
                status_code=502,
                detail=(
                    "OpenRouter request failed for both primary and fallback models. "
                    f"Primary model error: {primary_message}. "
                    f"Fallback model error: {fallback_exc.message}"
                ),
            )
