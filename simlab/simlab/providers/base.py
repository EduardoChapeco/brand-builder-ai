from __future__ import annotations

from typing import Protocol, Sequence


class LLMProvider(Protocol):
    async def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> dict:
        ...

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        ...

