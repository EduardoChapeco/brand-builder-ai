import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const mockupPhone = (data: SlideData, brand: BrandKit): string => {
  const w = data.format === 'landscape' ? 600 : 540;
  const h = data.format === 'story' ? 960 : data.format === 'portrait' ? 675 : data.format === 'landscape' ? 314 : 540;
  const primary = brand.color_primary || '#7C3AED';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${buildFontImport(brand)}
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${w}px; height:${h}px; overflow:hidden; }
.artboard { width:${w}px; height:${h}px; position:relative; overflow:hidden; background:${primary}; font-family:'Inter', sans-serif;}

.bg-image {
  position:absolute; inset:0; z-index:1;
  background-image:${data.bgImageUrl ? `url(${data.bgImageUrl})` : "none"};
  background-size:cover; background-position:center;
  opacity:0.4; mix-blend-mode: overlay;
}

.phone-container {
  position:absolute; inset:80px 60px; z-index:2;
  background:#fff; border-radius:40px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.4);
  padding:12px;
}

.phone-screen {
  background:#f8f9fa; width:100%; height:100%; border-radius:32px;
  position:relative; overflow:hidden;
  display:flex; flex-direction:column; align-items:center; padding: 50px 30px;
  text-align:center;
}

.notch {
  position:absolute; top:12px; left:50%; transform:translateX(-50%);
  width:120px; height:24px; background:#000; border-radius:12px; z-index:10;
}

.headline {
  font-family:'Outfit', sans-serif;
  font-size:${data.headline.length > 20 ? '34' : '42'}px;
  font-weight:800; color:#1a1a1a;
  line-height:1.2; margin-top:20px; margin-bottom:16px;
}

.body {
  font-size:18px; color:#4a4a4a; line-height:1.5;
}

.home-bar {
  position:absolute; bottom:12px; left:50%; transform:translateX(-50%);
  width:140px; height:6px; background:#1a1a1a; border-radius:3px;
}

.floating-alert {
  position:absolute; top:40px; left:30px; right:30px; z-index:5;
  background:#fff; border-radius:24px; padding:16px;
  display:flex; align-items:center; justify-content:center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  color:${primary}; font-weight:800; text-transform:uppercase; letter-spacing:0.1em;
  font-size:12px;
}

</style>
</head>
<body>
<div class="artboard">
  <div class="bg-image"></div>
  <div class="floating-alert">⚡ Novidade</div>
  <div class="phone-container">
    <div class="phone-screen">
      <div class="notch"></div>
      <div class="headline" data-postgen-field="headline" data-postgen-editable="true">${data.headline}</div>
      ${data.body ? `<div class="body" data-postgen-field="body" data-postgen-editable="true">${data.body}</div>` : ''}
      <div class="home-bar"></div>
    </div>
  </div>
</div>
</body>
</html>`;
};
