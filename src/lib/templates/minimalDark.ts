import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const minimalDark = (data: SlideData, brand: BrandKit): string => {
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
  background:${brand.color_bg_dark};
  display:flex; flex-direction:column; justify-content:center;
  padding:50px 48px;
}
.bg-orb {
  position:absolute; top:-100px; right:-80px;
  width:360px; height:360px; border-radius:50%;
  background:radial-gradient(circle, ${brand.color_primary}22 0%, transparent 65%);
  pointer-events:none;
}
.bg-orb-2 {
  position:absolute; bottom:-60px; left:-60px;
  width:220px; height:220px; border-radius:50%;
  background:radial-gradient(circle, ${brand.color_secondary}18 0%, transparent 65%);
  pointer-events:none;
}
.eyebrow {
  font-family:'DM Sans', sans-serif;
  font-size:11px; font-weight:600; letter-spacing:0.1em;
  text-transform:uppercase;
  color:${brand.color_accent};
  margin-bottom:20px;
}
.headline {
  font-family:'${brand.font_headline}', 'Bebas Neue', sans-serif;
  font-size:${data.headline.length > 25 ? '52' : '64'}px;
  line-height:1.05;
  color:${brand.color_text_light};
  margin-bottom:20px;
  text-shadow:0 2px 20px rgba(0,0,0,0.5);
}
.accent-line {
  width:52px; height:2px; border-radius:1px;
  background:linear-gradient(90deg, ${brand.color_primary}, ${brand.color_accent});
  margin-bottom:20px;
}
.body {
  font-family:'DM Sans', sans-serif;
  font-size:15px; color:#64748B;
  line-height:1.7; max-width:400px;
}
.cta {
  margin-top:28px;
  font-family:'DM Sans', sans-serif;
  font-size:13px; font-weight:600;
  color:${brand.color_primary};
}
.watermark {
  position:absolute; bottom:18px; right:22px;
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:rgba(255,255,255,0.25);
}
.slide-dots {
  position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
  display:flex; gap:5px;
}
</style>
</head>
<body>
<div class="artboard">
  <div class="bg-orb"></div>
  <div class="bg-orb-2"></div>
  <div class="eyebrow">✦ PostGen</div>
  <div class="headline">${data.headline}</div>
  <div class="accent-line"></div>
  ${data.body ? `<div class="body">${data.body}</div>` : ''}
  ${data.cta ? `<div class="cta">→ ${data.cta}</div>` : ''}
  <div class="watermark">${brand.watermark_text || ''}</div>
</div>
</body>
</html>`;
};
