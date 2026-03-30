import { useEffect, useRef } from 'react';

interface SlideFrameProps {
  slideHtml: string;
  width: number;
  height: number;
  editable?: boolean;
  onHtmlChange?: (nextHtml: string) => void;
}

const EXPLICIT_EDITABLE_SELECTOR = '[data-postgen-editable="true"]';
const FALLBACK_EDITABLE_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,span,li,blockquote,strong,em';

const wrapHtml = (html: string) => {
  // Add a global inline style to highlight selections and configure DND
  const canvasStyle = `
    <style id="postgen-canvas-core">
      [data-node-selected="true"] { outline: 2px solid var(--primary, #7C3AED) !important; outline-offset: 4px; border-radius: 4px; position: relative; z-index: 50; }
      .postgen-editable { transition: outline 0.1s; user-select: none; }
      .postgen-editable[contenteditable="true"] { user-select: text; cursor: text !important; outline: none !important; border-bottom: 2px dashed #7C3AED; }
    </style>
  `;
  let processed = html.toLowerCase().includes('<!doctype') ? html : `<!DOCTYPE html>${html}`;
  if (processed.includes('</head>')) {
    processed = processed.replace('</head>', canvasStyle + '</head>');
  } else {
    processed = processed.replace('</body>', canvasStyle + '</body>');
  }
  return processed;
};

const SlideFrame = ({ slideHtml, width, height, editable = false, onHtmlChange }: SlideFrameProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // We write the HTML natively to the iframe
    doc.open();
    doc.write(wrapHtml(slideHtml));
    doc.close();

    if (!editable) return;

    const win = iframe.contentWindow;
    if (!win) return;

    const syncHtml = () => {
      // Clean up internal selection flags before saving
      doc.querySelectorAll('[data-node-selected]').forEach(el => el.removeAttribute('data-node-selected'));
      onHtmlChange?.(wrapHtml(doc.documentElement.outerHTML));
    };

    const explicitNodes = Array.from(doc.body.querySelectorAll<HTMLElement>(EXPLICIT_EDITABLE_SELECTOR))
      .filter(node => node.textContent?.trim());

    const editableNodes = (explicitNodes.length > 0 ? explicitNodes : Array.from(
      doc.body.querySelectorAll<HTMLElement>(FALLBACK_EDITABLE_SELECTOR),
    )).filter(node => node.textContent?.trim());

    // ─── DND ENGINE VARIABLES ───
    let isDragging = false;
    let currentDragNode: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;

    editableNodes.forEach(node => {
      // Initialization
      if (!node.getAttribute('data-postgen-id')) {
        node.setAttribute('data-postgen-id', 'node_' + Math.random().toString(36).substring(2, 9));
      }
      node.classList.add('postgen-editable');
      node.style.cursor = 'grab';

      // Interactions
      node.addEventListener('mousedown', (e) => {
        if (node.getAttribute('contenteditable') === 'true') return;
        
        // Single Click: Select & start dragging
        e.preventDefault(); // prevent text selection while dragging
        isDragging = true;
        currentDragNode = node;
        startX = e.clientX;
        startY = e.clientY;

        // Visual Select
        doc.querySelectorAll('[data-node-selected]').forEach(el => el.removeAttribute('data-node-selected'));
        node.setAttribute('data-node-selected', 'true');

        // Post Message to GeneratorPage (React Context)
        const computed = win.getComputedStyle(node);
        window.parent.postMessage({
          type: 'POSTGEN_NODE_SELECT',
          nodeId: node.getAttribute('data-postgen-id'),
          tag: node.tagName,
          text: node.innerText,
          styles: {
            color: computed.color,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            textAlign: computed.textAlign,
            opacity: computed.opacity,
          }
        }, '*');
      });

      node.addEventListener('dblclick', (e) => {
        // Double Click: Enter text editing mode
        e.stopPropagation();
        node.contentEditable = 'true';
        node.style.cursor = 'text';
        node.focus();
        
        // Move caret to end
        const range = doc.createRange();
        const sel = win.getSelection();
        range.selectNodeContents(node);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      });

      node.addEventListener('blur', () => {
        // Exit editing mode
        node.contentEditable = 'false';
        node.style.cursor = 'grab';
        syncHtml();
      });
    });

    // ─── WINDOW DRAG EVENTS ───
    doc.addEventListener('mousemove', (e) => {
      if (!isDragging || !currentDragNode) return;
      currentDragNode.style.cursor = 'grabbing';
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;

      const currentTx = parseFloat(currentDragNode.getAttribute('data-tx') || '0');
      const currentTy = parseFloat(currentDragNode.getAttribute('data-ty') || '0');
      const newTx = currentTx + dx;
      const newTy = currentTy + dy;

      currentDragNode.setAttribute('data-tx', newTx.toString());
      currentDragNode.setAttribute('data-ty', newTy.toString());
      currentDragNode.style.transform = `translate(${newTx}px, ${newTy}px)`;
    });

    doc.addEventListener('mouseup', () => {
      if (isDragging && currentDragNode) {
        currentDragNode.style.cursor = 'grab';
        syncHtml();
      }
      isDragging = false;
      currentDragNode = null;
    });

    doc.addEventListener('click', (e) => {
      // Click outside to deselect
      if (e.target === doc.body || (e.target as Element).tagName === 'DIV') {
        if (!(e.target as Element).classList.contains('postgen-editable')) {
          doc.querySelectorAll('[data-node-selected]').forEach(el => el.removeAttribute('data-node-selected'));
          window.parent.postMessage({ type: 'POSTGEN_NODE_DESELECT' }, '*');
        }
      }
    });

    // ─── INCOMING MESSAGE HANDLER ───
    // Receives style updates from the React Inspector
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'POSTGEN_INSPECTOR_UPDATE') {
        const { nodeId, updates } = e.data;
        const target = doc.querySelector(`[data-postgen-id="${nodeId}"]`) as HTMLElement;
        if (target && updates) {
          Object.assign(target.style, updates);
          syncHtml();
        }
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [editable, onHtmlChange, slideHtml]);

  return (
    <iframe
      ref={iframeRef}
      title="slide-preview"
      sandbox="allow-same-origin allow-scripts"
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
