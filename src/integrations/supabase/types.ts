export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      brand_templates: {
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
          },
        ]
      }
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
          },
        ]
      }
      api_keys: {
        Row: {
          alias: string | null
          last_error?: string | null
          last_used_at?: string | null
          calls_today: number | null
          created_at: string
          daily_limit: number | null
          id: string
          is_active: boolean
          key_value: string
          provider: string
          workspace_id: string
        }
        Insert: {
          alias?: string | null
          last_error?: string | null
          last_used_at?: string | null
          calls_today?: number | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean
          key_value: string
          provider: string
          workspace_id: string
        }
        Update: {
          alias?: string | null
          last_error?: string | null
          last_used_at?: string | null
          calls_today?: number | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean
          key_value?: string
          provider?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          color_accent: string
          color_bg_dark: string
          color_bg_light: string
          color_primary: string
          color_secondary: string
          color_text_dark: string
          color_text_light: string
          custom_colors: Json | null
          font_accent: string
          font_body: string
          font_headline: string
          id: string
          logo_dark_url: string | null
          logo_url: string | null
          updated_at: string | null
          watermark_text: string | null
          workspace_id: string
        }
        Insert: {
          color_accent?: string
          color_bg_dark?: string
          color_bg_light?: string
          color_primary?: string
          color_secondary?: string
          color_text_dark?: string
          color_text_light?: string
          custom_colors?: Json | null
          font_accent?: string
          font_body?: string
          font_headline?: string
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          updated_at?: string | null
          watermark_text?: string | null
          workspace_id: string
        }
        Update: {
          color_accent?: string
          color_bg_dark?: string
          color_bg_light?: string
          color_primary?: string
          color_secondary?: string
          color_text_dark?: string
          color_text_light?: string
          custom_colors?: Json | null
          font_accent?: string
          font_body?: string
          font_headline?: string
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          updated_at?: string | null
          watermark_text?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing: {
        Row: {
          brand_dna: string | null
          company_name: string | null
          competitors: Json | null
          font_preference: string | null
          id: string
          inspirations: Json | null
          logo_url: string | null
          main_differentials: string | null
          primary_color: string | null
          secondary_color: string | null
          segment: string | null
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string | null
          visual_style: string | null
        }
        Insert: {
          brand_dna?: string | null
          company_name?: string | null
          competitors?: Json | null
          font_preference?: string | null
          id?: string
          inspirations?: Json | null
          logo_url?: string | null
          main_differentials?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          segment?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          visual_style?: string | null
        }
        Update: {
          brand_dna?: string | null
          company_name?: string | null
          competitors?: Json | null
          font_preference?: string | null
          id?: string
          inspirations?: Json | null
          logo_url?: string | null
          main_differentials?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          segment?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          visual_style?: string | null
        }
        Relationships: []
      }
      briefings: {
        Row: {
          avoid_topics: string | null
          brand_dna: string | null
          company_name: string | null
          content_pillars: Json | null
          id: string
          instagram_handle: string | null
          keywords: string[] | null
          linkedin_handle: string | null
          main_competitors: Json | null
          main_differentials: string | null
          market_position: string | null
          pain_points: string | null
          segment: string | null
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          avoid_topics?: string | null
          brand_dna?: string | null
          company_name?: string | null
          content_pillars?: Json | null
          id?: string
          instagram_handle?: string | null
          keywords?: string[] | null
          linkedin_handle?: string | null
          main_competitors?: Json | null
          main_differentials?: string | null
          market_position?: string | null
          pain_points?: string | null
          segment?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          avoid_topics?: string | null
          brand_dna?: string | null
          company_name?: string | null
          content_pillars?: Json | null
          id?: string
          instagram_handle?: string | null
          keywords?: string[] | null
          linkedin_handle?: string | null
          main_competitors?: Json | null
          main_differentials?: string | null
          market_position?: string | null
          pain_points?: string | null
          segment?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_analyses: {
        Row: {
          analyzed_at: string | null
          extracted_dna: string | null
          id: string
          name: string | null
          raw_content: string | null
          screenshot_url: string | null
          url: string
        }
        Insert: {
          analyzed_at?: string | null
          extracted_dna?: string | null
          id?: string
          name?: string | null
          raw_content?: string | null
          screenshot_url?: string | null
          url: string
        }
        Update: {
          analyzed_at?: string | null
          extracted_dna?: string | null
          id?: string
          name?: string | null
          raw_content?: string | null
          screenshot_url?: string | null
          url?: string
        }
        Relationships: []
      }
      competitor_analyses_v2: {
        Row: {
          analyzed_at: string | null
          dna_text: string | null
          id: string
          name: string | null
          raw_markdown: string | null
          url: string
          workspace_id: string
        }
        Insert: {
          analyzed_at?: string | null
          dna_text?: string | null
          id?: string
          name?: string | null
          raw_markdown?: string | null
          url: string
          workspace_id: string
        }
        Update: {
          analyzed_at?: string | null
          dna_text?: string | null
          id?: string
          name?: string | null
          raw_markdown?: string | null
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analyses_v2_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          post_data: Json | null
          role: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          post_data?: Json | null
          role: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          post_data?: Json | null
          role?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          caption: string | null
          created_at: string | null
          format: string | null
          hashtags: string | null
          html_content: Json | null
          id: string
          image_urls: Json | null
          is_saved_template: boolean | null
          slides_count: number | null
          template_name: string | null
          title: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          format?: string | null
          hashtags?: string | null
          html_content?: Json | null
          id?: string
          image_urls?: Json | null
          is_saved_template?: boolean | null
          slides_count?: number | null
          template_name?: string | null
          title?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          format?: string | null
          hashtags?: string | null
          html_content?: Json | null
          id?: string
          image_urls?: Json | null
          is_saved_template?: boolean | null
          slides_count?: number | null
          template_name?: string | null
          title?: string | null
        }
        Relationships: []
      }
      posts_v2: {
        Row: {
          caption: string | null
          created_at: string
          format: string | null
          funnel_type: string | null
          generation_meta: Json | null
          hashtags: string | null
          id: string
          image_urls: Json | null
          slides_count: number | null
          slides_html: Json | null
          source_topic: string | null
          source_url: string | null
          status: string | null
          template_id: string | null
          title: string | null
          visual_mode: string | null
          workspace_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          format?: string | null
          funnel_type?: string | null
          generation_meta?: Json | null
          hashtags?: string | null
          id?: string
          image_urls?: Json | null
          slides_count?: number | null
          slides_html?: Json | null
          source_topic?: string | null
          source_url?: string | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          visual_mode?: string | null
          workspace_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          format?: string | null
          funnel_type?: string | null
          generation_meta?: Json | null
          hashtags?: string | null
          id?: string
          image_urls?: Json | null
          slides_count?: number | null
          slides_html?: Json | null
          source_topic?: string | null
          source_url?: string | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          visual_mode?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_v2_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rss_feeds: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_fetched_at: string | null
          name: string | null
          url: string
          workspace_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          name?: string | null
          url: string
          workspace_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          name?: string | null
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rss_feeds_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string | null
          created_at: string | null
          html_base: string | null
          id: string
          is_system: boolean | null
          name: string
          preview_url: string | null
          tags: string[] | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          html_base?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          preview_url?: string | null
          tags?: string[] | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          html_base?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          preview_url?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
