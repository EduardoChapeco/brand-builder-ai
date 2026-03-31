import { BrandKit, SlideData, TemplateRenderer, buildFontImport } from '../canvasEngine';

export const appleMinimal: TemplateRenderer = (data: SlideData, brand: BrandKit) => {
  const css = `
${buildFontImport(brand)}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; width: 100%; height: 100%;
  background-color: #fbfbfd;
  font-family: 'Inter', -apple-system, sans-serif;
}
.artboard {
  position: relative;
  width: 100%; height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  text-align: center;
}
.eyebrow {
  color: #86868b;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 16px;
}
.headline {
  font-size: 72px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: #1d1d1f;
  margin: 0 0 24px 0;
  background: linear-gradient(90deg, #1d1d1f, #434345);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.body-text {
  font-size: 32px;
  line-height: 1.4;
  color: #86868b;
  max-width: 90%;
  margin: 0;
  font-weight: 500;
}
.product-image {
  width: 80%;
  height: auto;
  margin-top: 60px;
  border-radius: 20px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.08);
  object-fit: cover;
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
    <div class="eyebrow" data-postgen-editable="true">${brand.watermark_text || 'Novo.'}</div>
    <h1 class="headline" data-postgen-field="headline" data-postgen-editable="true">${data.headline}</h1>
    ${data.body ? `<p class="body-text" data-postgen-field="body" data-postgen-editable="true">${data.body}</p>` : ''}
    
    ${data.bgImageUrl ? `<img src="${data.bgImageUrl}" class="product-image" crossorigin="anonymous" />` : ''}
  </div>
</body>
</html>`;
};
