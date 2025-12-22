import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { Download, RefreshCcw, ImagePlus, Eraser, Share2, Loader2, Undo2, Redo2, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";
import { triggerFireworks } from "./Confetti";
import useHistory from "../hooks/useHistory";
import { MEME_QUOTES } from "../constants/memeQuotes";

// Sub-components
import MemeCanvas from "./MemeEditor/MemeCanvas";
import MemeToolbar from "./MemeEditor/MemeToolbar";
import MemeInputs from "./MemeEditor/MemeInputs";

export default function Main() {
  // --- State with History ---
  const {
    state: meme,
    updateState,
    updateTransient,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory(() => {
    const saved = localStorage.getItem("meme-generator-state");
    const defaultState = {
      imageUrl: "http://i.imgflip.com/1bij.jpg",
      name: "Meme Name",
      textColor: "#ffffff",
      textShadow: "#000000",
      fontSize: 40,
      maxWidth: 100,
      filters: { contrast: 100, brightness: 100, blur: 0 },
      texts: [
        { id: "top", content: "", x: 50, y: 5 },
        { id: "bottom", content: "", x: 50, y: 95 },
      ],
      stickers: [],
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if ("topText" in parsed) {
           return {
            ...defaultState,
            imageUrl: parsed.imageUrl || defaultState.imageUrl,
            textColor: parsed.textColor || defaultState.textColor,
            fontSize: parsed.fontSize || defaultState.fontSize,
            maxWidth: parsed.maxWidth || 100,
            filters: parsed.filters || defaultState.filters,
            texts: [
              { id: "top", content: parsed.topText || "", x: parsed.topTextPos?.x ?? 50, y: parsed.topTextPos?.y ?? 5 },
              { id: "bottom", content: parsed.bottomText || "", x: parsed.bottomTextPos?.x ?? 50, y: parsed.bottomTextPos?.y ?? 95 },
            ],
          };
        }
        if (Array.isArray(parsed.texts)) {
            return { 
                ...defaultState, 
                ...parsed, 
                stickers: parsed.stickers || [],
                filters: parsed.filters || defaultState.filters
            };
        }
      } catch (e) {
        console.error("Migration failed", e);
      }
    }
    return defaultState;
  });

  const [allMemes, setAllMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [flashColor, setFlashColor] = useState(null); // 'red' | 'green' | null
  const memeRef = useRef(null);
  const lastTapRef = useRef({ id: null, time: 0 });
  const globalLastTapRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [statusMessage, setStatusMessage] = useState("");

  // --- Helpers ---
  const triggerFlash = (color) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 200);
  };

  // --- Effects ---

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
        triggerFlash("red");
        toast("Undo", { icon: "↩️", duration: 1000 });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
        triggerFlash("green");
        toast("Redo", { icon: "↪️", duration: 1000 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    if (draggedId) {
      const handleGlobalMove = (e) => {
        if (longPressTimerRef.current) {
          const moveX = e.clientX - startPosRef.current.x;
          const moveY = e.clientY - startPosRef.current.y;
          const distance = Math.hypot(moveX, moveY);
          if (distance > 5) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }

        if (memeRef.current) {
          const rect = memeRef.current.getBoundingClientRect();
          let x = ((e.clientX - rect.left) / rect.width) * 100;
          let y = ((e.clientY - rect.top) / rect.height) * 100;
          x = Math.max(0, Math.min(100, x));
          y = Math.max(0, Math.min(100, y));

          updateTransient((prev) => {
            const isText = prev.texts.some(t => t.id === draggedId);
            if (isText) {
              return {
                ...prev,
                texts: prev.texts.map((t) => (t.id === draggedId ? { ...t, x, y } : t)),
              };
            }
            return {
              ...prev,
              stickers: prev.stickers.map((s) => (s.id === draggedId ? { ...s, x, y } : s)),
            };
          });
        }
      };

      const handleGlobalUp = () => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        setDraggedId(null);
      };

      window.addEventListener("pointermove", handleGlobalMove);
      window.addEventListener("pointerup", handleGlobalUp);
      window.addEventListener("pointercancel", handleGlobalUp);

      return () => {
        window.removeEventListener("pointermove", handleGlobalMove);
        window.removeEventListener("pointerup", handleGlobalUp);
        window.removeEventListener("pointercancel", handleGlobalUp);
      };
    }
  }, [draggedId, updateTransient]);

  useEffect(() => {
    const allFilled = meme.texts.every((t) => t.content.trim().length > 0);
    if (allFilled && meme.texts.length < 10) {
      updateState((prev) => ({
        ...prev,
        texts: [...prev.texts, { id: crypto.randomUUID(), content: "", x: 50, y: 50 }],
      }));
    }
  }, [meme.texts, updateState]);

  useEffect(() => {
    setLoading(true);
    fetch("https://api.imgflip.com/get_memes")
      .then((res) => res.json())
      .then((data) => {
        setAllMemes(data.data.memes);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load memes");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("meme-generator-state", JSON.stringify(meme));
  }, [meme]);

  // --- Handlers ---

  async function getMemeImage() {
    setStatusMessage("Fetching new meme template...");
    if (allMemes.length === 0) return;
    setGenerating(true);
    const randomNumber = Math.floor(Math.random() * allMemes.length);
    const newMeme = allMemes[randomNumber];
    const cleanName = newMeme.name ? newMeme.name.replace(/\s+/g, "-") : "meme";

    // Calculate smart font size based on aspect ratio
    const maxDim = 600; // Approximate max container dimension
    const ar = (newMeme.width && newMeme.height) ? (newMeme.width / newMeme.height) : 1;
    const estimatedWidth = ar >= 1 ? maxDim : maxDim * ar;
    const optimizedFontSize = Math.max(20, Math.min(80, Math.round(estimatedWidth * 0.07)));

    try {
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(newMeme.url)}`);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      updateState({ ...meme, imageUrl: dataUrl, name: cleanName, fontSize: optimizedFontSize });
      setStatusMessage(`New meme template loaded: ${cleanName}`);
    } catch {
      updateState({ ...meme, imageUrl: newMeme.url, name: cleanName, fontSize: optimizedFontSize });
      toast.error("CORS limit: download might fail");
      setStatusMessage(`New meme template loaded (CORS fallback): ${cleanName}`);
    } finally {
      setGenerating(false);
    }
  }

  function handleTextChange(id, value) {
    updateState((prev) => ({
      ...prev,
      texts: prev.texts.map((t) => (t.id === id ? { ...t, content: value } : t)),
    }));
  }

  function generateMagicCaption() {
    const category = MEME_QUOTES[meme.name] || MEME_QUOTES["generic"];
    const randomIndex = Math.floor(Math.random() * category.length);
    const captions = category[randomIndex];

    updateState((prev) => ({
      ...prev,
      texts: prev.texts.map((t, i) => ({
        ...t,
        content: captions[i] || ""
      }))
    }));
    
    toast("Magic logic applied! ✨", { 
        icon: "🪄",
        duration: 2000
    });
    setStatusMessage("Magic captions generated.");
  }

  function handleStyleChange(event) {
    const { value, name } = event.currentTarget;
    updateTransient((prev) => ({ ...prev, [name]: value }));
  }
  
  function handleFilterChange(event) {
    const { value, name } = event.currentTarget;
    updateTransient((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [name]: value
      }
    }));
  }
  
  function handleStyleCommit() {
     updateState(meme);
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateState((prev) => ({ ...prev, imageUrl: e.target.result, name: file.name.split(".")[0] }));
        toast.success("Custom image uploaded!");
        setStatusMessage(`Custom image uploaded: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleReset() {
    triggerFlash("red");
    updateState((prev) => ({
      ...prev,
      texts: [
        { id: "top", content: "", x: 50, y: 5 },
        { id: "bottom", content: "", x: 50, y: 95 },
      ],
      stickers: [],
      fontSize: 40,
      textColor: "#ffffff",
      filters: { contrast: 100, brightness: 100, blur: 0 },
    }));
    toast("Canvas cleared", { icon: "🧹" });
    setStatusMessage("Canvas reset to default.");
  }

  function addSticker(emoji) {
    const newSticker = {
      id: crypto.randomUUID(),
      url: emoji,
      x: 50,
      y: 50,
    };
    updateState(prev => ({
      ...prev,
      stickers: [...prev.stickers, newSticker]
    }));
    toast.success("Sticker added!");
    setStatusMessage(`Sticker added: ${emoji}`);
  }

  function removeSticker(id) {
    updateState(prev => ({
      ...prev,
      stickers: prev.stickers.filter(s => s.id !== id)
    }));
    toast.error("Sticker removed", { icon: "🗑️" });
    setStatusMessage("Sticker removed.");
  }

  function handleCanvasPointerDown() {
    const now = Date.now();
    if (now - globalLastTapRef.current < 450) {
      undo();
      triggerFlash("red");
      toast("Undone", { icon: "↩️", duration: 800 });
      globalLastTapRef.current = 0;
      setStatusMessage("Action undone.");
      return;
    }
    globalLastTapRef.current = now;
  }

  function handlePointerDown(e, id) {
    e.preventDefault();
    e.stopPropagation();

    updateState(meme);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    const isSticker = meme.stickers.some(s => s.id === id);

    if (isSticker) {
      const now = Date.now();
      if (lastTapRef.current.id === id && now - lastTapRef.current.time < 450) {
        removeSticker(id);
        lastTapRef.current = { id: null, time: 0 };
        return; 
      }
      lastTapRef.current = { id, time: now };

      longPressTimerRef.current = setTimeout(() => {
        removeSticker(id);
        setDraggedId(null); 
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]); 
      }, 600);
    }

    setDraggedId(id);
    if (navigator.vibrate) navigator.vibrate(20);
  }

  async function handleDownload() {
    if (!memeRef.current) return;
    const promise = new Promise(async (resolve, reject) => {
      try {
        await new Promise((r) => setTimeout(r, 100));
        const canvas = await html2canvas(memeRef.current, { useCORS: true, backgroundColor: "#000000", scale: 2 });
        const link = document.createElement("a");
        const fileName = (meme.name || "meme").replace(/\s+/g, "-");
        link.download = `${fileName}-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        triggerFireworks();
        setStatusMessage("Meme downloaded successfully.");
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    toast.promise(promise, { loading: "Generating...", success: "Downloaded!", error: "Error" });
  }

  async function handleShare() {
    if (!memeRef.current) return;
    const canvas = await html2canvas(memeRef.current, { useCORS: true, backgroundColor: "#000000", scale: 2 });
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `meme-${Date.now()}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Meme" });
        triggerFireworks();
        setStatusMessage("Share dialog opened.");
      } else {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        toast.success("Copied to clipboard!");
        setStatusMessage("Meme copied to clipboard.");
      }
    }, "image/png");
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 animate-in fade-in duration-500 relative">
      <div className="sr-only" role="status" aria-live="polite">{statusMessage}</div>

      <div 
        className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200 ease-out ${flashColor ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: flashColor === 'red' ? 'rgba(239, 68, 68, 0.15)' : flashColor === 'green' ? 'rgba(34, 197, 94, 0.08)' : 'transparent' }}
        aria-hidden="true"
      />

      <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">
        <MemeInputs 
            texts={meme.texts} 
            handleTextChange={handleTextChange} 
            onAddSticker={addSticker} 
            onMagicCaption={generateMagicCaption} 
        />
        
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
             <button 
                onClick={() => { undo(); triggerFlash("red"); }} 
                disabled={!canUndo} 
                aria-label="Undo last action" 
                className="bg-slate-800 disabled:opacity-50 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
             >
                <Undo2 className="w-4 h-4" /> Undo
             </button>
             <button 
                onClick={() => { redo(); triggerFlash("green"); }} 
                disabled={!canRedo} 
                aria-label="Redo reversed action" 
                className="bg-slate-800 disabled:opacity-50 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
             >
                <Redo2 className="w-4 h-4" /> Redo
             </button>
             <button 
                onClick={() => toast("Tip: Double-tap image to Undo. Ctrl+Z/Y also work!", { icon: "💡", style: { borderRadius: '10px', background: '#333', color: '#fff' }, duration: 3000 })}
                className="w-12 flex items-center justify-center bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
                title="History Help"
                aria-label="History Help"
             >
                <HelpCircle className="w-5 h-5" />
             </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-700 col-span-2">
            <ImagePlus className="w-4 h-4" />
            <span>Upload Custom Image</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </label>
          <button onClick={handleReset} className="bg-slate-800 hover:bg-red-900/30 hover:text-red-400 text-slate-400 font-semibold py-3 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-700 col-span-2">
            <Eraser className="w-4 h-4" />
            <span>Reset Canvas</span>
          </button>
          <button onClick={handleDownload} className="bg-slate-100 hover:bg-white/90 text-slate-900 font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-2">
            <Download className="w-5 h-5" />
            Download
          </button>
          <button onClick={handleShare} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-2 border border-slate-700">
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>
      </div>

      <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-4">
        <button
          onClick={getMemeImage}
          disabled={loading || generating}
          aria-label="Get new random meme template"
          className="w-full bg-[oklch(53%_0.187_39)] hover:bg-[oklch(56%_0.187_39)] text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 group border-t border-white/20 mb-2"
        >
          {generating ? <Loader2 className="animate-spin w-6 h-6" /> : <RefreshCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />}
          <span className="text-xl tracking-tight">{generating ? "Cooking..." : "Get new meme"}</span>
        </button>

        <div className="flex flex-col shadow-2xl rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900/50">
          <MemeToolbar 
            meme={meme} 
            handleStyleChange={handleStyleChange} 
            handleFilterChange={handleFilterChange} 
            handleStyleCommit={handleStyleCommit} 
          />
          <MemeCanvas
            ref={memeRef}
            meme={meme}
            loading={loading}
            draggedId={draggedId}
            onPointerDown={handlePointerDown}
            onRemoveSticker={removeSticker}
            onCanvasPointerDown={handleCanvasPointerDown}
          />
        </div>

        <div className="flex justify-between items-center px-2">
          <p className="text-xs text-slate-500 font-mono">
            {meme.imageUrl.startsWith("blob") ? "Custom Image" : "ImgFlip API"}
            <span className="mx-2">•</span>
            {memeRef.current?.offsetWidth || 0}x{memeRef.current?.offsetHeight || 0}px
          </p>
          <p className="text-xs text-slate-600 italic">Pro Tip: Click/Hold to move text 🔓</p>
        </div>
      </div>
    </main>
  );
}
