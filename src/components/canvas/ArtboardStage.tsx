import { useEffect, useRef, useState, useCallback } from 'react';
import { ArtboardFormat, ARTBOARD_DIMENSIONS, calculateScale } from '@/lib/canvasEngine';

interface ArtboardStageProps {
  format: ArtboardFormat;
  children: React.ReactNode;
  className?: string;
}

const ArtboardStage = ({ format, children, className = '' }: ArtboardStageProps) => {
  const stageRef   = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);

  const { width, height } = ARTBOARD_DIMENSIONS[format];

  const recalcScale = useCallback(() => {
    if (!stageRef.current) return;
    const { clientWidth, clientHeight } = stageRef.current;
    setScale(calculateScale(clientWidth, clientHeight, width, height));
  }, [width, height]);

  useEffect(() => {
    recalcScale();
    const observer = new ResizeObserver(recalcScale);
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [recalcScale]);

  return (
    <div
      ref={stageRef}
      className={`canvas-stage canvas-stage-bg ${className}`}
      style={{ flex: 1, minHeight: 0, minWidth: 0, position: 'relative' }}
    >
      {/* Artboard */}
      <div
        className="artboard-shadow"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          borderRadius: 2,
        }}
      >
        {children}
      </div>

      {/* Scale indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-3)',
          background: 'rgba(0,0,0,0.4)',
          padding: '2px 6px',
          borderRadius: 4,
          pointerEvents: 'none',
        }}
      >
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};

export default ArtboardStage;
