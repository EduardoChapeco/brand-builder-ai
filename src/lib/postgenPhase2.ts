import type { BrandKit } from '@/lib/canvasEngine';
import type { Json, Tables } from '@/integrations/supabase/types';

export type PromptPlatform = 'midjourney' | 'dalle3' | 'gemini_imagen' | 'firefly' | 'stable_diffusion';
export type PromptCategory = 'portrait' | 'product' | 'branding' | 'texture' | 'editorial';
export type PromptVariableType = 'text' | 'color' | 'select' | 'toggle';

export type ImagePromptTemplateRecord = Tables<'image_prompt_templates'>;
export type BrandCharacterRecord = Tables<'brand_characters'>;
export type MediaAssetRecord = Tables<'media_assets'>;
export type ViralAnalysisRecord = Tables<'viral_analyses'>;
export type CarouselStoryboardRecord = Tables<'carousel_storyboards'>;

export interface PromptVariableDefinition {
  id: string;
  label: string;
  placeholder: string;
  type: PromptVariableType;
  options?: string[];
}

export interface PromptTemplateModel {
  id: string;
  workspace_id: string | null;
  name: string;
  category: PromptCategory;
  subcategory: string | null;
  base_template: string;
  variables: PromptVariableDefinition[];
  default_values: Record<string, string>;
  platform_params: Record<string, Json>;
  is_system: boolean;
  usage_count: number;
  created_at: string | null;
}

export interface CarouselArcDefinition {
  id: string;
  name: string;
  description: string;
  ideal_funnel: string;
  slide_roles: string[];
}

export interface ProductShotPreset {
  id: string;
  name: string;
  description: string;
  promptHint: string;
}

export const PHASE2_PROMPT_PLATFORMS: Array<{
  id: PromptPlatform;
  label: string;
  helper: string;
}> = [
  { id: 'midjourney', label: 'Midjourney', helper: 'Melhor para prompts fotográficos longos + sufixos --ar/--stylize.' },
  { id: 'dalle3', label: 'DALL·E 3', helper: 'Precisa instrução explícita anti-texto no início do prompt.' },
  { id: 'gemini_imagen', label: 'Gemini Imagen', helper: 'Funciona bem com instruções diretas e contexto de marca.' },
  { id: 'firefly', label: 'Firefly', helper: 'Termos fotográficos e composição clara funcionam melhor.' },
  { id: 'stable_diffusion', label: 'Stable Diffusion', helper: 'Ideal para prompt + negative prompt separados.' },
];

export const PLATFORM_PARAM_SUFFIX: Record<PromptPlatform, { prefix?: string; suffix: string; notes: string }> = {
  midjourney: {
    suffix: '--ar {ratio} --v 6 --style raw --q 2 --stylize 750',
    notes: 'Adicione --no text antes dos parâmetros finais quando quiser evitar texto.',
  },
  dalle3: {
    prefix: 'IMPORTANT: Do not add any text to the image. ',
    suffix: 'Photorealistic. High resolution. No watermarks. No text overlays.',
    notes: 'DALL·E 3 tende a inventar lettering se o prompt não bloquear texto.',
  },
  gemini_imagen: {
    suffix: 'Generate image. No text. No watermarks.',
    notes: 'Prefere instruções objetivas e claras em linguagem natural.',
  },
  firefly: {
    suffix: 'Generative Fill disabled. No text. Professional quality.',
    notes: 'Responde bem a presets fotográficos e composição descritiva.',
  },
  stable_diffusion: {
    suffix: ', masterpiece, best quality, photorealistic, 8k uhd, dslr',
    notes: 'Use negative prompt separado para watermark, blur e distorções.',
  },
};

