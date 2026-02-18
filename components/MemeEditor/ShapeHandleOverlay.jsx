import { useRef, useEffect, useState } from 'react';
import { Trash2, RotateCw } from 'lucide-react';

/**
 * ShapeHandleOverlay - DOM overlay for manipulating selected shapes
 * Renders 8 resize handles (corners + edges) + rotation handle + delete button
 *
 * Props:
 *   shape - The selected shape object { id, x, y, w, h, rotation, ... }
 *   canvasWidth - Pixel width of canvas container
 *   canvasHeight - Pixel height of canvas container
 *   onMove - (newShape) => void
 *   onResize - (newShape) => void
 *   onRotate - (newShape) => void
 *   onDelete - () => void
 */
export default function ShapeHandleOverlay({ shape, canvasWidth, canvasHeight, onMove, onResize, onRotate, onDelete }) {
  const dragStateRef = useRef(null);

  // Convert normalized coords (0-1) to pixels
  const shapePixels = {
    x: shape.x * canvasWidth,
    y: shape.y * canvasHeight,
    w: shape.w * canvasWidth,
    h: shape.h * canvasHeight,
  };

  const center = {
    x: shapePixels.x + shapePixels.w / 2,
    y: shapePixels.y + shapePixels.h / 2,
  };

  // Handle positions (relative to container)
  const handles = {
    tl: { x: shapePixels.x, y: shapePixels.y },                              // top-left
    tr: { x: shapePixels.x + shapePixels.w, y: shapePixels.y },              // top-right
    bl: { x: shapePixels.x, y: shapePixels.y + shapePixels.h },              // bottom-left
    br: { x: shapePixels.x + shapePixels.w, y: shapePixels.y + shapePixels.h }, // bottom-right
    t: { x: shapePixels.x + shapePixels.w / 2, y: shapePixels.y },           // top
    b: { x: shapePixels.x + shapePixels.w / 2, y: shapePixels.y + shapePixels.h }, // bottom
    l: { x: shapePixels.x, y: shapePixels.y + shapePixels.h / 2 },           // left
    r: { x: shapePixels.x + shapePixels.w, y: shapePixels.y + shapePixels.h / 2 }, // right
  };

  const rotationHandle = {
    x: center.x,
    y: shapePixels.y - 40, // Above the shape
  };

  const handlePointerDown = (e, type, handle) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startShape = { ...shape };

    dragStateRef.current = { type, handle, startX, startY, startShape };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragStateRef.current) return;

    const { type, startX, startY, startShape } = dragStateRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Convert to normalized coords
    const ndx = dx / canvasWidth;
    const ndy = dy / canvasHeight;

    let newShape = { ...startShape };

    if (type === 'move') {
      // Move entire shape
      newShape.x = startShape.x + ndx;
      newShape.y = startShape.y + ndy;
      onMove(newShape);
    } else if (type === 'resize') {
      // Handle-based resize
      const handle = dragStateRef.current.handle;
      let newX = startShape.x;
      let newY = startShape.y;
      let newW = startShape.w;
      let newH = startShape.h;

      if (handle === 'tl') {
        newX = startShape.x + ndx;
        newY = startShape.y + ndy;
        newW = startShape.w - ndx;
        newH = startShape.h - ndy;
      } else if (handle === 'tr') {
        newY = startShape.y + ndy;
        newW = startShape.w + ndx;
        newH = startShape.h - ndy;
      } else if (handle === 'bl') {
        newX = startShape.x + ndx;
        newW = startShape.w - ndx;
        newH = startShape.h + ndy;
      } else if (handle === 'br') {
        newW = startShape.w + ndx;
        newH = startShape.h + ndy;
      } else if (handle === 't') {
        newY = startShape.y + ndy;
        newH = startShape.h - ndy;
      } else if (handle === 'b') {
        newH = startShape.h + ndy;
      } else if (handle === 'l') {
        newX = startShape.x + ndx;
        newW = startShape.w - ndx;
      } else if (handle === 'r') {
        newW = startShape.w + ndx;
      }

      // Prevent negative dimensions
      if (newW > 0.01 && newH > 0.01) {
        newShape = { ...startShape, x: newX, y: newY, w: newW, h: newH };
        onResize(newShape);
      }
    } else if (type === 'rotate') {
      // Rotation: calculate angle from center to current mouse position
      const cx = center.x;
      const cy = center.y;

      const startAngle = Math.atan2(startY - cy, startX - cx);
      const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);

      newShape.rotation = ((startShape.rotation || 0) + deltaAngle) % 360;
      onRotate(newShape);
    }
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
  };

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [shape, canvasWidth, canvasHeight, onMove, onResize, onRotate]);

  const handleSize = 12;
  const handleOffset = handleSize / 2;

  return (
    <div
      data-html2canvas-ignore="true"
      className="absolute inset-0 pointer-events-none select-none"
      style={{
        width: canvasWidth,
        height: canvasHeight,
      }}
    >
      {/* Rotation Handle */}
      <div
        className="absolute w-8 h-8 flex items-center justify-center bg-blue-500 border border-blue-300 rounded-full cursor-grab active:cursor-grabbing pointer-events-auto transition-transform hover:scale-125 z-40"
        style={{
          left: `${rotationHandle.x - 16}px`,
          top: `${rotationHandle.y - 16}px`,
        }}
        onPointerDown={(e) => handlePointerDown(e, 'rotate', null)}
        title="Rotate"
      >
        <RotateCw className="w-4 h-4 text-white" />
      </div>

      {/* Rotation Line (from shape center to rotation handle) */}
      <svg
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: 0,
          width: canvasWidth,
          height: canvasHeight,
        }}
      >
        <line
          x1={center.x}
          y1={center.y}
          x2={rotationHandle.x}
          y2={rotationHandle.y}
          stroke="var(--color-brand)"
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.7"
        />
      </svg>

      {/* Corner Handles */}
      {['tl', 'tr', 'bl', 'br'].map((corner) => (
        <div
          key={corner}
          className="absolute w-3 h-3 bg-white border-2 border-var(--color-brand) rounded cursor-nwse-resize pointer-events-auto hover:scale-150 transition-transform z-40"
          style={{
            left: `${handles[corner].x - handleOffset}px`,
            top: `${handles[corner].y - handleOffset}px`,
            borderColor: 'var(--color-brand)',
            cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
          }}
          onPointerDown={(e) => handlePointerDown(e, 'resize', corner)}
          title={`Resize ${corner}`}
        />
      ))}

      {/* Edge Handles */}
      {['t', 'b', 'l', 'r'].map((edge) => (
        <div
          key={edge}
          className="absolute bg-white border border-var(--color-brand) pointer-events-auto hover:scale-150 transition-transform z-40"
          style={{
            width: edge === 't' || edge === 'b' ? '24px' : '6px',
            height: edge === 't' || edge === 'b' ? '6px' : '24px',
            left: `${handles[edge].x - (edge === 't' || edge === 'b' ? 12 : 3)}px`,
            top: `${handles[edge].y - (edge === 't' || edge === 'b' ? 3 : 12)}px`,
            borderColor: 'var(--color-brand)',
            cursor: edge === 't' || edge === 'b' ? 'ns-resize' : 'ew-resize',
          }}
          onPointerDown={(e) => handlePointerDown(e, 'resize', edge)}
          title={`Resize ${edge}`}
        />
      ))}

      {/* Delete Button */}
      <button
        className="absolute w-8 h-8 flex items-center justify-center bg-red-500 border border-red-300 rounded-full pointer-events-auto hover:scale-125 transition-transform active:scale-90 z-40"
        style={{
          left: `${shapePixels.x + shapePixels.w - 16}px`,
          top: `${shapePixels.y - 16}px`,
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        title="Delete Shape"
      >
        <Trash2 className="w-4 h-4 text-white" />
      </button>

      {/* Marching Ants Border */}
      <svg
        className="absolute pointer-events-none"
        style={{
          left: `${shapePixels.x - 3}px`,
          top: `${shapePixels.y - 3}px`,
          width: `${shapePixels.w + 6}px`,
          height: `${shapePixels.h + 6}px`,
          overflow: 'visible',
        }}
      >
        <rect
          x="3"
          y="3"
          width={shapePixels.w}
          height={shapePixels.h}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2"
          strokeDasharray="8 4"
          className="animate-march"
        />
      </svg>
    </div>
  );
}
