import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const MemeCanvas = forwardRef(({ meme, loading, draggedId, selectedId, onFineTune, onFineTuneCommit, onCenterText, onPointerDown, onRemoveSticker, onCanvasPointerDown }, ref) => {
  const description = `Meme preview of ${meme.name || "Custom Image"} with ${meme.texts.length} text captions and ${meme.stickers?.length || 0} stickers`;
  
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
        className="relative w-full flex items-center justify-center overflow-hidden shadow-2xl"
        style={{ 
            backgroundColor: meme.paddingTop > 0 ? '#ffffff' : '#000000', 
            paddingTop: meme.paddingTop ? `${meme.paddingTop}%` : '0',
            alignItems: meme.paddingTop > 0 ? 'flex-start' : 'center'
        }}
      >
        {meme.isVideo ? (
            <video
                key={meme.imageUrl}
                src={meme.imageUrl}
                className="w-full max-h-[70vh] object-contain block pointer-events-none select-none"
                draggable="false"
                loop
                autoPlay
                playsInline
                crossOrigin="anonymous"
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
            src={meme.imageUrl}
            className="w-full max-h-[70vh] object-contain block pointer-events-none select-none"
            alt={`Template: ${meme.name}`}
            draggable="false"
            crossOrigin="anonymous"
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
              width: sticker.type === 'image' ? `${meme.stickerSize || 60}px` : 'auto',
              transform: "translate(-50%, -50%)",
            }}
            role="img"
            aria-label={`Sticker: ${sticker.url}`}
            tabIndex={0} // Make focusable
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
              transform: `translate(-50%, -50%) rotate(${textItem.rotation || 0}deg)`,
              color: meme.textColor,
              backgroundColor: hasBg ? meme.textBgColor : "transparent",
              display: "inline-block",
              textAlign: "center",
              padding: hasBg ? '0.25em 0.5em' : '0',
              lineHeight: 1.2,
              fontSize: `${meme.fontSize}px`,
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
                        stroke="#c2410c" 
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
          <Loader2 className="w-10 h-10 text-[#c2410c] animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Fetching templates...</p>
        </div>
      )}
    </div>
  );
});

MemeCanvas.displayName = "MemeCanvas";
export default MemeCanvas;
