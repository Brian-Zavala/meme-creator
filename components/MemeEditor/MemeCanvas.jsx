import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const MemeCanvas = forwardRef(({ meme, loading, draggedId, onPointerDown, onRemoveSticker, onCanvasPointerDown }, ref) => {
  const description = `Meme preview of ${meme.name || "Custom Image"} with ${meme.texts.length} text captions and ${meme.stickers?.length || 0} stickers`;

  return (
    <div 
      onPointerDown={onCanvasPointerDown}
      className="relative group flex items-center justify-center min-h-[400px] lg:min-h-[600px] animate-pop-in bg-slate-950 border-2 border-dashed border-slate-800/60 w-full overflow-hidden"
      role="img"
      aria-label={description}
    >
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
          
          return (
          <h2
            key={textItem.id}
            onPointerDown={(e) => onPointerDown(e, textItem.id)}
            className={`absolute uppercase tracking-tighter leading-tight whitespace-pre-wrap break-words px-4 select-none touch-none z-40 ${
              draggedId === textItem.id ? "cursor-grabbing scale-105" : "cursor-grab"
            }`}
            style={{
              left: `${textItem.x}%`,
              top: `${textItem.y}%`,
              transform: "translate(-50%, -50%)",
              color: meme.textColor,
              // We use SVG filter instead of CSS background-color for better html2canvas alignment
              // but we keep a fallback or secondary method for UI visual polish
              backgroundColor: "transparent", 
              backgroundImage: hasBg ? `linear-gradient(${meme.textBgColor}, ${meme.textBgColor})` : 'none',
              backgroundPosition: 'center',
              backgroundSize: 'calc(100% - 16px) 100%',
              backgroundRepeat: 'no-repeat',
              display: "inline-block",
              textAlign: "center",
              padding: hasBg ? '0.15em 0.3em' : '0',
              fontSize: `${meme.fontSize}px`,
              maxWidth: `${meme.maxWidth}%`,
              fontFamily: "Impact, sans-serif",
              textShadow: `
                ${stroke}px ${stroke}px 0 ${meme.textShadow},
                -${stroke}px -${stroke}px 0 ${meme.textShadow},
                ${stroke}px -${stroke}px 0 ${meme.textShadow},
                -${stroke}px ${stroke}px 0 ${meme.textShadow},
                0 ${stroke}px 0 ${meme.textShadow},
                ${stroke}px 0 0 ${meme.textShadow},
                0 -${stroke}px 0 ${meme.textShadow},
                -${stroke}px 0 0 ${meme.textShadow},
                ${stroke}px ${stroke}px 5px #000
              `,
              border: draggedId === textItem.id ? "2px dashed rgba(255,255,255,0.5)" : "none",
              borderRadius: "0.2em",
            }}
          >
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
