import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const listicleProgress = (data: SlideData, brand: BrandKit): string => {
  const w = data.format === 'landscape' ? 600 : 540;
  const h = data.format === 'story' ? 960 : data.format === 'portrait' ? 675 : data.format === 'landscape' ? 314 : 540;
  const primary = brand.color_primary || '#7C3AED';
  const progressPercent = data.slideNumber !== undefined && data.totalSlides ? Math.max(10, (data.slideNumber / data.totalSlides) * 100) : 50;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${buildFontImport(brand)}
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${w}px; height:${h}px; overflow:hidden; }
.artboard { width:${w}px; height:${h}px; position:relative; overflow:hidden; background:#111116; font-family:'Inter', sans-serif;}

.bg-image {
  position:absolute; inset:0; z-index:1;
  background-image:${data.bgImageUrl ? `url(${data.bgImageUrl})` : "none"};
  background-size:cover; background-position:center;
  opacity:0.25; filter:grayscale(0.6) blur(2px);
}

.progress-track {
  position:absolute; top:0; left:0; right:0; height:8px; background:rgba(255,255,255,0.1); z-index:5;
}
.progress-fill {
  height:100%; width:${progressPercent}%; background:${primary}; box-shadow: 0 0 10px ${primary};
  transition: width 0.3s;
}

.content-box {
  position:absolute; inset:40px; z-index:2;
  background:rgba(20, 20, 28, 0.85); backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,0.08); border-radius:24px;
  padding:32px; display:flex; flex-direction:column;
}

.step-badge {
  display:inline-flex; align-items:center; justify-content:center;
  background:${primary}22; color:${primary}; font-weight:700; font-size:14px;
  padding:6px 14px; border-radius:20px; border:1px solid ${primary};
  align-self:flex-start; margin-bottom:24px;
}

.headline {
  font-family:'Outfit', sans-serif;
  font-size:${data.headline.length > 30 ? '30' : '40'}px;
  font-weight:700; color:#fff;
  line-height:1.2; margin-bottom:16px;
}

.body {
  font-size:16px; color:rgba(255,255,255,0.7); line-height:1.6;
}

.watermark { position:absolute; bottom:20px; right:20px; font-size:11px; color:rgba(255,255,255,0.3); z-index:10; }
</style>
</head>
<body>
<div class="artboard">
  <div class="bg-image"></div>
  <div class="progress-track"><div class="progress-fill"></div></div>
  <div class="content-box">
    <div class="step-badge">Passo ${data.slideNumber || 1}/${data.totalSlides || 5}</div>
    <div class="headline" data-postgen-field="headline" data-postgen-editable="true">${data.headline}</div>
    ${data.body ? `<div class="body" data-postgen-field="body" data-postgen-editable="true">${data.body}</div>` : ''}
  </div>
  <div class="watermark">${brand.watermark_text || ''}</div>
</div>
</body>
</html>`;
};
