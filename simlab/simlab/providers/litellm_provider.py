from __future__ import annotations

import json
from typing import Sequence

from simlab.core.settings import Settings


def _strip_json(text: str) -> str:
    raw = text.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
            return "\n".join(lines[1:-1]).strip()
    return raw


class LiteLLMProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _client_kwargs(self) -> dict[str, str]:
        kwargs: dict[str, str] = {}
        if self.settings.litellm_api_key:
            kwargs["api_key"] = self.settings.litellm_api_key
        if self.settings.litellm_base_url:
            kwargs["api_base"] = self.settings.litellm_base_url
        return kwargs

    async def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> dict:
        try:
            import litellm
        except ImportError as exc:  # pragma: no cover - dependency guard
            raise RuntimeError("litellm is not installed") from exc

        response = await litellm.acompletion(
            model=self.settings.litellm_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
            **self._client_kwargs(),
        )
        message = response.choices[0].message.content or "{}"
        return json.loads(_strip_json(message))

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        try:
            import litellm
        except ImportError as exc:  # pragma: no cover - dependency guard
            raise RuntimeError("litellm is not installed") from exc

        response = await litellm.aembedding(
            model=self.settings.litellm_embedding_model,
            input=list(texts),
            **self._client_kwargs(),
        )
        return [list(item.embedding) for item in response.data]