export const CAROUSEL_ARCS: CarouselArcDefinition[] = [
  {
    id: 'hook_reveal',
    name: 'Gancho → Revelação',
    description: 'Pergunta impossível, tensão crescente e solução no final.',
    ideal_funnel: 'Awareness',
    slide_roles: ['hook', 'agitation', 'discovery', 'solution', 'proof', 'cta'],
  },
  {
    id: 'numbered_tips',
    name: 'Dicas Numeradas',
    description: 'Formato listicle clássico com retenção alta.',
    ideal_funnel: 'Educativo',
    slide_roles: ['hook', 'tip', 'tip', 'tip', 'tip', 'summary_cta'],
  },
  {
    id: 'before_after',
    name: 'Antes → Depois',
    description: 'Mostra contraste forte entre problema e transformação.',
    ideal_funnel: 'Captar Leads',
    slide_roles: ['before_problem', 'agitation', 'turning_point', 'transformation', 'after_result', 'cta'],
  },
  {
    id: 'manifesto',
    name: 'Manifesto de Marca',
    description: 'Declaração forte + argumentos + CTA.',
    ideal_funnel: 'Engajamento',
    slide_roles: ['declaration', 'argument_1', 'argument_2', 'argument_3', 'vulnerable_moment', 'cta'],
  },
  {
    id: 'journey_case',
    name: 'Jornada / Case',
    description: 'Case de transformação em etapas.',
    ideal_funnel: 'Vendas',
    slide_roles: ['situation', 'challenge', 'decision', 'action', 'result', 'lesson', 'cta'],
  },
  {
    id: 'educational_thread',
    name: 'Thread Educacional',
    description: 'Explicação progressiva de um conceito complexo.',
    ideal_funnel: 'Educativo',
    slide_roles: ['hook_question', 'concept_intro', 'deep_dive_1', 'deep_dive_2', 'common_mistake', 'key_insight', 'cta'],
  },
  {
    id: 'social_proof_stack',
    name: 'Prova Social em Cascata',
    description: 'Depoimentos e dados em sequência.',
    ideal_funnel: 'Vendas',
    slide_roles: ['claim', 'testimonial_1', 'testimonial_2', 'data_point', 'testimonial_3', 'guarantee_cta'],
  },
];

export const PRODUCT_SHOT_PRESETS: ProductShotPreset[] = [
  {
    id: 'hero_shot',
    name: 'Hero Shot',
    description: 'Produto heroico, dramático e premium.',
    promptHint: 'Produto central, fundo limpo, iluminação premium, textura ultra-realista.',
  },
  {
    id: 'flat_lay',
    name: 'Flat Lay',
    description: 'Top-down organizado com repetição visual.',
    promptHint: 'Visão 90°, múltiplas unidades, composição edge-to-edge e labels nítidos.',
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Produto em contexto de uso real.',
    promptHint: 'Integre o produto em ambiente natural mantendo-o como hero element.',
  },
  {
    id: 'explosion',
    name: 'Explosion',
    description: 'Ingredientes/props explodindo ao redor do produto.',
    promptHint: 'Energia visual, partículas congeladas no ar e alto contraste.',
  },
  {
    id: 'texture',
    name: 'Detail / Texture',
    description: 'Close extremo focado em detalhe e materialidade.',
    promptHint: 'Macro photography, shallow depth of field, foco em textura e reflexos.',
  },
  {
    id: 'stack_360',
    name: '360° Stack',
    description: 'Múltiplos ângulos empilhados do mesmo produto.',
    promptHint: 'Composição modular com 3 a 4 ângulos do produto na mesma cena.',
  },
];

const isObject = (value: unknown): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseJsonArray = <T>(value: Json | null, fallback: T[] = []): T[] =>
  Array.isArray(value) ? (value as T[]) : fallback;

export const parseJsonObject = <T extends Record<string, unknown>>(value: Json | null, fallback: T): T =>
  isObject(value) ? (value as T) : fallback;

