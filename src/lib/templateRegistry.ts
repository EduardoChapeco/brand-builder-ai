import { TemplateMetadata } from './canvasEngine';
import { viralHook }          from './templates/viralHook';
import { editorialMagazine }  from './templates/editorialMagazine';
import { cleanWhite }         from './templates/cleanWhite';
import { minimalDark }        from './templates/minimalDark';
import { magnataSplit }       from './templates/magnataSplit';
import { cardFloat }          from './templates/cardFloat';
import { dataInsight }        from './templates/dataInsight';
import { analistaCraft }      from './templates/analistaCraft';
import { splitStatement }     from './templates/splitStatement';
import { iosNotification }    from './templates/iosNotification';

export const TEMPLATE_REGISTRY: TemplateMetadata[] = [
  {
    id: 'viral-hook',
    name: 'Viral Hook',
    category: 'bold',
    previewGradient: 'linear-gradient(135deg, #09090F 0%, #3b1170 100%)',
    previewAccent: '#fff',
    renderer: viralHook,
    supportedFormats: ['square', 'portrait', 'story'],
    imageSuggested: true,
    description: 'Texto gigante sobre fundo escuro. Máximo impacto.',
  },
  {
    id: 'split-statement',
    name: 'Split Statement',
    category: 'bold',
    previewGradient: 'linear-gradient(90deg, #1a1a2e 50%, #7C3AED 50%)',
    previewAccent: '#fff',
    renderer: splitStatement,
    supportedFormats: ['square', 'portrait'],
    imageSuggested: true,
    description: '50% imagem | 50% cor sólida com texto.',
  },
  {
    id: 'editorial-magazine',
    name: 'Editorial',
    category: 'editorial',
    previewGradient: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.3) 50%, transparent 100%), linear-gradient(135deg, #1a1a2e, #2d1b69)',
    previewAccent: '#fff',
    renderer: editorialMagazine,
    supportedFormats: ['square', 'portrait', 'story'],
    imageSuggested: true,
    description: 'Estilo capa de revista. Headline na base.',
  },
  {
    id: 'magnata-split',
    name: 'Magnata',
    category: 'editorial',
    previewGradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1000 100%)',
    previewAccent: '#c9a962',
    renderer: magnataSplit,
    supportedFormats: ['square', 'portrait'],
    imageSuggested: false,
    description: 'Luxo dark com detalhes dourados. Playfair.',
  },
  {
    id: 'analista-craft',
    name: 'Craft',
    category: 'editorial',
    previewGradient: 'linear-gradient(135deg, #f5f0e6 0%, #e8dcc8 100%)',
    previewAccent: '#1C1C1C',
    renderer: analistaCraft,
    supportedFormats: ['square', 'portrait'],
    imageSuggested: false,
    description: 'Jornalístico e investigativo. Textura de papel.',
  },
  {
    id: 'clean-white',
    name: 'Clean White',
    category: 'minimal',
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    previewAccent: '#111',
    renderer: cleanWhite,
    supportedFormats: ['square', 'portrait', 'landscape'],
    imageSuggested: false,
    description: 'Limpo, profissional. Ideal para LinkedIn.',
  },
  {
    id: 'card-float',
    name: 'Card Float',
    category: 'minimal',
    previewGradient: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
    previewAccent: '#fff',
    renderer: cardFloat,
    supportedFormats: ['square', 'portrait', 'story'],
    imageSuggested: false,
    description: 'Glassmorphism card sobre gradiente colorido.',
  },
  {
    id: 'data-insight',
    name: 'Data Insight',
    category: 'minimal',
    previewGradient: 'linear-gradient(135deg, #7C3AED 0%, #ffffff 40%)',
    previewAccent: '#111',
    renderer: dataInsight,
    supportedFormats: ['square', 'portrait'],
    imageSuggested: false,
    description: 'Para dados, listas e estatísticas com impacto.',
  },
  {
    id: 'minimal-dark',
    name: 'Minimal Dark',
    category: 'minimal',
    previewGradient: 'linear-gradient(135deg, #09090F 0%, #170a2e 100%)',
    previewAccent: '#94a3b8',
    renderer: minimalDark,
    supportedFormats: ['square', 'portrait', 'story', 'landscape'],
    imageSuggested: false,
    description: 'Dark clean com radial glow e texto grande.',
  },
  {
    id: 'ios-notification',
    name: 'iOS Lock',
    category: 'social',
    previewGradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 100%)',
    previewAccent: '#fff',
    renderer: iosNotification,
    supportedFormats: ['square', 'portrait', 'story'],
    imageSuggested: false,
    description: 'Simula notificação iOS. Alto CTR.',
  },
];

export const getTemplate = (id: string): TemplateMetadata | undefined =>
  TEMPLATE_REGISTRY.find(t => t.id === id);

export const getTemplatesByCategory = (category: string): TemplateMetadata[] =>
  TEMPLATE_REGISTRY.filter(t => t.category === category);
