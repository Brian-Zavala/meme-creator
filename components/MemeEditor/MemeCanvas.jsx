import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const MemeCanvas = forwardRef(({ meme, loading, draggedId, selectedId, onFineTune, onFineTuneCommit, onPointerDown, onRemoveSticker, onCanvasPointerDown }, ref) => {
  const description = `Meme preview of ${meme.name || "Custom Image"} with ${meme.texts.length} text captions and ${meme.stickers?.length || 0} stickers`;
  
  const selectedText = meme.texts.find(t => t.id === selectedId);

  return (
    <div 
      onPointerDown={onCanvasPointerDown}
      className="relative group flex items-center justify-center min-h-[400px] lg:min-h-[600px] animate-pop-in bg-slate-950 border-2 border-dashed border-slate-800/60 w-full overflow-hidden select-none"
      role="img"
      aria-label={description}
    >
      {/* Fine-Tuning Controls Overlay */}
      {selectedText && (
        <div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-700/50 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 w-[90%] max-w-sm" 
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-center">X</span>
                <input 
                    type="range" 
                    min="0" max="100" step="0.5"
                    value={selectedText.x}
                    onChange={(e) => onFineTune('x', e.target.value)}
                    onMouseUp={onFineTuneCommit}
                    onTouchEnd={onFineTuneCommit}
                    className="flex-1 accent-[oklch(53%_0.187_39)] h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer"
                />
            </div>
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-center">Y</span>
                <input 
                    type="range" 
                    min="0" max="100" step="0.5"
                    value={selectedText.y}
                    onChange={(e) => onFineTune('y', e.target.value)}
                    onMouseUp={onFineTuneCommit}
                    onTouchEnd={onFineTuneCommit}
                    className="flex-1 accent-[oklch(53%_0.187_39)] h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer"
                />
            </div>
        </div>
      )}

      <div
        ref={ref}
        className="relative w-full flex items-center justify-center overflow-hidden shadow-2xl"
        style={{ backgroundColor: "#000000", color: "#ffffff" }}
      >
        {meme.isVideo ? (
            <video
                key={meme.imageUrl}
                src={meme.imageUrl}
                className="w-full max-h-[70vh] object-contain block"
                loop
                autoPlay
                playsInline
                crossOrigin="anonymous"
                style={{
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
            src={meme.imageUrl}
            className="w-full max-h-[70vh] object-contain block"
            alt={`Template: ${meme.name}`}
            crossOrigin="anonymous"
            style={{
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

        {/* Render Stickers */}
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
              fontSize: `${meme.stickerSize || 60}px`, // Independent sticker size
              transform: "translate(-50%, -50%)",
            }}
            role="img"
            aria-label={`Sticker: ${sticker.url}`}
            tabIndex={0} // Make focusable
            onKeyDown={(e) => {
                if(e.key === 'Delete' || e.key === 'Backspace') onRemoveSticker(sticker.id);
            }}
          >
            {sticker.url}
          </div>
        ))}
        
        {/* SVG Filter for Text Background Alignment */}
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
              transform: "translate(-50%, -50%)",
              color: meme.textColor,
              backgroundColor: hasBg ? meme.textBgColor : "transparent",
              display: "inline-block",
              textAlign: "center",
              padding: hasBg ? '0.25em 0.5em' : '0',
              lineHeight: 1.2,
              fontSize: `${meme.fontSize}px`,
              maxWidth: `${meme.maxWidth}%`,
              fontFamily: "Impact, sans-serif",
              WebkitTextStroke: `${stroke}px ${meme.textShadow}`,
              paintOrder: "fill stroke",
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
                        stroke="oklch(53% 0.187 39)" 
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
          <Loader2 className="w-10 h-10 text-[oklch(53%_0.187_39)] animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Fetching templates...</p>
        </div>
      )}
    </div>
  );
});

MemeCanvas.displayName = "MemeCanvas";
export default MemeCanvas;
