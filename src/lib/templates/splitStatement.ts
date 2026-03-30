import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const splitStatement = (data: SlideData, brand: BrandKit): string => {
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
  display:flex;
}
.left-half {
  width:50%; height:100%;
  background-image:${data.bgImageUrl ? `url(${data.bgImageUrl})` : `linear-gradient(135deg, ${brand.color_bg_dark}, ${brand.color_primary}66)`};
  background-size:cover; background-position:center;
  position:relative;
}
.left-overlay {
  position:absolute; inset:0;
  background:linear-gradient(270deg, rgba(0,0,0,0.35) 0%, transparent 60%);
}
.divider {
  width:3px; background:${brand.color_accent};
  flex-shrink:0; position:relative; z-index:2;
}
.right-half {
  width:50%; height:100%;
  background:${brand.color_primary};
  display:flex; flex-direction:column; justify-content:center;
  padding:32px 28px;
  position:relative; overflow:hidden;
}
.right-bg-pattern {
  position:absolute; bottom:-40px; right:-40px;
  width:180px; height:180px; border-radius:50%;
  background:rgba(255,255,255,0.06);
}
.eyebrow {
  font-family:'DM Sans', sans-serif;
  font-size:10px; font-weight:700; letter-spacing:0.12em;
  text-transform:uppercase; color:rgba(255,255,255,0.6);
  margin-bottom:16px;
}
.headline {
  font-family:'${brand.font_headline}', 'Bebas Neue', sans-serif;
  font-size:${data.headline.length > 20 ? '36' : '46'}px;
  font-weight:700; line-height:1.1;
  color:#fff; margin-bottom:16px;
}
.body {
  font-family:'DM Sans', sans-serif;
  font-size:13px; color:rgba(255,255,255,0.75);
  line-height:1.65; margin-bottom:20px;
}
.cta-btn {
  display:inline-block;
  padding:9px 18px; border-radius:8px;
  background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3);
  font-family:'DM Sans', sans-serif;
  font-size:12px; font-weight:600; color:#fff;
}
.watermark {
  position:absolute; bottom:12px; right:14px; z-index:3;
  font-family:'DM Sans', sans-serif;
  font-size:10px; color:rgba(255,255,255,0.35);
}
</style>
</head>
<body>
<div class="artboard">
  <div class="left-half">
    <div class="left-overlay"></div>
  </div>
  <div class="divider"></div>
  <div class="right-half">
    <div class="right-bg-pattern"></div>
    <div class="eyebrow">★ Destaque</div>
    <div class="headline">${data.headline}</div>
    ${data.body ? `<div class="body">${data.body}</div>` : ''}
    ${data.cta ? `<div class="cta-btn">→ ${data.cta}</div>` : ''}
    <div class="watermark">${brand.watermark_text || ''}</div>
  </div>
</div>
</body>
</html>`;
};
