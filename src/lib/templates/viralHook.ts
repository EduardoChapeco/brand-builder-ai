import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const viralHook = (data: SlideData, brand: BrandKit): string => {
  const { headline, body, watermark_text } = { ...data, watermark_text: brand.watermark_text };
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
  width:${w}px; height:${h}px;
  position:relative; overflow:hidden;
  background:${brand.color_bg_dark};
}
.layer-bg {
  position:absolute; inset:0; z-index:1;
  background:radial-gradient(ellipse 80% 60% at 50% 50%, ${brand.color_primary}22 0%, transparent 70%),
    ${brand.color_bg_dark};
}
.layer-media {
  position:absolute; inset:0; z-index:2;
  background-image:${data.bgImageUrl ? `url(${data.bgImageUrl})` : 'none'};
  background-size:cover; background-position:center;
  opacity:${data.bgOpacity ?? 0.28};
}
.layer-overlay {
  position:absolute; inset:0; z-index:3;
  background:radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,0,0,0.85) 0%, transparent 60%);
}
.layer-text {
  position:absolute; inset:0; z-index:4;
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  padding:40px;
}
.headline {
  font-family:'Bebas Neue', sans-serif;
  font-size:${headline.length > 20 ? '72' : headline.length > 12 ? '88' : '100'}px;
  line-height:0.95;
  color:${brand.color_text_light};
  text-align:center;
  text-transform:uppercase;
  letter-spacing:2px;
  text-shadow:0 4px 32px rgba(0,0,0,0.9);
  word-break:break-word;
}
.headline strong { color:${brand.color_accent}; }
.body {
  font-family:'DM Sans', sans-serif;
  font-size:16px;
  color:rgba(248,250,252,0.7);
  text-align:center;
  margin-top:16px;
  max-width:400px;
  line-height:1.5;
}
.accent-line {
  width:48px; height:4px; border-radius:2px;
  background:${brand.color_accent};
  margin:20px auto 0;
}
.watermark {
  position:absolute; bottom:16px; right:20px; z-index:6;
  font-family:'DM Sans', sans-serif;
  font-size:12px; color:rgba(255,255,255,0.45);
  letter-spacing:0.5px;
}
.slide-num {
  position:absolute; top:20px; right:20px; z-index:6;
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:rgba(255,255,255,0.4);
}
</style>
</head>
<body>
<div class="artboard">
  <div class="layer-bg"></div>
  <div class="layer-media"></div>
  <div class="layer-overlay"></div>
  <div class="layer-text">
    <div class="headline" data-postgen-field="headline" data-postgen-editable="true">${headline}</div>
    ${body ? `<div class="body" data-postgen-field="body" data-postgen-editable="true">${body}</div>` : ''}
    <div class="accent-line"></div>
  </div>
  ${data.totalSlides && data.totalSlides > 1 ? `<div class="slide-num">${data.slideNumber}/${data.totalSlides}</div>` : ''}
  <div class="watermark">${brand.watermark_text || 'Sua Marca'}</div>
</div>
</body>
</html>`;
};
