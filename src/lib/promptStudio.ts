export type PromptPlatform = 'midjourney' | 'dalle3' | 'gemini_imagen' | 'firefly' | 'stable_diffusion';
export type PromptCategory = 'portrait' | 'product' | 'branding' | 'texture' | 'editorial';

export interface PromptVariable {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'color' | 'select';
  options?: string[]; // If type === select
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: PromptCategory;
  usageCount: number;
  base_template: string; // The raw prompt containing {var_id} placeholders
  variables: PromptVariable[];
  defaultValues: Record<string, string>;
  isSystem: boolean;
}

export const PLATFORM_PARAMS: Record<PromptPlatform, { prefix?: string, suffix: string, notes: string }> = {
  midjourney: {
    suffix: '--v 6 --style raw --q 2 --stylize 750',
    notes: 'Adicionar --no text antes dos parâmetros finais se usar palavras perigosas',
  },
  dalle3: {
    prefix: 'IMPORTANT: Do not add any text to the image. ',
    suffix: 'Photorealistic. High resolution. No watermarks.',
    notes: 'DALL·E 3 tende a gerar texto. O prefixo anti-texto é adicionado automaticamente.',
  },
  gemini_imagen: {
    suffix: 'Generate image. No text. No watermarks. High resolution photograph.',
    notes: 'Responde bem a comandos narrativos diretos.',
  },
  firefly: {
    suffix: 'Generative Fill disabled. No text. Professional quality.',
    notes: 'Firefly domina simulações de lentes e iluminação fotográfica real.',
  },
  stable_diffusion: {
    suffix: ', masterpiece, best quality, photorealistic, 8k uhd, dslr',
    notes: 'Requer negative prompts separados na UI nativa. Assegure a precisão dos tokens.',
  }
};

export const SYSTEM_PROMPTS: PromptTemplate[] = [
  {
    id: 'editorial_portrait_clean',
    name: 'Retrato Editorial Limpo',
    category: 'portrait',
    usageCount: 154,
    isSystem: true,
    variables: [
      { id: 'subject', label: 'Descrição do Assunto', placeholder: 'ex: executiva segurando tablet', type: 'text' },
      { id: 'brand_color', label: 'Cor da Marca', placeholder: '#7C3AED', type: 'color' }
    ],
    defaultValues: { subject: 'empreendedora de braços cruzados', brand_color: 'purple' },
    base_template: `{subject}. Editorial ultra-realista, 8K. Canon EOS R5, lente 85mm f/1.4, DOF rasa. ISO 100, 1/125s. Texturas: pele com poros visíveis. Iluminação: Key light 5600K 45°, backlight quente 3000K, fill light suave. Ambiente de estúdio clean, fundo neutro. Reflexos em tons de {brand_color} nas sombras suaves. Expressão natural, sem poses forçadas. LUT cinematográfico.`
  },
  {
    id: 'product_hero_shot',
    name: 'Hero Shot de Produto',
    category: 'product',
    usageCount: 302,
    isSystem: true,
    variables: [
      { id: 'product_type', label: 'Tipo de Produto', placeholder: 'ex: Frasco de Perfume de luxo', type: 'text' },
      { id: 'bg_color', label: 'Cor de Fundo', placeholder: 'dark black', type: 'text' },
      { id: 'environment', label: 'Atmosfera / Props', placeholder: 'ex: respingos sutis de água', type: 'text' }
    ],
    defaultValues: { product_type: 'Frasco de Perfume', bg_color: '#0D1117', environment: 'reflexos aquáticos' },
    base_template: `Ultra-realistic premium commercial photography of a {product_type}. The product is the absolute hero of the frame. Indulgent, rich visual focused on material quality. Solid background color: {bg_color}. Smooth matte surface. Product angled dynamically. {environment}. Soft studio softbox lighting with warm highlights. Eye-level, tight framing. 8K macro render.`
  },
  {
    id: 'texture_grainy_abstract',
    name: 'Textura Grainy Abstrata',
    category: 'texture',
    usageCount: 89,
    isSystem: true,
    variables: [
      { id: 'color1', label: 'Cor Primária', placeholder: 'deep blue', type: 'text' },
      { id: 'color2', label: 'Cor Secundária', placeholder: 'neon pink', type: 'text' }
    ],
    defaultValues: { color1: 'navy', color2: 'gold' },
    base_template: `Abstract grainy texture, {color1} and {color2} color scheme, organic flowing shapes, bold graphic design aesthetic, high contrast, smooth cinematic film grain overlay (30% intensity), no text, no recognizable objects. Contemporary print aesthetic.`
  }
];
