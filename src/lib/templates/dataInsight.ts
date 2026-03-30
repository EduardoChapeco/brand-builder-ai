import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const dataInsight = (data: SlideData, brand: BrandKit): string => {
  const w = data.format === 'landscape' ? 600 : 540;
  const h = data.format === 'story' ? 960 : data.format === 'portrait' ? 675 : data.format === 'landscape' ? 314 : 540;

  // Parse body as bullet-point items (split by newline or period)
  const items = (data.body || '').split(/[\n•·]/).map(s => s.trim()).filter(Boolean).slice(0, 5);
  const listHtml = items.length > 0
    ? items.map((item, i) => `
      <div class="list-item">
        <span class="item-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="item-text">${item}</span>
      </div>`).join('')
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${buildFontImport(brand)}
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${w}px; height:${h}px; overflow:hidden; }
.artboard {
  width:${w}px; height:${h}px; position:relative; overflow:hidden;
  background:#FFFFFF;
  display:flex; flex-direction:column;
}
.header {
  background:${brand.color_primary};
  padding:28px 32px 24px;
  flex-shrink:0;
  position:relative; overflow:hidden;
}
.header-bg-circle {
  position:absolute; top:-40px; right:-40px;
  width:160px; height:160px; border-radius:50%;
  background:rgba(255,255,255,0.08);
}
.header-label {
  font-family:'DM Sans', sans-serif;
  font-size:10px; font-weight:700; letter-spacing:0.12em;
  text-transform:uppercase; color:rgba(255,255,255,0.6);
  margin-bottom:8px;
}
.headline {
  font-family:'${brand.font_headline}', 'DM Sans', sans-serif;
  font-size:${data.headline.length > 25 ? '28' : '34'}px;
  font-weight:700; line-height:1.2;
  color:#fff;
}
.content {
  flex:1; padding:28px 32px;
  display:flex; flex-direction:column; gap:14px;
  overflow:hidden;
}
.list-item {
  display:flex; align-items:flex-start; gap:14px;
  padding:10px 14px; border-radius:10px;
  background:${brand.color_primary}08;
  border-left:3px solid ${brand.color_primary};
}
.item-num {
  font-family:'DM Sans', sans-serif;
  font-size:16px; font-weight:800;
  color:${brand.color_primary}; min-width:28px;
  line-height:1.4;
}
.item-text {
  font-family:'DM Sans', sans-serif;
  font-size:13px; line-height:1.55; color:#374151;
  flex:1;
}
.footer-bar {
  height:44px; background:${brand.color_accent};
  display:flex; align-items:center; padding:0 32px;
  flex-shrink:0;
}
.footer-text {
  font-family:'DM Sans', sans-serif;
  font-size:12px; font-weight:600; color:#fff;
  flex:1;
}
.watermark {
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:rgba(255,255,255,0.6);
}
</style>
</head>
<body>
<div class="artboard">
  <div class="header">
    <div class="header-bg-circle"></div>
    <div class="header-label">📊 Dados & Insights</div>
    <div class="headline">${data.headline}</div>
  </div>
  <div class="content">
    ${listHtml || `<div class="list-item"><span class="item-text">${data.body || ''}</span></div>`}
  </div>
  <div class="footer-bar">
    <span class="footer-text">${data.cta || 'Salve e compartilhe →'}</span>
    <span class="watermark">${brand.watermark_text || ''}</span>
  </div>
</div>
</body>
</html>`;
};
