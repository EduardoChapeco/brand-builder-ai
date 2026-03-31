/**
 * Presentation Templates — Pingo Slides style
 * 8 native layouts for full HTML presentations
 */
import { BrandKit, PresentationSlide, buildFontImport } from './canvasEngine';

export type PresentationTemplateRenderer = (
  slide: PresentationSlide,
  brand: BrandKit,
  w: number,
  h: number
) => string;

export interface PresentationTemplateMetadata {
  id:              string;
  name:            string;
  icon:            string;
  previewGradient: string;
  previewAccent:   string;
  description:     string;
  renderer:        PresentationTemplateRenderer;
}

// ─── Shared CSS base ──────────────────────────────────────────────────────────
const base = (brand: BrandKit, w: number, h: number) => `
${buildFontImport(brand)}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${w}px; height:${h}px; overflow:hidden; background: ${brand.color_bg_dark}; }
.artboard { width:${w}px; height:${h}px; position:relative; overflow:hidden;
  display:flex; flex-direction:column; }
.bg-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; }
.overlay { position:absolute; inset:0; z-index:1; }
.content { position:relative; z-index:2; }
`;

// ─── 1. Title Hero ────────────────────────────────────────────────────────────
const titleHero: PresentationTemplateRenderer = (slide, brand, w, h) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
${base(brand, w, h)}
.artboard { align-items:center; justify-content:center; text-align:center;
  background: ${slide.bgColor || `linear-gradient(135deg, ${brand.color_bg_dark}, #1a0a2e)`}; }
.overlay { background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%); }
.content { display:flex; flex-direction:column; align-items:center; padding:${h * 0.08}px ${w * 0.08}px; gap:${h * 0.025}px; }
.eyebrow { font-family:'DM Sans',sans-serif; font-size:${h*0.018}px; font-weight:600;
  letter-spacing:0.15em; text-transform:uppercase; color:${brand.color_accent}; }
.title { font-family:'${brand.font_headline}','Bebas Neue',sans-serif; font-size:${h*0.1}px;
  line-height:1.05; color:${brand.color_text_light}; text-shadow:0 4px 32px rgba(0,0,0,0.5);
  max-width:${w*0.85}px; }
.sep { width:60px; height:3px; border-radius:2px; background:linear-gradient(90deg, ${brand.color_primary}, ${brand.color_accent}); margin:${h*0.015}px auto; }
.subtitle { font-family:'DM Sans',sans-serif; font-size:${h*0.032}px; color:rgba(255,255,255,0.7); max-width:${w*0.65}px; line-height:1.5; }
.watermark { position:absolute; bottom:${h*0.03}px; right:${w*0.04}px; font-family:'DM Sans',sans-serif; font-size:${h*0.018}px; color:rgba(255,255,255,0.2); z-index:3; }
</style></head><body>
<div class="artboard">
  ${slide.bgImageUrl ? `<img class="bg-img" src="${slide.bgImageUrl}" alt="" crossorigin="anonymous"/>` : ''}
  <div class="overlay"></div>
  <div class="content">
    ${brand.watermark_text ? `<div class="eyebrow" data-postgen-field="eyebrow" data-postgen-editable="true">${brand.watermark_text}</div>` : ''}
    <h1 class="title" data-postgen-field="headline" data-postgen-editable="true">${slide.title || 'Título da Apresentação'}</h1>
    <div class="sep"></div>
    ${slide.subtitle ? `<p class="subtitle" data-postgen-field="body" data-postgen-editable="true">${slide.subtitle}</p>` : ''}
  </div>
  <div class="watermark">${brand.watermark_text || ''}</div>
