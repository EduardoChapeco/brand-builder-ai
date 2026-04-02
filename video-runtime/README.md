# video-runtime

Runtime pesado do Video Studio. Recebe jobs assinados pelas Edge Functions, processa FFmpeg/export/transcript/análises e persiste o resultado no Postgres/Storage do Supabase.

## Variáveis esperadas

- `PORT`
- `VIDEO_RUNTIME_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FFMPEG_PATH` (opcional, default `ffmpeg`)
- `REDIS_URL` (opcional)

## Endpoints

- `GET /health`
- `POST /internal/jobs/dispatch`

## Observação

Os handlers `render_generated_video`, `render_layer_composition`, `remotion_render` e `enhance_video` falham honestamente até que o adapter/provider correspondente esteja configurado no ambiente.
