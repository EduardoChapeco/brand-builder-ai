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