</div>
</body></html>`;

// ─── 2. Content Bullets ───────────────────────────────────────────────────────
const contentBullets: PresentationTemplateRenderer = (slide, brand, w, h) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
${base(brand, w, h)}
.artboard { background: ${slide.bgColor || brand.color_bg_dark}; padding:${h*0.07}px ${w*0.08}px; justify-content:center; }
.accent-bar { width:4px; height:${h*0.06}px; background:linear-gradient(to bottom, ${brand.color_primary}, ${brand.color_accent}); border-radius:2px; margin-right:${w*0.025}px; flex-shrink:0; }
.header { display:flex; align-items:center; margin-bottom:${h*0.04}px; }
.slide-title { font-family:'${brand.font_headline}','Bebas Neue',sans-serif; font-size:${h*0.072}px; line-height:1; color:${brand.color_text_light}; }
.body-text { font-family:'DM Sans',sans-serif; font-size:${h*0.032}px; color:rgba(255,255,255,0.7); line-height:1.6; margin-bottom:${h*0.04}px; }
.bullets { display:flex; flex-direction:column; gap:${h*0.022}px; }
.bullet { display:flex; align-items:flex-start; gap:${w*0.02}px; }
.bullet-dot { width:${h*0.012}px; height:${h*0.012}px; border-radius:50%; background:${brand.color_primary}; flex-shrink:0; margin-top:${h*0.011}px; }
.bullet-text { font-family:'DM Sans',sans-serif; font-size:${h*0.033}px; color:rgba(255,255,255,0.85); line-height:1.5; }
.slide-num { position:absolute; bottom:${h*0.03}px; right:${w*0.04}px; font-family:'DM Sans',sans-serif; font-size:${h*0.018}px; color:rgba(255,255,255,0.2); z-index:3; }
</style></head><body>
<div class="artboard">
  ${slide.bgImageUrl ? `<img class="bg-img" src="${slide.bgImageUrl}" alt="" crossorigin="anonymous"/>` : ''}
  <div class="overlay" style="background:rgba(9,9,15,0.85)"></div>
  <div class="content" style="width:100%">
    <div class="header">
      <div class="accent-bar"></div>
      <h2 class="slide-title" data-postgen-field="headline" data-postgen-editable="true">${slide.title || 'Título'}</h2>
    </div>
    ${slide.body ? `<p class="body-text" data-postgen-field="body" data-postgen-editable="true">${slide.body}</p>` : ''}
    <div class="bullets">
      ${(slide.bullets || ['Ponto principal um', 'Segundo ponto importante', 'Terceiro insight']).map(b => `
        <div class="bullet">
          <div class="bullet-dot"></div>
          <span class="bullet-text" data-postgen-editable="true">${b}</span>
        </div>`).join('')}
    </div>
  </div>
  <div class="slide-num">${brand.watermark_text || ''}</div>
</div>
</body></html>`;

// ─── 3. Split Image ───────────────────────────────────────────────────────────
const splitImage: PresentationTemplateRenderer = (slide, brand, w, h) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
${base(brand, w, h)}
.artboard { flex-direction:row; background:${brand.color_bg_dark}; }
.img-side { width:45%; height:100%; position:relative; overflow:hidden; flex-shrink:0; }
.img-side img { width:100%; height:100%; object-fit:cover; }
.img-overlay { position:absolute; inset:0; background:linear-gradient(to right, transparent 60%, ${brand.color_bg_dark} 100%); }
.text-side { flex:1; display:flex; flex-direction:column; justify-content:center; padding:${h*0.06}px ${w*0.06}px; }
.label { font-family:'DM Sans',sans-serif; font-size:${h*0.018}px; font-weight:600;
  letter-spacing:0.12em; text-transform:uppercase; color:${brand.color_accent}; margin-bottom:${h*0.02}px; }
.slide-title { font-family:'${brand.font_headline}','Bebas Neue',sans-serif; font-size:${h*0.08}px;
  color:white; line-height:1.05; margin-bottom:${h*0.025}px; }
.sep { width:40px; height:2px; background:${brand.color_primary}; border-radius:1px; margin:${h*0.02}px 0; }
.body-text { font-family:'DM Sans',sans-serif; font-size:${h*0.028}px; color:rgba(255,255,255,0.65); line-height:1.65; }
</style></head><body>
<div class="artboard">
  <div class="img-side">
    ${slide.bgImageUrl ? `<img src="${slide.bgImageUrl}" alt="" crossorigin="anonymous"/>` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${brand.color_primary},${brand.color_secondary})"></div>`}
    <div class="img-overlay"></div>
  </div>
  <div class="text-side">
    ${brand.watermark_text ? `<div class="label">${brand.watermark_text}</div>` : ''}
    <h2 class="slide-title" data-postgen-field="headline" data-postgen-editable="true">${slide.title || 'Título'}</h2>
    <div class="sep"></div>
    ${slide.body ? `<p class="body-text" data-postgen-field="body" data-postgen-editable="true">${slide.body}</p>` : ''}
  </div>
