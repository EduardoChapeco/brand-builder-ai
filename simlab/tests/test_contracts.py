from __future__ import annotations

import pytest
from pydantic import ValidationError

from simlab.models.contracts import ValidateContentRequest


def test_validate_content_requires_variants():
    with pytest.raises(ValidationError):
        ValidateContentRequest(
            workspace_id="11111111-1111-1111-1111-111111111111",
            module_type="content_post",
            stimulus_type="content",
            objective="Test",
        )


def test_validate_content_accepts_structured_variants():
    request = ValidateContentRequest(
        workspace_id="11111111-1111-1111-1111-111111111111",
        module_type="content_post",
        stimulus_type="content",
        objective="Test",
        variants=[{"label": "A", "payload": {"headline": "One"}}],
    )
    assert request.variants[0].label == "A"

