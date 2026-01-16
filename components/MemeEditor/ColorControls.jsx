import { Palette, Paintbrush as Brush } from "lucide-react";
import { useEffect, useState, useId } from "react";
import OptimizedSlider from "../ui/OptimizedSlider";

export default function ColorControls({ meme, handleStyleChange, handleStyleCommit }) {
  const hasText = meme.texts.some(t => (t.content || "").trim().length > 0);
  const [isMobile, setIsMobile] = useState(false);
  const baseId = useId();

  useEffect(() => {
    // Initial check
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();

    // Resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getOpacity = (color) => {
    if (!color || color === 'transparent') return 0;
    if (color.startsWith('#') && color.length === 9) {
      return Math.round((parseInt(color.substring(7, 9), 16) / 255) * 100);
    }
    return 100;
  };

  const changeOpacity = (name, opacity, commit = false) => {
    let baseColor = meme[name];
    if (baseColor === 'transparent') baseColor = '#000000';

    const hex = baseColor.startsWith('#') ? baseColor.substring(0, 7) : '#000000';

    const alphaInt = Math.round((opacity / 100) * 255);
    const alphaHex = alphaInt.toString(16).padStart(2, '0');
    const finalColor = `${hex}${alphaHex}`;

    handleStyleChange({ currentTarget: { name, value: finalColor } }, commit);
  };

  const toSafeHex = (color) => {
    if (!color || color === 'transparent') return '#000000';
    if (color.startsWith('#') && color.length >= 7) return color.substring(0, 7);
    return '#000000';
  };

  const onColorPick = (name, newHex) => {
    let currentOpacity = getOpacity(meme[name]);

    if (currentOpacity === 0) currentOpacity = 100;

    const alphaInt = Math.round((currentOpacity / 100) * 255);
    const alphaHex = alphaInt.toString(16).padStart(2, '0');
    const finalColor = `${newHex}${alphaHex}`;
    handleStyleChange({ currentTarget: { name, value: finalColor } }, false);
  };

  return (
    <div
      className="w-full flex flex-col items-stretch justify-start gap-8 min-w-0 animate-in slide-in-from-right duration-500 px-0 pb-2 pt-0 shrink-0 overflow-visible"
    >

      {/* Text Color + Opacity */}
      <div className="flex flex-row items-center gap-4 shrink-0 w-full">
        {/* Label */}
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider w-16 sm:w-20 shrink-0 text-left">Text</span>

        <div className="relative flex items-center justify-center w-auto shrink-0" title="Text Color">
          {(meme.textColor.substring(0, 7) !== '#ffffff' || getOpacity(meme.textColor) < 100) && (
            <button
              onClick={() => handleStyleChange({ currentTarget: { name: 'textColor', value: '#ffffff' } }, true)}
              className="absolute -top-6 -left-2 sm:-left-3 text-[8px] uppercase font-bold text-slate-500 hover:text-white transition-colors bg-[#181818]/80 px-1 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-[#2f3336] z-10"
            >
              Reset
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="color-picker-ring w-8 h-8 rounded-full shrink-0">
              <div className="relative overflow-hidden w-full h-full rounded-full cursor-pointer">
                <input
                  id={`${baseId}-text-color`}
                  type="color" name="textColor"
                  value={toSafeHex(meme.textColor)}
                  onChange={(e) => onColorPick('textColor', e.target.value)}
                  onBlur={handleStyleCommit}
                  className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
        {hasText && (
          <div className="relative h-auto flex items-center justify-center touch-none shrink-0 flex-1">
            <OptimizedSlider
              min="0" max="100"
              value={getOpacity(meme.textColor)}
              onChange={(e) => changeOpacity('textColor', e.target.value, false)}
              onCommit={(e) => changeOpacity('textColor', e.target.value, true)}
              className="range-slider cursor-pointer h-1.5 w-full rounded-full opacity-70 hover:opacity-100 transition-opacity touch-none"
              title="Text Opacity"
            />
          </div>
        )}
      </div>

      {/* Outline Color + Opacity */}
      <div className="flex flex-row items-center gap-4 shrink-0 w-full animate-in fade-in zoom-in duration-300">
        {/* Label */}
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider w-16 sm:w-20 shrink-0 text-left">Outline</span>

        <div className="relative flex items-center justify-center w-auto shrink-0" title="Outline Color">
          {((meme.textShadow || '#000000').substring(0, 7) !== '#000000' || getOpacity(meme.textShadow || '#000000') < 100) && (
            <button
              onClick={() => handleStyleChange({ currentTarget: { name: 'textShadow', value: '#000000' } }, true)}
              className="absolute -top-6 -left-2 sm:-left-3 text-[8px] uppercase font-bold text-slate-500 hover:text-white transition-colors bg-[#181818]/80 px-1 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-[#2f3336] z-10"
            >
              Reset
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="color-picker-ring w-8 h-8 rounded-full shrink-0">
              <div className="relative overflow-hidden w-full h-full rounded-full cursor-pointer">
                <input
                  id={`${baseId}-outline-color`}
                  type="color" name="textShadow"
                  value={toSafeHex(meme.textShadow || '#000000')}
                  onChange={(e) => onColorPick('textShadow', e.target.value)}
                  onBlur={handleStyleCommit}
                  className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
        {hasText && (
          <div className="relative h-auto flex items-center justify-center touch-none shrink-0 flex-1">
            <OptimizedSlider
              min="0" max="100"
              value={getOpacity(meme.textShadow || '#000000')}
              onChange={(e) => changeOpacity('textShadow', e.target.value, false)}
              onCommit={(e) => changeOpacity('textShadow', e.target.value, true)}
              className="range-slider cursor-pointer h-1.5 w-full rounded-full opacity-70 hover:opacity-100 transition-opacity touch-none"
              title="Outline Opacity"
            />
          </div>
        )}
      </div>

      {/* Background Color + Opacity */}
      {hasText && (
        <div className="flex flex-row items-center gap-4 shrink-0 w-full animate-in fade-in zoom-in duration-300">
          {/* Label */}
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider w-16 sm:w-20 shrink-0 text-left">Backdrop</span>

          <div className="relative flex items-center justify-center w-auto shrink-0" title="Background Color">
            {meme.textBgColor !== 'transparent' && (
              <button
                onClick={() => handleStyleChange({ currentTarget: { name: 'textBgColor', value: 'transparent' } }, true)}
                className="absolute -top-6 -left-2 sm:-left-3 text-[8px] uppercase font-bold text-slate-500 hover:text-white transition-colors bg-[#181818]/80 px-1 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-[#2f3336] z-10"
              >
                Reset
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="color-picker-ring w-8 h-8 rounded-full shrink-0">
                <div className="relative overflow-hidden w-full h-full rounded-full cursor-pointer">
                  <input
                    id={`${baseId}-backdrop-color`}
                    type="color" name="textBgColor"
                    value={toSafeHex(meme.textBgColor)}
                    onChange={(e) => onColorPick('textBgColor', e.target.value)}
                    onBlur={handleStyleCommit}
                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-auto flex items-center justify-center touch-none shrink-0 flex-1">
            <OptimizedSlider
              min="0" max="100"
              value={getOpacity(meme.textBgColor)}
              onChange={(e) => changeOpacity('textBgColor', e.target.value, false)}
              onCommit={(e) => changeOpacity('textBgColor', e.target.value, true)}
              className="range-slider cursor-pointer h-1.5 w-full rounded-full opacity-70 hover:opacity-100 transition-opacity touch-none"
              title="Background Opacity"
            />
          </div>
        </div>
      )}
    </div>
  );
}
