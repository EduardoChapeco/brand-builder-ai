from __future__ import annotations

from importlib import resources


def load_prompt(name: str) -> str:
    try:
        return resources.files("simlab.prompts").joinpath(name).read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Prompt template not found: {name}") from exc

