// ============================================================
// PostGen Canvas Engine
// Fixed-pixel artboard that scales via transform: scale()
// ============================================================

export type ArtboardFormat = 'square' | 'portrait' | 'story' | 'landscape';
export type VisualMode = 'editorial' | 'bold' | 'minimal' | 'dark' | 'documentary';
export type FunnelType = 'awareness' | 'educational' | 'leads' | 'sales' | 'engagement';

export interface ArtboardDimension {
  width: number;
  height: number;
  label: string;
  aspectLabel: string;
}

export const ARTBOARD_DIMENSIONS: Record<ArtboardFormat, ArtboardDimension> = {
  square:    { width: 540, height: 540,  label: 'Post 1:1',   aspectLabel: '1:1'   },
  portrait:  { width: 540, height: 675,  label: 'Post 4:5',   aspectLabel: '4:5'   },
  story:     { width: 540, height: 960,  label: 'Story 9:16', aspectLabel: '9:16'  },
  landscape: { width: 600, height: 314,  label: 'Paisagem',   aspectLabel: '1.91:1'},
};

export interface BrandKit {
  color_primary:    string;
  color_secondary:  string;
  color_accent:     string;
  color_bg_dark:    string;
  color_bg_light:   string;
  color_text_dark:  string;
  color_text_light: string;
  font_headline:    string;
  font_body:        string;
  font_accent:      string;
  logo_url:         string | null;
  watermark_text:   string | null;
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  color_primary:    '#7C3AED',
  color_secondary:  '#06B6D4',
  color_accent:     '#F59E0B',
  color_bg_dark:    '#09090F',
  color_bg_light:   '#FFFFFF',
  color_text_dark:  '#111111',
  color_text_light: '#F8FAFC',
  font_headline:    'Bebas Neue',
  font_body:        'DM Sans',
  font_accent:      'Playfair Display',
  logo_url:         null,
  watermark_text:   null,
};

export interface SlideData {
  headline:      string;
  body?:         string;
  cta?:          string;
  bgImageUrl?:   string;
  bgOpacity?:    number;
  slideNumber?:  number;
  totalSlides?:  number;
  format?:       ArtboardFormat;
}

export type TemplateRenderer = (data: SlideData, brand: BrandKit) => string;

export interface TemplateMetadata {
  id:               string;
  name:             string;
  category:         'bold' | 'editorial' | 'minimal' | 'social';
  previewGradient:  string;   // CSS gradient for thumbnail
  previewAccent:    string;   // text color on thumbnail
  renderer:         TemplateRenderer;
  supportedFormats: ArtboardFormat[];
  imageSuggested:   boolean;
  description:      string;
}

/**
 * Calculate the scale factor for the artboard to fit the container.
 * The artboard itself is always fixed at its native dimensions.
 */
export function calculateScale(
  containerWidth:  number,
  containerHeight: number,
  artboardWidth:   number,
  artboardHeight:  number,
  padding = 64
): number {
  const scaleX = (containerWidth  - padding) / artboardWidth;
  const scaleY = (containerHeight - padding) / artboardHeight;
  return Math.min(scaleX, scaleY, 1.5); // Allow slight upscale on very large screens
}

/**
 * Build the complete font @import string for a brand kit.
 */
export function buildFontImport(brand: BrandKit): string {
  const fonts = [
    'Bebas+Neue',
    'DM+Sans:wght@300;400;500;600;700',
    'Playfair+Display:ital,wght@0,400;0,600;0,700;1,400',
    'Syne:wght@400;700;800',
    'DM+Serif+Display',
  ];
  return `@import url('https://fonts.googleapis.com/css2?family=${fonts.join('&family=')}&display=swap');`;
}

/**
 * Get artboard dimensions for a given format with fallback.
 */
export function getArtboardDimensions(format: ArtboardFormat = 'square'): ArtboardDimension {
  return ARTBOARD_DIMENSIONS[format] ?? ARTBOARD_DIMENSIONS.square;
}
