import { forwardRef, useRef, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const MemeCanvas = forwardRef(({ meme, overrideImageUrl, loading, draggedId, selectedId, activeTool, onDrawCommit, onFineTune, onFineTuneCommit, onCenterText, onPointerDown, onRemoveSticker, onCanvasPointerDown }, ref) => {
  const description = `Meme preview of ${meme.name || "Custom Image"} with ${meme.texts.length} text captions and ${meme.stickers?.length || 0} stickers`;
  const drawCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const currentPathRef = useRef([]);
  
  const displayUrl = overrideImageUrl || meme.imageUrl;
  const isVideo = meme.isVideo && !overrideImageUrl;

  const handleMediaLoad = (e) => {
    const { naturalWidth, naturalHeight, videoWidth, videoHeight } = e.target;
    const w = naturalWidth || videoWidth || 1;
    const h = naturalHeight || videoHeight || 1;
    setAspectRatio(w / h);
  };

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
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
  }, [meme.drawings, meme.paddingTop]);

  const handleDrawStart = (e) => {
    if (activeTool !== 'pen' && activeTool !== 'eraser') return;
    e.stopPropagation();
    setIsDrawing(true);
    
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    currentPathRef.current = [{x, y}];
  };

  const handleDrawMove = (e) => {
    if (!isDrawing) return;
    e.stopPropagation();
    
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    currentPathRef.current.push({x, y});

    const ctx = canvas.getContext('2d');
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

  let containerAspect = aspectRatio;
  if (meme.paddingTop > 0 && aspectRatio > 0) {
       containerAspect = 1 / ((1 / aspectRatio) + (meme.paddingTop / 100));
  }

  return (
    <div 
      onPointerDown={onCanvasPointerDown}
      onContextMenu={(e) => e.preventDefault()}
      className="relative group flex items-center justify-center min-h-[400px] lg:min-h-[600px] animate-pop-in bg-slate-950 border-2 border-dashed border-slate-800/60 w-full select-none"
      role="img"
      aria-label={description}
    >
      <div
        ref={ref}
        onPointerDown={onCanvasPointerDown}
        className="relative flex items-center justify-center overflow-hidden shadow-2xl mx-auto"
        style={{ 
            backgroundColor: meme.paddingTop > 0 ? '#ffffff' : '#000000', 
            paddingTop: meme.paddingTop ? `${meme.paddingTop}%` : '0',
            alignItems: meme.paddingTop > 0 ? 'flex-start' : 'center',
            aspectRatio: containerAspect,
            width: 'auto',
            height: '70vh',
            maxWidth: '100%',
            maxHeight: '70vh'
        }}
      >
        <canvas 
            ref={drawCanvasRef}
            className={`absolute inset-0 w-full h-full z-20 touch-none ${activeTool === 'pen' ? 'cursor-pen pointer-events-auto' : activeTool === 'eraser' ? 'cursor-eraser pointer-events-auto' : 'pointer-events-none'}`}
            onPointerDown={handleDrawStart}
            onPointerMove={handleDrawMove}
            onPointerUp={handleDrawEnd}
            onPointerLeave={handleDrawEnd}
        />
        {isVideo ? (
            <video
                key={displayUrl}
                src={displayUrl}
                className="w-full h-full object-contain block pointer-events-none select-none"
                draggable="false"
                loop
                autoPlay
                playsInline
                crossOrigin="anonymous"
                onLoadedMetadata={handleMediaLoad}
                style={{
                    WebkitTouchCallout: "none",
                    filter: `
                      contrast(${meme.filters?.contrast ?? 100}%) 
                      brightness(${meme.filters?.brightness ?? 100}%) 
                      blur(${meme.filters?.blur ?? 0}px)
                      grayscale(${meme.filters?.grayscale ?? 0}%)
                      sepia(${meme.filters?.sepia ?? 0}%)
                      hue-rotate(${meme.filters?.hueRotate ?? 0}deg)
                      saturate(${meme.filters?.saturate ?? 100}%)
                      invert(${meme.filters?.invert ?? 0}%)
                    `
                }}
            />
        ) : (
            <img
            src={displayUrl}
            className="w-full h-full object-contain block pointer-events-none select-none"
            alt={`Template: ${meme.name}`}
            draggable="false"
            crossOrigin="anonymous"
            onLoad={handleMediaLoad}
            style={{
                WebkitTouchCallout: "none",
                filter: `
                  contrast(${meme.filters?.contrast ?? 100}%) 
                  brightness(${meme.filters?.brightness ?? 100}%) 
                  blur(${meme.filters?.blur ?? 0}px)
                  grayscale(${meme.filters?.grayscale ?? 0}%)
                  sepia(${meme.filters?.sepia ?? 0}%)
                  hue-rotate(${meme.filters?.hueRotate ?? 0}deg)
                  saturate(${meme.filters?.saturate ?? 100}%)
                  invert(${meme.filters?.invert ?? 0}%)
                `
            }}
            />
        )}

        {meme.stickers?.map((sticker) => (
          <div
            key={sticker.id}
            onPointerDown={(e) => onPointerDown(e, sticker.id)}
            onDoubleClick={() => onRemoveSticker(sticker.id)}
            className={`absolute select-none touch-none z-30 flex items-center justify-center transition-transform ${
              draggedId === sticker.id ? "scale-125 cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              fontSize: `${meme.stickerSize || 60}px`, 
              width: sticker.type === 'image' ? `${meme.stickerSize || 60}px` : 'auto',
              transform: "translate(-50%, -50%)",
            }}
            role="img"
            aria-label={`Sticker: ${sticker.url}`}
            tabIndex={0}
            onKeyDown={(e) => {
                if(e.key === 'Delete' || e.key === 'Backspace') onRemoveSticker(sticker.id);
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
        ))}
        
        <svg className="absolute w-0 h-0 invisible" aria-hidden="true">
          <defs>
            <filter id="text-bg-filter" x="-5%" y="-5%" width="110%" height="110%">
              <feFlood floodColor={meme.textBgColor} result="flood" />
              <feComposite in="flood" in2="SourceGraphic" operator="over" />
            </filter>
          </defs>
        </svg>

        {meme.texts.map((textItem) => {
          if (!(textItem.content || "").trim()) return null;
          const stroke = Math.max(1, meme.fontSize / 25);
          const hasBg = meme.textBgColor && meme.textBgColor !== 'transparent';
          const isSelected = selectedId === textItem.id;
          
          return (
          <h2
            key={textItem.id}
            onPointerDown={(e) => onPointerDown(e, textItem.id)}
            className={`absolute uppercase tracking-tighter whitespace-pre-wrap break-words select-none touch-none z-40 ${
              draggedId === textItem.id ? "cursor-grabbing scale-105" : "cursor-grab"
            } ${isSelected ? "z-50" : ""}`}
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
              fontSize: `${meme.fontSize}px`,
              letterSpacing: `${meme.letterSpacing || 0}px`,
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
                <svg className="absolute inset-[-6px] w-[calc(100%+12px)] h-[calc(100%+12px)] pointer-events-none overflow-visible" xmlns="http://www.w3.org/2000/svg">
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
            {textItem.content}
          </h2>
        )})}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm gap-4">
          <Loader2 className="w-10 h-10 text-brand animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Fetching templates...</p>
        </div>
      )}
    </div>
  );
});

MemeCanvas.displayName = "MemeCanvas";
export default MemeCanvas;
