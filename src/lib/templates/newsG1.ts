import { BrandKit, SlideData, TemplateRenderer, buildFontImport } from '../canvasEngine';

export const newsG1: TemplateRenderer = (data: SlideData, brand: BrandKit) => {
  const css = `
${buildFontImport(brand)}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; width: 100%; height: 100%;
  background-color: #f4f4f4;
  font-family: 'Inter', sans-serif;
}
.artboard {
  position: relative;
  width: 100%; height: 100%;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.header {
  background-color: #C00;
  color: white;
  padding: 24px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 800;
  font-size: 32px;
  letter-spacing: -1px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.header::before {
  content: 'g1';
  font-size: 42px;
  letter-spacing: -2px;
  background: white;
  color: #C00;
  border-radius: 50%;
  width: 50px; height: 50px;
  display: flex; align-items: center; justify-content: center;
}
.content {
  padding: 40px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.chapeu {
  color: #C00;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 20px;
  letter-spacing: 1px;
}
.headline {
  font-family: 'DM Serif Display', serif;
  font-size: 64px;
  line-height: 1.1;
  color: #222;
  margin: 0;
}
.image-container {
  width: 100%;
  height: 350px;
  background-color: #eee;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  margin-top: 10px;
}
.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.body-text {
  font-size: 28px;
  line-height: 1.5;
  color: #444;
  margin: 0;
}
.time {
  color: #888;
  font-size: 18px;
  font-weight: 500;
  margin-top: auto;
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
    <div class="header" data-postgen-editable="true">NOTÍCIA</div>
    <div class="content">
      <div class="chapeu" data-postgen-editable="true">URGENTE</div>
      <h1 class="headline" data-postgen-field="headline" data-postgen-editable="true">${data.headline || 'Impacto profundo na nova atualização'}</h1>
      ${data.bgImageUrl ? `
      <div class="image-container">
        <img src="${data.bgImageUrl}" alt="" crossorigin="anonymous" />
      </div>` : ''}
      ${data.body ? `<p class="body-text" data-postgen-field="body" data-postgen-editable="true">${data.body}</p>` : ''}
      <div class="time">Há 5 minutos</div>
    </div>
  </div>
</body>
</html>`;
};
