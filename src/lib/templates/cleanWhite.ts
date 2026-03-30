import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const cleanWhite = (data: SlideData, brand: BrandKit): string => {
  const w = data.format === 'landscape' ? 600 : 540;
  const h = data.format === 'story' ? 960 : data.format === 'portrait' ? 675 : data.format === 'landscape' ? 314 : 540;

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
.top-accent { width:100%; height:5px; background:${brand.color_primary}; flex-shrink:0; }
.body-area {
  flex:1; display:flex; flex-direction:column;
  justify-content:center; padding:40px 44px;
  position:relative;
}
.category {
  font-family:'DM Sans', sans-serif;
  font-size:11px; font-weight:700; letter-spacing:0.12em;
  text-transform:uppercase; color:${brand.color_primary};
  margin-bottom:16px;
}
.headline {
  font-family:'${brand.font_headline}', 'DM Sans', sans-serif;
  font-size:${data.headline.length > 30 ? '36' : '48'}px;
  font-weight:700; line-height:1.1;
  color:#111111;
  margin-bottom:18px;
}
.divider { width:40px; height:3px; background:${brand.color_accent}; margin-bottom:18px; border-radius:2px; }
.body-text {
  font-family:'DM Sans', sans-serif;
  font-size:16px; color:#374151;
  line-height:1.7; max-width:400px;
}
.cta {
  margin-top:28px;
  display:inline-flex; align-items:center; gap:8px;
  font-family:'DM Sans', sans-serif;
  font-size:13px; font-weight:600;
  color:${brand.color_primary};
}
.bg-shape {
  position:absolute; bottom:-80px; right:-80px;
  width:240px; height:240px; border-radius:50%;
  background:${brand.color_primary}08;
  pointer-events:none;
}
.watermark {
  position:absolute; bottom:16px; right:20px;
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:#94A3B8;
}
</style>
</head>
<body>
<div class="artboard">
  <div class="top-accent"></div>
  <div class="body-area">
    <div class="bg-shape"></div>
    <div class="category">✦ Insight</div>
    <div class="headline" data-postgen-field="headline" data-postgen-editable="true">${data.headline}</div>
    <div class="divider"></div>
    ${data.body ? `<div class="body-text" data-postgen-field="body" data-postgen-editable="true">${data.body}</div>` : ''}
    ${data.cta ? `<div class="cta" data-postgen-field="cta" data-postgen-editable="true">→ ${data.cta}</div>` : ''}
    <div class="watermark">${brand.watermark_text || ''}</div>
  </div>
</div>
</body>
</html>`;
};