</div>
</body></html>`;

// ─── 4. Quote Centered ────────────────────────────────────────────────────────
const quoteCentered: PresentationTemplateRenderer = (slide, brand, w, h) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
${base(brand, w, h)}
.artboard { align-items:center; justify-content:center; text-align:center;
  background:linear-gradient(135deg, ${brand.color_bg_dark}, #0a0118); }
.giant-q { position:absolute; top:-${h*0.05}px; left:${w*0.05}px; font-family:'Playfair Display',serif;
  font-size:${h*0.4}px; color:${brand.color_primary}; opacity:0.08; line-height:1; pointer-events:none; user-select:none; }
.content { display:flex; flex-direction:column; align-items:center; padding:${h*0.08}px ${w*0.1}px; }
.quote-text { font-family:'Playfair Display',serif; font-size:${h*0.055}px; font-style:italic;
  color:white; line-height:1.45; margin-bottom:${h*0.04}px; max-width:${w*0.8}px; }
.quote-line { width:40px; height:2px; background:${brand.color_accent}; border-radius:1px; margin:${h*0.015}px auto; }
.author { font-family:'DM Sans',sans-serif; font-size:${h*0.025}px; font-weight:600; color:${brand.color_accent}; letter-spacing:0.05em; }
</style></head><body>
<div class="artboard">
  <div class="giant-q">"</div>
  <div class="content">
    <p class="quote-text" data-postgen-field="headline" data-postgen-editable="true">${slide.title || 'Sua citação impactante vai aqui, com aquele peso que faz o público parar.'}</p>
    <div class="quote-line"></div>
    ${slide.subtitle ? `<p class="author" data-postgen-field="body" data-postgen-editable="true">${slide.subtitle}</p>` : ''}
  </div>
</div>
</body></html>`;

// ─── 5. Data / Stat ───────────────────────────────────────────────────────────
const dataStat: PresentationTemplateRenderer = (slide, brand, w, h) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
${base(brand, w, h)}
.artboard { background:${brand.color_bg_dark}; align-items:center; justify-content:center; }
.glow { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:${w*0.5}px; height:${w*0.5}px; border-radius:50%;
  background:radial-gradient(circle, ${brand.color_primary}25 0%, transparent 70%); }
.content { display:flex; flex-direction:column; align-items:center; text-align:center; padding:${h*0.05}px ${w*0.06}px; gap:${h*0.018}px; }
.label-top { font-family:'DM Sans',sans-serif; font-size:${h*0.022}px; font-weight:600;
  letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.4); }
