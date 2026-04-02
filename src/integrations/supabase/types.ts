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
          created_at: string
          ethnicity_notes: string | null
          expression_default: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          name: string
          physical_traits: Json | null
          sample_images: Json | null
          seed_prompt: string | null
          signature_item: string | null
          style_notes: string | null
          workspace_id: string
        }
        Insert: {
          age_range?: string | null
          archetype?: string | null
          created_at?: string
          ethnicity_notes?: string | null
          expression_default?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          physical_traits?: Json | null
          sample_images?: Json | null
          seed_prompt?: string | null
          signature_item?: string | null
          style_notes?: string | null
          workspace_id: string
        }
        Update: {
          age_range?: string | null
          archetype?: string | null
          created_at?: string
          ethnicity_notes?: string | null
          expression_default?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          physical_traits?: Json | null
          sample_images?: Json | null
          seed_prompt?: string | null
          signature_item?: string | null
          style_notes?: string | null
          workspace_id?: string
        }
        Relationships: [
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
      bio_link_blocks: {
        Row: {
          bio_link_id: string
          block_type: string
          config: Json
          created_at: string
          draft_only: boolean
          id: string
          is_visible: boolean
          layout_slot: string | null
          position: number
          size: string
          updated_at: string
          visibility_rules: Json
          workspace_id: string
        }
        Insert: {
          bio_link_id: string
          block_type: string
          config?: Json
          created_at?: string
          draft_only?: boolean
          id?: string
          is_visible?: boolean
          layout_slot?: string | null
          position?: number
          size?: string
          updated_at?: string
          visibility_rules?: Json
          workspace_id: string
        }
        Update: {
          bio_link_id?: string
          block_type?: string
          config?: Json
          created_at?: string
          draft_only?: boolean
          id?: string
          is_visible?: boolean
          layout_slot?: string | null
          position?: number
          size?: string
          updated_at?: string
          visibility_rules?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_link_blocks_bio_link_id_fkey"
            columns: ["bio_link_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bio_link_blocks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bio_link_versions: {
        Row: {
          bio_link_id: string
          created_at: string
          created_by: string | null
          id: string
          snapshot: Json
          status: string
          summary: string | null
          version_number: number
          workspace_id: string
        }
        Insert: {
          bio_link_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot?: Json
          status?: string
          summary?: string | null
          version_number: number
          workspace_id: string
        }
        Update: {
          bio_link_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot?: Json
          status?: string
          summary?: string | null
          version_number?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_link_versions_bio_link_id_fkey"
            columns: ["bio_link_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bio_link_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bio_links: {
        Row: {
          avatar_url: string | null
          background_config: Json
          bio_text: string | null
          blocks: Json | null
          created_at: string
          cta_enabled: boolean
          cta_text: string | null
          cta_url: string | null
          display_name: string | null
          ga4_measurement_id: string | null
          gtm_id: string | null
          header_config: Json
          id: string
          is_published: boolean | null
          latest_simlab_run_id: string | null
          latest_version_number: number
          layout_template_key: string
          links: Json | null
          meta_pixel_id: string | null
          profile: Json | null
          public_domain_id: string | null
          published_at: string | null
          published_html: string | null
          published_version_id: string | null
          scheduled_publish_at: string | null
          seo_config: Json | null
          seo_description: string | null
          seo_image_url: string | null
          seo_title: string | null
          slug: string
          social_links: Json
          status: string
          theme_config: Json | null
          theme_id: string | null
          theme_key: string
          theme_tokens: Json
          tiktok_pixel_id: string | null
          total_clicks: number
          total_views: number
          updated_at: string
          username: string | null
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          background_config?: Json
          bio_text?: string | null
          blocks?: Json | null
          created_at?: string
          cta_enabled?: boolean
          cta_text?: string | null
          cta_url?: string | null
          display_name?: string | null
          ga4_measurement_id?: string | null
          gtm_id?: string | null
          header_config?: Json
          id?: string
          is_published?: boolean | null
          latest_simlab_run_id?: string | null
          latest_version_number?: number
          layout_template_key?: string
          links?: Json | null
          meta_pixel_id?: string | null
          profile?: Json | null
          public_domain_id?: string | null
          published_at?: string | null
          published_html?: string | null
          published_version_id?: string | null
          scheduled_publish_at?: string | null
          seo_config?: Json | null
          seo_description?: string | null
          seo_image_url?: string | null
          seo_title?: string | null
          slug: string
          social_links?: Json
          status?: string
          theme_config?: Json | null
          theme_id?: string | null
          theme_key?: string
          theme_tokens?: Json
          tiktok_pixel_id?: string | null
          total_clicks?: number
          total_views?: number
          updated_at?: string
          username?: string | null
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          background_config?: Json
          bio_text?: string | null
          blocks?: Json | null
          created_at?: string
          cta_enabled?: boolean
          cta_text?: string | null
          cta_url?: string | null
          display_name?: string | null
          ga4_measurement_id?: string | null
          gtm_id?: string | null
          header_config?: Json
          id?: string
          is_published?: boolean | null
          latest_simlab_run_id?: string | null
          latest_version_number?: number
          layout_template_key?: string
          links?: Json | null
          meta_pixel_id?: string | null
          profile?: Json | null
          public_domain_id?: string | null
          published_at?: string | null
          published_html?: string | null
          published_version_id?: string | null
          scheduled_publish_at?: string | null
          seo_config?: Json | null
          seo_description?: string | null
          seo_image_url?: string | null
          seo_title?: string | null
          slug?: string
          social_links?: Json
          status?: string
          theme_config?: Json | null
          theme_id?: string | null
          theme_key?: string
          theme_tokens?: Json
          tiktok_pixel_id?: string | null
          total_clicks?: number
          total_views?: number
          updated_at?: string
          username?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_links_public_domain_id_fkey"
            columns: ["public_domain_id"]
            isOneToOne: false
            referencedRelation: "public_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bio_links_published_version_id_fkey"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "bio_link_versions"
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
      crm_bookings: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          scheduled_at: string | null
          service_name: string | null
          source_block_id: string | null
          source_module: string
          source_record_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          scheduled_at?: string | null
          service_name?: string | null
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          scheduled_at?: string | null
          service_name?: string | null
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_bookings_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_bookings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaign_events: {
        Row: {
          campaign_id: string
          contact_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaign_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaign_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          audience_filter: Json
          body_html: string | null
          created_at: string
          id: string
          name: string
          sent_at: string | null
          source_module: string
          status: string
          subject: string | null
          total_recipients: number
          total_sent: number
          workspace_id: string
        }
        Insert: {
          audience_filter?: Json
          body_html?: string | null
          created_at?: string
          id?: string
          name: string
          sent_at?: string | null
          source_module?: string
          status?: string
          subject?: string | null
          total_recipients?: number
          total_sent?: number
          workspace_id: string
        }
        Update: {
          audience_filter?: Json
          body_html?: string | null
          created_at?: string
          id?: string
          name?: string
          sent_at?: string | null
          source_module?: string
          status?: string
          subject?: string | null
          total_recipients?: number
          total_sent?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          created_at: string
          id: string
          last_interaction_at: string | null
          metadata: Json
          name: string | null
          notes: string | null
          phone: string | null
          primary_email: string | null
          source_block_id: string | null
          source_module: string
          source_record_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          metadata?: Json
          name?: string | null
          notes?: string | null
          phone?: string | null
          primary_email?: string | null
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          metadata?: Json
          name?: string | null
          notes?: string | null
          phone?: string | null
          primary_email?: string | null
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_downloads: {
        Row: {
          asset_name: string | null
          asset_url: string | null
          contact_id: string
          created_at: string
          id: string
          metadata: Json
          source_block_id: string | null
          source_module: string
          source_record_id: string | null
          workspace_id: string
        }
        Insert: {
          asset_name?: string | null
          asset_url?: string | null
          contact_id: string
          created_at?: string
          id?: string
          metadata?: Json
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          workspace_id: string
        }
        Update: {
          asset_name?: string | null
          asset_url?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_downloads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_downloads_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_downloads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_event_registrations: {
        Row: {
          contact_id: string
          created_at: string
          event_date: string | null
          event_name: string | null
          id: string
          metadata: Json
          source_block_id: string | null
          source_module: string
          source_record_id: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          event_date?: string | null
          event_name?: string | null
          id?: string
          metadata?: Json
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          event_date?: string | null
          event_name?: string | null
          id?: string
          metadata?: Json
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_event_registrations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_event_registrations_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_event_registrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          interaction_type: string
          payload: Json
          source_block_id: string | null
          source_module: string
          source_record_id: string | null
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          interaction_type: string
          payload?: Json
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          interaction_type?: string
          payload?: Json
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_messages: {
        Row: {
          body: string | null
          contact_id: string
          created_at: string
          fields: Json
          id: string
          replied_at: string | null
          source_block_id: string | null
          source_module: string
          source_record_id: string | null
          status: string
          subject: string | null
          workspace_id: string
        }
        Insert: {
          body?: string | null
          contact_id: string
          created_at?: string
          fields?: Json
          id?: string
          replied_at?: string | null
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          subject?: string | null
          workspace_id: string
        }
        Update: {
          body?: string | null
          contact_id?: string
          created_at?: string
          fields?: Json
          id?: string
          replied_at?: string | null
          source_block_id?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          subject?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_messages_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          label: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          label: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          label?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_workspace_id_fkey"
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
          slides_plan: Json | null
          topic: string
          workspace_id: string
        }
        Insert: {
          arc_type?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          slides_plan?: Json | null
          topic?: string
          workspace_id: string
        }
        Update: {
          arc_type?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
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
      public_domains: {
        Row: {
          created_at: string
          dns_status: string
          domain: string
          id: string
          metadata: Json
          module_type: string
          record_id: string
          updated_at: string
          verified: boolean
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dns_status?: string
          domain: string
          id?: string
          metadata?: Json
          module_type?: string
          record_id: string
          updated_at?: string
          verified?: boolean
          workspace_id: string
        }
        Update: {
          created_at?: string
          dns_status?: string
          domain?: string
          id?: string
          metadata?: Json
          module_type?: string
          record_id?: string
          updated_at?: string
          verified?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_domains_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      public_page_events: {
        Row: {
          block_id: string | null
          block_type: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          metadata: Json
          module_type: string
          published_version_id: string | null
          record_id: string
          record_type: string
          referrer: string | null
          session_id: string | null
          slug: string
          target_url: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
          workspace_id: string
        }
        Insert: {
          block_id?: string | null
          block_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          metadata?: Json
          module_type?: string
          published_version_id?: string | null
          record_id: string
          record_type?: string
          referrer?: string | null
          session_id?: string | null
          slug: string
          target_url?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
          workspace_id: string
        }
        Update: {
          block_id?: string | null
          block_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          module_type?: string
          published_version_id?: string | null
          record_id?: string
          record_type?: string
          referrer?: string | null
          session_id?: string | null
          slug?: string
          target_url?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_page_events_published_version_id_fkey"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "bio_link_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_page_events_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_page_events_workspace_id_fkey"
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
