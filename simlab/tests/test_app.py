from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
TestClient = pytest.importorskip("fastapi.testclient").TestClient

from simlab.factory import create_app


def test_health_route_exists():
    app = create_app()
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "SimLab"


def test_internal_route_requires_token():
    app = create_app()
    client = TestClient(app)
    response = client.post(
        "/simlab/validate-content",
        json={
            "workspace_id": "11111111-1111-1111-1111-111111111111",
            "module_type": "content_post",
            "stimulus_type": "content",
            "objective": "Test",
            "variants": [{"label": "A", "payload": {"headline": "One"}}],
        },
    )
    assert response.status_code in {401, 503}

