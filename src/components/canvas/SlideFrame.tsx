import { useEffect, useRef } from 'react';

interface SlideFrameProps {
  slideHtml: string;
  width: number;
  height: number;
  editable?: boolean;
  onHtmlChange?: (nextHtml: string) => void;
}

const EDITABLE_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,span,li,blockquote,strong,em';

const wrapHtml = (html: string) => (html.toLowerCase().includes('<!doctype') ? html : `<!DOCTYPE html>${html}`);

const SlideFrame = ({ slideHtml, width, height, editable = false, onHtmlChange }: SlideFrameProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(wrapHtml(slideHtml));
    doc.close();

    if (!editable) return;

    const syncHtml = () => {
      onHtmlChange?.(wrapHtml(doc.documentElement.outerHTML));
    };

    const editableNodes = Array.from(doc.body.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR))
      .filter(node => node.textContent?.trim());

    editableNodes.forEach(node => {
      node.contentEditable = 'true';
      node.spellcheck = false;
      node.style.cursor = 'text';
      node.style.outline = 'none';
      node.style.caretColor = '#60A5FA';
      node.addEventListener('blur', syncHtml);
    });

    return () => {
      editableNodes.forEach(node => {
        node.removeEventListener('blur', syncHtml);
      });
    };
  }, [editable, onHtmlChange, slideHtml]);

  return (
    <iframe
      ref={iframeRef}
      title="slide-preview"
      sandbox="allow-same-origin"
      scrolling="no"
      style={{
        width,
        height,
        border: 'none',
        display: 'block',
        pointerEvents: editable ? 'auto' : 'none',
      }}
    />
  );
};

export default SlideFrame;
