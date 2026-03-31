import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { SupabaseClient } from '@supabase/supabase-js';

// ─── Render slide HTML into an offscreen iframe, then capture via html2canvas ─
async function renderSlideToCanvas(slideHtml: string, width: number, height: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
      position:fixed; top:-9999px; left:-9999px;
      width:${width}px; height:${height}px;
      border:none; pointer-events:none; z-index:-1;
    `;
    document.body.appendChild(iframe);

    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument!;
        doc.open();
        doc.write(slideHtml);
        doc.close();
        await new Promise(r => setTimeout(r, 500)); // wait for fonts/images
        const canvas = await html2canvas(doc.body, {
          width, height,
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
        });
        resolve(canvas);
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(iframe);
      }
    };

    iframe.src = 'about:blank';
  });
}

// ─── Export a single slide as PNG Blob ──────────────────────────────────────
export async function exportSlide(
  slideHtml: string,
  filename: string,
  width: number,
  height: number
): Promise<Blob> {
  const canvas = await renderSlideToCanvas(slideHtml, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png', 0.95);
  });
}

// ─── Export all slides as individual PNGs zipped ────────────────────────────
export async function exportAllSlides(
  slidesHtml: string[],
  basename: string,
  width: number,
  height: number
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(basename) || zip;
  for (let i = 0; i < slidesHtml.length; i++) {
    const blob = await exportSlide(slidesHtml[i], `slide-${i + 1}`, width, height);
    folder.file(`${basename}_slide_${i + 1}.png`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `${basename}_slides.zip`);
}

// ─── Export slides as PDF (one page per slide) ──────────────────────────────
export async function exportSlidesPDF(
  slidesHtml: string[],
  basename: string,
  width: number,
  height: number
): Promise<void> {
  const orientation = width > height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling'],
  });

  for (let i = 0; i < slidesHtml.length; i++) {
    const canvas = await renderSlideToCanvas(slidesHtml[i], width, height);
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    if (i > 0) pdf.addPage([width, height], orientation);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
  }

  pdf.save(`${basename}.pdf`);
}

// ─── Export slides as a self-contained HTML page ────────────────────────────
export function exportSlidesHTML(
  slidesHtml: string[],
  title: string,
  width: number,
  height: number
): void {
  const slidesSrc = slidesHtml.map((html, i) => `
    <section class="slide" id="slide-${i + 1}" style="display:${i === 0 ? 'flex' : 'none'}; align-items:center; justify-content:center; width:100vw; height:100vh; background:#09090f;">
      <div style="width:${width}px; height:${height}px; transform-origin:center; overflow:hidden; border-radius:12px; box-shadow:0 24px 64px rgba(0,0,0,0.6);">
        <iframe srcdoc="${encodeHTML(html)}" style="width:${width}px; height:${height}px; border:none; pointer-events:none; transform-origin:top left;" scrolling="no"></iframe>
      </div>
    </section>
  `).join('');

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #09090f; font-family: 'DM Sans', sans-serif; overflow: hidden; }
    .slide { position: fixed; inset: 0; }
    
    /* Navigation */
    .nav { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 100;
      display: flex; align-items: center; gap: 16px; padding: 10px 20px; border-radius: 40px;
      background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.12); }
    .nav button { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer;
      font-size: 18px; padding: 4px 8px; border-radius: 8px; transition: all 0.2s; }
    .nav button:hover { color: white; background: rgba(255,255,255,0.1); }
    .nav .dots { display: flex; gap: 6px; }
    .nav .dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.3);
      cursor: pointer; transition: all 0.3s; }
    .nav .dot.active { width: 20px; border-radius: 4px; background: #7C3AED; }
    .counter { color: rgba(255,255,255,0.5); font-size: 12px; letter-spacing: 0.05em; font-family: monospace; min-width: 48px; text-align: center; }
    
    /* Keyboard hint */
    .hint { position: fixed; top: 16px; right: 16px; z-index: 100; font-size: 11px;
      color: rgba(255,255,255,0.3); letter-spacing: 0.05em; }
    
    .slide iframe { transform-origin: top left; }
  </style>
</head>
<body>
  ${slidesSrc}
  
  <div class="hint">← → ou SPACE para navegar · F para fullscreen</div>
  
  <div class="nav">
    <button id="prev-btn" onclick="changeSlide(-1)">←</button>
    <div class="dots" id="dots-container"></div>
    <button id="next-btn" onclick="changeSlide(1)">→</button>
    <span class="counter" id="counter">1 / ${slidesHtml.length}</span>
  </div>

  <script>
    const TOTAL = ${slidesHtml.length};
    const W = ${width}, H = ${height};
    let current = 0;
    
    // Scale iframes to viewport
    function scaleSlides() {
      const scaleX = window.innerWidth / W;
      const scaleY = window.innerHeight / H;
      const scale = Math.min(scaleX, scaleY);
      document.querySelectorAll('.slide iframe').forEach(iframe => {
        iframe.style.transform = 'scale(' + scale + ')';
      });
    }
    window.addEventListener('resize', scaleSlides);
    scaleSlides();
    
    // Dots
    const dotsContainer = document.getElementById('dots-container');
    for (let i = 0; i < TOTAL; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.onclick = () => goTo(i);
      dotsContainer.appendChild(dot);
    }
    
    function goTo(idx) {
      const slides = document.querySelectorAll('.slide');
      const dots = document.querySelectorAll('.dot');
      slides[current].style.display = 'none';
      dots[current].classList.remove('active');
      current = Math.max(0, Math.min(TOTAL - 1, idx));
      slides[current].style.display = 'flex';
      dots[current].classList.add('active');
      document.getElementById('counter').textContent = (current + 1) + ' / ' + TOTAL;
    }
    
    function changeSlide(dir) { goTo(current + dir); }
    
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' ') changeSlide(1);
      if (e.key === 'ArrowLeft') changeSlide(-1);
      if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.();
    });
  </script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, `${title}.html`);
}

// ─── Upload a single slide image to Supabase storage ────────────────────────
export async function uploadSlideToStorage(
  blob: Blob,
  workspaceId: string,
  postId: string,
  slideIndex: number,
  client: SupabaseClient
): Promise<string | null> {
  const filePath = `${workspaceId}/${postId}/slide_${slideIndex}.png`;

  const { error } = await client.storage
    .from('postgen')
    .upload(filePath, blob, { upsert: true, contentType: 'image/png' });

  if (error) {
    console.error('uploadSlideToStorage error:', error);
    return null;
  }

  const { data: urlData } = client.storage.from('postgen').getPublicUrl(filePath);
  return urlData?.publicUrl ?? null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function encodeHTML(html: string): string {
  return html.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
