const fs = require('fs');
let file = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');

const tplDef = `      brand_templates: {
        Row: {
          analyzed_at: string | null
          brand_dna: Json | null
          category: string | null
          copy_dna: Json | null
          created_at: string | null
          error_message: string | null
          html_template: string | null
          id: string
          is_public: boolean | null
          layout_dna: Json | null
          screenshot_url: string | null
          thumbnail_url: string | null
          source_name: string | null
          source_platform: string | null
          source_url: string
          status: string | null
          style_tags: string[] | null
          use_count: number | null
          view_count: number | null
          workspace_id: string
        }
        Insert: {
          analyzed_at?: string | null
          brand_dna?: Json | null
          category?: string | null
          copy_dna?: Json | null
          created_at?: string | null
          error_message?: string | null
          html_template?: string | null
          id?: string
          is_public?: boolean | null
          layout_dna?: Json | null
          screenshot_url?: string | null
          thumbnail_url?: string | null
          source_name?: string | null
          source_platform?: string | null
          source_url: string
          status?: string | null
          style_tags?: string[] | null
          use_count?: number | null
          view_count?: number | null
          workspace_id: string
        }
        Update: {
          analyzed_at?: string | null
          brand_dna?: Json | null
          category?: string | null
          copy_dna?: Json | null
          created_at?: string | null
          error_message?: string | null
          html_template?: string | null
          id?: string
          is_public?: boolean | null
          layout_dna?: Json | null
          screenshot_url?: string | null
          thumbnail_url?: string | null
          source_name?: string | null
          source_platform?: string | null
          source_url?: string
          status?: string | null
          style_tags?: string[] | null
          use_count?: number | null
          view_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }`;

const squadDef = `
      squad_runs: {
        Row: {
          captured_screenshots: Json | null
          created_at: string | null
          error_message: string | null
          final_template_id: string | null
          id: string
          status: string
          target_url: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          captured_screenshots?: Json | null
          created_at?: string | null
          error_message?: string | null
          final_template_id?: string | null
          id?: string
          status?: string
          target_url: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          captured_screenshots?: Json | null
          created_at?: string | null
          error_message?: string | null
          final_template_id?: string | null
          id?: string
          status?: string
          target_url?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_runs_final_template_id_fkey"
            columns: ["final_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          }
        ]
      }`;

if (!file.includes('brand_templates: {')) {
    file = file.replace('Tables: {', 'Tables: {\n' + tplDef + squadDef);
}

const apiKeysRowMatch = /alias:\s*string\s*\|\s*null/g;
const apiKeysInsertMatch = /alias\?:\s*string\s*\|\s*null/g;

file = file.replace(apiKeysRowMatch, 'alias: string | null\n          last_error?: string | null\n          last_used_at?: string | null');
file = file.replace(apiKeysInsertMatch, 'alias?: string | null\n          last_error?: string | null\n          last_used_at?: string | null');

const rssFeedsRowMatch = /name:\s*string\s*\|\s*null/g;
const rssFeedsInsertMatch = /name\?:\s*string\s*\|\s*null/g;

file = file.replace(rssFeedsRowMatch, 'name: string | null\n          last_fetched_at?: string | null');
file = file.replace(rssFeedsInsertMatch, 'name?: string | null\n          last_fetched_at?: string | null');

fs.writeFileSync('src/integrations/supabase/types.ts', file);
console.log('types.ts patched.');
