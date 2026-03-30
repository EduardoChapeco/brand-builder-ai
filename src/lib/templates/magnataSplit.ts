import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const magnataSplit = (data: SlideData, brand: BrandKit): string => {
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
  background:#0d0d0d;
  display:flex; flex-direction:column; justify-content:center;
  padding:56px 52px;
}
.noise {
  position:absolute; inset:0; z-index:0;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
  opacity:0.5; pointer-events:none;
}
.gold-line-top {
  position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, transparent, #c9a962, transparent);
}
.gold-line-bottom {
  position:absolute; bottom:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg, transparent, #c9a96244, transparent);
}
.eyebrow {
  font-family:'DM Sans', sans-serif;
  font-size:10px; font-weight:700; letter-spacing:0.18em;
  text-transform:uppercase; color:#c9a962;
  margin-bottom:24px; z-index:1;
}
.diamond {
  width:8px; height:8px; background:#c9a962;
  transform:rotate(45deg); display:inline-block;
  margin-right:10px; vertical-align:middle;
}
.headline {
  font-family:'Playfair Display', serif;
  font-size:${data.headline.length > 25 ? '38' : '48'}px;
  line-height:1.15; font-style:italic;
  color:#c9a962;
  margin-bottom:24px; z-index:1;
}
.accent-rule {
  width:60px; height:1px; background:#c9a96266;
  margin-bottom:20px; z-index:1;
}
.body {
  font-family:'DM Sans', sans-serif;
  font-size:14px; line-height:1.75;
  color:#94A3B8; max-width:390px; z-index:1;
}
.cta {
  margin-top:28px; z-index:1;
  font-family:'DM Sans', sans-serif;
  font-size:12px; font-weight:600; letter-spacing:0.05em;
  color:#c9a962;
}
.watermark {
  position:absolute; bottom:18px; right:20px; z-index:2;
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:rgba(255,255,255,0.2);
}
</style>
</head>
<body>
<div class="artboard">
  <div class="noise"></div>
  <div class="gold-line-top"></div>
  <div class="gold-line-bottom"></div>
  <div class="eyebrow"><span class="diamond"></span>Premium Insight</div>
  <div class="headline" data-postgen-field="headline" data-postgen-editable="true">${data.headline}</div>
  <div class="accent-rule"></div>
  ${data.body ? `<div class="body" data-postgen-field="body" data-postgen-editable="true">${data.body}</div>` : ''}
  ${data.cta ? `<div class="cta" data-postgen-field="cta" data-postgen-editable="true">→ ${data.cta}</div>` : ''}
  <div class="watermark">${brand.watermark_text || ''}</div>
</div>
</body>
</html>`;
};