export const normalizePromptTemplate = (record: ImagePromptTemplateRecord): PromptTemplateModel => ({
  id: record.id,
  workspace_id: record.workspace_id,
  name: record.name,
  category: record.category as PromptCategory,
  subcategory: record.subcategory,
  base_template: record.base_template,
  variables: parseJsonArray<PromptVariableDefinition>(record.variables),
  default_values: parseJsonObject<Record<string, string>>(record.default_values, {}),
  platform_params: parseJsonObject<Record<string, Json>>(record.platform_params, {}),
  is_system: Boolean(record.is_system),
  usage_count: record.usage_count || 0,
  created_at: record.created_at,
});

const replaceToken = (template: string, token: string, value: string) =>
  template.replace(new RegExp(`\\[${token}\\]`, 'g'), value).replace(new RegExp(`\\{${token}\\}`, 'g'), value);

export const compilePrompt = (
  template: PromptTemplateModel,
  values: Record<string, string>,
  platform: PromptPlatform,
  aspectRatio: string,
  includeBrandParams: boolean,
  brandKit?: BrandKit | null,
  characterSeed?: string | null,
) => {
  const mergedValues = { ...template.default_values, ...values };
  let prompt = template.base_template;

  for (const variable of template.variables) {
    const value = mergedValues[variable.id] || variable.placeholder || '';
    prompt = replaceToken(prompt, variable.id, value);
    prompt = replaceToken(prompt, variable.id.toUpperCase(), value);
  }

  if (includeBrandParams && brandKit) {
    const palette = [brandKit.color_primary, brandKit.color_secondary, brandKit.color_accent].filter(Boolean).join(', ');
    prompt = replaceToken(prompt, 'PALETA_DA_MARCA', palette);
    prompt = replaceToken(prompt, 'BRAND_COLORS', palette);
  }

  if (characterSeed) {
    prompt = `${characterSeed}\n\n${prompt}`;
  }

  const platformConfig = PLATFORM_PARAM_SUFFIX[platform];
  const suffix = platformConfig.suffix.replace('{ratio}', aspectRatio);
  const warnings = [platformConfig.notes];

  if (platform === 'stable_diffusion') {
    warnings.push('Use negative prompt separado na plataforma final para bloquear texto e watermark.');
  }

  if (platformConfig.prefix) {
    prompt = `${platformConfig.prefix}${prompt}`;
  }

  prompt = replaceToken(prompt, 'TARGET_PLATFORM_PARAMS', suffix);

  if (!prompt.includes(suffix)) {
    prompt = `${prompt}\n${suffix}`;
  }

  return {
    prompt: prompt.trim(),
    warnings,
  };
};

export const inferProductCategory = (description: string) => {
  const normalized = description.toLowerCase();
  if (/perfume|skincare|serum|cosmetic|maquiagem|batom|creme/.test(normalized)) return 'Cosmético';
  if (/chocolate|snack|food|bebida|cookie|bar|cafe|suco/.test(normalized)) return 'Alimento';
  if (/camisa|moda|vestuario|jaqueta|roupa|tenis/.test(normalized)) return 'Vestuário';
  if (/phone|tech|fone|notebook|gadget|hardware/.test(normalized)) return 'Tech';
  return 'Outro';
};

export const summarizeViralPatterns = (analyses: ViralAnalysisRecord[]) => {
  const grouped = new Map<string, { title: string; count: number; example: string; kind: string; value: string }>();

  analyses.forEach((analysis) => {
    const candidates = [
      ['hook', analysis.hook_formula],
      ['visual', analysis.visual_style],
      ['trigger', analysis.emotional_trigger],
      ['type', analysis.content_type],
    ] as const;

    candidates.forEach(([kind, value]) => {
      if (!value) return;
      const key = `${kind}:${value}`;
      const current = grouped.get(key);
      if (current) {
        current.count += 1;
      } else {
        grouped.set(key, {
          title: value,
          count: 1,
          example: analysis.content_sample || analysis.source_account || analysis.source_url || value,
          kind,
          value,
        });
      }
    });
  });

  return Array.from(grouped.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
};
