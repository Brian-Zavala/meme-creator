import { Palette, Paintbrush as Brush } from "lucide-react";

export default function ColorControls({ meme, handleStyleChange, handleStyleCommit }) {
  const hasText = meme.texts.some(t => (t.content || "").trim().length > 0);

  // Helper to extract opacity (0-100) from hex color
  const getOpacity = (color) => {
    if (!color || color === 'transparent') return 0;
    if (color.startsWith('#') && color.length === 9) {
      return Math.round((parseInt(color.substring(7, 9), 16) / 255) * 100);
    }
    return 100;
  };

  // Helper to update opacity
  const changeOpacity = (name, opacity, commit = false) => {
    let baseColor = meme[name];
    if (baseColor === 'transparent') baseColor = '#000000'; // Default to black base if transparent
    
    // Ensure we have #RRGGBB
    const hex = baseColor.startsWith('#') ? baseColor.substring(0, 7) : '#000000';
    
    const alphaInt = Math.round((opacity / 100) * 255);
    const alphaHex = alphaInt.toString(16).padStart(2, '0');
    const finalColor = `${hex}${alphaHex}`;
    
    handleStyleChange({ currentTarget: { name, value: finalColor } }, commit);
  };

  // Helper to handle color picker change (preserving opacity)
  const onColorPick = (name, newHex) => {
    let currentOpacity = getOpacity(meme[name]);
    
    // Auto-max opacity if it was transparent (0) when picking a new color
    if (currentOpacity === 0) currentOpacity = 100;

    const alphaInt = Math.round((currentOpacity / 100) * 255);
    const alphaHex = alphaInt.toString(16).padStart(2, '0');
    const finalColor = `${newHex}${alphaHex}`;
    handleStyleChange({ currentTarget: { name, value: finalColor } }, false);
  };

  return (
    <div className="w-full md:w-auto flex flex-row flex-nowrap md:flex-wrap items-center justify-between md:justify-end gap-2 md:gap-6 animate-in slide-in-from-right duration-500 px-2 md:px-0">
      
      {/* Text Color + Opacity */}
      <div className="flex flex-row md:flex-col items-center gap-2 md:gap-3">
        <div className="relative flex items-center justify-center w-10 md:w-20" title="Text Color">
            {(meme.textColor.substring(0,7) !== '#ffffff' || getOpacity(meme.textColor) < 100) && (
                <button 
                onClick={() => handleStyleChange({ currentTarget: { name: 'textColor', value: '#ffffff' } }, true)}
                className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-colors bg-slate-800/80 px-1 md:px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700/50"
                >
                Reset
                </button>
            )}
            <Palette className="absolute left-0 -ml-1 w-4 h-4 text-slate-400 pointer-events-none hidden md:block" aria-hidden="true" />
            <div className="relative overflow-hidden w-8 h-8 md:w-10 md:h-10 rounded-full ring-2 ring-slate-700 hover:ring-slate-500 transition-all cursor-pointer focus-within:ring-yellow-500 shadow-sm md:ml-auto">
            <input
                type="color" name="textColor"
                value={meme.textColor.substring(0, 7)}
                onChange={(e) => onColorPick('textColor', e.target.value)}
                onBlur={handleStyleCommit} 
                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
            />
            </div>
        </div>
        {hasText && (
          <div className="h-12 w-4 flex items-center justify-center md:w-full md:h-auto">
              <input
                  type="range" min="0" max="100"
                  value={getOpacity(meme.textColor)}
                  onChange={(e) => changeOpacity('textColor', e.target.value, false)}
                  onMouseUp={(e) => changeOpacity('textColor', e.target.value, true)}
                  onTouchEnd={(e) => changeOpacity('textColor', e.target.value, true)}
                  className="accent-[oklch(53%_0.187_39)] cursor-pointer h-1.5 rounded-full opacity-70 hover:opacity-100 transition-opacity -rotate-90 md:rotate-0 w-12 md:w-full"
                  title="Text Opacity"
              />
          </div>
        )}
      </div>

      {/* Outline Color + Opacity */}
      <div className="flex flex-row md:flex-col items-center gap-2 md:gap-3 animate-in fade-in zoom-in duration-300">
        <div className="relative flex items-center justify-center w-10 md:w-20" title="Outline Color">
            {((meme.textShadow || '#000000').substring(0,7) !== '#000000' || getOpacity(meme.textShadow || '#000000') < 100) && (
                <button 
                onClick={() => handleStyleChange({ currentTarget: { name: 'textShadow', value: '#000000' } }, true)}
                className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-colors bg-slate-800/80 px-1 md:px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700/50"
                >
                Reset
                </button>
            )}
            <div className="absolute left-0 -ml-1 w-4 h-4 text-slate-400 shrink-0 flex items-center justify-center font-black text-[10px] border border-slate-400 rounded-sm pointer-events-none hidden md:flex">T</div>
            <div className="relative overflow-hidden w-8 h-8 md:w-10 md:h-10 rounded-full ring-2 ring-slate-700 hover:ring-slate-500 transition-all cursor-pointer focus-within:ring-yellow-500 shadow-sm md:ml-auto">
            <input
                type="color" name="textShadow"
                value={(meme.textShadow || '#000000').substring(0, 7)}
                onChange={(e) => onColorPick('textShadow', e.target.value)}
                onBlur={handleStyleCommit} 
                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
            />
            </div>
        </div>
        {hasText && (
          <div className="h-12 w-4 flex items-center justify-center md:w-full md:h-auto">
              <input
                  type="range" min="0" max="100"
                  value={getOpacity(meme.textShadow || '#000000')}
                  onChange={(e) => changeOpacity('textShadow', e.target.value, false)}
                  onMouseUp={(e) => changeOpacity('textShadow', e.target.value, true)}
                  onTouchEnd={(e) => changeOpacity('textShadow', e.target.value, true)}
                  className="accent-[oklch(53%_0.187_39)] cursor-pointer h-1.5 rounded-full opacity-70 hover:opacity-100 transition-opacity -rotate-90 md:rotate-0 w-12 md:w-full"
                  title="Outline Opacity"
              />
          </div>
        )}
      </div>

      {/* Background Color + Opacity */}
      {hasText && (
        <div className="flex flex-row md:flex-col items-center gap-2 md:gap-3 animate-in fade-in zoom-in duration-300">
            <div className="relative flex items-center justify-center w-10 md:w-20" title="Background Color">
            {meme.textBgColor !== 'transparent' && (
                <button 
                onClick={() => handleStyleChange({ currentTarget: { name: 'textBgColor', value: 'transparent' } }, true)}
                className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-colors bg-slate-800/80 px-1 md:px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700/50"
                >
                Clear
                </button>
            )}
            <Brush className="absolute left-0 -ml-1 w-4 h-4 text-slate-400 pointer-events-none hidden md:block" aria-hidden="true" />
            <div className="relative overflow-hidden w-8 h-8 md:w-10 md:h-10 rounded-full ring-2 ring-slate-700 hover:ring-slate-500 transition-all cursor-pointer focus-within:ring-yellow-500 shadow-sm md:ml-auto">
                <input
                type="color" name="textBgColor"
                value={meme.textBgColor === 'transparent' ? '#000000' : meme.textBgColor.substring(0, 7)}
                onChange={(e) => onColorPick('textBgColor', e.target.value)}
                onBlur={handleStyleCommit} 
                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                />
            </div>
            </div>
            <div className="h-12 w-4 flex items-center justify-center md:w-full md:h-auto">
                <input
                    type="range" min="0" max="100"
                    value={getOpacity(meme.textBgColor)}
                    onChange={(e) => changeOpacity('textBgColor', e.target.value, false)}
                    onMouseUp={(e) => changeOpacity('textBgColor', e.target.value, true)}
                    onTouchEnd={(e) => changeOpacity('textBgColor', e.target.value, true)}
                    className="accent-[oklch(53%_0.187_39)] cursor-pointer h-1.5 rounded-full opacity-70 hover:opacity-100 transition-opacity -rotate-90 md:rotate-0 w-12 md:w-full"
                    title="Background Opacity"
                />
            </div>
        </div>
      )}
    </div>
  );
}