.stat { font-family:'${brand.font_headline}','Bebas Neue',sans-serif; font-size:${h*0.22}px;
  line-height:1; color:white; background:linear-gradient(135deg, ${brand.color_primary}, ${brand.color_accent});
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.stat-label { font-family:'DM Sans',sans-serif; font-size:${h*0.036}px; font-weight:600;
  color:white; letter-spacing:0.02em; }
.sep { width:48px; height:2px; background:${brand.color_primary}; border-radius:1px; }
.body-text { font-family:'DM Sans',sans-serif; font-size:${h*0.026}px; color:rgba(255,255,255,0.5); line-height:1.6; max-width:${w*0.7}px; }
</style></head><body>
<div class="artboard">
  <div class="glow"></div>
  <div class="content">
    ${slide.title ? `<p class="label-top">${brand.watermark_text || 'Resultado'}</p>` : ''}
    <div class="stat" data-postgen-field="headline" data-postgen-editable="true">${slide.stat || '97%'}</div>
    <p class="stat-label" data-postgen-editable="true">${slide.title || 'dos clientes recomendam'}</p>
    <div class="sep"></div>
    ${slide.body ? `<p class="body-text" data-postgen-field="body" data-postgen-editable="true">${slide.body}</p>` : ''}
  </div>
</div>
</body></html>`;

// ─── 6. Team Profile ─────────────────────────────────────────────────────────
const teamProfile: PresentationTemplateRenderer = (slide, brand, w, h) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
${base(brand, w, h)}
.artboard { background:${brand.color_bg_dark}; align-items:center; justify-content:center; }
.content { display:flex; flex-direction:column; align-items:center; text-align:center; padding:${h*0.05}px; gap:${h*0.025}px; }
.avatar { width:${h*0.22}px; height:${h*0.22}px; border-radius:50%; object-fit:cover; overflow:hidden;
  border:3px solid ${brand.color_primary}; box-shadow:0 0 0 6px ${brand.color_primary}22; }
.avatar-placeholder { width:${h*0.22}px; height:${h*0.22}px; border-radius:50%;
  background:linear-gradient(135deg,${brand.color_primary},${brand.color_secondary});
  border:3px solid ${brand.color_primary}; display:flex; align-items:center; justify-content:center;
  font-family:'Bebas Neue',sans-serif; font-size:${h*0.08}px; color:white; }
.name { font-family:'${brand.font_headline}','Bebas Neue',sans-serif; font-size:${h*0.07}px; color:white; line-height:1.05; }
.role { font-family:'DM Sans',sans-serif; font-size:${h*0.028}px; color:${brand.color_accent}; font-weight:600; letter-spacing:0.05em; }
.sep { width:40px; height:2px; background:${brand.color_primary}; border-radius:1px; }
.bio { font-family:'DM Sans',sans-serif; font-size:${h*0.025}px; color:rgba(255,255,255,0.55); line-height:1.65; max-width:${w*0.65}px; }
</style></head><body>
<div class="artboard">
  <div class="content">
    ${slide.bgImageUrl
      ? `<img class="avatar" src="${slide.bgImageUrl}" alt="${slide.title}" crossorigin="anonymous"/>`
      : `<div class="avatar-placeholder">${(slide.title || 'A').charAt(0)}</div>`}
    <h2 class="name" data-postgen-field="headline" data-postgen-editable="true">${slide.title || 'Nome Sobrenome'}</h2>
    ${slide.subtitle ? `<p class="role" data-postgen-field="body" data-postgen-editable="true">${slide.subtitle}</p>` : ''}
    <div class="sep"></div>
    ${slide.body ? `<p class="bio" data-postgen-editable="true">${slide.body}</p>` : ''}
  </div>
</div>
</body></html>`;

// ─── 7. Agenda ────────────────────────────────────────────────────────────────
const agenda: PresentationTemplateRenderer = (slide, brand, w, h) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
${base(brand, w, h)}
.artboard { background:${brand.color_bg_dark}; flex-direction:row; }
.left-col { width:${w*0.35}px; flex-shrink:0; background:linear-gradient(to bottom, ${brand.color_primary}22, ${brand.color_secondary}11);
  border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; justify-content:center; padding:${h*0.06}px ${w*0.04}px; }
.label { font-family:'DM Sans',sans-serif; font-size:${h*0.018}px; font-weight:600;
  letter-spacing:0.12em; text-transform:uppercase; color:${brand.color_accent}; margin-bottom:${h*0.02}px; }
.main-title { font-family:'${brand.font_headline}','Bebas Neue',sans-serif; font-size:${h*0.072}px; color:white; line-height:1.05; }
.right-col { flex:1; display:flex; flex-direction:column; justify-content:center; padding:${h*0.06}px ${w*0.05}px; gap:${h*0.022}px; }
.agenda-item { display:flex; align-items:center; gap:${w*0.025}px; }
.num { font-family:'Bebas Neue',sans-serif; font-size:${h*0.045}px; color:${brand.color_primary}; min-width:${h*0.05}px; }
.item-text { font-family:'DM Sans',sans-serif; font-size:${h*0.03}px; color:rgba(255,255,255,0.8); line-height:1.4; }
.item-sep { width:100%; height:1px; background:rgba(255,255,255,0.06); }
</style></head><body>
<div class="artboard">
  <div class="left-col">
    <p class="label">Agenda</p>
    <h2 class="main-title" data-postgen-field="headline" data-postgen-editable="true">${slide.title || 'O que veremos'}</h2>
  </div>
  <div class="right-col">
    ${(slide.bullets || ['Introdução ao tema', 'Desenvolvimento principal', 'Casos práticos', 'Conclusões e próximos passos']).map((b, i) => `
      ${i > 0 ? '<div class="item-sep"></div>' : ''}
      <div class="agenda-item">
        <span class="num">${String(i+1).padStart(2,'0')}</span>
        <span class="item-text" data-postgen-editable="true">${b}</span>
      </div>`).join('')}
  </div>
</div>
</body></html>`;

// ─── 8. Closing CTA ───────────────────────────────────────────────────────────
const closingCta: PresentationTemplateRenderer = (slide, brand, w, h) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
${base(brand, w, h)}
.artboard { align-items:center; justify-content:center; text-align:center;
  background:linear-gradient(135deg, #09090F, ${brand.color_primary}33, #09090F); }
.rings { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:${h*0.7}px; height:${h*0.7}px; border-radius:50%;
  border:1px solid ${brand.color_primary}22; pointer-events:none; }
.rings::before { content:''; position:absolute; inset:-${h*0.06}px; border-radius:50%; border:1px solid ${brand.color_primary}15; }
.rings::after { content:''; position:absolute; inset:-${h*0.12}px; border-radius:50%; border:1px solid ${brand.color_primary}0A; }
.content { display:flex; flex-direction:column; align-items:center; gap:${h*0.025}px; padding:${h*0.06}px ${w*0.08}px; }
.pre-text { font-family:'DM Sans',sans-serif; font-size:${h*0.022}px; color:${brand.color_accent}; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; }
.title { font-family:'${brand.font_headline}','Bebas Neue',sans-serif; font-size:${h*0.1}px; line-height:1.05; color:white; }
.sub { font-family:'DM Sans',sans-serif; font-size:${h*0.03}px; color:rgba(255,255,255,0.55); line-height:1.6; max-width:${w*0.6}px; }
.cta-btn { display:flex; align-items:center; gap:8px; padding:${h*0.025}px ${w*0.055}px;
  background:linear-gradient(135deg, ${brand.color_primary}, ${brand.color_accent});
  border-radius:${h*0.04}px; color:white; font-family:'DM Sans',sans-serif; font-size:${h*0.028}px; font-weight:700;
  box-shadow:0 8px 32px ${brand.color_primary}50; margin-top:${h*0.01}px; }
</style></head><body>
<div class="artboard">
  ${slide.bgImageUrl ? `<img class="bg-img" src="${slide.bgImageUrl}" alt="" crossorigin="anonymous" style="opacity:0.15"/>` : ''}
  <div class="rings"></div>
  <div class="content">
    <p class="pre-text">${brand.watermark_text || 'Obrigado'}</p>
    <h2 class="title" data-postgen-field="headline" data-postgen-editable="true">${slide.title || 'Vamos começar?'}</h2>
    ${slide.subtitle ? `<p class="sub" data-postgen-field="body" data-postgen-editable="true">${slide.subtitle}</p>` : ''}
    ${slide.cta ? `<div class="cta-btn" data-postgen-field="cta" data-postgen-editable="true">→ ${slide.cta}</div>` : ''}
  </div>
</div>
</body></html>`;

// ─── Registry ─────────────────────────────────────────────────────────────────
export const PRESENTATION_TEMPLATE_REGISTRY: PresentationTemplateMetadata[] = [
  {
    id: 'title-hero',
    name: 'Title Hero',
    icon: '🎬',
    previewGradient: 'linear-gradient(135deg, #09090F 0%, #2d1b69 100%)',
    previewAccent: '#fff',
    description: 'Slide de abertura com imagem e headline grande.',
    renderer: titleHero,
  },
  {
    id: 'content-bullets',
    name: 'Bullets',
    icon: '📋',
    previewGradient: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a35 100%)',
    previewAccent: '#94a3b8',
    description: 'Título + lista de tópicos com pontos.',
    renderer: contentBullets,
  },
  {
    id: 'split-image',
    name: 'Split',
    icon: '◧',
    previewGradient: 'linear-gradient(90deg, #7C3AED 40%, #09090F 40%)',
    previewAccent: '#fff',
    description: 'Imagem à esquerda + texto à direita.',
    renderer: splitImage,
  },
  {
    id: 'quote-centered',
    name: 'Citação',
    icon: '💬',
    previewGradient: 'linear-gradient(135deg, #0a0118 0%, #1a0040 100%)',
    previewAccent: '#c9a962',
    description: 'Citação estilizada centralizada.',
    renderer: quoteCentered,
  },
  {
    id: 'data-stat',
    name: 'Dado / Stat',
    icon: '📊',
    previewGradient: 'linear-gradient(135deg, #09090F 0%, #7C3AED33 100%)',
    previewAccent: '#7C3AED',
    description: 'Destaque de número ou estatística.',
    renderer: dataStat,
  },
  {
    id: 'team-profile',
    name: 'Perfil',
    icon: '👤',
    previewGradient: 'linear-gradient(135deg, #0f0018 0%, #1a0030 100%)',
    previewAccent: '#F59E0B',
    description: 'Foto circular, nome e cargo.',
    renderer: teamProfile,
  },
  {
    id: 'agenda',
    name: 'Agenda',
    icon: '📌',
    previewGradient: 'linear-gradient(90deg, #7C3AED22 35%, #09090F 35%)',
    previewAccent: '#6366f1',
    description: 'Lista numerada de tópicos com coluna lateral.',
    renderer: agenda,
  },
  {
    id: 'closing-cta',
    name: 'Encerramento',
    icon: '🚀',
    previewGradient: 'linear-gradient(135deg, #09090F 0%, #7C3AED55 100%)',
    previewAccent: '#fff',
    description: 'Slide de fechamento com chamada à ação.',
    renderer: closingCta,
  },
];

export const getPresentationTemplate = (id: string) =>
  PRESENTATION_TEMPLATE_REGISTRY.find(t => t.id === id);
