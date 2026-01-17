import { forwardRef, useRef, useEffect, useState, memo } from "react";
import { Loader2, Plus, Image as ImageIcon, Video, Upload, X, Trash2, Settings2 } from "lucide-react";
import { getAnimationById } from "../../constants/textAnimations";
import CountdownOverlay from "./CountdownOverlay";

/**
 * Optimized Wave Animation Text Component
 * Memoized to prevent recalculating character splits on every parent render
 * Only re-renders when content actually changes
 */
const WaveAnimationText = memo(function WaveAnimationText({ content }) {
  // Pre-compute the animated characters structure
  // This is expensive so we only do it when content changes
  const lines = content.split('\n');
  let globalCharIdx = 0;

  return lines.map((line, lineIdx) => {
    const words = line.split(/(\s+)/);

    return (
      <span key={lineIdx} style={{ display: 'block' }}>
        {words.map((word, wordIdx) => {
          if (/^\s+$/.test(word)) {
            globalCharIdx += word.length;
            return ' ';
          }

          const startIdx = globalCharIdx;
          globalCharIdx += word.length;

          return (
            <span key={wordIdx} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {word.split('').map((char, charInWordIdx) => (
                <span
                  key={charInWordIdx}
                  className="animate-meme-wave-char"
                  style={{ animationDelay: `${(startIdx + charInWordIdx) * 0.1}s` }}
                >
                  {char}
                </span>
              ))}
            </span>
          );
        })}
        {line.length === 0 && <span>&nbsp;</span>}
      </span>
    );
  });
});

