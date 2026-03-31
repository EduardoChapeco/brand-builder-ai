import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const legalClassic = (data: SlideData, brand: BrandKit): string => {
  const w = data.format === 'landscape' ? 600 : 540;
  const h = data.format === 'story' ? 960 : data.format === 'portrait' ? 675 : data.format === 'landscape' ? 314 : 540;
  const primary = brand.color_primary || '#0F172A';
  const accent = brand.color_accent || '#D4AF37';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;600&display=swap');
${buildFontImport(brand)}
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${w}px; height:${h}px; overflow:hidden; }
.artboard { width:${w}px; height:${h}px; position:relative; overflow:hidden; background:${primary}; font-family:'Inter', serif;}

.bg-image {
  position:absolute; inset:0; z-index:1;
  background-image:${data.bgImageUrl ? `url(${data.bgImageUrl})` : "none"};
  background-size:cover; background-position:center;
  opacity:0.1; filter: sepia(100%) hue-rotate(180deg);
}

.classic-frame {
  position:absolute; inset:40px; z-index:2;
  border: 4px solid ${accent};
}

.content-box {
  position:absolute; inset:50px; z-index:3;
  display:flex; flex-direction:column;
}

.title-box {
  background:rgba(255, 255, 255, 0.05);
  padding: 30px 40px;
  border-bottom: 2px solid ${accent}55;
  margin-bottom: 30px;
}

.headline {
  font-family:'Playfair Display', serif;
  font-size:${data.headline.length > 30 ? '36' : '44'}px;
  font-weight:700; color:#fff;
  line-height:1.2; text-transform: uppercase; letter-spacing: 0.05em;
}

.body {
  font-size:16px; color:#e2e8f0; line-height:1.7; font-family:'Inter', sans-serif;
  padding: 0 40px; text-align: justify;
}

.seal-stamp {
  position:absolute; bottom:50px; right:50px; z-index:5;
  width:48px; height:48px; border-radius:50%; background:${accent};
  display:flex; align-items:center; justify-content:center;
  color:${primary}; font-weight:800; font-size:14px; font-family:'Inter', sans-serif;
}

.watermark { position:absolute; bottom:60px; left:90px; font-size:11px; color:rgba(255,255,255,0.3); z-index:10; }
</style>
</head>
<body>
<div class="artboard">
  <div class="bg-image"></div>
  <div class="classic-frame"></div>
  <div class="content-box">
    <div class="title-box">
      <div class="headline" data-postgen-field="headline" data-postgen-editable="true">${data.headline}</div>
    </div>
    ${data.body ? `<div class="body" data-postgen-field="body" data-postgen-editable="true">${data.body}</div>` : ''}
  </div>
  <div class="seal-stamp">LEI</div>
  <div class="watermark">${brand.watermark_text || ''}</div>
</div>
</body>
</html>`;
};
