import { SlideData, BrandKit, buildFontImport } from '../canvasEngine';

export const iosNotification = (data: SlideData, brand: BrandKit): string => {
  const w = data.format === 'landscape' ? 600 : 540;
  const h = data.format === 'story' ? 960 : data.format === 'portrait' ? 675 : data.format === 'landscape' ? 314 : 540;
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:32px;
}
.bg-blur {
  position:absolute; inset:0;
  background:${data.bgImageUrl ? `url(${data.bgImageUrl})` : `radial-gradient(ellipse 90% 70% at 50% 50%, ${brand.color_primary}18 0%, ${brand.color_bg_dark} 70%)`};
  background-size:cover; background-position:center;
  filter:blur(16px) brightness(0.4);
}
.lockscreen-time {
  font-family:'DM Sans', sans-serif;
  font-size:64px; font-weight:200; color:#fff;
  letter-spacing:-3px; margin-bottom:4px; z-index:1;
}
.lockscreen-date {
  font-family:'DM Sans', sans-serif;
  font-size:14px; color:rgba(255,255,255,0.6);
  margin-bottom:32px; z-index:1;
}
.notification-card {
  width:100%; max-width:440px; z-index:2;
  background:rgba(30,30,40,0.85);
  backdrop-filter:blur(40px) saturate(180%);
  -webkit-backdrop-filter:blur(40px) saturate(180%);
  border-radius:20px;
  border:1px solid rgba(255,255,255,0.12);
  box-shadow:0 8px 32px rgba(0,0,0,0.5);
  padding:16px 18px;
}
.notif-header {
  display:flex; align-items:center; gap:10px; margin-bottom:8px;
}
.app-icon {
  width:32px; height:32px; border-radius:8px;
  background:${brand.color_primary};
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.app-icon-text {
  font-family:'DM Sans', sans-serif;
  font-size:14px; font-weight:700; color:#fff;
}
.app-name {
  font-family:'DM Sans', sans-serif;
  font-size:12px; font-weight:600; color:rgba(255,255,255,0.6);
  flex:1; text-transform:uppercase; letter-spacing:0.08em;
}
.notif-time {
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:rgba(255,255,255,0.4);
}
.notif-title {
  font-family:'DM Sans', sans-serif;
  font-size:14px; font-weight:600; color:#fff;
  margin-bottom:4px; line-height:1.3;
}
.notif-body {
  font-family:'DM Sans', sans-serif;
  font-size:13px; color:rgba(255,255,255,0.65);
  line-height:1.5;
}
.watermark {
  position:absolute; bottom:16px; right:20px; z-index:3;
  font-family:'DM Sans', sans-serif;
  font-size:11px; color:rgba(255,255,255,0.25);
}
</style>
</head>
<body>
<div class="artboard">
  <div class="bg-blur"></div>
  <div class="lockscreen-time">${time}</div>
  <div class="lockscreen-date">${now.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}</div>
  <div class="notification-card">
    <div class="notif-header">
      <div class="app-icon">
        <span class="app-icon-text">P</span>
      </div>
      <span class="app-name">${brand.watermark_text || 'PostGen'}</span>
      <span class="notif-time">agora</span>
    </div>
    <div class="notif-title" data-postgen-field="headline" data-postgen-editable="true">${data.headline}</div>
    ${data.body ? `<div class="notif-body" data-postgen-field="body" data-postgen-editable="true">${data.body}</div>` : ''}
  </div>
  <div class="watermark">${brand.watermark_text || ''}</div>
</div>
</body>
</html>`;
};
