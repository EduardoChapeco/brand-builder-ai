export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  created_at: string | null;
};

type BriefingRow = {
  id: string;
  workspace_id: string;
  company_name: string | null;
  segment: string | null;
  target_audience: string | null;
  main_differentials: string | null;
  tone_of_voice: string | null;
  main_competitors: Json | null;
  market_position: string | null;
  pain_points: string | null;
  content_pillars: Json | null;
  keywords: string[] | null;
  avoid_topics: string | null;
  instagram_handle: string | null;
  linkedin_handle: string | null;
  brand_dna: string | null;
  updated_at: string | null;
};

type BrandKitRow = {
  id: string;
  workspace_id: string;
  color_primary: string | null;
  color_secondary: string | null;
  color_accent: string | null;
  color_bg_dark: string | null;
  color_bg_light: string | null;
  color_text_dark: string | null;
  color_text_light: string | null;
  custom_colors: Json | null;
  font_headline: string | null;
  font_body: string | null;
  font_accent: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  watermark_text: string | null;
  updated_at: string | null;
};

type ApiKeyRow = {
  id: string;
  workspace_id: string;
  provider: string;
  alias: string | null;
  key_value: string;
  calls_today: number | null;
  daily_limit: number | null;
  is_active: boolean | null;
  last_error: string | null;
  last_used_at: string | null;
  created_at: string | null;
};

type RssFeedRow = {
  id: string;
  workspace_id: string;
  name: string | null;
  url: string;
  category: string | null;
  is_active: boolean | null;
  last_fetched_at: string | null;
  created_at: string | null;
};

type PostRow = {
  id: string;
  workspace_id: string;
  title: string | null;
  format: string;
  slides_html: Json;
  slides_count: number | null;
  caption: string | null;
  hashtags: string | null;
  template_id: string | null;
  visual_mode: string | null;
  funnel_type: string | null;
  image_urls: Json | null;
  source_topic: string | null;
  source_url: string | null;
  generation_meta: Json | null;
  status: string | null;
  created_at: string | null;
};

type CompetitorAnalysisRow = {
  id: string;
  workspace_id: string;
  url: string;
  name: string | null;
  dna_text: string | null;
  screenshot_url: string | null;
  raw_markdown: string | null;
  analyzed_at: string | null;
};

type LegacyBriefingRow = {
  id: string;
  company_name: string | null;
  segment: string | null;
  tone_of_voice: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_preference: string | null;
  visual_style: string | null;
  target_audience: string | null;
  main_differentials: string | null;
  competitors: Json | null;
  inspirations: Json | null;
  brand_dna: string | null;
  logo_url: string | null;
  updated_at: string | null;
};

type LegacyMessageRow = {
  id: string;
  role: string;
  content: string | null;
  post_data: Json | null;
  created_at: string | null;
};

type LegacyPostRow = {
  id: string;
  title: string | null;
  format: string | null;
  slides_count: number | null;
  html_content: Json | null;
  image_urls: Json | null;
  caption: string | null;
  hashtags: string | null;
  template_name: string | null;
  is_saved_template: boolean | null;
  created_at: string | null;
};

type LegacyTemplateRow = {
  id: string;
  name: string;
  preview_url: string | null;
  html_base: string | null;
  category: string | null;
  tags: string[] | null;
  is_system: boolean | null;
  created_at: string | null;
};

type LegacyCompetitorAnalysisRow = {
  id: string;
  url: string;
  name: string | null;
  extracted_dna: string | null;
  screenshot_url: string | null;
  raw_content: string | null;
  analyzed_at: string | null;
};

type BrandTemplateRow = {
  id: string;
  workspace_id: string;
  source_url: string;
  source_name: string | null;
  source_platform: string | null;
  layout_dna: Json | null;
  brand_dna: Json | null;
  copy_dna: Json | null;
  html_template: string | null;
  screenshot_url: string | null;
  thumbnail_url: string | null;
  style_tags: string[] | null;
  category: string | null;
  status: string | null;
  error_message: string | null;
  is_public: boolean | null;
  view_count: number | null;
  use_count: number | null;
  created_at: string | null;
  analyzed_at: string | null;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      workspaces: TableDefinition<WorkspaceRow>;
      briefings: TableDefinition<BriefingRow>;
      brand_kits: TableDefinition<BrandKitRow>;
      api_keys: TableDefinition<ApiKeyRow>;
      rss_feeds: TableDefinition<RssFeedRow>;
      posts_v2: TableDefinition<PostRow>;
      competitor_analyses_v2: TableDefinition<CompetitorAnalysisRow>;
      briefing: TableDefinition<LegacyBriefingRow>;
      messages: TableDefinition<LegacyMessageRow>;
      posts: TableDefinition<LegacyPostRow>;
      templates: TableDefinition<LegacyTemplateRow>;
      competitor_analyses: TableDefinition<LegacyCompetitorAnalysisRow>;
      brand_templates: TableDefinition<BrandTemplateRow>;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals["public"];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer Row;
    }
    ? Row
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer Row;
      }
      ? Row
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer Insert;
    }
    ? Insert
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer Insert;
      }
      ? Insert
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer Update;
    }
    ? Update
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer Update;
      }
      ? Update
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
