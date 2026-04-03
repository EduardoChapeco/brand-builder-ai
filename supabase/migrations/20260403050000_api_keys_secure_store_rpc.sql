CREATE OR REPLACE FUNCTION public.secure_store_api_key(
  p_workspace_id UUID,
  p_provider TEXT,
  p_alias TEXT,
  p_key_value TEXT,
  p_app_secret TEXT,
  p_daily_limit INTEGER DEFAULT 200,
  p_monthly_limit INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  provider TEXT,
  alias TEXT,
  key_preview TEXT,
  calls_today INTEGER,
  daily_limit INTEGER,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_row public.api_keys;
BEGIN
  INSERT INTO public.api_keys (
    workspace_id,
    provider,
    alias,
    key_value,
    key_encrypted,
    key_preview,
    calls_today,
    calls_this_month,
    daily_limit,
    monthly_limit,
    is_active,
    is_verified,
    created_at
  )
  VALUES (
    p_workspace_id,
    p_provider,
    NULLIF(TRIM(COALESCE(p_alias, '')), ''),
    '',
    pgp_sym_encrypt(p_key_value, p_app_secret),
    RIGHT(p_key_value, 4),
    0,
    0,
    COALESCE(p_daily_limit, 200),
    COALESCE(p_monthly_limit, 5000),
    TRUE,
    FALSE,
    NOW()
  )
  RETURNING * INTO inserted_row;

  RETURN QUERY
  SELECT
    inserted_row.id,
    inserted_row.provider,
    inserted_row.alias,
    inserted_row.key_preview,
    inserted_row.calls_today,
    inserted_row.daily_limit,
    inserted_row.is_active;
END;
$$;
