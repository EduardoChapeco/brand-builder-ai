import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const cardFloat = (data: SlideData, brand: BrandKit): string => {
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
  display:flex; align-items:center; justify-content:center;
}
.bg {
  position:absolute; inset:0;
  background:linear-gradient(135deg, ${brand.color_primary} 0%, ${brand.color_secondary} 60%, ${brand.color_accent}66 100%);
}
.blur-orb-1 {
  position:absolute; top:-60px; left:-60px;
  width:300px; height:300px; border-radius:50%;
  background:${brand.color_secondary}; filter:blur(80px); opacity:0.5;
}
.blur-orb-2 {
  position:absolute; bottom:-60px; right:-40px;
  width:250px; height:250px; border-radius:50%;
  background:${brand.color_accent}; filter:blur(90px); opacity:0.4;
}
.card {
  position:relative; z-index:2;
  width:${w - 80}px;
  padding:36px 40px;
  border-radius:24px;
  background:rgba(255,255,255,0.1);
  backdrop-filter:blur(24px) saturate(180%);
  -webkit-backdrop-filter:blur(24px) saturate(180%);
  border:1px solid rgba(255,255,255,0.25);
  box-shadow:0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
}
.badge {
  display:inline-block; padding:4px 12px; border-radius:99px;
  background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25);
  font-family:'DM Sans', sans-serif;
  font-size:10px; font-weight:600; color:rgba(255,255,255,0.9);
  letter-spacing:0.08em; text-transform:uppercase;
  margin-bottom:20px;
}
.headline {
  font-family:'${brand.font_headline}', 'DM Sans', sans-serif;
  font-size:${data.headline.length > 25 ? '34' : '42'}px;
  font-weight:700; line-height:1.15;
  color:#fff;
  margin-bottom:16px;
  text-shadow:0 2px 12px rgba(0,0,0,0.2);
}
.body {
  font-family:'DM Sans', sans-serif;
  font-size:15px; line-height:1.7;
  color:rgba(255,255,255,0.8);
}
.cta {
  margin-top:24px;
  display:inline-flex; align-items:center; gap:6px;
  padding:10px 20px;
  background:rgba(255,255,255,0.2); border-radius:10px;
  font-family:'DM Sans', sans-serif;
  font-size:13px; font-weight:600;
  color:#fff; border:1px solid rgba(255,255,255,0.3);
}
.watermark {
  position:absolute; bottom:16px; right:20px; z-index:3;
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:rgba(255,255,255,0.45);
}
</style>
</head>
<body>
<div class="artboard">
  <div class="bg"></div>
  <div class="blur-orb-1"></div>
  <div class="blur-orb-2"></div>
  <div class="card">
    <div class="badge">✦ Destaque</div>
    <div class="headline">${data.headline}</div>
    ${data.body ? `<div class="body">${data.body}</div>` : ''}
    ${data.cta ? `<div class="cta">→ ${data.cta}</div>` : ''}
  </div>
  <div class="watermark">${brand.watermark_text || ''}</div>
</div>
</body>
</html>`;
};
