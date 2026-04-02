# SimLab

Microservice de validacao sintetica para o SaaS.

## Env vars

- `SIMLAB_SUPABASE_URL`
- `SIMLAB_SUPABASE_SERVICE_ROLE_KEY`
- `SIMLAB_INTERNAL_TOKEN`
- `SIMLAB_REDIS_URL`
- `SIMLAB_QDRANT_URL`
- `SIMLAB_QDRANT_API_KEY`
- `SIMLAB_QDRANT_VECTOR_SIZE`
- `SIMLAB_LITELLM_MODEL`
- `SIMLAB_LITELLM_EMBEDDING_MODEL`
- `SIMLAB_LITELLM_API_KEY`
- `SIMLAB_LITELLM_BASE_URL`

## Run

```bash
uvicorn simlab.main:app --reload --app-dir simlab
```

## Notes

- The service expects the `public.simlab_*` tables to exist in Supabase.
- Internal routes require `X-SimLab-Token`.

