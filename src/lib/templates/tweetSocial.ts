import { BrandKit, SlideData, TemplateRenderer, buildFontImport } from '../canvasEngine';

export const tweetSocial: TemplateRenderer = (data: SlideData, brand: BrandKit) => {
  const isDark = brand.color_bg_dark !== '#ffffff';
  
  const css = `
${buildFontImport(brand)}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; width: 100%; height: 100%;
  background: linear-gradient(135deg, ${brand.color_primary}22, ${brand.color_secondary}33);
  font-family: 'DM Sans', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}
.artboard {
  position: relative;
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.tweet-card {
  background: ${brand.color_bg_light};
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 24px;
  border: 1px solid rgba(0,0,0,0.05);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${brand.color_primary}, ${brand.color_secondary});
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 24px; font-weight: bold;
}
.names {
  display: flex; flex-direction: column;
}
.name {
  color: #111;
  font-weight: 700;
  font-size: 24px;
}
.username {
  color: #666;
  font-size: 20px;
}
.content {
  font-size: 38px;
  line-height: 1.4;
  color: #111;
  margin: 0;
  font-family: 'Inter', sans-serif;
}
.image-attached {
  width: 100%;
  height: 300px;
  border-radius: 16px;
  object-fit: cover;
  margin-top: 12px;
  border: 1px solid rgba(0,0,0,0.1);
}
.stats {
  display: flex;
  gap: 32px;
  color: #666;
  font-size: 20px;
  border-top: 1px solid rgba(0,0,0,0.08);
  padding-top: 24px;
}
.stat {
  display: flex; align-items: center; gap: 8px;
}
`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  <div class="artboard">
    <div class="tweet-card">
      <div class="user-info">
        <div class="avatar">${brand.watermark_text ? brand.watermark_text.charAt(0) : 'X'}</div>
        <div class="names">
          <div class="name" data-postgen-editable="true">${brand.watermark_text || 'Especialista'}</div>
          <div class="username" data-postgen-editable="true">@${(brand.watermark_text || 'especialista').toLowerCase().replace(' ', '')}</div>
        </div>
      </div>
      
      <p class="content" data-postgen-field="headline" data-postgen-editable="true">${data.headline}</p>
      
      ${data.bgImageUrl ? `<img src="${data.bgImageUrl}" class="image-attached" crossorigin="anonymous" />` : ''}
      
      <div class="stats">
        <div class="stat"><span>💬</span> 124</div>
        <div class="stat"><span>🔁</span> 892</div>
        <div class="stat"><span>❤️</span> 4.2K</div>
      </div>
    </div>
  </div>
</body>
</html>`;
};
