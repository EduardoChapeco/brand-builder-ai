export type WebsiteStatus = 'draft' | 'published' | 'archived';

export type WebsiteRecord = {
  id: string;
  workspace_id: string;
  name: string;
  domain: string | null;
  status: WebsiteStatus;
  global_config: Record<string, unknown> | null;
  brand_kit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsitePageRecord = {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  is_home: boolean;
  status: 'draft' | 'published';
  seo_metadata: Record<string, unknown> | null;
  content_blocks: unknown;
  created_at: string;
  updated_at: string;
  is_temporary?: boolean;
};

export type WebsiteSectionType =
  | 'hero'
  | 'features'
  | 'benefits'
  | 'pricing'
  | 'faq'
  | 'testimonials'
  | 'cta'
  | 'contact_form'
  | 'gallery'
  | 'video_embed'
  | 'stats'
  | 'team'
  | 'blog_feed'
  | 'newsletter'
  | 'social_proof'
  | 'comparison_table'
  | 'timeline'
  | 'custom_html'
  | 'legacy_block';

export type WebsiteBackgroundType = 'color' | 'gradient' | 'image' | 'pattern';

export type WebsiteScrollAnimation =
  | 'none'
  | 'fade_up'
  | 'fade_in'
  | 'slide_left'
  | 'slide_right'
  | 'zoom_in';

export type WebsiteSectionRecord = {
  id: string;
  page_id: string;
  workspace_id: string;
  section_type: WebsiteSectionType;
  sort_order: number;
  is_visible: boolean;
  content: Record<string, unknown>;
  bg_type: WebsiteBackgroundType;
  bg_value: string | null;
  padding_top: string;
  padding_bottom: string;
  style_override: Record<string, unknown>;
  scroll_animation: WebsiteScrollAnimation;
  version: number;
  snapshot_history: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
  is_temporary?: boolean;
};

export type WebsiteBuilderData = {
  website: WebsiteRecord;
  pages: WebsitePageRecord[];
  sectionsByPage: Record<string, WebsiteSectionRecord[]>;
  sourceMode: 'sections' | 'legacy';
};

export type WebsiteSectionLibraryItem = {
  type: WebsiteSectionType;
  label: string;
  description: string;
  group: 'Topo' | 'Conteudo' | 'Conversao' | 'Custom';
};
