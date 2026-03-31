import { BrandKit, SlideData, TemplateRenderer, buildFontImport } from '../canvasEngine';

export const glassNeon: TemplateRenderer = (data: SlideData, brand: BrandKit) => {
  const css = `
${buildFontImport(brand)}
*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0; width: 100%; height: 100%;
  font-family: var(--font-headline, 'Inter'), sans-serif;
  background-color: var(--color-bg, #0B0F19);
  color: var(--color-text, #ffffff);
  overflow: hidden;
}

.artboard {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-size: cover;
  background-position: center;
}

/* Glassmorphism card perfectly matching the Z-pattern reading architecture */
.glass-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  width: 90%;
  margin: 0 auto;
  padding: 60px 50px;
  background: rgba(15, 20, 30, 0.4);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1);
  position: relative;
  z-index: 10;
}

/* Glowing Neon Elements */
.glass-panel::before {
  content: '';
  position: absolute;
  top: -2px; left: -2px; right: -2px; bottom: -2px;
  background: linear-gradient(135deg, var(--color-primary, #6366f1) 0%, transparent 40%, transparent 60%, var(--color-secondary, #a855f7) 100%);
  z-index: -1;
  border-radius: 34px;
  opacity: 0.5;
}

.watermark {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary, #6366F1);
  margin-bottom: 24px;
}

.headline {
  font-size: 76px;
  font-family: var(--font-headline, 'Inter');
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0 0 32px 0;
  text-shadow: 0 4px 20px rgba(0,0,0,0.5);
  text-align: left;
}

.body {
  font-size: 34px;
  font-family: var(--font-body, 'Inter');
  font-weight: 500;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 40px 0;
  text-align: left;
}

.cta {
  display: inline-block;
  padding: 16px 36px;
  background: var(--color-primary, #6366f1);
  color: #fff;
  border-radius: 100px;
  font-size: 28px;
  font-weight: 800;
  box-shadow: 0 10px 30px rgba(var(--color-primary-rgb, 99, 102, 241), 0.4);
}
`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body style="${data.bgImageUrl ? `background-image: url('${data.bgImageUrl}');` : ''}">
  <div class="artboard">
    <div class="glass-panel">
      ${brand.watermark_text ? `<div class="watermark" data-postgen-editable="true">${brand.watermark_text}</div>` : ''}
      <h1 class="headline" data-postgen-field="headline" data-postgen-editable="true">${data.headline}</h1>
      ${data.body ? `<p class="body" data-postgen-field="body" data-postgen-editable="true">${data.body}</p>` : ''}
      ${data.cta ? `<div class="cta" data-postgen-field="cta" data-postgen-editable="true">${data.cta}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
};
