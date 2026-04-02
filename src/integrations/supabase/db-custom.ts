/**
 * Typed helpers for tables that exist in the database but are not yet
 * reflected in the auto-generated types.ts file.
 *
 * Usage:  import { fromTable } from '@/integrations/supabase/db-custom';
 *         const { data } = await fromTable('bio_links').select('*').eq('workspace_id', id);
 *
 * This avoids scattering `as any` casts across every page.
 */
import { supabase } from './client';

/**
 * Calls supabase.from(table) with an `as any` cast so TypeScript
 * doesn't complain about tables missing from the generated schema.
 */
export const fromTable = (table: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).from(table);
