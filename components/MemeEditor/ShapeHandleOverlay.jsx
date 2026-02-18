import { useRef, useEffect } from 'react';
import { Trash2, RotateCw } from 'lucide-react';

export default function ShapeHandleOverlay({ shape, canvasWidth, canvasHeight, onMove, onResize, onRotate, onDelete }) {
  const dragStateRef = useRef(null);
  const containerRef = useRef(null);

  // Canvas-local pixel bounds
  const px = shape.x * canvasWidth;
  const py = shape.y * canvasHeight;
  const pw = shape.w * canvasWidth;
  const ph = shape.h * canvasHeight;
  const cx = px + pw / 2;
  const cy = py + ph / 2;

  // Rotation handle sits 36px above the top-center
  const rotHandleLocalX = cx;
  const rotHandleLocalY = py - 36;

  const startDrag = (e, type, handle) => {
    e.preventDefault();
    e.stopPropagation();

    // Convert canvas-local center → viewport coords using container rect
    const containerRect = containerRef.current?.getBoundingClientRect();
    const centerViewport = containerRect
      ? { x: containerRect.left + cx, y: containerRect.top + cy }
      : { x: cx, y: cy };

    dragStateRef.current = {
      type,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startShape: { ...shape },
      centerViewport,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const state = dragStateRef.current;
    if (!state) return;

    const { type, handle, startClientX, startClientY, startShape, centerViewport } = state;
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    const ndx = dx / canvasWidth;
    const ndy = dy / canvasHeight;
    let next = { ...startShape };

    if (type === 'move') {
      next.x = startShape.x + ndx;
      next.y = startShape.y + ndy;
      onMove(next);

    } else if (type === 'resize') {
      let { x, y, w, h } = startShape;
      if (handle === 'tl') { x += ndx; y += ndy; w -= ndx; h -= ndy; }
      else if (handle === 'tr') { y += ndy; w += ndx; h -= ndy; }
      else if (handle === 'bl') { x += ndx; w -= ndx; h += ndy; }
      else if (handle === 'br') { w += ndx; h += ndy; }
      else if (handle === 't')  { y += ndy; h -= ndy; }
      else if (handle === 'b')  { h += ndy; }
      else if (handle === 'l')  { x += ndx; w -= ndx; }
      else if (handle === 'r')  { w += ndx; }
      if (w > 0.01 && h > 0.01) {
        next = { ...startShape, x, y, w, h };
        onResize(next);
      }

    } else if (type === 'rotate') {
      // Both angles measured from shape center in viewport coords
      const startAngle   = Math.atan2(startClientY - centerViewport.y, startClientX - centerViewport.x);
      const currentAngle = Math.atan2(e.clientY    - centerViewport.y, e.clientX    - centerViewport.x);
      const delta = (currentAngle - startAngle) * (180 / Math.PI);
      next.rotation = ((startShape.rotation || 0) + delta + 360) % 360;
      onRotate(next);
    }
  };

  const onPointerUp = () => { dragStateRef.current = null; };

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [shape, canvasWidth, canvasHeight]);

  // Shared handle dot style
  const dot = (x, y, cursor, handle) => (
    <div
      key={handle}
      className="absolute w-3 h-3 bg-white rounded-sm pointer-events-auto z-50 transition-transform hover:scale-150"
      style={{
        left: x - 6,
        top:  y - 6,
        cursor,
        border: '2px solid var(--color-brand)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
      }}
      onPointerDown={(e) => startDrag(e, 'resize', handle)}
    />
  );

  return (
    <div
      ref={containerRef}
      data-html2canvas-ignore="true"
      className="absolute inset-0 pointer-events-none select-none"
    >
      {/* ── Move zone (transparent, over the shape bounds) ── */}
      <div
        className="absolute pointer-events-auto cursor-move"
        style={{ left: px, top: py, width: pw, height: ph }}
        onPointerDown={(e) => startDrag(e, 'move', null)}
      />

      {/* ── Marching ants border ── */}
      <svg className="absolute pointer-events-none overflow-visible"
        style={{ left: px - 3, top: py - 3, width: pw + 6, height: ph + 6 }}>
        <rect x="3" y="3" width={pw} height={ph}
          fill="none" stroke="var(--color-brand)" strokeWidth="2"
          strokeDasharray="8 4" className="animate-march"/>
      </svg>

      {/* ── Rotation stem line ── */}
      <svg className="absolute pointer-events-none"
        style={{ left: 0, top: 0, width: canvasWidth, height: canvasHeight }}>
        <line x1={cx} y1={py} x2={rotHandleLocalX} y2={rotHandleLocalY}
          stroke="var(--color-brand)" strokeWidth="1.5"
          strokeDasharray="4 3" opacity="0.6"/>
      </svg>

      {/* ── Rotation handle ── */}
      <div
        className="absolute w-7 h-7 flex items-center justify-center bg-[#1a1a2e] border border-brand/70 rounded-full pointer-events-auto cursor-grab active:cursor-grabbing z-50 hover:bg-brand/20 transition-colors"
        style={{
          left: rotHandleLocalX - 14,
          top:  rotHandleLocalY - 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
        onPointerDown={(e) => startDrag(e, 'rotate', null)}
        title="Drag to rotate"
      >
        <RotateCw className="w-3.5 h-3.5 text-brand" />
      </div>

      {/* ── Corner handles ── */}
      {dot(px,      py,      'nwse-resize', 'tl')}
      {dot(px + pw, py,      'nesw-resize', 'tr')}
      {dot(px,      py + ph, 'nesw-resize', 'bl')}
      {dot(px + pw, py + ph, 'nwse-resize', 'br')}

      {/* ── Edge handles ── */}
      {dot(cx,      py,      'ns-resize',  't')}
      {dot(cx,      py + ph, 'ns-resize',  'b')}
      {dot(px,      cy,      'ew-resize',  'l')}
      {dot(px + pw, cy,      'ew-resize',  'r')}

      {/* ── Delete button ── */}
      <button
        className="absolute w-6 h-6 flex items-center justify-center bg-red-600 border border-red-400/60 rounded-full pointer-events-auto z-50 hover:bg-red-500 active:scale-90 transition-all"
        style={{
          left: px + pw - 12,
          top:  py - 12,
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
        }}
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
        title="Delete shape"
      >
        <Trash2 className="w-3 h-3 text-white" />
      </button>
    </div>
  );
}
