import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const editorialMagazine = (data: SlideData, brand: BrandKit): string => {
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
.artboard { width:${w}px; height:${h}px; position:relative; overflow:hidden; background:#000; }
.layer-media {
  position:absolute; inset:0; z-index:1;
  background-image:${data.bgImageUrl ? `url(${data.bgImageUrl})` : `linear-gradient(135deg, ${brand.color_bg_dark} 0%, ${brand.color_primary}44 100%)`};
  background-size:cover; background-position:center;
  opacity:${data.bgImageUrl ? 1 : 1};
}
.layer-overlay {
  position:absolute; inset:0; z-index:2;
  background:linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.0) 75%);
}
.category-badge {
  position:absolute; top:24px; left:24px; z-index:4;
  font-family:'DM Sans', sans-serif;
  font-size:10px; font-weight:700;
  color:${brand.color_accent};
  letter-spacing:0.15em; text-transform:uppercase;
  padding:4px 10px;
  background:rgba(0,0,0,0.5);
  border:1px solid ${brand.color_accent}60;
  border-radius:4px;
}
.layer-text {
  position:absolute; bottom:0; left:0; right:0; z-index:3;
  padding:28px 28px 32px;
}
.accent-rule {
  width:40px; height:2px; background:${brand.color_primary}; margin-bottom:12px;
}
.headline {
  font-family:'Playfair Display', serif;
  font-size:${data.headline.length > 30 ? '32' : '40'}px;
  line-height:1.15;
  color:#fff;
  margin-bottom:10px;
  text-shadow:0 2px 12px rgba(0,0,0,0.6);
}
.body {
  font-family:'DM Sans', sans-serif;
  font-size:13px;
  color:rgba(255,255,255,0.65);
  line-height:1.6;
  max-width:380px;
}
.watermark {
  position:absolute; bottom:16px; right:20px; z-index:5;
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:rgba(255,255,255,0.35);
}
</style>
</head>
<body>
<div class="artboard">
  <div class="layer-media"></div>
  <div class="layer-overlay"></div>
  <div class="category-badge">📸 Editorial</div>
  <div class="layer-text">
    <div class="accent-rule"></div>
    <div class="headline">${data.headline}</div>
    ${data.body ? `<div class="body">${data.body}</div>` : ''}
  </div>
  <div class="watermark">${brand.watermark_text || ''}</div>
</div>
</body>
</html>`;
};
