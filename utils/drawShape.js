// utils/drawShape.js
// Pure function — no side effects, no imports. Works on any Canvas 2D context.

/**
 * Draw a single shape onto a canvas context.
 * All coordinates in the shape are normalized (0-1); pass actual canvas pixel dimensions.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} shape - shape data object from meme.shapes[]
 * @param {number} width - canvas pixel width
 * @param {number} height - canvas pixel height
 */
export function drawShape(ctx, shape, width, height) {
  const sx = shape.x * width;
  const sy = shape.y * height;
  const sw = shape.w * width;
  const sh = shape.h * height;
  const cx = sx + sw / 2;
  const cy = sy + sh / 2;

  ctx.save();

  // Apply rotation around shape center
  if (shape.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate((shape.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.beginPath();
  ctx.lineWidth = (shape.strokeWidth || 3) * (width / 800);
  ctx.strokeStyle = shape.stroke || '#ff0000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (shape.type) {
    case 'rectangle':
      ctx.rect(sx, sy, sw, sh);
      break;

    case 'circle':
      ctx.ellipse(cx, cy, sw / 2, sh / 2, 0, 0, Math.PI * 2);
      break;

    case 'triangle': {
      ctx.moveTo(cx, sy);                // top center
      ctx.lineTo(sx + sw, sy + sh);      // bottom right
      ctx.lineTo(sx, sy + sh);           // bottom left
      ctx.closePath();
      break;
    }

    case 'line':
      ctx.moveTo(sx, sy + sh / 2);
      ctx.lineTo(sx + sw, sy + sh / 2);
      break;

    case 'arrow': {
      const headLen = Math.min(sw * 0.25, sh * 0.5, 30 * (width / 800));
      const angle = 0; // horizontal arrow
      const ex = sx + sw;
      const ey = sy + sh / 2;
      const startX = sx;
      const startY = sy + sh / 2;
      ctx.moveTo(startX, startY);
      ctx.lineTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
      break;
    }

    case 'star': {
      const points = shape.starPoints || 5;
      const outerR = Math.min(sw, sh) / 2;
      const innerR = outerR * 0.4;
      const step = Math.PI / points;
      ctx.moveTo(cx, cy - outerR);
      for (let i = 1; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = i * step - Math.PI / 2;
        ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();
      break;
    }

    case 'heart': {
      const hx = cx, hy = cy;
      const hw = sw / 2, hh = sh / 2;
      ctx.moveTo(hx, hy + hh * 0.35);
      ctx.bezierCurveTo(hx, hy - hh * 0.5, hx - hw * 1.2, hy - hh * 0.5, hx - hw, hy + hh * 0.1);
      ctx.bezierCurveTo(hx - hw * 0.5, hy + hh * 0.7, hx, hy + hh, hx, hy + hh);
      ctx.bezierCurveTo(hx, hy + hh, hx + hw * 0.5, hy + hh * 0.7, hx + hw, hy + hh * 0.1);
      ctx.bezierCurveTo(hx + hw * 1.2, hy - hh * 0.5, hx, hy - hh * 0.5, hx, hy + hh * 0.35);
      ctx.closePath();
      break;
    }

    case 'diamond': {
      ctx.moveTo(cx, sy);           // top
      ctx.lineTo(sx + sw, cy);      // right
      ctx.lineTo(cx, sy + sh);      // bottom
      ctx.lineTo(sx, cy);           // left
      ctx.closePath();
      break;
    }

    case 'speech-bubble': {
      const r = Math.min(sw, sh) * 0.15;
      const tailW = sw * 0.15;
      const tailAnchorX = sx + sw * (shape.tailX ?? 0.25);
      const bubbleBottom = sy + sh * 0.75;

      ctx.moveTo(sx + r, sy);
      ctx.lineTo(sx + sw - r, sy);
      ctx.arcTo(sx + sw, sy, sx + sw, sy + r, r);
      ctx.lineTo(sx + sw, bubbleBottom - r);
      ctx.arcTo(sx + sw, bubbleBottom, sx + sw - r, bubbleBottom, r);
      ctx.lineTo(tailAnchorX + tailW / 2, bubbleBottom);
      ctx.lineTo(tailAnchorX, sy + sh);
      ctx.lineTo(tailAnchorX - tailW / 2, bubbleBottom);
      ctx.lineTo(sx + r, bubbleBottom);
      ctx.arcTo(sx, bubbleBottom, sx, bubbleBottom - r, r);
      ctx.lineTo(sx, sy + r);
      ctx.arcTo(sx, sy, sx + r, sy, r);
      ctx.closePath();
      break;
    }

    case 'thought-bubble': {
      // Main ellipse
      ctx.ellipse(cx, sy + sh * 0.38, sw * 0.48, sh * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      // Three small circles as tail
      const tailBaseX = cx - sw * 0.2;
      const tailBaseY = sy + sh * 0.73;
      ctx.ellipse(tailBaseX, tailBaseY, sw * 0.07, sh * 0.07, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(tailBaseX - sw * 0.09, tailBaseY + sh * 0.1, sw * 0.05, sh * 0.05, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(tailBaseX - sw * 0.16, tailBaseY + sh * 0.18, sw * 0.035, sh * 0.035, 0, 0, Math.PI * 2);
      if (shape.fill) {
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();
      return; // Early return — thought bubble handles its own strokes
    }

    default:
      ctx.restore();
      return;
  }

  if (shape.fill) {
    ctx.fillStyle = shape.fill;
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Returns true if point (px, py) — in canvas pixels — hits the shape.
 * Includes 6px stroke tolerance for outline-only shapes.
 *
 * @param {Object} shape
 * @param {number} px - point x in canvas pixels
 * @param {number} py - point y in canvas pixels
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function hitTestShape(shape, px, py, canvasWidth, canvasHeight) {
  const sx = shape.x * canvasWidth;
  const sy = shape.y * canvasHeight;
  const sw = shape.w * canvasWidth;
  const sh = shape.h * canvasHeight;
  const cx = sx + sw / 2;
  const cy = sy + sh / 2;
  const tol = 6;

  // Apply inverse rotation to point
  let testX = px, testY = py;
  if (shape.rotation) {
    const rad = (-shape.rotation * Math.PI) / 180;
    const dx = px - cx, dy = py - cy;
    testX = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
    testY = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
  }

  // Fast bounding box reject (with tolerance)
  if (testX < sx - tol || testX > sx + sw + tol || testY < sy - tol || testY > sy + sh + tol) {
    return false;
  }

  switch (shape.type) {
    case 'rectangle':
    case 'diamond':
    case 'triangle':
    case 'speech-bubble':
    case 'thought-bubble':
    case 'arrow':
    case 'line':
      if (shape.fill) return true;
      return (
        Math.abs(testX - sx) < tol ||
        Math.abs(testX - (sx + sw)) < tol ||
        Math.abs(testY - sy) < tol ||
        Math.abs(testY - (sy + sh)) < tol
      );

    case 'circle': {
      const rx = sw / 2, ry = sh / 2;
      const nx = (testX - cx) / rx;
      const ny = (testY - cy) / ry;
      const dist = Math.sqrt(nx * nx + ny * ny);
      if (shape.fill) return dist <= 1;
      return Math.abs(dist - 1) * Math.min(rx, ry) < tol;
    }

    case 'star':
    case 'heart':
      return true; // already passed fast reject above

    default:
      return true;
  }
}
