import { useState, useEffect, useRef, useTransition, Suspense, useCallback } from "react";
import html2canvas from "html2canvas";
import {
  Download,
  RefreshCcw,
  ImagePlus,
  Eraser,
  Share2,
  Loader2,
  Undo2,
  Redo2,
  HelpCircle,
  Search,
  X,
  Video,
  ChevronDown,
  TrendingUp,
  Sparkles,
  Tag
} from "lucide-react";
import toast from "react-hot-toast";
import { triggerFireworks } from "./Confetti";
import useHistory from "../hooks/useHistory";
import { searchTenor, registerShare, getAutocomplete, getSearchSuggestions, getCategories } from "../services/tenor";
import { exportGif } from "../services/gifExporter";
import { MEME_QUOTES } from "../constants/memeQuotes";

// Sub-components
import MemeCanvas from "./MemeEditor/MemeCanvas";
import MemeToolbar from "./MemeEditor/MemeToolbar";
import MemeInputs from "./MemeEditor/MemeInputs";

export default function Main() {
  const [isPending, startTransition] = useTransition();
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem("meme-creator-welcome-seen");
  });

  function closeWelcome() {
    localStorage.setItem("meme-creator-welcome-seen", "true");
    setShowWelcome(false);
  }

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
      id: null,
      imageUrl: "http://i.imgflip.com/1bij.jpg",
      sourceUrl: null,
      name: "Meme Name",
      textColor: "#ffffff",
      textBgColor: "transparent",
      textShadow: "#000000",
      fontSize: 40,
      maxWidth: 100,
      filters: {
        contrast: 100,
        brightness: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        saturate: 100,
        invert: 0,
      },
      texts: [
        { id: "top", content: "", x: 50, y: 5 },
        { id: "bottom", content: "", x: 50, y: 95 },
      ],
      stickers: [],
      isVideo: false,
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.imageUrl && parsed.imageUrl.startsWith("blob:")) {
          parsed.imageUrl = defaultState.imageUrl;
          parsed.name = defaultState.name;
          parsed.isVideo = defaultState.isVideo;
        }
        return { ...defaultState, ...parsed };
      } catch (e) {
        console.error("State hydration failed", e);
      }
    }
    return defaultState;
  });

  const [allMemes, setAllMemes] = useState([]); 
  const [allGifs, setAllGifs] = useState([]);   
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [flashColor, setFlashColor] = useState(null); 
  const memeRef = useRef(null);
  const lastTapRef = useRef({ id: null, time: 0 });
  const globalLastTapRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [statusMessage, setStatusMessage] = useState("");
  const requestCounterRef = useRef(0);

  const [imageDeck, setImageDeck] = useState([]);
  const [videoDeck, setVideoDeck] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mode, setMode] = useState("image"); 
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  const triggerFlash = (color) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 200);
  };

  const getNextItem = (items, deck, setDeck) => {
    let currentDeck = [...deck];
    if (currentDeck.length === 0) {
      currentDeck = items.map((_, i) => i);
      for (let i = currentDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentDeck[i], currentDeck[j]] = [currentDeck[j], currentDeck[i]];
      }
    }
    const index = currentDeck.pop();
    setDeck(currentDeck);
    return items[index];
  };

  const calculateSmartFontSize = useCallback((width, height, currentTexts = []) => {
    const refWidth = 500;
    const ar = (width && height) ? (width / height) : 1;
    const effectiveWidth = ar < 1 ? refWidth * ar : refWidth;
    const effectiveHeight = ar > 1 ? refWidth / ar : refWidth;
    let size = effectiveWidth * 0.10;
    currentTexts.forEach(t => {
      const content = (t.content || "").trim();
      if (!content) return;
      const lines = content.split('\n');
      const longestLine = lines.reduce((max, l) => Math.max(max, l.length), 0);
      const allowedWidth = effectiveWidth * (meme.maxWidth / 100) * 0.9;
      const estimatedTextWidth = longestLine * (size * 0.6);
      if (estimatedTextWidth > allowedWidth) size *= (allowedWidth / estimatedTextWidth);
      const allowedHeight = effectiveHeight * 0.4;
      const estimatedTextHeight = lines.length * (size * 1.2);
      if (estimatedTextHeight > allowedHeight) size *= (allowedHeight / estimatedTextHeight);
    });
    return Math.max(2, Math.min(120, Math.round(size)));
  }, [meme.maxWidth]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Restore Global Dragging Logic
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
            const isText = prev.texts.some((t) => t.id === draggedId);
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
    if (mode === 'video') {
      getCategories().then(cats => setCategories(cats.slice(0, 8)));
    }
  }, [mode]);

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
    try {
      localStorage.setItem("meme-generator-state", JSON.stringify(meme));
    } catch (e) {
      console.warn("Storage quota exceeded");
    }
  }, [meme]);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        const autoResults = await getAutocomplete(val);
        startTransition(() => {
            setSuggestions(autoResults);
            setShowSuggestions(true);
        });
      }, 300);
    } else {
      startTransition(() => setSuggestions([]));
    }
  };

  const selectSuggestion = (term) => {
    setSearchQuery(term);
    setShowSuggestions(false);
    performSearch(term);
  };

  async function performSearch(term) {
    if (!term.trim()) return;
    setIsSearching(true);
    const results = await searchTenor(term);
    if (results.length > 0) {
      setAllGifs(results);
      setVideoDeck([]);
      setMode("video");
      const first = results[0];
      updateState((prev) => ({
        ...prev,
        imageUrl: first.url,
        sourceUrl: first.url,
        name: first.name.replace(/\s+/g, "-"),
        isVideo: false,
        id: first.id,
        fontSize: calculateSmartFontSize(first.width, first.height, prev.texts)
      }));
    } else {
      toast.error("No GIFs found");
    }
    setIsSearching(false);
  }

  async function getMemeImage(forcedMode) {
    const requestId = ++requestCounterRef.current;
    const activeMode = typeof forcedMode === 'string' ? forcedMode : mode;
    setGenerating(true);
    try {
      if (activeMode === "video") {
        let currentGifs = allGifs;
        if (currentGifs.length === 0) {
          const results = await searchTenor("");
          if (requestId !== requestCounterRef.current) return;
          if (results.length > 0) {
            currentGifs = results;
            setAllGifs(results);
          } else {
            toast.error("Failed to load GIFs");
            setGenerating(false);
            return;
          }
        }
        const newMeme = getNextItem(currentGifs, videoDeck, setVideoDeck);
        if (requestId !== requestCounterRef.current) return;
        updateState((prev) => ({
          ...prev,
          imageUrl: newMeme.url,
          sourceUrl: newMeme.url,
          name: newMeme.name.replace(/\s+/g, "-"),
          isVideo: false,
          id: newMeme.id,
          fontSize: calculateSmartFontSize(newMeme.width, newMeme.height, prev.texts),
        }));
      } else {
        if (allMemes.length === 0) return;
        const newMeme = getNextItem(allMemes, imageDeck, setImageDeck);
        try {
          const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(newMeme.url)}`);
          if (!response.ok) throw new Error();
          const blob = await response.blob();
          const dataUrl = await new Promise(r => {
            const reader = new FileReader();
            reader.onload = () => r(reader.result);
            reader.readAsDataURL(blob);
          });
          if (requestId !== requestCounterRef.current) return;
          updateState((prev) => ({
            ...prev,
            imageUrl: dataUrl,
            name: newMeme.name.replace(/\s+/g, "-"),
            fontSize: calculateSmartFontSize(newMeme.width, newMeme.height, prev.texts),
            isVideo: false
          }));
        } catch {
          if (requestId !== requestCounterRef.current) return;
          updateState((prev) => ({
            ...prev,
            imageUrl: newMeme.url,
            name: newMeme.name.replace(/\s+/g, "-"),
            fontSize: calculateSmartFontSize(newMeme.width, newMeme.height, prev.texts),
            isVideo: false
          }));
        }
      }
    } finally {
      if (requestId === requestCounterRef.current) setGenerating(false);
    }
  }

  function handleTextChange(id, value) {
    updateState((prev) => ({
      ...prev,
      texts: prev.texts.map((t) => (t.id === id ? { ...t, content: value } : t)),
    }));
  }

  function handleStyleChange(event, shouldCommit = false) {
    const { value, name } = event.currentTarget;
    if (shouldCommit) {
      updateState((prev) => ({ ...prev, [name]: value }));
    } else {
      startTransition(() => {
        updateTransient((prev) => ({ ...prev, [name]: value }));
      });
    }
  }

  function handleFilterChange(event) {
    const { value, name } = event.currentTarget;
    startTransition(() => {
        updateTransient((prev) => ({
        ...prev,
        filters: { ...prev.filters, [name]: value },
        }));
    });
  }

  function handleStyleCommit() { updateState((prev) => prev); }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      updateState((prev) => ({
        ...prev,
        imageUrl: localUrl,
        name: file.name.split(".")[0],
        isVideo: file.type.startsWith("video/"),
      }));
    }
  }

  function handleReset() {
    triggerFlash("red");
    updateState((prev) => ({
      ...prev,
      texts: [{ id: "top", content: "", x: 50, y: 5 }, { id: "bottom", content: "", x: 50, y: 95 }],
      stickers: [],
      fontSize: 40,
      textColor: "#ffffff",
      textBgColor: "transparent",
      filters: { contrast: 100, brightness: 100, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, saturate: 100, invert: 0 },
    }));
  }

  function addSticker(emoji) {
    updateState((prev) => ({
      ...prev,
      stickers: [...prev.stickers, { id: crypto.randomUUID(), url: emoji, x: 50, y: 50 }],
    }));
  }

  function removeSticker(id) {
    updateState((prev) => ({
      ...prev,
      stickers: prev.stickers.filter((s) => s.id !== id),
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

  function generateMagicCaption() {
    const category = MEME_QUOTES[meme.name] || MEME_QUOTES["generic"];
    const randomIndex = Math.floor(Math.random() * category.length);
    const captions = category[randomIndex];

    updateState((prev) => ({
      ...prev,
      texts: prev.texts.map((t, i) => ({
        ...t,
        content: captions[i] || "",
      })),
    }));

    toast("Magic logic applied! ✨", {
      icon: "🪄",
      duration: 2000,
    });
    setStatusMessage("Magic captions generated.");
  }

  const handlePointerDown = useCallback((e, id) => {
    e.stopPropagation();

    updateState((prev) => prev);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    const isSticker = meme.stickers.some((s) => s.id === id);

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
  }, [meme.stickers, updateState]);

  async function handleDownload() {
    if (!memeRef.current) return;
    if (mode === "video") {
      const promise = (async () => {
        const blob = await exportGif(meme, meme.texts, meme.stickers);
        if (meme.id) registerShare(meme.id, searchQuery);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${meme.name}-${Date.now()}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        triggerFireworks();
      })();
      toast.promise(promise, { loading: "Encoding GIF...", success: "Downloaded!", error: "Error" });
    } else {
      const promise = (async () => {
        const canvas = await html2canvas(memeRef.current, { useCORS: true, backgroundColor: "#000000", scale: 2 });
        const link = document.createElement("a");
        link.download = `${meme.name}-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        triggerFireworks();
      })();
      toast.promise(promise, { loading: "Generating...", success: "Downloaded!", error: "Error" });
    }
  }

  async function handleShare() {
    if (!memeRef.current) return;
    if (mode === "video") {
      const hasContent = meme.texts.some(t => t.content?.trim()) || meme.stickers.length > 0;
      if (hasContent) {
        toast("Generating high-quality file for manual sharing...", { duration: 4000 });
        handleDownload();
        return;
      }
      const shareUrl = meme.sourceUrl || meme.imageUrl;
      try {
        const response = await fetch(shareUrl);
        const blob = await response.blob();
        const file = new File([blob], `meme-${Date.now()}.gif`, { type: "image/gif" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          if (meme.id) registerShare(meme.id, searchQuery);
          triggerFireworks();
        } else {
          await navigator.share({ url: shareUrl });
        }
      } catch {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      }
    } else {
      const canvas = await html2canvas(memeRef.current, { useCORS: true, backgroundColor: "#000000", scale: 2 });
      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      const file = new File([blob], `meme.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Copied!");
      }
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSuggestions([]);
    setMode("image");
    if (allMemes.length === 0) {
        setLoading(true);
        fetch("https://api.imgflip.com/get_memes").then(r => r.json()).then(d => {
            setAllMemes(d.data.memes);
            setLoading(false);
        });
    }
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 animate-in fade-in duration-500 relative">
      <div className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200 ${flashColor ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundColor: flashColor === "red" ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.08)" }} />

      <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">
        <MemeInputs 
          texts={meme.texts} 
          handleTextChange={handleTextChange} 
          onAddSticker={addSticker} 
          onMagicCaption={generateMagicCaption} 
        />
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
          <button onClick={undo} disabled={!canUndo} className="bg-slate-800 disabled:opacity-50 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95">
            <Undo2 className="w-4 h-4" /> Undo
          </button>
          <button onClick={redo} disabled={!canRedo} className="bg-slate-800 disabled:opacity-50 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95">
            <Redo2 className="w-4 h-4" /> Redo
          </button>
          <button onClick={() => toast("Tip: Ctrl+Z/Y work too!", { icon: "💡" })} className="w-12 flex items-center justify-center bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-400">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-700 col-span-2">
            <ImagePlus className="w-4 h-4" /> <span>Upload Custom</span>
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={handleReset} 
            className="bg-slate-800 hover:bg-red-900/30 hover:text-red-400 text-slate-400 font-semibold py-3 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-700 col-span-2"
          >
            <Eraser className="w-4 h-4" /> <span>Reset Canvas</span>
          </button>
          <button onClick={handleDownload} className="bg-slate-100 hover:bg-white text-slate-900 font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
            <Download className="w-5 h-5" /> Download
          </button>
          <button onClick={handleShare} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95">
            <Share2 className="w-5 h-5" /> Share
          </button>
        </div>
      </div>

      <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-4">
        <div className="relative">
          <select value={mode} onChange={(e) => {
              const m = e.target.value; setMode(m);
              startTransition(() => { if (m === "image") clearSearch(); getMemeImage(m); });
            }} className="w-full bg-slate-900/50 hover:bg-white/5 transition-colors border border-slate-700 text-white rounded-xl py-3 px-4 outline-none font-bold text-center appearance-none cursor-pointer">
            <option value="image" className="bg-slate-800 text-white hover:bg-[#7a1a1a]">🖼️ Static Images</option>
            <option value="video" className="bg-slate-800 text-white hover:bg-[#7a1a1a]">🎥 Animated GIFs</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center bg-slate-900/50 rounded-2xl animate-pulse"><Loader2 className="animate-spin" /></div>}>
          {mode === "video" && (
            <div className="relative z-50 mb-2" ref={searchContainerRef}>
              <div className="relative">
                <input type="text" value={searchQuery} onFocus={() => setShowSuggestions(true)} onChange={handleSearchInput}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setShowSuggestions(false); performSearch(searchQuery); }}} 
                  placeholder="Search GIFs..." className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-10 focus:ring-2 focus:ring-yellow-500 outline-none" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                {searchQuery && <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X className="w-4 h-4" /></button>}
              </div>
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                    {suggestions.length > 0 ? (
                        <div className="p-2">{suggestions.map((t, i) => (
                            <button key={i} onClick={() => selectSuggestion(t)} className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> {t}
                            </button>
                        ))}
                        </div>
                    ) : categories.length > 0 && !searchQuery ? (
                        <div className="p-2 grid grid-cols-2 gap-2">{categories.map((c, i) => (
                            <button key={i} onClick={() => selectSuggestion(c.searchterm)} className="relative h-16 rounded-lg overflow-hidden group">
                                <img src={c.image} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-bold text-xs">{c.name}</span></div>
                            </button>
                        ))}
                        </div>
                    ) : null}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col shadow-2xl rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900/50">
            <MemeToolbar meme={meme} handleStyleChange={handleStyleChange} handleFilterChange={handleFilterChange} handleStyleCommit={handleStyleCommit} />
            <button onClick={getMemeImage} disabled={loading || generating} className={`w-full text-white font-bold py-3 flex items-center justify-center gap-2 group border-y border-slate-800 bg-[oklch(53%_0.187_39)] hover:bg-[oklch(56%_0.187_39)] ${generating ? "animate-pulse-ring" : ""}`}>
              {generating ? <Loader2 className="animate-spin w-5 h-5" /> : mode === "video" ? <Video className="w-5 h-5" /> : <RefreshCcw className="w-5 h-5" />}
              <span className="text-lg">{generating ? "Cooking..." : mode === "video" ? "Get Random GIF" : "Get Random Image"}</span>
            </button>
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
        </Suspense>
      </div>
      {showWelcome && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-500">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-[oklch(53%_0.187_39)] px-8 py-6 text-center">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Meme Creator</h2>
              <p className="text-white/70 text-xs font-bold tracking-widest uppercase mt-1">Creation Guide</p>
            </div>
            <div className="p-8 space-y-6">
              <section className="space-y-3">
                <h3 className="text-yellow-500 font-bold uppercase text-sm tracking-wider">Sharing GIFs</h3>
                <ul className="text-slate-300 text-sm space-y-3 list-disc list-outside pl-5 marker:text-slate-600">
                  <li><span className="text-white font-medium">Unedited GIFs</span> can be shared directly to your favorite apps.</li>
                  <li>If you add <span className="text-white font-medium">Text or Stickers</span>, we will automatically generate and download a high-quality file for you to share manually.</li>
                  <li>This ensures your captions and animations are perfectly preserved for your friends!</li>
                </ul>
              </section>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Pro Tip
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Use the <b>Magic AI</b> button to instantly generate hilarious captions based on your selected template!
                </p>
              </div>

              <button 
                onClick={closeWelcome} 
                className="w-full bg-slate-100 hover:bg-white transition-all active:scale-95 py-4 rounded-2xl text-slate-900 font-black uppercase tracking-widest text-sm shadow-lg"
              >
                Start Creating
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
