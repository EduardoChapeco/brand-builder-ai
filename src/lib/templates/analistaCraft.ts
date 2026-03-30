import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const analistaCraft = (data: SlideData, brand: BrandKit): string => {
  const w = data.format === 'landscape' ? 600 : 540;
  const h = data.format === 'story' ? 960 : data.format === 'portrait' ? 675 : data.format === 'landscape' ? 314 : 540;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=DM+Sans:wght@400;600&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${w}px; height:${h}px; overflow:hidden; }
.artboard {
  width:${w}px; height:${h}px; position:relative; overflow:hidden;
  background:#f5f0e6;
  display:flex; flex-direction:column; justify-content:center;
  padding:48px;
}
.grain {
  position:absolute; inset:0; z-index:0;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
  opacity:0.7;
}
.stamp {
  position:absolute; top:36px; right:36px; z-index:3;
  font-family:'Special Elite', monospace;
  font-size:11px; font-weight:900;
  color:#DC2626; border:2px solid #DC2626;
  padding:4px 10px; border-radius:4px;
  transform:rotate(8deg); letter-spacing:0.08em;
  opacity:0.8; text-transform:uppercase;
}
.date {
  font-family:'Special Elite', monospace;
  font-size:11px; color:#92400E; margin-bottom:20px; z-index:1;
}
.headline {
  font-family:'Special Elite', monospace;
  font-size:${data.headline.length > 25 ? '34' : '42'}px;
  line-height:1.2; color:#1C1C1C;
  margin-bottom:16px; z-index:1;
  text-decoration:underline; text-underline-offset:6px;
  text-decoration-color:#DC2626;
}
.underline-svg {
  position:absolute; z-index:2;
}
.body {
  font-family:'DM Sans', sans-serif;
  font-size:15px; line-height:1.75;
  color:#374151; max-width:400px; z-index:1;
}
.footer {
  margin-top:28px; z-index:1;
  font-family:'Special Elite', monospace;
  font-size:10px; color:#92400E;
  letter-spacing:0.08em;
}
.watermark {
  position:absolute; bottom:16px; right:20px; z-index:3;
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:rgba(0,0,0,0.3);
}
</style>
</head>
<body>
<div class="artboard">
  <div class="grain"></div>
  <div class="stamp">Exclusivo</div>
  <div class="date">Relatório · ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
  <div class="headline">${data.headline}</div>
  ${data.body ? `<div class="body">${data.body}</div>` : ''}
  <div class="footer">Fonte: ${brand.watermark_text || 'Análise Interna'}</div>
  <div class="watermark">${brand.watermark_text || ''}</div>
</div>
</body>
</html>`;
};
