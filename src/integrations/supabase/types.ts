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
      api_keys: {
        Row: {
          alias: string | null
          calls_today: number | null
          created_at: string
          daily_limit: number | null
          id: string
          is_active: boolean
          key_value: string
          last_error: string | null
          last_used_at: string | null
          provider: string
          workspace_id: string
        }
        Insert: {
          alias?: string | null
          calls_today?: number | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean
          key_value: string
          last_error?: string | null
          last_used_at?: string | null
          provider: string
          workspace_id: string
        }
        Update: {
          alias?: string | null
          calls_today?: number | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean
          key_value?: string
          last_error?: string | null
          last_used_at?: string | null
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
      brand_characters: {
        Row: {
          age_range: string | null
          archetype: string | null
          character_kind: string | null
          created_at: string
          ethnicity_notes: string | null
          expression_default: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          latest_simlab_run_id: string | null
          name: string
          physical_traits: Json | null
          sample_images: Json | null
          seed_prompt: string | null
          signature_item: string | null
          simlab_status: string | null
          simlab_validated_at: string | null
          style_notes: string | null
          workspace_id: string
        }
        Insert: {
          age_range?: string | null
          archetype?: string | null
          character_kind?: string | null
          created_at?: string
          ethnicity_notes?: string | null
          expression_default?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          latest_simlab_run_id?: string | null
          name: string
          physical_traits?: Json | null
          sample_images?: Json | null
          seed_prompt?: string | null
          signature_item?: string | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          style_notes?: string | null
          workspace_id: string
        }
        Update: {
          age_range?: string | null
          archetype?: string | null
          character_kind?: string | null
          created_at?: string
          ethnicity_notes?: string | null
          expression_default?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          latest_simlab_run_id?: string | null
          name?: string
          physical_traits?: Json | null
          sample_images?: Json | null
          seed_prompt?: string | null
          signature_item?: string | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          style_notes?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_characters_latest_simlab_run_id_fkey"
            columns: ["latest_simlab_run_id"]
            isOneToOne: false
            referencedRelation: "simlab_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_characters_workspace_id_fkey"
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
      brand_templates: {
        Row: {
          analyzed_at: string | null
          brand_dna: Json | null
          category: string | null
          copy_dna: Json | null
          created_at: string
          error_message: string | null
          html_template: string | null
          id: string
          is_public: boolean
          layout_dna: Json | null
          layout_style: Json | null
          screenshot_url: string | null
          source_name: string | null
          source_platform: string | null
          source_url: string
          status: string | null
          style_tags: string[] | null
          use_count: number
          workspace_id: string
        }
        Insert: {
          analyzed_at?: string | null
          brand_dna?: Json | null
          category?: string | null
          copy_dna?: Json | null
          created_at?: string
          error_message?: string | null
          html_template?: string | null
          id?: string
          is_public?: boolean
          layout_dna?: Json | null
          layout_style?: Json | null
          screenshot_url?: string | null
          source_name?: string | null
          source_platform?: string | null
          source_url: string
          status?: string | null
          style_tags?: string[] | null
          use_count?: number
          workspace_id: string
        }
        Update: {
          analyzed_at?: string | null
          brand_dna?: Json | null
          category?: string | null
          copy_dna?: Json | null
          created_at?: string
          error_message?: string | null
          html_template?: string | null
          id?: string
          is_public?: boolean
          layout_dna?: Json | null
          layout_style?: Json | null
          screenshot_url?: string | null
          source_name?: string | null
          source_platform?: string | null
          source_url?: string
          status?: string | null
          style_tags?: string[] | null
          use_count?: number
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
      bio_links: {
        Row: {
          blocks: Json | null
          created_at: string
          id: string
          is_published: boolean | null
          latest_simlab_run_id: string | null
          links: Json | null
          profile: Json | null
          published_html: string | null
          seo_config: Json | null
          simlab_status: string | null
          simlab_validated_at: string | null
          slug: string
          theme_config: Json | null
          theme_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          blocks?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          latest_simlab_run_id?: string | null
          links?: Json | null
          profile?: Json | null
          published_html?: string | null
          seo_config?: Json | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          slug: string
          theme_config?: Json | null
          theme_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          blocks?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          latest_simlab_run_id?: string | null
          links?: Json | null
          profile?: Json | null
          published_html?: string | null
          seo_config?: Json | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          slug?: string
          theme_config?: Json | null
          theme_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_links_latest_simlab_run_id_fkey"
            columns: ["latest_simlab_run_id"]
            isOneToOne: false
            referencedRelation: "simlab_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bio_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_articles: {
        Row: {
          agent_prd_id: string | null
          content_html: string | null
          content_markdown: string | null
          created_at: string | null
          hero_image_url: string | null
          id: string
          instagram_post_id: string | null
          keywords: string[] | null
          latest_simlab_run_id: string | null
          layout_template: string | null
          meta_description: string | null
          news_item_id: string | null
          simlab_status: string | null
          simlab_validated_at: string | null
          slug: string | null
          source_type: string | null
          source_url: string | null
          status: string | null
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          agent_prd_id?: string | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_post_id?: string | null
          keywords?: string[] | null
          latest_simlab_run_id?: string | null
          layout_template?: string | null
          meta_description?: string | null
          news_item_id?: string | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          slug?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          agent_prd_id?: string | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_post_id?: string | null
          keywords?: string[] | null
          latest_simlab_run_id?: string | null
          layout_template?: string | null
          meta_description?: string | null
          news_item_id?: string | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          slug?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_instagram_post_id_fkey"
            columns: ["instagram_post_id"]
            isOneToOne: false
            referencedRelation: "posts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_latest_simlab_run_id_fkey"
            columns: ["latest_simlab_run_id"]
            isOneToOne: false
            referencedRelation: "simlab_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_news_item_id_fkey"
            columns: ["news_item_id"]
            isOneToOne: false
            referencedRelation: "news_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
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
          last_competitor_analysis: string | null
          linkedin_handle: string | null
          main_competitors: Json | null
          main_differentials: string | null
          market_position: string | null
          pain_points: string | null
          segment: string | null
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string | null
          viral_patterns_cache: Json | null
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
          last_competitor_analysis?: string | null
          linkedin_handle?: string | null
          main_competitors?: Json | null
          main_differentials?: string | null
          market_position?: string | null
          pain_points?: string | null
          segment?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          viral_patterns_cache?: Json | null
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
          last_competitor_analysis?: string | null
          linkedin_handle?: string | null
          main_competitors?: Json | null
          main_differentials?: string | null
          market_position?: string | null
          pain_points?: string | null
          segment?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          viral_patterns_cache?: Json | null
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
      carousel_storyboards: {
        Row: {
          arc_type: string | null
          created_at: string
          id: string
          post_id: string | null
          remotion_component_preset_id: string | null
          remotion_composition_id: string | null
          remotion_template_id: string | null
          slides_plan: Json | null
          topic: string
          workspace_id: string
        }
        Insert: {
          arc_type?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          remotion_component_preset_id?: string | null
          remotion_composition_id?: string | null
          remotion_template_id?: string | null
          slides_plan?: Json | null
          topic?: string
          workspace_id: string
        }
        Update: {
          arc_type?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          remotion_component_preset_id?: string | null
          remotion_composition_id?: string | null
          remotion_template_id?: string | null
          slides_plan?: Json | null
          topic?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carousel_storyboards_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_storyboards_remotion_component_preset_id_fkey"
            columns: ["remotion_component_preset_id"]
            isOneToOne: false
            referencedRelation: "remotion_component_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_storyboards_remotion_composition_id_fkey"
            columns: ["remotion_composition_id"]
            isOneToOne: false
            referencedRelation: "remotion_compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_storyboards_remotion_template_id_fkey"
            columns: ["remotion_template_id"]
            isOneToOne: false
            referencedRelation: "remotion_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_storyboards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
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
      image_prompt_templates: {
        Row: {
          base_template: string
          category: string
          created_at: string
          default_values: Json | null
          id: string
          is_system: boolean | null
          name: string
          platform_params: Json | null
          subcategory: string | null
          usage_count: number | null
          variables: Json | null
          workspace_id: string | null
        }
        Insert: {
          base_template?: string
          category?: string
          created_at?: string
          default_values?: Json | null
          id?: string
          is_system?: boolean | null
          name: string
          platform_params?: Json | null
          subcategory?: string | null
          usage_count?: number | null
          variables?: Json | null
          workspace_id?: string | null
        }
        Update: {
          base_template?: string
          category?: string
          created_at?: string
          default_values?: Json | null
          id?: string
          is_system?: boolean | null
          name?: string
          platform_params?: Json | null
          subcategory?: string | null
          usage_count?: number | null
          variables?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_prompt_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          asset_type: string
          character_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          module: string
          prompt_template_id: string | null
          public_url: string | null
          storage_path: string | null
          workspace_id: string
        }
        Insert: {
          asset_type?: string
          character_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          module?: string
          prompt_template_id?: string | null
          public_url?: string | null
          storage_path?: string | null
          workspace_id: string
        }
        Update: {
          asset_type?: string
          character_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          module?: string
          prompt_template_id?: string | null
          public_url?: string | null
          storage_path?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "brand_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "image_prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_workspace_id_fkey"
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
          workspace_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          post_data?: Json | null
          role: string
          workspace_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          post_data?: Json | null
          role?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      news_items: {
        Row: {
          blog_article_id: string | null
          categories: string[] | null
          content_extracted: boolean | null
          content_markdown: string | null
          content_piece_ids: string[] | null
          description: string | null
          fetched_at: string | null
          id: string
          latest_simlab_run_id: string | null
          published_at: string | null
          relevance_reason: string | null
          relevance_score: number | null
          rss_source_id: string | null
          simlab_status: string | null
          simlab_validated_at: string | null
          source_name: string | null
          source_url: string
          status: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          blog_article_id?: string | null
          categories?: string[] | null
          content_extracted?: boolean | null
          content_markdown?: string | null
          content_piece_ids?: string[] | null
          description?: string | null
          fetched_at?: string | null
          id?: string
          latest_simlab_run_id?: string | null
          published_at?: string | null
          relevance_reason?: string | null
          relevance_score?: number | null
          rss_source_id?: string | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          source_name?: string | null
          source_url: string
          status?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          blog_article_id?: string | null
          categories?: string[] | null
          content_extracted?: boolean | null
          content_markdown?: string | null
          content_piece_ids?: string[] | null
          description?: string | null
          fetched_at?: string | null
          id?: string
          latest_simlab_run_id?: string | null
          published_at?: string | null
          relevance_reason?: string | null
          relevance_score?: number | null
          rss_source_id?: string | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          source_name?: string | null
          source_url?: string
          status?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_items_blog_article_id_fkey"
            columns: ["blog_article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_items_latest_simlab_run_id_fkey"
            columns: ["latest_simlab_run_id"]
            isOneToOne: false
            referencedRelation: "simlab_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_items_rss_source_id_fkey"
            columns: ["rss_source_id"]
            isOneToOne: false
            referencedRelation: "rss_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          agent_prd_id: string | null
          animation_config: Json | null
          caption: string | null
          character_id: string | null
          created_at: string
          format: string | null
          funnel_type: string | null
          generation_meta: Json | null
          hashtags: string | null
          id: string
          image_urls: Json | null
          latest_simlab_run_id: string | null
          prompt_used: string | null
          remotion_component_preset_id: string | null
          remotion_composition_id: string | null
          remotion_template_id: string | null
          simlab_status: string | null
          simlab_validated_at: string | null
          slides_count: number | null
          slides_html: Json | null
          source_topic: string | null
          source_url: string | null
          status: string | null
          storyboard_id: string | null
          template_id: string | null
          title: string | null
          visual_mode: string | null
          workspace_squad_id: string | null
          workspace_id: string
        }
        Insert: {
          agent_prd_id?: string | null
          animation_config?: Json | null
          caption?: string | null
          character_id?: string | null
          created_at?: string
          format?: string | null
          funnel_type?: string | null
          generation_meta?: Json | null
          hashtags?: string | null
          id?: string
          image_urls?: Json | null
          latest_simlab_run_id?: string | null
          prompt_used?: string | null
          remotion_component_preset_id?: string | null
          remotion_composition_id?: string | null
          remotion_template_id?: string | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          slides_count?: number | null
          slides_html?: Json | null
          source_topic?: string | null
          source_url?: string | null
          status?: string | null
          storyboard_id?: string | null
          template_id?: string | null
          title?: string | null
          visual_mode?: string | null
          workspace_squad_id?: string | null
          workspace_id: string
        }
        Update: {
          agent_prd_id?: string | null
          animation_config?: Json | null
          caption?: string | null
          character_id?: string | null
          created_at?: string
          format?: string | null
          funnel_type?: string | null
          generation_meta?: Json | null
          hashtags?: string | null
          id?: string
          image_urls?: Json | null
          latest_simlab_run_id?: string | null
          prompt_used?: string | null
          remotion_component_preset_id?: string | null
          remotion_composition_id?: string | null
          remotion_template_id?: string | null
          simlab_status?: string | null
          simlab_validated_at?: string | null
          slides_count?: number | null
          slides_html?: Json | null
          source_topic?: string | null
          source_url?: string | null
          status?: string | null
          storyboard_id?: string | null
          template_id?: string | null
          title?: string | null
          visual_mode?: string | null
          workspace_squad_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_v2_agent_prd_id_fkey"
            columns: ["agent_prd_id"]
            isOneToOne: false
            referencedRelation: "agent_prds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_v2_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "brand_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_v2_latest_simlab_run_id_fkey"
            columns: ["latest_simlab_run_id"]
            isOneToOne: false
            referencedRelation: "simlab_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_v2_remotion_component_preset_id_fkey"
            columns: ["remotion_component_preset_id"]
            isOneToOne: false
            referencedRelation: "remotion_component_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_v2_remotion_composition_id_fkey"
            columns: ["remotion_composition_id"]
            isOneToOne: false
            referencedRelation: "remotion_compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_v2_remotion_template_id_fkey"
            columns: ["remotion_template_id"]
            isOneToOne: false
            referencedRelation: "remotion_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_v2_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "carousel_storyboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_v2_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_v2_workspace_squad_id_fkey"
            columns: ["workspace_squad_id"]
            isOneToOne: false
            referencedRelation: "workspace_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      remotion_ai_generations: {
        Row: {
          created_at: string
          created_by: string | null
          generation_kind: string
          id: string
          input_payload: Json
          latest_job_id: string | null
          metadata: Json
          model_name: string | null
          output_asset_id: string | null
          prompt_composed: Json
          prompt_original: string | null
          provider_name: string | null
          remotion_component_preset_id: string | null
          remotion_composition_id: string | null
          remotion_template_id: string | null
          source_post_id: string | null
          source_scroll_section_id: string | null
          source_storyboard_id: string | null
          source_video_generation_id: string | null
          status: string
          title: string | null
          updated_at: string
          video_project_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          generation_kind?: string
          id?: string
          input_payload?: Json
          latest_job_id?: string | null
          metadata?: Json
          model_name?: string | null
          output_asset_id?: string | null
          prompt_composed?: Json
          prompt_original?: string | null
          provider_name?: string | null
          remotion_component_preset_id?: string | null
          remotion_composition_id?: string | null
          remotion_template_id?: string | null
          source_post_id?: string | null
          source_scroll_section_id?: string | null
          source_storyboard_id?: string | null
          source_video_generation_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          video_project_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          generation_kind?: string
          id?: string
          input_payload?: Json
          latest_job_id?: string | null
          metadata?: Json
          model_name?: string | null
          output_asset_id?: string | null
          prompt_composed?: Json
          prompt_original?: string | null
          provider_name?: string | null
          remotion_component_preset_id?: string | null
          remotion_composition_id?: string | null
          remotion_template_id?: string | null
          source_post_id?: string | null
          source_scroll_section_id?: string | null
          source_storyboard_id?: string | null
          source_video_generation_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          video_project_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remotion_ai_generations_latest_job_id_fkey"
            columns: ["latest_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_output_asset_id_fkey"
            columns: ["output_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_remotion_component_preset_id_fkey"
            columns: ["remotion_component_preset_id"]
            isOneToOne: false
            referencedRelation: "remotion_component_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_remotion_composition_id_fkey"
            columns: ["remotion_composition_id"]
            isOneToOne: false
            referencedRelation: "remotion_compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_remotion_template_id_fkey"
            columns: ["remotion_template_id"]
            isOneToOne: false
            referencedRelation: "remotion_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_source_scroll_section_id_fkey"
            columns: ["source_scroll_section_id"]
            isOneToOne: false
            referencedRelation: "scroll_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_source_storyboard_id_fkey"
            columns: ["source_storyboard_id"]
            isOneToOne: false
            referencedRelation: "carousel_storyboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_source_video_generation_id_fkey"
            columns: ["source_video_generation_id"]
            isOneToOne: false
            referencedRelation: "ai_generated_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_video_project_id_fkey"
            columns: ["video_project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_ai_generations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      remotion_component_presets: {
        Row: {
          asset_bindings: Json
          component_key: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          is_system: boolean
          name: string
          preset_key: string
          preview_json: Json
          props_json: Json
          remotion_template_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          asset_bindings?: Json
          component_key: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name: string
          preset_key: string
          preview_json?: Json
          props_json?: Json
          remotion_template_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          asset_bindings?: Json
          component_key?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name?: string
          preset_key?: string
          preview_json?: Json
          props_json?: Json
          remotion_template_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remotion_component_presets_remotion_template_id_fkey"
            columns: ["remotion_template_id"]
            isOneToOne: false
            referencedRelation: "remotion_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_component_presets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      remotion_compositions: {
        Row: {
          composition_json: Json
          composition_key: string
          composition_kind: string
          created_at: string
          created_by: string | null
          duration_frames: number
          fps: number
          height: number
          id: string
          latest_export_id: string | null
          latest_job_id: string | null
          metadata: Json
          name: string
          props_json: Json
          remotion_component_preset_id: string | null
          remotion_template_id: string | null
          source_post_id: string | null
          source_scroll_section_id: string | null
          source_storyboard_id: string | null
          status: string
          updated_at: string
          video_project_id: string | null
          width: number
          workspace_id: string
        }
        Insert: {
          composition_json?: Json
          composition_key: string
          composition_kind?: string
          created_at?: string
          created_by?: string | null
          duration_frames?: number
          fps?: number
          height?: number
          id?: string
          latest_export_id?: string | null
          latest_job_id?: string | null
          metadata?: Json
          name: string
          props_json?: Json
          remotion_component_preset_id?: string | null
          remotion_template_id?: string | null
          source_post_id?: string | null
          source_scroll_section_id?: string | null
          source_storyboard_id?: string | null
          status?: string
          updated_at?: string
          video_project_id?: string | null
          width?: number
          workspace_id: string
        }
        Update: {
          composition_json?: Json
          composition_key?: string
          composition_kind?: string
          created_at?: string
          created_by?: string | null
          duration_frames?: number
          fps?: number
          height?: number
          id?: string
          latest_export_id?: string | null
          latest_job_id?: string | null
          metadata?: Json
          name?: string
          props_json?: Json
          remotion_component_preset_id?: string | null
          remotion_template_id?: string | null
          source_post_id?: string | null
          source_scroll_section_id?: string | null
          source_storyboard_id?: string | null
          status?: string
          updated_at?: string
          video_project_id?: string | null
          width?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remotion_compositions_latest_export_id_fkey"
            columns: ["latest_export_id"]
            isOneToOne: false
            referencedRelation: "video_exports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_compositions_latest_job_id_fkey"
            columns: ["latest_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_compositions_remotion_component_preset_id_fkey"
            columns: ["remotion_component_preset_id"]
            isOneToOne: false
            referencedRelation: "remotion_component_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_compositions_remotion_template_id_fkey"
            columns: ["remotion_template_id"]
            isOneToOne: false
            referencedRelation: "remotion_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_compositions_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_compositions_source_scroll_section_id_fkey"
            columns: ["source_scroll_section_id"]
            isOneToOne: false
            referencedRelation: "scroll_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_compositions_source_storyboard_id_fkey"
            columns: ["source_storyboard_id"]
            isOneToOne: false
            referencedRelation: "carousel_storyboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_compositions_video_project_id_fkey"
            columns: ["video_project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remotion_compositions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      remotion_templates: {
        Row: {
          composition_key: string
          created_at: string
          created_by: string | null
          default_props: Json
          description: string | null
          duration_frames: number
          fps: number
          height: number
          id: string
          is_public: boolean
          is_system: boolean
          name: string
          preview_json: Json
          props_schema: Json
          renderer_kind: string
          slug: string
          template_kind: string
          updated_at: string
          width: number
          workspace_id: string | null
        }
        Insert: {
          composition_key: string
          created_at?: string
          created_by?: string | null
          default_props?: Json
          description?: string | null
          duration_frames?: number
          fps?: number
          height?: number
          id?: string
          is_public?: boolean
          is_system?: boolean
          name: string
          preview_json?: Json
          props_schema?: Json
          renderer_kind?: string
          slug: string
          template_kind?: string
          updated_at?: string
          width?: number
          workspace_id?: string | null
        }
        Update: {
          composition_key?: string
          created_at?: string
          created_by?: string | null
          default_props?: Json
          description?: string | null
          duration_frames?: number
          fps?: number
          height?: number
          id?: string
          is_public?: boolean
          is_system?: boolean
          name?: string
          preview_json?: Json
          props_schema?: Json
          renderer_kind?: string
          slug?: string
          template_kind?: string
          updated_at?: string
          width?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remotion_templates_workspace_id_fkey"
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
          name: string | null
          url: string
          workspace_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          url: string
          workspace_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
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
      projects: {
        Row: {
          created_at: string
          description: string | null
          entry_file: string | null
          id: string
          name: string
          preview_meta: Json | null
          source_files_json: Json | null
          status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entry_file?: string | null
          id?: string
          name: string
          preview_meta?: Json | null
          source_files_json?: Json | null
          status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entry_file?: string | null
          id?: string
          name?: string
          preview_meta?: Json | null
          source_files_json?: Json | null
          status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      websites: {
        Row: {
          brand_kit_id: string | null
          created_at: string
          domain: string | null
          global_config: Json | null
          id: string
          name: string
          status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_kit_id?: string | null
          created_at?: string
          domain?: string | null
          global_config?: Json | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_kit_id?: string | null
          created_at?: string
          domain?: string | null
          global_config?: Json | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "websites_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "websites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      website_pages: {
        Row: {
          content_blocks: Json | null
          created_at: string
          id: string
          is_home: boolean | null
          seo_metadata: Json | null
          slug: string
          status: string | null
          title: string
          updated_at: string
          website_id: string
        }
        Insert: {
          content_blocks?: Json | null
          created_at?: string
          id?: string
          is_home?: boolean | null
          seo_metadata?: Json | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string
          website_id: string
        }
        Update: {
          content_blocks?: Json | null
          created_at?: string
          id?: string
          is_home?: boolean | null
          seo_metadata?: Json | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_pages_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      video_projects: {
        Row: {
          active_timeline_version_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fps: number
          id: string
          latest_analysis_job_id: string | null
          latest_export_id: string | null
          latest_source_asset_id: string | null
          latest_subtitle_track_id: string | null
          metadata: Json
          name: string
          ratio: string
          settings: Json
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active_timeline_version_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fps?: number
          id?: string
          latest_analysis_job_id?: string | null
          latest_export_id?: string | null
          latest_source_asset_id?: string | null
          latest_subtitle_track_id?: string | null
          metadata?: Json
          name: string
          ratio?: string
          settings?: Json
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active_timeline_version_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fps?: number
          id?: string
          latest_analysis_job_id?: string | null
          latest_export_id?: string | null
          latest_source_asset_id?: string | null
          latest_subtitle_track_id?: string | null
          metadata?: Json
          name?: string
          ratio?: string
          settings?: Json
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_assets: {
        Row: {
          asset_type: string
          bucket_name: string
          created_at: string
          created_by: string | null
          duration_ms: number | null
          file_name: string | null
          file_size_bytes: number | null
          height: number | null
          id: string
          metadata: Json
          mime_type: string | null
          public_url: string | null
          source_asset_id: string | null
          status: string
          storage_path: string
          updated_at: string
          video_project_id: string | null
          waveform_json: Json
          width: number | null
          workspace_id: string
        }
        Insert: {
          asset_type: string
          bucket_name?: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          public_url?: string | null
          source_asset_id?: string | null
          status?: string
          storage_path: string
          updated_at?: string
          video_project_id?: string | null
          waveform_json?: Json
          width?: number | null
          workspace_id: string
        }
        Update: {
          asset_type?: string
          bucket_name?: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          public_url?: string | null
          source_asset_id?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
          video_project_id?: string | null
          waveform_json?: Json
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_assets_video_project_id_fkey"
            columns: ["video_project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_timeline_versions: {
        Row: {
          command_log: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          summary: string | null
          timeline_json: Json
          updated_at: string
          version_number: number
          video_project_id: string
          workspace_id: string
        }
        Insert: {
          command_log?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          summary?: string | null
          timeline_json?: Json
          updated_at?: string
          version_number?: number
          video_project_id: string
          workspace_id: string
        }
        Update: {
          command_log?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          summary?: string | null
          timeline_json?: Json
          updated_at?: string
          version_number?: number
          video_project_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_timeline_versions_video_project_id_fkey"
            columns: ["video_project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_timeline_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_subtitle_tracks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          language_code: string
          latest_job_id: string | null
          provider_name: string | null
          source_asset_id: string | null
          style_overrides: Json
          style_preset: string
          transcript_text: string | null
          updated_at: string
          video_project_id: string
          words_json: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          language_code?: string
          latest_job_id?: string | null
          provider_name?: string | null
          source_asset_id?: string | null
          style_overrides?: Json
          style_preset?: string
          transcript_text?: string | null
          updated_at?: string
          video_project_id: string
          words_json?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          language_code?: string
          latest_job_id?: string | null
          provider_name?: string | null
          source_asset_id?: string | null
          style_overrides?: Json
          style_preset?: string
          transcript_text?: string | null
          updated_at?: string
          video_project_id?: string
          words_json?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_subtitle_tracks_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_subtitle_tracks_video_project_id_fkey"
            columns: ["video_project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_subtitle_tracks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_jobs: {
        Row: {
          cost_total: number | null
          created_at: string
          created_by: string | null
          error_message: string | null
          export_id: string | null
          finished_at: string | null
          generation_id: string | null
          id: string
          last_heartbeat_at: string | null
          latency_ms: number | null
          layer_composition_id: string | null
          locked_at: string | null
          locked_by: string | null
          model_name: string | null
          output_asset_id: string | null
          priority: number
          provider_capability: string | null
          provider_name: string | null
          remotion_ai_generation_id: string | null
          remotion_component_preset_id: string | null
          remotion_composition_id: string | null
          remotion_template_id: string | null
          request_payload: Json
          result_payload: Json
          retry_count: number
          scroll_section_id: string | null
          started_at: string | null
          status: string
          subtitle_track_id: string | null
          timeline_version_id: string | null
          updated_at: string
          video_project_id: string | null
          workspace_id: string
        }
        Insert: {
          cost_total?: number | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          export_id?: string | null
          finished_at?: string | null
          generation_id?: string | null
          id?: string
          last_heartbeat_at?: string | null
          latency_ms?: number | null
          layer_composition_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          model_name?: string | null
          output_asset_id?: string | null
          priority?: number
          provider_capability?: string | null
          provider_name?: string | null
          remotion_ai_generation_id?: string | null
          remotion_component_preset_id?: string | null
          remotion_composition_id?: string | null
          remotion_template_id?: string | null
          request_payload?: Json
          result_payload?: Json
          retry_count?: number
          scroll_section_id?: string | null
          started_at?: string | null
          status?: string
          subtitle_track_id?: string | null
          timeline_version_id?: string | null
          updated_at?: string
          video_project_id?: string | null
          workspace_id: string
        }
        Update: {
          cost_total?: number | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          export_id?: string | null
          finished_at?: string | null
          generation_id?: string | null
          id?: string
          last_heartbeat_at?: string | null
          latency_ms?: number | null
          layer_composition_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          model_name?: string | null
          output_asset_id?: string | null
          priority?: number
          provider_capability?: string | null
          provider_name?: string | null
          remotion_ai_generation_id?: string | null
          remotion_component_preset_id?: string | null
          remotion_composition_id?: string | null
          remotion_template_id?: string | null
          request_payload?: Json
          result_payload?: Json
          retry_count?: number
          scroll_section_id?: string | null
          started_at?: string | null
          status?: string
          subtitle_track_id?: string | null
          timeline_version_id?: string | null
          updated_at?: string
          video_project_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_jobs_remotion_ai_generation_id_fkey"
            columns: ["remotion_ai_generation_id"]
            isOneToOne: false
            referencedRelation: "remotion_ai_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_remotion_component_preset_id_fkey"
            columns: ["remotion_component_preset_id"]
            isOneToOne: false
            referencedRelation: "remotion_component_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_remotion_composition_id_fkey"
            columns: ["remotion_composition_id"]
            isOneToOne: false
            referencedRelation: "remotion_compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_remotion_template_id_fkey"
            columns: ["remotion_template_id"]
            isOneToOne: false
            referencedRelation: "remotion_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_job_steps: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          request_payload: Json
          result_payload: Json
          started_at: string | null
          status: string
          step_key: string
          updated_at: string
          video_job_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          request_payload?: Json
          result_payload?: Json
          started_at?: string | null
          status?: string
          step_key: string
          updated_at?: string
          video_job_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          request_payload?: Json
          result_payload?: Json
          started_at?: string | null
          status?: string
          step_key?: string
          updated_at?: string
          video_job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_job_steps_video_job_id_fkey"
            columns: ["video_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      video_exports: {
        Row: {
          codec: string
          created_at: string
          created_by: string | null
          export_preset: string
          format: string
          fps: number
          height: number
          id: string
          latest_job_id: string | null
          metadata: Json
          output_asset_id: string | null
          ratio: string
          remotion_composition_id: string | null
          settings_json: Json
          status: string
          updated_at: string
          video_project_id: string
          width: number
          workspace_id: string
        }
        Insert: {
          codec?: string
          created_at?: string
          created_by?: string | null
          export_preset: string
          format?: string
          fps?: number
          height: number
          id?: string
          latest_job_id?: string | null
          metadata?: Json
          output_asset_id?: string | null
          ratio: string
          remotion_composition_id?: string | null
          settings_json?: Json
          status?: string
          updated_at?: string
          video_project_id: string
          width: number
          workspace_id: string
        }
        Update: {
          codec?: string
          created_at?: string
          created_by?: string | null
          export_preset?: string
          format?: string
          fps?: number
          height?: number
          id?: string
          latest_job_id?: string | null
          metadata?: Json
          output_asset_id?: string | null
          ratio?: string
          remotion_composition_id?: string | null
          settings_json?: Json
          status?: string
          updated_at?: string
          video_project_id?: string
          width?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_exports_remotion_composition_id_fkey"
            columns: ["remotion_composition_id"]
            isOneToOne: false
            referencedRelation: "remotion_compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_exports_video_project_id_fkey"
            columns: ["video_project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_exports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_templates: {
        Row: {
          camera_module: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean
          is_system: boolean
          lighting_module: Json
          name: string
          negative_prompt: string | null
          preview_json: Json
          quality_module: Json
          style_module: Json
          template_kind: string
          thumbnail_url: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          camera_module?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          is_system?: boolean
          lighting_module?: Json
          name: string
          negative_prompt?: string | null
          preview_json?: Json
          quality_module?: Json
          style_module?: Json
          template_kind?: string
          thumbnail_url?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          camera_module?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          is_system?: boolean
          lighting_module?: Json
          name?: string
          negative_prompt?: string | null
          preview_json?: Json
          quality_module?: Json
          style_module?: Json
          template_kind?: string
          thumbnail_url?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generated_videos: {
        Row: {
          camera_movement: string | null
          created_at: string
          created_by: string | null
          credits_used: number | null
          duration_seconds: number
          id: string
          keyframe_asset_id: string | null
          latest_job_id: string | null
          lighting_preset: string | null
          metadata: Json
          negative_prompt: string | null
          prompt_composed: Json
          prompt_original: string
          provider_name: string | null
          quality_module: Json
          status: string
          style_template: string | null
          title: string | null
          updated_at: string
          video_asset_id: string | null
          video_project_id: string | null
          workspace_id: string
        }
        Insert: {
          camera_movement?: string | null
          created_at?: string
          created_by?: string | null
          credits_used?: number | null
          duration_seconds?: number
          id?: string
          keyframe_asset_id?: string | null
          latest_job_id?: string | null
          lighting_preset?: string | null
          metadata?: Json
          negative_prompt?: string | null
          prompt_composed?: Json
          prompt_original: string
          provider_name?: string | null
          quality_module?: Json
          status?: string
          style_template?: string | null
          title?: string | null
          updated_at?: string
          video_asset_id?: string | null
          video_project_id?: string | null
          workspace_id: string
        }
        Update: {
          camera_movement?: string | null
          created_at?: string
          created_by?: string | null
          credits_used?: number | null
          duration_seconds?: number
          id?: string
          keyframe_asset_id?: string | null
          latest_job_id?: string | null
          lighting_preset?: string | null
          metadata?: Json
          negative_prompt?: string | null
          prompt_composed?: Json
          prompt_original?: string
          provider_name?: string | null
          quality_module?: Json
          status?: string
          style_template?: string | null
          title?: string | null
          updated_at?: string
          video_asset_id?: string | null
          video_project_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_videos_video_project_id_fkey"
            columns: ["video_project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_videos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      layer_compositions: {
        Row: {
          canvas_height: number
          canvas_width: number
          created_at: string
          created_by: string | null
          final_asset_id: string | null
          id: string
          layers: Json
          latest_job_id: string | null
          metadata: Json
          prompt_original: string
          status: string
          updated_at: string
          video_project_id: string | null
          workspace_id: string
        }
        Insert: {
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          created_by?: string | null
          final_asset_id?: string | null
          id?: string
          layers?: Json
          latest_job_id?: string | null
          metadata?: Json
          prompt_original: string
          status?: string
          updated_at?: string
          video_project_id?: string | null
          workspace_id: string
        }
        Update: {
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          created_by?: string | null
          final_asset_id?: string | null
          id?: string
          layers?: Json
          latest_job_id?: string | null
          metadata?: Json
          prompt_original?: string
          status?: string
          updated_at?: string
          video_project_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "layer_compositions_video_project_id_fkey"
            columns: ["video_project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layer_compositions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scroll_sections: {
        Row: {
          active_remotion_composition_id: string | null
          background_image_asset_id: string | null
          background_video_asset_id: string | null
          code_bundle: Json
          content: Json
          created_at: string
          created_by: string | null
          id: string
          latest_job_id: string | null
          metadata: Json
          name: string
          preview_data: Json
          remotion_component_preset_id: string | null
          remotion_template_id: string | null
          renderer_config: Json
          scroll_effect_type: string
          section_order: number
          site_id: string | null
          source_generation_id: string | null
          status: string
          updated_at: string
          website_page_id: string | null
          workspace_id: string
        }
        Insert: {
          active_remotion_composition_id?: string | null
          background_image_asset_id?: string | null
          background_video_asset_id?: string | null
          code_bundle?: Json
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          latest_job_id?: string | null
          metadata?: Json
          name: string
          preview_data?: Json
          remotion_component_preset_id?: string | null
          remotion_template_id?: string | null
          renderer_config?: Json
          scroll_effect_type: string
          section_order?: number
          site_id?: string | null
          source_generation_id?: string | null
          status?: string
          updated_at?: string
          website_page_id?: string | null
          workspace_id: string
        }
        Update: {
          active_remotion_composition_id?: string | null
          background_image_asset_id?: string | null
          background_video_asset_id?: string | null
          code_bundle?: Json
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          latest_job_id?: string | null
          metadata?: Json
          name?: string
          preview_data?: Json
          remotion_component_preset_id?: string | null
          remotion_template_id?: string | null
          renderer_config?: Json
          scroll_effect_type?: string
          section_order?: number
          site_id?: string | null
          source_generation_id?: string | null
          status?: string
          updated_at?: string
          website_page_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scroll_sections_active_remotion_composition_id_fkey"
            columns: ["active_remotion_composition_id"]
            isOneToOne: false
            referencedRelation: "remotion_compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scroll_sections_remotion_component_preset_id_fkey"
            columns: ["remotion_component_preset_id"]
            isOneToOne: false
            referencedRelation: "remotion_component_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scroll_sections_remotion_template_id_fkey"
            columns: ["remotion_template_id"]
            isOneToOne: false
            referencedRelation: "remotion_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scroll_sections_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scroll_sections_website_page_id_fkey"
            columns: ["website_page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scroll_sections_workspace_id_fkey"
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
      viral_analyses: {
        Row: {
          analyzed_at: string | null
          content_sample: string | null
          content_type: string | null
          created_at: string
          emotional_trigger: string | null
          engagement_notes: string | null
          hook_formula: string | null
          id: string
          patterns_extracted: Json | null
          source_account: string | null
          source_url: string | null
          visual_style: string | null
          workspace_id: string
        }
        Insert: {
          analyzed_at?: string | null
          content_sample?: string | null
          content_type?: string | null
          created_at?: string
          emotional_trigger?: string | null
          engagement_notes?: string | null
          hook_formula?: string | null
          id?: string
          patterns_extracted?: Json | null
          source_account?: string | null
          source_url?: string | null
          visual_style?: string | null
          workspace_id: string
        }
        Update: {
          analyzed_at?: string | null
          content_sample?: string | null
          content_type?: string | null
          created_at?: string
          emotional_trigger?: string | null
          engagement_notes?: string | null
          hook_formula?: string | null
          id?: string
          patterns_extracted?: Json | null
          source_account?: string | null
          source_url?: string | null
          visual_style?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viral_analyses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
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