const MemeCanvas = forwardRef(({
  meme,
  loading,
  isProcessing,
  draggedId,
  selectedId,
  editingId,
  activeTool,
  onDrawCommit,
  onFineTune,
  onFineTuneCommit,
  onCenterText,
  onPointerDown,
  onRemoveSticker,
  onRemoveText,
  onTextChange,
  onAddTextAtPosition,
  onStartEditing,
  onCanvasPointerDown,
  activePanelId,
  onPanelSelect,
  onDrop,
  onClearPanel,
  onPanelPosChange,
  onHoverChange,
  isCropping,
  onCropCancel
}, ref) => {
  const description = `Meme editor with ${meme.panels?.length || 1} panels`;
  const drawCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const dummyInputRef = useRef(null); // iOS Keyboard Trigger Helper
  const targetPanelRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1); // Global Aspect Ratio (usually driven by first panel or default)
  const currentPathRef = useRef([]);
  const [dragOverPanel, setDragOverPanel] = useState(null);
  const [draggingPanel, setDraggingPanel] = useState(null);
  const [isHoveringElement, setIsHoveringElement] = useState(false); // Track text/sticker hover

  // Long-press cursor indicator state
  const [longPressCursor, setLongPressCursor] = useState(null); // { x, y, progress }

  // Long-press to add text refs
  const canvasLongPressTimerRef = useRef(null);
  const longPressStartPosRef = useRef(null);
  const focusOnNextReleaseRef = useRef(false); // New flag for hybrid approach

  // Robustly set caret position when editing starts
  useEffect(() => {
    if (editingId) {
      // Use requestAnimationFrame to ensure DOM is ready after React render
      requestAnimationFrame(() => {
        const textarea = document.getElementById(`canvas-input-${editingId}`);
        if (textarea) {
          textarea.focus({ preventScroll: true });
          // Set caret to the end of the text content
          const len = textarea.value.length;
          textarea.setSelectionRange(len, len);
        }
      });
    }
  }, [editingId]);

  // If we have an override (Deep Fry preview), it only applies to the ACTIVE panel for now visually

  const handleMediaLoad = (e) => {
    if (meme.layout === 'single') {
      const { naturalWidth, naturalHeight, videoWidth, videoHeight } = e.target;
      const w = naturalWidth || videoWidth || 1;
      const h = naturalHeight || videoHeight || 1;
      setAspectRatio(w / h);
    }
  };

  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef(null);

  // Sync container width for scaling (debounced to reduce layout thrashing)
  useEffect(() => {
    let timeoutId;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    const debouncedUpdateWidth = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateWidth, 100);
    };
    updateWidth();
    window.addEventListener('resize', debouncedUpdateWidth);
    return () => {
      window.removeEventListener('resize', debouncedUpdateWidth);
      clearTimeout(timeoutId);
    };
  }, []);

  const scaleFactor = containerWidth / 800;

  // Determine the IMAGE/CONTENT aspect ratio based on layout
  let imageAspect = 1; // Default square
  if (meme.layout === 'single') {
    imageAspect = aspectRatio;
  } else if (meme.layout === 'top-bottom') {
    imageAspect = 3 / 4; // Portrait-ish
  } else if (meme.layout === 'side-by-side') {
    imageAspect = 4 / 3; // Landscape-ish
  }

  // Calculate the TOTAL container aspect ratio that includes image + padding bars
  // The padding values are percentages of WIDTH
  // paddingHeight (in width units) = paddingPct / 100
  // totalHeight (in width units) = imageHeight + paddingTop + paddingBottom
  //                               = (1 / imageAspect) + (paddingTop/100) + (paddingBottom/100)
  // containerAspect = 1 / totalHeight
  const paddingTop = meme.paddingTop || 0;
  const paddingBottom = meme.paddingBottom || 0;
  const totalHeightInWidthUnits = (1 / imageAspect) + (paddingTop / 100) + (paddingBottom / 100);
  const containerAspect = 1 / totalHeightInWidthUnits;

  // Calculate what percentage of the TOTAL container height each section takes
  // This ensures the image area is NOT cut off - it maintains its full size
  const paddingTopPct = (paddingTop / 100) / totalHeightInWidthUnits * 100;
  const paddingBottomPct = (paddingBottom / 100) / totalHeightInWidthUnits * 100;

  // Panel Drag Logic
  useEffect(() => {
    if (!draggingPanel) return;

    const handlePointerMove = (e) => {
      const deltaX = e.clientX - draggingPanel.startX;
      const deltaY = e.clientY - draggingPanel.startY;

      // Calculate percentage change based on panel dimensions
      const deltaPctX = (deltaX / draggingPanel.panelWidth) * 100;
      const deltaPctY = (deltaY / draggingPanel.panelHeight) * 100;

      const newX = draggingPanel.startPosX - deltaPctX;
      const newY = draggingPanel.startPosY - deltaPctY;

      onPanelPosChange(draggingPanel.id, newX, newY, true);
    };

    const handlePointerUp = () => {
      const currentPanel = meme.panels.find(p => p.id === draggingPanel.id);
      if (currentPanel) {
        onPanelPosChange(draggingPanel.id, currentPanel.posX ?? 50, currentPanel.posY ?? 50, false);
      }
      setDraggingPanel(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingPanel, meme.panels, onPanelPosChange]);

  const handlePanelPointerDown = (e, panel) => {
    // Check conditions: Not single mode, No text selected, Not drawing
    const canDrag = meme.layout !== 'single' && !selectedId && !['pen', 'eraser'].includes(activeTool);

    // Also trigger long-press start (timer will be cancelled if drag moves too far)
    handleCanvasLongPressStart(e);

    if (canDrag && panel.url) { // Only if has image
      e.preventDefault(); // Prevent default drag behavior (and scrolling)
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      setDraggingPanel({
        id: panel.id,
        startX: e.clientX,
        startY: e.clientY,
        startPosX: panel.posX ?? 50,
        startPosY: panel.posY ?? 50,
        panelWidth: rect.width,
        panelHeight: rect.height
      });
    }
  };

  // Canvas Drawing Logic (Global Overlay)
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    (meme.drawings || []).forEach(d => {
      if (d.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.width * (canvas.width / 800);
      ctx.globalCompositeOperation = d.mode === 'eraser' ? 'destination-out' : 'source-over';

      ctx.moveTo(d.points[0].x * canvas.width, d.points[0].y * canvas.height);
      d.points.slice(1).forEach(p => ctx.lineTo(p.x * canvas.width, p.y * canvas.height));
      ctx.stroke();
    });

    ctx.globalCompositeOperation = 'source-over';
  }, [meme.drawings, meme.paddingTop, meme.paddingBottom, containerWidth]);

  const handleDrawStart = (e) => {
    if (activeTool !== 'pen' && activeTool !== 'eraser') return;
    e.stopPropagation();
    setIsDrawing(true);

    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    currentPathRef.current = [{ x, y }];
  };

  const handleDrawMove = (e) => {
    if (!isDrawing) return;
    e.stopPropagation();

    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    currentPathRef.current.push({ x, y });

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = (meme.drawWidth || 5) * (rect.width / 800);
    ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(255,255,255,0.5)' : (meme.drawColor || '#ff0000');

    const pts = currentPathRef.current;
    if (pts.length >= 2) {
      ctx.beginPath();
      const p1 = pts[pts.length - 2];
      const p2 = pts[pts.length - 1];
      ctx.moveTo(p1.x * rect.width, p1.y * rect.height);
      ctx.lineTo(p2.x * rect.width, p2.y * rect.height);
      ctx.stroke();
    }
  };

  const handleDrawEnd = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    e.stopPropagation();

    if (currentPathRef.current.length > 1) {
      onDrawCommit({
        points: currentPathRef.current,
        color: meme.drawColor || '#ff0000',
        width: meme.drawWidth || 5,
        mode: activeTool
      });
    }
    currentPathRef.current = [];
  };

  const handleGhostClick = (e, panelId, isActive) => {
    e.stopPropagation();
    if (isActive) {
      targetPanelRef.current = panelId;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    } else {
      onPanelSelect(panelId);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file && onDrop && targetPanelRef.current) {
      onDrop(file, targetPanelRef.current);
      targetPanelRef.current = null;
    }
  };

  // Long-press to add text handlers
  const handleCanvasLongPressStart = (e) => {
    // Don't trigger if drawing, if there's already a selected element, or if in editing mode
    if (activeTool === 'pen' || activeTool === 'eraser' || selectedId || editingId) return;

    // Check if we're on the canvas area using closest() to handle clicks on panels
    const canvasElement = e.target.closest('[data-meme-canvas]');
    if (!canvasElement) return;

    // Get position relative to the MAIN canvas
    const canvasRect = canvasElement.getBoundingClientRect();
    const x = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    const y = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    longPressStartPosRef.current = { x, y, clientX: e.clientX, clientY: e.clientY };

    // Robust Startup Cleanup: Clear any existing timers first to prevent "ghost" intervals
    if (canvasLongPressTimerRef.current) {
      if (canvasLongPressTimerRef.current.delayTimerId) clearTimeout(canvasLongPressTimerRef.current.delayTimerId);
      if (canvasLongPressTimerRef.current.timerId) clearTimeout(canvasLongPressTimerRef.current.timerId);
      if (canvasLongPressTimerRef.current.progressInterval) clearInterval(canvasLongPressTimerRef.current.progressInterval);
    }

    // Store all timer IDs
    canvasLongPressTimerRef.current = {
      delayTimerId: null,
      timerId: null,
      progressInterval: null
    };

    // Wait 300ms before showing the progress indicator (prevents flash on quick taps)
    canvasLongPressTimerRef.current.delayTimerId = setTimeout(() => {
      if (!longPressStartPosRef.current) return;

      // Show the cursor indicator after delay
      setLongPressCursor({ x, y, progress: 0 });

      // Animate progress over remaining 1.7 seconds (2s total - 0.3s delay)
      const startTime = Date.now();
      const remainingTime = 1700;

      canvasLongPressTimerRef.current.progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / remainingTime, 1);
        setLongPressCursor(prev => prev ? { ...prev, progress } : null);
        if (progress >= 1) {
          clearInterval(canvasLongPressTimerRef.current?.progressInterval);
        }
      }, 50);
    }, 300);

    // Start 2 second timer for text creation
    canvasLongPressTimerRef.current.timerId = setTimeout(() => {
      // 1. Clear the animation interval
      if (canvasLongPressTimerRef.current?.progressInterval) {
        clearInterval(canvasLongPressTimerRef.current.progressInterval);
      }

      // 2. Auto-trigger text creation IMMEDIATELY (User Request)
      if (longPressStartPosRef.current && onAddTextAtPosition) {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        onAddTextAtPosition(longPressStartPosRef.current.x, longPressStartPosRef.current.y);

        // 3. Set flag to focus input on NEXT release (iOS Requirement)
        focusOnNextReleaseRef.current = true;
      }

      // 4. Reset internal state (but keep cursor until release? actually let's clear it to show action is done)
      setLongPressCursor(null);
      longPressStartPosRef.current = null;
      canvasLongPressTimerRef.current = null;
    }, 2000);

  };

  const handleCanvasLongPressMove = (e) => {
    // If moved too far, cancel the long press
    if (longPressStartPosRef.current && canvasLongPressTimerRef.current) {
      const dx = e.clientX - longPressStartPosRef.current.clientX;
      const dy = e.clientY - longPressStartPosRef.current.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10) {
        if (canvasLongPressTimerRef.current.delayTimerId) {
          clearTimeout(canvasLongPressTimerRef.current.delayTimerId);
        }
        if (canvasLongPressTimerRef.current.timerId) {
          clearTimeout(canvasLongPressTimerRef.current.timerId);
        }
        if (canvasLongPressTimerRef.current.progressInterval) {
          clearInterval(canvasLongPressTimerRef.current.progressInterval);
        }
        canvasLongPressTimerRef.current = null;
        longPressStartPosRef.current = null;
        focusOnNextReleaseRef.current = false;
        setLongPressCursor(null);
      }
    }
  };

  const handleCanvasLongPressEnd = () => {
    // 1. Check if we need to focus the dummy input (Hybrid Approach)
    // 1. Check if we need to focus the dummy input (Hybrid Approach)
    if (focusOnNextReleaseRef.current) {
      // CRITICAL FIX: Only focus dummy input if we are NOT already editing a real input (avoid stealing focus)
      // The timer logic (onAddTextAtPosition) sets editingId, which triggers MemeInputs to focus.
      // We only want to 'bump' the keyboard if for some reason it didn't open.
      // Actually, on iOS, the async timer focus MIGHT fail.
      // So we should focus the dummy input, BUT IMMEDIATELY check if we have a real input to switch to.

      // Better strategy:
      // If we are in the "just created" flow, we want to piggyback on this touch event.
      // If we focus dummy input here, it opens keyboard.
      // Then we must ensure focus goes back to the real input.

      // Try to find the real text input first (if it's already mounted)
      const existingInput = document.querySelector('textarea[id^="canvas-input-"]');

      if (existingInput) {
        existingInput.focus({ preventScroll: true });
      } else if (dummyInputRef.current) {
        // Fallback to dummy input if real one isn't ready yet
        // Prevent Viewport Jump: Move dummy input to the touch position
        if (longPressStartPosRef.current) {
          dummyInputRef.current.style.top = `${longPressStartPosRef.current.clientY}px`;
          dummyInputRef.current.style.left = `${longPressStartPosRef.current.clientX}px`;
        }
        dummyInputRef.current.focus({ preventScroll: true });

        // Queue the handover to the real input
        setTimeout(() => {
          const targetInput = document.querySelector('textarea[id^="canvas-input-"]');
          if (targetInput) {
            targetInput.focus({ preventScroll: true });
          }
        }, 50);
      }
      focusOnNextReleaseRef.current = false;
    }

    if (canvasLongPressTimerRef.current) {
      if (canvasLongPressTimerRef.current.delayTimerId) {
        clearTimeout(canvasLongPressTimerRef.current.delayTimerId);
      }
      if (canvasLongPressTimerRef.current.timerId) {
        clearTimeout(canvasLongPressTimerRef.current.timerId);
      }
      if (canvasLongPressTimerRef.current.progressInterval) {
        clearInterval(canvasLongPressTimerRef.current.progressInterval);
      }
      canvasLongPressTimerRef.current = null;
    }
    longPressStartPosRef.current = null;
    setLongPressCursor(null); // Ensure UI clears unconditionally
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onCanvasPointerDown}
      onContextMenu={(e) => e.preventDefault()}
      className="relative group flex items-center justify-center min-h-[400px] lg:min-h-[600px] animate-pop-in bg-black border-2 border-dashed border-[#2f3336]/60 w-full select-none rounded-none"
      role="img"
      aria-label={description}
    >
      {/* Hidden Global File Input for Ghost Slots */}
      <input
        id="ghost-slot-file-input"
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* iOS Keyboard Helper Input */}
      <input
        id="ios-keyboard-helper"
        ref={dummyInputRef}
        type="text"
        className="fixed w-1 h-1 opacity-0 pointer-events-none"
        style={{ top: -100, left: -100 }}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div
        ref={ref}
        data-meme-canvas="true"
        onPointerDown={(e) => {
          onCanvasPointerDown();
          handleCanvasLongPressStart(e);
        }}
        onPointerMove={handleCanvasLongPressMove}
        onPointerUp={handleCanvasLongPressEnd}
        onPointerLeave={handleCanvasLongPressEnd}
        onPointerCancel={handleCanvasLongPressEnd}
        className="relative overflow-hidden shadow-2xl mx-auto rounded-none"
        style={{
          backgroundColor: '#000000',
          width: '100%',
          height: 'auto',
          aspectRatio: containerAspect,
          maxWidth: '100%'
        }}
      >
        {/* Top Caption Bar */}
        {meme.paddingTop > 0 && (
          <div
            className="absolute inset-x-0 top-0"
            style={{
              height: `${paddingTopPct}%`,
              backgroundColor: meme.paddingTopColor || '#ffffff'
            }}
          />
        )}

        {/* Bottom Caption Bar */}
        {meme.paddingBottom > 0 && (
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: `${paddingBottomPct}%`,
              backgroundColor: meme.paddingBottomColor || '#ffffff'
            }}
          />
        )}

        <div
          className="absolute inset-x-0"
          style={{
            top: `${paddingTopPct}%`,
            bottom: `${paddingBottomPct}%`
          }}
        >
          {meme.panels?.map((panel) => {
            const isActive = panel.id === activePanelId;
            const showUrl = panel.processedImage || panel.url;
            const canDrag = meme.layout !== 'single' && !selectedId && !['pen', 'eraser'].includes(activeTool) && showUrl;

            return (
              <div
                key={panel.id}
                onPointerDown={(e) => handlePanelPointerDown(e, panel)}
                onClick={(e) => {
                  if (!showUrl) {
                    handleGhostClick(e, panel.id, isActive);
                  } else {
                    e.stopPropagation();
                    onPanelSelect(panel.id);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverPanel(panel.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOverPanel(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverPanel(null);
                  const file = e.dataTransfer.files[0];
                  if (file && onDrop) {
                    onDrop(file, panel.id);
                  }
                }}
                className={`absolute overflow-hidden transition-all duration-200 rounded-none
                            ${dragOverPanel === panel.id ? 'bg-brand/20' : ''}
                            ${canDrag ? 'cursor-move' : ''}
                        `}
                style={{
                  left: `${panel.x}%`,
                  top: `${panel.y}%`,
                  width: `${panel.w}%`,
                  height: `${panel.h}%`,
                  touchAction: canDrag ? 'none' : 'auto'
                }}
              >
                {showUrl ? (
                  (panel.isVideo && !panel.isGif && !panel.processedImage && !showUrl.toLowerCase().includes('.gif') && !showUrl.startsWith('data:image/gif')) ? (
                    <video
                      src={showUrl}
                      className="w-full h-full block pointer-events-none select-none rounded-none"
                      loop
                      autoPlay
                      playsInline
                      muted
                      crossOrigin={(!showUrl.startsWith('data:') && !showUrl.startsWith('blob:')) ? "anonymous" : undefined}
                      onLoadedMetadata={handleMediaLoad}
                      style={{
                        objectFit: meme.layout === 'single' ? (panel.objectFit || "contain") : (panel.objectFit || "cover"),
                        objectPosition: `${panel.posX ?? 50}% ${panel.posY ?? 50}%`,
                        filter: `
                                          contrast(${panel.filters?.contrast ?? 100}%)
                                          brightness(${panel.filters?.brightness ?? 100}%)
                                          blur(${panel.filters?.blur ?? 0}px)
                                          grayscale(${panel.filters?.grayscale ?? 0}%)
                                          sepia(${panel.filters?.sepia ?? 0}%)
                                          hue-rotate(${panel.filters?.hueRotate ?? 0}deg)
                                          saturate(${panel.filters?.saturate ?? 100}%)
                                          invert(${panel.filters?.invert ?? 0}%)
                                        `
                      }}
                    />
                  ) : (
                    <img
                      src={showUrl}
                      alt={meme.name ? `Meme panel: ${meme.name}` : "Meme panel"}
                      className="w-full h-full block pointer-events-none select-none rounded-none"
                      crossOrigin={(!showUrl.startsWith('data:') && !showUrl.startsWith('blob:')) ? "anonymous" : undefined}
                      onLoad={handleMediaLoad}
                      style={{
                        objectFit: meme.layout === 'single' ? (panel.objectFit || "contain") : (panel.objectFit || "cover"),
                        objectPosition: `${panel.posX ?? 50}% ${panel.posY ?? 50}%`,
                        filter: `
                                          contrast(${panel.filters?.contrast ?? 100}%)
                                          brightness(${panel.filters?.brightness ?? 100}%)
                                          blur(${panel.filters?.blur ?? 0}px)
                                          grayscale(${panel.filters?.grayscale ?? 0}%)
                                          sepia(${panel.filters?.sepia ?? 0}%)
                                          hue-rotate(${panel.filters?.hueRotate ?? 0}deg)
                                          saturate(${panel.filters?.saturate ?? 100}%)
                                          invert(${panel.filters?.invert ?? 0}%)
                                        `
                      }}
                    />
                  )
                ) : (
                  // GHOST SLOT STATE
                  <div
                    data-html2canvas-ignore="true"
                    className="w-full h-full flex flex-col items-center justify-center card-bg group-hover:bg-slate-900/70 transition-colors cursor-pointer group/ghost"
                  >
                    <div className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center mb-2 transition-all ${isActive ? 'border-brand text-brand scale-110' : 'border-[#2f3336] text-slate-500 group-hover/ghost:border-brand group-hover/ghost:text-brand'}`}>
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-brand' : 'text-slate-500 group-hover/ghost:text-slate-300'}`}>
                      {isActive ? "Tap to Upload" : "Tap to Select"}
                    </span>
                  </div>
                )}

                {/* Remove Button - Shows when Active or Hovered, BUT NOT when cropping */}
                {showUrl && !isCropping && (
                  <button
                    data-html2canvas-ignore="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onClearPanel) onClearPanel(panel.id);
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-full text-white backdrop-blur-md border shadow-lg transition-all duration-200 group/btn flex items-center justify-center
                                    ${isActive ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 -translate-y-2 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'}
                                    active:scale-90
                                    bg-red-500/80 border-white/10 hover:bg-red-500 hover:border-red-400 hover:rotate-90 z-30
                                `}
                    title="Clear Slot"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>


        <canvas
          ref={drawCanvasRef}
          role="img"
          aria-label="Drawing Canvas Layer"
          className={`absolute inset-0 w-full h-full z-20 touch-none ${activeTool === 'pen' ? 'cursor-pen pointer-events-auto' : activeTool === 'eraser' ? 'cursor-eraser pointer-events-auto' : 'pointer-events-none'}`}
          onPointerDown={handleDrawStart}
          onPointerMove={handleDrawMove}
          onPointerUp={handleDrawEnd}
          onPointerLeave={handleDrawEnd}
        />


        {meme.stickers?.map((sticker) => {
          // Map animation IDs to CSS class names
          const animationClass = sticker.animation ? `animate-meme-${sticker.animation}` : '';

          return (
            <div
              key={sticker.id}
              onPointerDown={(e) => onPointerDown(e, sticker.id)}
              onDoubleClick={() => onRemoveSticker(sticker.id)}
              onMouseEnter={() => { setIsHoveringElement(true); onHoverChange?.(true); }}
              onMouseLeave={() => { setIsHoveringElement(false); onHoverChange?.(false); }}
              className={`absolute select-none touch-none z-30 flex items-center justify-center transition-transform will-change-transform ${draggedId === sticker.id ? "scale-125 cursor-grabbing" : "cursor-grab"
                } ${animationClass}`}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                fontSize: `${(meme.stickerSize || 100) * (sticker.scale ?? 1) * scaleFactor}px`,
                width: (sticker.type === 'image' || sticker.type === 'giphy' || sticker.type === 'tenor') ? `${(meme.stickerSize || 100) * (sticker.scale ?? 1) * scaleFactor}px` : 'auto',
                transform: `translate(-50%, -50%) rotate(${sticker.rotation || 0}deg)`,
                border: draggedId === sticker.id ? "2px dashed rgba(255,255,255,0.5)" : "none",
                borderRadius: "0.5em",
              }}
              role="img"
              aria-label={`Sticker: ${sticker.url}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') onRemoveSticker(sticker.id);
              }}
            >
              {/* Selected State: Marching Ants Overlay */}
              {selectedId === sticker.id && (
                <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none overflow-visible z-50">
                  <rect
                    x="2"
                    y="2"
                    width="calc(100% - 4px)"
                    height="calc(100% - 4px)"
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth="3"
                    strokeDasharray="12 6"
                    strokeLinecap="round"
                    className="animate-march"
                  />
                  {/* Selection Handles (Visual only) - Perfectly aligned with rect corners */}
                  <circle cx="2" cy="2" r="4" fill="var(--color-brand)" />
                  <circle cx="calc(100% - 2px)" cy="2" r="4" fill="var(--color-brand)" />
                  <circle cx="calc(100% - 2px)" cy="calc(100% - 2px)" r="4" fill="var(--color-brand)" />
                  <circle cx="2" cy="calc(100% - 2px)" r="4" fill="var(--color-brand)" />
                </svg>
              )}

              {(sticker.type === 'image' || sticker.type === 'giphy' || sticker.type === 'tenor') ? (
                <img
                  src={sticker.url}
                  alt="sticker"
                  className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md"
                  draggable="false"
                  crossOrigin="anonymous"
                />
              ) : (
                sticker.url
              )}
            </div>
          )
        })}


        <svg className="absolute w-0 h-0 invisible" aria-hidden="true">
          <defs>
            <filter id="text-bg-filter" x="-5%" y="-5%" width="110%" height="110%">
              <feFlood floodColor={meme.textBgColor} result="flood" />
              <feComposite in="flood" in2="SourceGraphic" operator="over" />
            </filter>
          </defs>
        </svg>


        {meme.texts.map((textItem) => {
          const isSelected = selectedId === textItem.id;
          const isEditing = editingId === textItem.id;
          const hasContent = (textItem.content || "").trim();

          // Show empty placeholder cursor for texts being edited
          if (!hasContent && !isSelected && !isEditing) return null;

          // Map animation IDs to CSS class names
          const animationClass = textItem.animation ? `animate-meme-${textItem.animation}` : '';

          const stroke = Math.max(1, (meme.fontSize * (textItem.scale ?? 1) * scaleFactor) / 25);
          const hasBg = meme.textBgColor && meme.textBgColor !== 'transparent';



          // Dynamic Positioning Logic for Action Buttons
          // Trigger side placement if near Top, Left or Right edges
          const isNearTop = textItem.y < 20;
          const isNearLeft = textItem.x < 15;
          const isNearRight = textItem.x > 85;
          const shouldUseSidePosition = isNearTop || isNearLeft || isNearRight;

          let btnContainerClasses = "absolute flex items-center z-[60] animate-in zoom-in-95 fade-in";
          let btnContainerStyle = {
            gap: 'clamp(12px, 4vw, 24px)',
            pointerEvents: 'auto'
          };

          if (isSelected || isEditing) {
            if (shouldUseSidePosition) {
              // Side Positioning (Center Vertically)
              btnContainerStyle.top = '50%';
              btnContainerStyle.transform = 'translateY(-50%)';

              // Decide Left vs Right side based on canvas position
              // If on right half -> Buttons go Left
              // If on left half -> Buttons go Right
              if (textItem.x > 50) {
                btnContainerClasses += " right-full mr-4";
              } else {
                btnContainerClasses += " left-full ml-4";
              }
            } else {
              // Standard Top Positioning
              btnContainerClasses += " left-1/2 -translate-x-1/2 -top-[52px] md:-top-[68px]";
            }
          }

          return (
            <h2
              key={textItem.id}
              onPointerDown={(e) => onPointerDown(e, textItem.id)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onMouseEnter={() => { setIsHoveringElement(true); onHoverChange?.(true); }}
              onMouseLeave={() => { setIsHoveringElement(false); onHoverChange?.(false); }}
              className={`absolute uppercase tracking-tighter select-none touch-none z-40 will-change-transform ${draggedId === textItem.id ? "cursor-grabbing scale-105" : "cursor-grab"
                } ${isSelected || isEditing ? "z-50" : ""} ${textItem.animation !== 'wave' ? animationClass : ''}`}
              style={{
                left: `${textItem.x}%`,
                top: `${textItem.y}%`,
                transform: `translate(-50%, -50%) rotate(${textItem.rotation || 0}deg)`,
                color: meme.textColor,
                backgroundColor: hasBg ? meme.textBgColor : "transparent",
                display: "inline-block",
                textAlign: "center",
                padding: hasBg ? '0.25em 0.5em' : '0',
                lineHeight: 1.2,
                fontSize: `${meme.fontSize * (textItem.scale ?? 1) * scaleFactor}px`,
                letterSpacing: `${(meme.letterSpacing || 0) * scaleFactor}px`,
                whiteSpace: 'nowrap',
                fontFamily: `${meme.fontFamily || 'Roboto'}, sans-serif`,
                WebkitTextStroke: hasContent ? `${stroke * 2}px ${meme.textShadow}` : 'none',
                paintOrder: "stroke fill",
                filter: hasContent ? "drop-shadow(0px 2px 2px rgba(0,0,0,0.8))" : "none",
                border: draggedId === textItem.id ? "2px dashed rgba(255,255,255,0.5)" : "none",
                borderRadius: "0.2em",
                // iOS Safari Fixes
                WebkitTouchCallout: 'none',
                // Min size for empty editing text placeholder
                minWidth: !hasContent && isEditing ? '80px' : 'auto',
                minHeight: !hasContent && isEditing ? '40px' : 'auto',
              }}
            >
              {/* Marching ants border - only for SELECTED texts, NOT during editing */}
              {isSelected && !isEditing && (
                <svg data-html2canvas-ignore="true" className="absolute inset-[-6px] w-[calc(100%+12px)] h-[calc(100%+12px)] pointer-events-none overflow-visible" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    width="100%"
                    height="100%"
                    rx="12"
                    ry="12"
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth="3"
                    strokeDasharray="12 8"
                    className="animate-march"
                  />
                </svg>
              )}
              {/* Action Buttons Container - positioned together with proper spacing */}
              {(isSelected || isEditing) && (
                <div
                  data-html2canvas-ignore="true"
                  className={btnContainerClasses}
                  style={btnContainerStyle}
                >
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (onRemoveText) onRemoveText(textItem.id);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (onRemoveText) onRemoveText(textItem.id);
                    }}
                    className="flex items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-xl bg-red-500/80 backdrop-blur-md text-white border border-red-400/50 shadow-lg transition-all duration-200 hover:bg-red-500 hover:scale-110 active:scale-90"
                    style={{ touchAction: 'manipulation', minWidth: '40px', minHeight: '40px' }}
                    title="Delete Text"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Settings/Edit Button - only shows when selected, not editing */}
                  {!isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (navigator.vibrate) navigator.vibrate(30);

                        // 1. Activate dummy input to wake up keyboard (iOS requirement)
                        if (dummyInputRef.current) {
                          dummyInputRef.current.style.top = `${e.clientY}px`;
                          dummyInputRef.current.style.left = `${e.clientX}px`;
                          dummyInputRef.current.focus({ preventScroll: true });
                        }

                        // 2. Trigger React state update to render the real input
                        if (onStartEditing) onStartEditing(textItem.id);

                        // 3. Queue the handover execution to the real input
                        setTimeout(() => {
                          const targetInput = document.getElementById(`canvas-input-${textItem.id}`);
                          if (targetInput) {
                            targetInput.focus({ preventScroll: true });
                          }
                        }, 50);
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // Redundant safety for touch devices
                        if (dummyInputRef.current) {
                          dummyInputRef.current.style.top = `${e.clientY}px`;
                          dummyInputRef.current.style.left = `${e.clientX}px`;
                          dummyInputRef.current.focus({ preventScroll: true });
                        }
                        if (onStartEditing) onStartEditing(textItem.id);

                        setTimeout(() => {
                          const targetInput = document.getElementById(`canvas-input-${textItem.id}`);
                          if (targetInput) {
                            targetInput.focus({ preventScroll: true });
                          }
                        }, 50);
                      }}
                      className="flex items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-xl bg-brand/80 backdrop-blur-md text-slate-900 border border-brand/50 shadow-lg transition-all duration-200 hover:bg-brand hover:scale-110 active:scale-90"
                      style={{ touchAction: 'manipulation', minWidth: '40px', minHeight: '40px' }}
                      title="Edit Text"
                    >
                      <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
              )}
              {/* Text Content Rendering - always visible, styled h2 displays the text */}
              {textItem.animation === 'wave' ? (
                <WaveAnimationText content={textItem.content} />
              ) : (
                textItem.content
              )}

              {/* Native Textarea Overlay for Direct Editing - captures keystrokes & handles cursor */}
              {isEditing && (
                <textarea
                  id={`canvas-input-${textItem.id}`}
                  data-html2canvas-ignore="true"
                  value={textItem.content}
                  onChange={(e) => onTextChange(textItem.id, e.target.value)}
                  onContextMenu={(e) => e.preventDefault()}
                  spellCheck="false"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  className="absolute inset-0 w-full h-full bg-transparent resize-none overflow-hidden focus:outline-none uppercase tracking-tighter"
                  style={{
                    color: 'transparent',
                    textShadow: 'none',
                    WebkitTextStroke: '0',
                    caretColor: 'var(--color-brand)', // Visible native cursor
                    opacity: 1, // Visible element (text is transparent)
                    fontFamily: `${meme.fontFamily || 'Impact'}, sans-serif`,
                    fontSize: `${meme.fontSize * scaleFactor}px`,
                    letterSpacing: `${(meme.letterSpacing || 0) * scaleFactor}px`,
                    lineHeight: 1.2,
                    padding: hasBg ? '0.25em 0.5em' : '0',
                    textAlign: "center",
                    whiteSpace: 'nowrap',
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              )}
            </h2>
          )
        })}

        {/* Long-press cursor indicator - enhanced with smooth animations */}
        {longPressCursor && (
          <CountdownOverlay
            x={longPressCursor.x}
            y={longPressCursor.y}
            progress={longPressCursor.progress}
          />
        )}
      </div>


      {loading && (
        <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm gap-4">
          <Loader2 className="w-10 h-10 text-brand animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Fetching templates...</p>
        </div>
      )}

      {isProcessing && !loading && (
        <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center z-[60] backdrop-blur-[1px] gap-2">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <p className="text-[10px] font-bold text-brand uppercase tracking-widest animate-pulse">Processing Effect...</p>
        </div>
      )}
    </div>
  );
});

MemeCanvas.displayName = "MemeCanvas";
export default MemeCanvas;
