from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from simlab.api.dependencies import get_repository, get_runtime, verify_internal_request
from simlab.models.contracts import (
    CalibrationFeedbackRequest,
    CharacterBindRequest,
    GeneratePersonaRequest,
    ModulePolicyRequest,
    SimlabRunCreateResult,
    ValidateCharacterRequest,
    ValidateContentRequest,
    ValidateJourneyRequest,
    ValidateTrendRequest,
)
from simlab.workers.celery_app import get_celery_app
from simlab.workers.tasks import process_run_task, record_feedback_task

router = APIRouter(prefix="/simlab", tags=["simlab"])


def _queue_run(run_id: str) -> None:
    try:
        get_celery_app()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    process_run_task.delay(run_id)


def _require_signed_request(request: Request, body: bytes) -> None:
    verify_internal_request(
        body=body,
        timestamp=request.headers.get("X-SimLab-Timestamp"),
        signature=request.headers.get("X-SimLab-Signature"),
        path=request.url.path,
    )


async def _schedule_existing_run(request: Request, payload: ValidateContentRequest | ValidateJourneyRequest | ValidateCharacterRequest | ValidateTrendRequest) -> SimlabRunCreateResult:
    body = await request.body()
    _require_signed_request(request, body)

    if payload.run_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="run_id is required.")

    repo = get_repository()
    if not repo.ready():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")

    run = await repo.get_run(str(payload.run_id))
    _queue_run(str(run["id"]))
    return SimlabRunCreateResult(run_id=run["id"], status=run["status"])


@router.post("/validate-content")
async def validate_content(request: Request, payload: ValidateContentRequest) -> SimlabRunCreateResult:
    return await _schedule_existing_run(request, payload)


@router.post("/validate-journey")
async def validate_journey(request: Request, payload: ValidateJourneyRequest) -> SimlabRunCreateResult:
    return await _schedule_existing_run(request, payload)


@router.post("/validate-character")
async def validate_character(request: Request, payload: ValidateCharacterRequest) -> SimlabRunCreateResult:
    return await _schedule_existing_run(request, payload)


@router.post("/validate-trend")
async def validate_trend(request: Request, payload: ValidateTrendRequest) -> SimlabRunCreateResult:
    return await _schedule_existing_run(request, payload)


@router.get("/runs/{run_id}")
async def get_run_status(request: Request, run_id: str):
    _require_signed_request(request, b"")
    runtime = get_runtime()
    return await runtime.get_run_status(run_id)


@router.get("/personas")
async def list_personas(request: Request):
    _require_signed_request(request, b"")
    repo = get_repository()
    if not repo.ready():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
    return {"personas": await repo.list_personas(limit=100)}


@router.post("/personas/generate")
async def generate_persona(request: Request, payload: GeneratePersonaRequest):
    body = await request.body()
    _require_signed_request(request, body)
    runtime = get_runtime()
    return await runtime.generate_persona(payload)


@router.post("/calibration/feedback")
async def calibration_feedback(request: Request, payload: CalibrationFeedbackRequest):
    body = await request.body()
    _require_signed_request(request, body)
    try:
        get_celery_app()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    async_result = record_feedback_task.delay(payload.model_dump(mode="json"))
    return {"task_id": async_result.id, "status": "queued"}


@router.post("/module-policy")
async def upsert_module_policy(request: Request, payload: ModulePolicyRequest):
    body = await request.body()
    _require_signed_request(request, body)
    runtime = get_runtime()
    return await runtime.upsert_module_policy(payload)


@router.post("/character-bind")
async def bind_character(request: Request, payload: CharacterBindRequest):
    body = await request.body()
    _require_signed_request(request, body)
    runtime = get_runtime()
    return await runtime.bind_character(payload)
