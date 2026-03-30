import html2canvas from 'html2canvas';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/**
 * Export a single slide HTML string to a PNG Blob via html2canvas.
 */
export async function exportSlide(
  slideHtml: string,
  _filename:  string,
  width:      number,
  height:     number,
  scale = 2
): Promise<Blob> {
  // Create an off-screen container at exact artboard size
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -${width * scale + 100}px;
    top: 0;
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    visibility: visible;
    z-index: -1;
  `;

  // Write the HTML into an iframe within the container
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width:${width}px; height:${height}px; border:none; display:block;`;
  iframe.setAttribute('sandbox', 'allow-same-origin');
  container.appendChild(iframe);
  document.body.appendChild(container);

  // Wait for the iframe to initialize then write content
  await new Promise(resolve => setTimeout(resolve, 100));
  const doc = iframe.contentDocument!;
  doc.open(); doc.write(slideHtml); doc.close();

  // Give fonts and images time to load
  await new Promise(resolve => setTimeout(resolve, 600));

  const canvas = await html2canvas(iframe.contentDocument!.body, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    width,
    height,
    logging: false,
    imageTimeout: 6000,
  });

  document.body.removeChild(container);

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png', 1.0);
  });
}

/**
 * Export all slides and bundle them as a ZIP download.
 */
export async function exportAllSlides(
  slidesHtml: string[],
  title:      string,
  width:      number,
  height:     number,
  scale = 2
): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  for (let i = 0; i < slidesHtml.length; i++) {
    const blob = await exportSlide(slidesHtml[i], `slide-${i + 1}`, width, height, scale);
    const safeTitle = title.replace(/[^a-zA-Z0-9-_]/g, '_');
    zip.file(`${safeTitle}_slide_${i + 1}.png`, blob);
    // Breathing room between slides
    await new Promise(r => setTimeout(r, 150));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9-_]/g, '_')}_posts.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Upload a slide blob to Supabase Storage.
 */
export async function uploadSlideToStorage(
  blob:        Blob,
  workspaceId: string,
  postId:      string,
  slideIndex:  number,
  supabaseClient: SupabaseClient<Database>
): Promise<string | null> {
  const path = `post-images/${workspaceId}/${postId}/slide-${slideIndex}.png`;
  const { error } = await supabaseClient.storage
    .from('postgen')
    .upload(path, blob, { contentType: 'image/png', upsert: true });
  if (error) { console.error('Upload error:', error); return null; }
  const { data } = supabaseClient.storage.from('postgen').getPublicUrl(path);
  return data?.publicUrl ?? null;
}
