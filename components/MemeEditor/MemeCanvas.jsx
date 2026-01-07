import { forwardRef, useRef, useEffect, useState } from "react";
import { Loader2, Plus, Image as ImageIcon, Video, Upload, X } from "lucide-react";
import { getAnimationById } from "../../constants/textAnimations";

const MemeCanvas = forwardRef(({
  meme,
  loading,
  isProcessing,
  draggedId,
  selectedId,
  activeTool,
  onDrawCommit,
  onFineTune,
  onFineTuneCommit,
  onCenterText,
  onPointerDown,
  onRemoveSticker,
  onCanvasPointerDown,
  activePanelId,
  onPanelSelect,
  onDrop,
  onClearPanel,
  onPanelPosChange
}, ref) => {
  const description = `Meme editor with ${meme.panels?.length || 1} panels`;
  const drawCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const targetPanelRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1); // Global Aspect Ratio (usually driven by first panel or default)
  const currentPathRef = useRef([]);
  const [dragOverPanel, setDragOverPanel] = useState(null);
  const [draggingPanel, setDraggingPanel] = useState(null);

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

  // Sync container width for scaling
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const scaleFactor = containerWidth / 800;

  // Determine container aspect ratio based on layout
  let containerAspect = 1; // Default square
  if (meme.layout === 'single') {
    containerAspect = aspectRatio;
  } else if (meme.layout === 'top-bottom') {
    containerAspect = 3 / 4; // Portrait-ish
  } else if (meme.layout === 'side-by-side') {
    containerAspect = 4 / 3; // Landscape-ish
  }

  // Adjust for padding
  if (meme.paddingTop > 0 && containerAspect > 0) {
    containerAspect = 1 / ((1 / containerAspect) + (meme.paddingTop / 100));
  }

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
  }, [meme.drawings, meme.paddingTop, containerWidth]);

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

  return (
    <div
      ref={containerRef}
      onPointerDown={onCanvasPointerDown}
      onContextMenu={(e) => e.preventDefault()}
      className="relative group flex items-center justify-center min-h-[400px] lg:min-h-[600px] animate-pop-in bg-slate-950 border-2 border-dashed border-slate-800/60 w-full select-none"
      role="img"
      aria-label={description}
    >
      {/* Hidden Global File Input for Ghost Slots */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div
        ref={ref}
        onPointerDown={onCanvasPointerDown}
        className="relative overflow-hidden shadow-2xl mx-auto"
        style={{
          backgroundColor: meme.paddingTop > 0 ? '#ffffff' : '#000000',
          width: '100%',
          height: 'auto',
          aspectRatio: containerAspect,
          maxHeight: '75vh',
          maxWidth: '100%'
        }}
      >
        {/* === PANELS LAYER === */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: `${(meme.paddingTop || 0) * containerAspect}%` }}
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
                className={`absolute overflow-hidden transition-all duration-200 border-2 border-slate-800/50 hover:border-slate-600 
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
                  (panel.isVideo && !panel.processedImage && !showUrl.includes('.gif')) ? (
                    <video
                      src={showUrl}
                      className="w-full h-full block pointer-events-none select-none"
                      loop
                      autoPlay
                      playsInline
                      muted
                      crossOrigin="anonymous"
                      onLoadedMetadata={handleMediaLoad}
                      style={{
                        objectFit: panel.objectFit || "cover",
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
                      alt="panel"
                      className="w-full h-full block pointer-events-none select-none"
                      crossOrigin="anonymous"
                      onLoad={handleMediaLoad}
                      style={{
                        objectFit: panel.objectFit || "cover",
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
                    className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 group-hover:bg-slate-900/70 transition-colors cursor-pointer group/ghost"
                  >
                    <div className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center mb-2 transition-all ${isActive ? 'border-brand text-brand scale-110' : 'border-slate-600 text-slate-500 group-hover/ghost:border-brand group-hover/ghost:text-brand'}`}>
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-brand' : 'text-slate-500 group-hover/ghost:text-slate-300'}`}>
                      {isActive ? "Tap to Upload" : "Tap to Select"}
                    </span>
                  </div>
                )}

                {/* Active Selection Border Overlay - Separated for Export Ignoring */}
                {(isActive || dragOverPanel === panel.id) && (
                  <div
                    data-html2canvas-ignore="true"
                    className="absolute inset-0 border-2 border-brand z-10 shadow-[0_0_20px_rgba(255,199,0,0.3)] pointer-events-none"
                  />
                )}
                {isActive && (
                  <div
                    data-html2canvas-ignore="true"
                    className="absolute top-2 left-2 w-3 h-3 bg-brand rounded-full shadow-lg animate-pulse pointer-events-none z-20"
                  />
                )}

                {/* Remove Button - Shows when Active or Hovered */}
                {showUrl && (
                  <button
                    data-html2canvas-ignore="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onClearPanel) onClearPanel(panel.id);
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/60 text-white backdrop-blur-md border border-white/10 shadow-lg transition-all duration-200 z-30 group/btn
                                    ${isActive ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 -translate-y-2 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'}
                                    hover:bg-red-500 hover:border-red-400 hover:rotate-90 active:scale-90
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

        {/* === DRAWING LAYER (Global) === */}
        <canvas
          ref={drawCanvasRef}
          className={`absolute inset-0 w-full h-full z-20 touch-none ${activeTool === 'pen' ? 'cursor-pen pointer-events-auto' : activeTool === 'eraser' ? 'cursor-eraser pointer-events-auto' : 'pointer-events-none'}`}
          onPointerDown={handleDrawStart}
          onPointerMove={handleDrawMove}
          onPointerUp={handleDrawEnd}
          onPointerLeave={handleDrawEnd}
        />

        {/* === STICKERS LAYER (Global) === */}
        {meme.stickers?.map((sticker) => {
          // Map animation IDs to CSS class names
          const animationClass = sticker.animation ? `animate-meme-${sticker.animation}` : '';

          return (
            <div
              key={sticker.id}
              onPointerDown={(e) => onPointerDown(e, sticker.id)}
              onDoubleClick={() => onRemoveSticker(sticker.id)}
              className={`absolute select-none touch-none z-30 flex items-center justify-center transition-transform ${draggedId === sticker.id ? "scale-125 cursor-grabbing" : "cursor-grab"
                } ${animationClass}`}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                fontSize: `${(meme.stickerSize || 60) * scaleFactor}px`,
                width: sticker.type === 'image' ? `${(meme.stickerSize || 60) * scaleFactor}px` : 'auto',
                transform: "translate(-50%, -50%)",
              }}
              role="img"
              aria-label={`Sticker: ${sticker.url}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') onRemoveSticker(sticker.id);
              }}
            >
              {sticker.type === 'image' ? (
                <img
                  src={sticker.url}
                  alt="sticker"
                  className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md"
                  draggable="false"
                />
              ) : (
                sticker.url
              )}
            </div>
          )
        })}

        {/* === TEXT FILTER DEF === */}
        <svg className="absolute w-0 h-0 invisible" aria-hidden="true">
          <defs>
            <filter id="text-bg-filter" x="-5%" y="-5%" width="110%" height="110%">
              <feFlood floodColor={meme.textBgColor} result="flood" />
              <feComposite in="flood" in2="SourceGraphic" operator="over" />
            </filter>
          </defs>
        </svg>

        {/* === TEXT LAYER (Global) === */}
        {meme.texts.map((textItem) => {
          if (!(textItem.content || "").trim()) return null;
          const stroke = Math.max(1, (meme.fontSize * scaleFactor) / 25);
          const hasBg = meme.textBgColor && meme.textBgColor !== 'transparent';
          const isSelected = selectedId === textItem.id;

          // Map animation IDs to CSS class names
          const animationClass = textItem.animation ? `animate-meme-${textItem.animation}` : '';

          return (
            <h2
              key={textItem.id}
              onPointerDown={(e) => onPointerDown(e, textItem.id)}
              className={`absolute uppercase tracking-tighter whitespace-pre-wrap break-words select-none touch-none z-40 ${draggedId === textItem.id ? "cursor-grabbing scale-105" : "cursor-grab"
                } ${isSelected ? "z-50" : ""} ${textItem.animation !== 'wave' ? animationClass : ''}`}
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
                fontSize: `${meme.fontSize * scaleFactor}px`,
                letterSpacing: `${(meme.letterSpacing || 0) * scaleFactor}px`,
                maxWidth: `${meme.maxWidth}%`,
                fontFamily: `${meme.fontFamily || 'Impact'}, sans-serif`,
                WebkitTextStroke: `${stroke * 2}px ${meme.textShadow}`,
                paintOrder: "stroke fill",
                filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.8))",
                border: draggedId === textItem.id ? "2px dashed rgba(255,255,255,0.5)" : "none",
                borderRadius: "0.2em",
              }}
            >
              {isSelected && (
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
              {textItem.animation === 'wave' ? (
                textItem.content.split('\n').map((line, lineIdx) => {
                  // Split line into words (preserving spaces as separators)
                  const words = line.split(/(\s+)/);
                  let globalCharIdx = 0;

                  return (
                    <span key={lineIdx} style={{ display: 'block' }}>
                      {words.map((word, wordIdx) => {
                        // If it's whitespace, render a regular space (allows wrapping)
                        if (/^\s+$/.test(word)) {
                          globalCharIdx += word.length;
                          return ' ';
                        }

                        // For actual words, wrap in inline-block to keep together
                        const chars = word.split('').map((char, charInWordIdx) => {
                          const charDelay = globalCharIdx + charInWordIdx;
                          return (
                            <span
                              key={charInWordIdx}
                              className="animate-meme-wave-char"
                              style={{ animationDelay: `${charDelay * 0.1}s` }}
                            >
                              {char}
                            </span>
                          );
                        });
                        globalCharIdx += word.length;

                        return (
                          <span key={wordIdx} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                            {chars}
                          </span>
                        );
                      })}
                      {line.length === 0 && <span>&nbsp;</span>}
                    </span>
                  );
                })
              ) : (
                textItem.content
              )}
            </h2>
          )
        })}
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
