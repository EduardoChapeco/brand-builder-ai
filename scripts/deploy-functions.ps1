#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Deploy todos os edge functions do Brand Builder AI para o Supabase.
  
.DESCRIPTION
  Requer: npx supabase (instalado via npm) + SUPABASE_ACCESS_TOKEN no ambiente.
  O projeto deve estar linkado: npx supabase link --project-ref pjwupmxbsricseslxmbr
  
.USAGE
  .\scripts\deploy-functions.ps1
#>

$PROJECT_REF = "pjwupmxbsricseslxmbr"
$FUNCTIONS_DIR = "supabase\functions"

$functions = @(
  "clone-brand-template",
  "agent-scraper",
  "agent-vision-analyzer",
  "generate-post-content",
  "generate-background-image",
  "fetch-rss-topics",
  "analyze-url",
  "extract-brand-identity",
  "orchestrate-post"
)

Write-Host "🚀 Deployando Edge Functions para projeto $PROJECT_REF..." -ForegroundColor Cyan

foreach ($fn in $functions) {
  $fnPath = "$FUNCTIONS_DIR\$fn\index.ts"
  if (Test-Path $fnPath) {
    Write-Host "  📦 Deployando: $fn" -ForegroundColor Yellow
    npx supabase functions deploy $fn --project-ref $PROJECT_REF --no-verify-jwt
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  ✅ $fn deployed!" -ForegroundColor Green
    } else {
      Write-Host "  ❌ $fn falhou!" -ForegroundColor Red
    }
  } else {
    Write-Host "  ⚠️  $fn não encontrado em $fnPath" -ForegroundColor Gray
  }
}

Write-Host ""
Write-Host "🏁 Deploy concluído!" -ForegroundColor Cyan
Write-Host ""
Write-Host "PRÓXIMOS PASSOS para aplicar o schema no Supabase:"
Write-Host "  1. Acesse https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
Write-Host "  2. Cole e execute o conteúdo de: supabase/migrations/20260330000000_postgen_multi_tenant.sql"
Write-Host "  3. Em seguida: supabase/migrations/20260331000000_brand_dna_templates.sql"
Write-Host "  4. Em seguida: supabase/migrations/20260332000000_squad_runs.sql"
