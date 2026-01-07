import { useState, useEffect, useRef, useTransition, Suspense, useCallback, lazy, useDeferredValue, useMemo } from "react";
import html2canvas from "html2canvas-pro";
import { RefreshCcw, Loader2, Video, Undo2, Redo2, HelpCircle, Search, X, TrendingUp, Eraser } from "lucide-react";
import toast from "react-hot-toast";
import { triggerFireworks } from "./Confetti";
import useHistory from "../hooks/useHistory";
import { searchTenor, registerShare, getAutocomplete, getCategories } from "../services/tenor";
import { exportGif, exportStickersAsPng } from "../services/gifExporter";
import { hasAnimatedText } from "../constants/textAnimations";
import { deepFryImage } from "../services/imageProcessor";
import { MEME_QUOTES } from "../constants/memeQuotes";

import MemeCanvas from "./MemeEditor/MemeCanvas";
import MemeToolbar from "./MemeEditor/MemeToolbar";
import MemeInputs from "./MemeEditor/MemeInputs";
import { LayoutSelector } from "./MemeEditor/LayoutSelector";
import { ExportConfirmModal } from "./ExportConfirmModal";
const RemixCarousel = lazy(() => import("./MemeEditor/RemixCarousel"));

const MemeActions = lazy(() => import("./MemeEditor/MemeActions").then((module) => ({ default: module.MemeActions })));
const GifSearch = lazy(() => import("./MemeEditor/GifSearch").then((module) => ({ default: module.GifSearch })));
const ModeSelector = lazy(() =>
  import("./MemeEditor/ModeSelector").then((module) => ({ default: module.ModeSelector })),
);
const ColorControls = lazy(() => import("./MemeEditor/ColorControls"));
const MemeFineTune = lazy(() => import("./MemeEditor/MemeFineTune"));

const DEFAULT_FILTERS = {
  contrast: 100,
  brightness: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  saturate: 100,
  invert: 0,
  deepFry: 0,
};

const DEFAULT_LAYOUTS = {
  "single": [{ id: "p1", x: 0, y: 0, w: 100, h: 100, posX: 50, posY: 50 }],
  "top-bottom": [{ id: "p1", x: 0, y: 0, w: 100, h: 50, posX: 50, posY: 50 }, { id: "p2", x: 0, y: 50, w: 100, h: 50, posX: 50, posY: 50 }],
  "side-by-side": [{ id: "p1", x: 0, y: 0, w: 50, h: 100, posX: 50, posY: 50 }, { id: "p2", x: 50, y: 0, w: 50, h: 100, posX: 50, posY: 50 }],
  "grid-4": [
    { id: "p1", x: 0, y: 0, w: 50, h: 50, posX: 50, posY: 50 }, { id: "p2", x: 50, y: 0, w: 50, h: 50, posX: 50, posY: 50 },
    { id: "p3", x: 0, y: 50, w: 50, h: 50, posX: 50, posY: 50 }, { id: "p4", x: 50, y: 50, w: 50, h: 50, posX: 50, posY: 50 }
  ]
};

export default function Main() {
  const [isPending, startTransition] = useTransition();

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
      name: "Meme Name",
      mode: "image",

      // Global Styles
      textColor: "#ffffff",
      textBgColor: "transparent",
      textShadow: "#000000",
      fontFamily: "Impact",
      fontSize: 30,
      paddingTop: 0,
      letterSpacing: 0,
      drawColor: "#ff0000",
      drawWidth: 5,
      maxWidth: 100,

      // Layout State
      layout: "single",
      activePanelId: "p1",
      panels: [
        {
          id: "p1",
          // Dimensions for single layout (100% width/height)
          x: 0, y: 0, w: 100, h: 100,
          url: "http://i.imgflip.com/1bij.jpg",
          sourceUrl: null,
          isVideo: false,
          objectFit: "cover",
          posX: 50,
          posY: 50,
          filters: { ...DEFAULT_FILTERS }
        }
      ],

      texts: [{ id: "top", content: "", x: 50, y: 5, rotation: 0, animation: null },
      { id: "bottom", content: "", x: 50, y: 95, rotation: 0, animation: null },
      ],
      stickers: [],
      drawings: [],
      selectedId: null,
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration logic
        if (!parsed.panels) {
          parsed.panels = [{
            id: "p1",
            url: parsed.imageUrl || defaultState.panels[0].url,
            sourceUrl: parsed.sourceUrl || null,
            isVideo: parsed.isVideo || false,
            objectFit: "cover",
            posX: 50,
            posY: 50,
            filters: parsed.filters || { ...DEFAULT_FILTERS }
          }];
          parsed.activePanelId = "p1";
          parsed.layout = "single";
          delete parsed.imageUrl;
          delete parsed.isVideo;
          delete parsed.filters;
        }
        // Ensure existing panels have posX/posY AND dimensions (x, y, w, h)
        if (parsed.panels) {
          const layoutDef = DEFAULT_LAYOUTS[parsed.layout || 'single'];
          parsed.panels = parsed.panels.map((p, idx) => {
            const layoutSlot = layoutDef[idx] || { x: 0, y: 0, w: 100, h: 100 };
            return {
              ...p,
              // Add missing dimensions from layout definition
              x: p.x ?? layoutSlot.x,
              y: p.y ?? layoutSlot.y,
              w: p.w ?? layoutSlot.w,
              h: p.h ?? layoutSlot.h,
              posX: p.posX ?? 50,
              posY: p.posY ?? 50
            };
          });
        }

        if (parsed.texts) {
          parsed.texts = parsed.texts.map((t) => ({ ...t, rotation: t.rotation ?? 0, animation: t.animation ?? null }));
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [activeTool, setActiveTool] = useState("move");
  const [flashColor, setFlashColor] = useState(null);
  const memeRef = useRef(null);
  const lastTapRef = useRef({ id: null, time: 0 });
  const globalLastTapRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [statusMessage, setStatusMessage] = useState("");
  const requestCounterRef = useRef(0);
  const canvasContainerRef = useRef(null);
  const remixClickCountRef = useRef({ chaos: 0, caption: 0, style: 0, filter: 0, vibe: 0, deepfry: 0 });

  const [imageDeck, setImageDeck] = useState([]);
  const [videoDeck, setVideoDeck] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isStickerExport, setIsStickerExport] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  // --- IMGFLIP SEARCH LOGIC ---
  const [memeSearchQuery, setMemeSearchQuery] = useState("");
  const [showMemeSuggestions, setShowMemeSuggestions] = useState(false);
  const [hoveredMeme, setHoveredMeme] = useState(null);
  const memeSearchRef = useRef(null);

  // Filter the ~100 memes locally. Instant.
  const filteredMemes = useMemo(() => {
    if (!memeSearchQuery) return allMemes.slice(0, 100);
    const lower = memeSearchQuery.toLowerCase();
    return allMemes.filter((m) => m.name.toLowerCase().includes(lower));
  }, [allMemes, memeSearchQuery]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Existing logic for GIF search...
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      // NEW: Logic for Imgflip search
      if (memeSearchRef.current && !memeSearchRef.current.contains(e.target)) {
        setShowMemeSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dedicated function to load a SPECIFIC meme (reusing your CORS logic)
  async function loadSelectedMeme(memeData) {
    setGenerating(true);
    try {
      // 1. Try to fetch via Weserv to avoid Tainted Canvas and COEP issues
      const response = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(memeData.url)}`);
      if (!response.ok) throw new Error("Weserv failed");
      const blob = await response.blob();
      const dataUrl = await new Promise((r) => {
        const reader = new FileReader();
        reader.onload = () => r(reader.result);
        reader.readAsDataURL(blob);
      });

      updateSelectedPanel(dataUrl, memeData);
    } catch (e) {
      console.warn("Weserv failed, falling back to direct URL (Canvas might taint)", e);
      updateSelectedPanel(memeData.url, memeData);
    } finally {
      setGenerating(false);
      setShowMemeSuggestions(false);
      setMemeSearchQuery(""); // Optional: clear search after pick
    }
  }

  const updateSelectedPanel = (url, memeData) => {
    updateState((prev) => {
      const newPanels = prev.panels.map((p) =>
        p.id === prev.activePanelId
          ? {
            ...p,
            url: url,
            isVideo: false,
            objectFit: "cover",
            filters: { ...DEFAULT_FILTERS },
            processedImage: null,
            processedDeepFryLevel: 0,
          }
          : p
      );
      return {
        ...prev,
        panels: newPanels,
        name: memeData.name.replace(/\s+/g, "-"),
        fontSize: calculateSmartFontSize(memeData.width, memeData.height, prev.texts),
      };
    });
  };

  const [pingKey, setPingKey] = useState(null);
  const [isMagicGenerating, setIsMagicGenerating] = useState(false);
  const fineTuneRef = useRef(null);

  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkSize = () => setIsMobileScreen(window.innerWidth < 1024);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);


  const activePanel = meme.panels.find(p => p.id === meme.activePanelId) || meme.panels[0];
  const deferredDeepFry = useDeferredValue(activePanel?.filters?.deepFry);

  // ------------------------------------------------------
  // ✅ FIXED: Deep Fry Effect with Debounce & Safety Checks
  // ------------------------------------------------------
  useEffect(() => {
    const level = parseInt(deferredDeepFry || 0, 10);
    const controller = new AbortController();
    const signal = controller.signal;

    if (!activePanel) return;

    // 1. If level is 0, show original image and stop
    if (level === 0) {
      if (activePanel.processedImage) {
        startTransition(() => {
          updateState((prev) => ({
            ...prev,
            panels: prev.panels.map((p) =>
              p.id === activePanel.id
                ? { ...p, processedImage: null, processedDeepFryLevel: 0 }
                : p
            ),
          }));
        });
      }
      return;
    }

    // 2. Skip if we already processed this level for this image
    if (activePanel.processedImage && activePanel.processedDeepFryLevel === level) {
      return;
    }

    const processDeepFry = async () => {
      try {
        setIsProcessing(true); // Start loading spinner

        if (activePanel.isVideo) {
          toast("GIF freezes for performance, but export stays animated!", {
            id: "fry-warning",
            icon: (
              <picture>
                <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f6a8/512.webp" type="image/webp" />
                <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f6a8/512.gif" alt="🚨" width="32" height="32" />
              </picture>
            ),
          });
        }

        // Call your service
        const fried = await deepFryImage(activePanel.url, level, signal);

        // 3. CRITICAL CHECK: If user moved slider again, STOP here.
        if (signal.aborted) return;

        // 4. Success! Update the image
        startTransition(() => {
          updateState((prev) => ({
            ...prev,
            panels: prev.panels.map((p) =>
              p.id === activePanel.id
                ? { ...p, processedImage: fried, processedDeepFryLevel: level }
                : p
            ),
          }));
        });

      } catch (error) {
        // 5. SILENTLY FAIL if it was just an abort (this fixes your error log)
        if (error.name === 'AbortError' || error.message === 'Aborted' || error.message?.includes('aborted')) {
          return;
        }

        console.error("Deep Fry Error:", error);
        toast.error("Effect failed");
      } finally {
        if (!signal.aborted) setIsProcessing(false);
      }
    };

    // 6. DEBOUNCE: Wait 100ms before processing. 
    const timerId = setTimeout(() => {
      processDeepFry();
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timerId); // Cancel the timer
      controller.abort();    // Cancel any running process
    };
  }, [deferredDeepFry, activePanel?.url, activePanel?.id]);

  useEffect(() => {
    if (meme.selectedId && fineTuneRef.current) {
      const timer = setTimeout(() => {
        const elementRect = fineTuneRef.current.getBoundingClientRect();
        const elementTop = elementRect.top + window.scrollY;
        const elementHeight = elementRect.height;
        const windowHeight = window.innerHeight;

        const isMobile = window.innerWidth < 768;
        const targetScroll = isMobile ? elementTop - (windowHeight - elementHeight - 20) : elementTop - 150;

        window.scroll({
          top: Math.max(0, targetScroll),
          behavior: "smooth",
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [meme.selectedId]);

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

  const calculateSmartFontSize = () => {
    return 30;
  };

  useEffect(() => {
    if (draggedId) {
      const handleGlobalMove = (e) => {
        if (longPressTimerRef.current) {
          const moveX = e.clientX - startPosRef.current.x;
          const moveY = e.clientY - startPosRef.current.y;
          const distance = Math.hypot(moveX, moveY);
          if (distance > 15) {
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
    if (meme.mode === "video") {
      getCategories().then((cats) => setCategories(cats.slice(0, 8)));
    }
  }, [meme.mode]);

  useEffect(() => {
    setLoading(true);
    fetch("https://api.imgflip.com/get_memes")
      .then((res) => res.json())
      .then((data) => {
        const fixedMemes = data.data.memes.map(m => ({
          ...m,
          url: m.url.replace(/^http:\/\//i, "https://")
        }));
        setAllMemes(fixedMemes);
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
      const first = results[0];

      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === prev.activePanelId
            ? { ...p, url: first.url, sourceUrl: first.shareUrl, isVideo: false, objectFit: "cover", filters: { ...DEFAULT_FILTERS } }
            : p
        );
        return {
          ...prev,
          panels: newPanels,
          name: first.name.replace(/\s+/g, "-"),
          mode: "video",
          fontSize: calculateSmartFontSize(first.width, first.height, prev.texts),
        };
      });
    } else {
      toast.error("No GIFs found");
    }
    setIsSearching(false);
  }

  async function getMemeImage(forcedMode) {
    const requestId = ++requestCounterRef.current;
    const activeMode = typeof forcedMode === "string" ? forcedMode : meme.mode;
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

        updateState((prev) => {
          const newPanels = prev.panels.map(p =>
            p.id === prev.activePanelId
              ? { ...p, url: newMeme.url, sourceUrl: newMeme.shareUrl, isVideo: true, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
              : p
          );
          return {
            ...prev,
            panels: newPanels,
            name: newMeme.name.replace(/\s+/g, "-"),
            fontSize: calculateSmartFontSize(newMeme.width, newMeme.height, prev.texts),
          };
        });

      } else {
        if (allMemes.length === 0) return;
        const newMeme = getNextItem(allMemes, imageDeck, setImageDeck);

        const updatePanelWithImage = (url) => {
          updateState((prev) => {
            const newPanels = prev.panels.map(p =>
              p.id === prev.activePanelId
                ? { ...p, url, isVideo: false, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
                : p
            );
            return {
              ...prev,
              panels: newPanels,
              name: newMeme.name.replace(/\s+/g, "-"),
              fontSize: calculateSmartFontSize(newMeme.width, newMeme.height, prev.texts),
            };
          });
        };

        try {
          const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(newMeme.url)}`);
          if (!response.ok) throw new Error();
          const blob = await response.blob();
          const dataUrl = await new Promise((r) => {
            const reader = new FileReader();
            reader.onload = () => r(reader.result);
            reader.readAsDataURL(blob);
          });
          if (requestId !== requestCounterRef.current) return;
          updatePanelWithImage(dataUrl);
        } catch {
          if (requestId !== requestCounterRef.current) return;
          updatePanelWithImage(newMeme.url);
        }
      }
    } finally {
      if (requestId === requestCounterRef.current) setGenerating(false);
    }
  }

  async function handleChaos() {
    // Safety check for memes
    if (!allMemes || allMemes.length === 0) {
      toast.error("Memes are still loading...");
      return;
    }

    try {
      // 1. DECIDE: Static Image or GIF? (40% chance of GIF)
      const isGifChaos = Math.random() > 0.6;

      let selectedMedia = null;
      let isVideo = false;
      let sourceUrl = null;

      if (isGifChaos) {
        // Fetch a random GIF from expanded chaos keywords
        const chaosKeywords = [
          "funny", "cat", "fail", "chaos", "reaction", "coding",
          "meme", "bruh", "shocked", "rage", "crying", "dance",
          "explosion", "fire", "based", "sus"
        ];
        const keyword = chaosKeywords[Math.floor(Math.random() * chaosKeywords.length)];
        const results = await searchTenor(keyword);

        if (results && results.length > 0) {
          const randomGif = results[Math.floor(Math.random() * results.length)];
          selectedMedia = randomGif.url;
          sourceUrl = randomGif.shareUrl;
          isVideo = true;
        }
      }

      // Fallback to Image if GIF failed or wasn't chosen
      if (!selectedMedia) {
        const randomMeme = allMemes[Math.floor(Math.random() * allMemes.length)];
        selectedMedia = randomMeme.url;
        isVideo = false;
      }

      // 2. Pick Random Quote
      const categories = Object.keys(MEME_QUOTES);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const quotes = MEME_QUOTES[randomCategory];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

      // 3. Determine if EXTREME CHAOS mode (15% chance)
      const isExtremeChaos = Math.random() < 0.15;

      // 4. Generate chaos filters
      let chaosFilters;
      if (isExtremeChaos) {
        // EXTREME CHAOS: Stack multiple intense filters
        chaosFilters = {
          ...DEFAULT_FILTERS,
          deepFry: 15 + Math.floor(Math.random() * 15), // 15-30
          hueRotate: Math.floor(Math.random() * 180), // Wild colors
          brightness: 70 + Math.floor(Math.random() * 60), // 70-130
          contrast: 120 + Math.floor(Math.random() * 40), // 120-160
          saturate: 150 + Math.floor(Math.random() * 100) // 150-250
        };
      } else {
        // Normal chaos: Randomized but more moderate
        chaosFilters = {
          ...DEFAULT_FILTERS,
          // 40% chance of deep fry, levels 5-25
          deepFry: Math.random() < 0.4 ? 5 + Math.floor(Math.random() * 20) : 0,
          // 25% chance hue rotate, 0-180°
          hueRotate: Math.random() < 0.25 ? Math.floor(Math.random() * 180) : 0,
          // 60% chance brightness shift, 90-130
          brightness: Math.random() < 0.6 ? 90 + Math.floor(Math.random() * 40) : 100,
          // 60% chance contrast shift, 80-140
          contrast: Math.random() < 0.6 ? 80 + Math.floor(Math.random() * 60) : 100,
          // 30% chance saturation shift, 50-200
          saturate: Math.random() < 0.3 ? 50 + Math.floor(Math.random() * 150) : 100
        };
      }

      // 5. Update State
      triggerFlash("red");
      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === prev.activePanelId
            ? {
              ...p,
              url: selectedMedia,
              sourceUrl: sourceUrl,
              isVideo: isVideo,
              objectFit: "cover",
              filters: chaosFilters,
              processedImage: null,
              processedDeepFryLevel: 0
            }
            : p
        );

        // Random text with wilder rotation (±12°)
        const newTexts = randomQuote.map((line, idx) => ({
          id: crypto.randomUUID(),
          content: line,
          x: 50,
          y: idx === 0 ? 10 : 90,
          rotation: 0,
          animation: null,
        }));

        // Add empty text input to enable conditional rendering for additional inputs
        newTexts.push({
          id: crypto.randomUUID(),
          content: "",
          x: 50,
          y: 50,
          rotation: 0,
          animation: null,
        });

        // Random font size between 24-40
        const chaosFontSize = 24 + Math.floor(Math.random() * 16);

        return {
          ...prev,
          panels: newPanels,
          mode: isVideo ? "video" : "image",
          texts: newTexts,
          fontSize: chaosFontSize,
        };
      });

      remixClickCountRef.current.chaos++;
      if (remixClickCountRef.current.chaos === 1 || remixClickCountRef.current.chaos % 5 === 0) {
        toast(isExtremeChaos ? "EXTREME CHAOS!" : "CHAOS MODE ACTIVATED!", {
          icon: isExtremeChaos ? "💥" : "🔥"
        });
      }
    } catch (e) {
      console.error("Chaos failed", e);
      toast.error("Chaos missed!");
    }
  }

  // --- REMIX HANDLERS ---

  function handleCaptionRemix() {
    // Generate new captions, preserve current media
    const categories = Object.keys(MEME_QUOTES);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const quotes = MEME_QUOTES[randomCategory];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    triggerFlash("green");
    updateState((prev) => {
      const newTexts = randomQuote.map((line, idx) => ({
        id: crypto.randomUUID(),
        content: line,
        x: 50,
        y: idx === 0 ? 10 : 90,
        rotation: 0,
        animation: null,
      }));
      newTexts.push({ id: crypto.randomUUID(), content: "", x: 50, y: 50, rotation: 0, animation: null });
      return { ...prev, texts: newTexts };
    });
    remixClickCountRef.current.caption++;
    if (remixClickCountRef.current.caption === 1 || remixClickCountRef.current.caption % 5 === 0) {
      toast("Caption remixed!", { icon: "💬" });
    }
  }

  function handleStyleShuffle() {
    const fonts = ["Impact", "Anton", "Archivo Black", "Bangers", "Comic Neue", "Creepster", "Oswald", "Pacifico", "Permanent Marker"];
    const colors = ["#ffffff", "#ffff00", "#00ff00", "#ff00ff", "#00ffff", "#ff6600", "#ff0000"];
    const shadows = ["#000000", "#1a1a1a", "#ff0000", "#0000ff", "transparent"];

    // Calculate safe font size based on text length to prevent overflow
    // (MemeCanvas scaling handles device width, this handles content density)
    const maxTextLength = Math.max(...meme.texts.map(t => (t.content || "").length), 0);
    let maxSafeSize = 60;
    if (maxTextLength > 100) maxSafeSize = 25;
    else if (maxTextLength > 50) maxSafeSize = 35;
    else if (maxTextLength > 20) maxSafeSize = 50;

    // Ensure we don't go below readable minimum
    const minSafeSize = Math.max(20, maxSafeSize - 15);

    const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomShadow = shadows[Math.floor(Math.random() * shadows.length)];
    // Reduce spacing for longer text
    const maxSpacing = maxTextLength > 30 ? 2 : 10;
    const randomSpacing = Math.floor(Math.random() * maxSpacing);
    const randomSize = minSafeSize + Math.floor(Math.random() * (maxSafeSize - minSafeSize));

    triggerFlash("green");
    updateState((prev) => ({
      ...prev,
      fontFamily: randomFont,
      textColor: randomColor,
      textShadow: randomShadow,
      letterSpacing: randomSpacing,
      fontSize: randomSize,
    }));
    remixClickCountRef.current.style++;
    if (remixClickCountRef.current.style === 1 || remixClickCountRef.current.style % 5 === 0) {
      toast("Style shuffled!", { icon: "🎨" });
    }
  }

  function handleFilterFrenzy() {
    const randomFilters = {
      ...DEFAULT_FILTERS,
      contrast: 80 + Math.floor(Math.random() * 60),
      brightness: 80 + Math.floor(Math.random() * 50),
      hueRotate: Math.floor(Math.random() * 360),
      saturate: 50 + Math.floor(Math.random() * 150),
      grayscale: Math.random() < 0.2 ? Math.floor(Math.random() * 50) : 0,
      sepia: Math.random() < 0.15 ? Math.floor(Math.random() * 40) : 0,
    };

    triggerFlash("green");
    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        panels: prev.panels.map(p =>
          p.id === prev.activePanelId
            ? { ...p, filters: randomFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });
    remixClickCountRef.current.filter++;
    if (remixClickCountRef.current.filter === 1 || remixClickCountRef.current.filter % 5 === 0) {
      toast("Filters applied!", { icon: "✨" });
    }
  }

  function handleVibeCheck() {
    const vibes = {
      retro: { sepia: 40, grayscale: 20, contrast: 110, brightness: 95, saturate: 80, hueRotate: 0, blur: 0, invert: 0, deepFry: 0 },
      neon: { saturate: 200, hueRotate: 180, brightness: 120, contrast: 120, sepia: 0, grayscale: 0, blur: 0, invert: 0, deepFry: 0 },
      cursed: { deepFry: 40, contrast: 150, saturate: 180, brightness: 110, hueRotate: 15, sepia: 0, grayscale: 0, blur: 0, invert: 0 },
      noir: { grayscale: 100, contrast: 130, brightness: 90, saturate: 0, sepia: 0, hueRotate: 0, blur: 0, invert: 0, deepFry: 0 },
      dreamy: { blur: 1, brightness: 115, saturate: 120, sepia: 15, contrast: 95, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 }
    };
    const vibeNames = Object.keys(vibes);
    const randomVibe = vibeNames[Math.floor(Math.random() * vibeNames.length)];
    const filters = vibes[randomVibe];

    triggerFlash("green");
    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        panels: prev.panels.map(p =>
          p.id === prev.activePanelId
            ? { ...p, filters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });
    remixClickCountRef.current.vibe++;
    if (remixClickCountRef.current.vibe === 1 || remixClickCountRef.current.vibe % 5 === 0) {
      toast(`${randomVibe.charAt(0).toUpperCase() + randomVibe.slice(1)} vibe applied!`, { icon: "🎭" });
    }
  }

  function handleExtremeDeepFry() {
    triggerFlash("red");
    startTransition(() => {
      updateState((prev) => {
        const activePanelId = prev.activePanelId;
        const currentPanel = prev.panels.find(p => p.id === activePanelId);
        const currentFry = currentPanel?.filters?.deepFry || 0;
        const newFry = currentFry > 0 ? 0 : 50;

        return {
          ...prev,
          panels: prev.panels.map(p =>
            p.id === activePanelId
              ? { ...p, filters: { ...DEFAULT_FILTERS, deepFry: newFry }, processedImage: null, processedDeepFryLevel: 0 }
              : p
          )
        };
      });
    });

    const currentFry = meme.panels.find(p => p.id === meme.activePanelId)?.filters?.deepFry || 0;
    const isTurningOn = currentFry === 0;

    remixClickCountRef.current.deepfry++;
    if (isTurningOn) {
      toast("Extreme Deep Fry applied!", { icon: "🍗" });
    } else {
      toast("Deep Fry removed", { icon: "🧹" });
    }
  }

  // Calculate current deep fry level for the active panel to pass down
  const currentDeepFryLevel = meme.panels.find(p => p.id === meme.activePanelId)?.filters?.deepFry || 0;

  function handleLayoutChange(layoutId) {
    if (layoutId === meme.layout) return;

    startTransition(() => {
      updateState(prev => {
        const newLayoutDef = DEFAULT_LAYOUTS[layoutId];
        const oldPanels = [...prev.panels];

        const newPanels = newLayoutDef.map((slot, index) => {
          const existing = oldPanels[index];
          if (existing) {
            return { ...existing, id: slot.id, x: slot.x, y: slot.y, w: slot.w, h: slot.h };
          }
          return {
            id: slot.id,
            x: slot.x, y: slot.y, w: slot.w, h: slot.h,
            url: null,
            isVideo: false,
            objectFit: "cover",
            posX: 50,
            posY: 50,
            filters: { ...DEFAULT_FILTERS }
          };
        });

        return {
          ...prev,
          layout: layoutId,
          panels: newPanels,
          activePanelId: newPanels[0].id
        };
      });
    });
  }

  const handlePanelPosChange = (id, x, y, isTransient = false) => {
    const updater = isTransient ? updateTransient : updateState;
    // For transient updates, we use startTransition implicitly if not provided, 
    // but updateTransient usually handles its own scheduling or is fast enough.
    // However, Main.jsx uses startTransition for transient sometimes.

    const updateFn = (prev) => ({
      ...prev,
      panels: prev.panels.map(p =>
        p.id === id ? { ...p, posX: x, posY: y } : p
      )
    });

    if (isTransient) {
      updateTransient(updateFn);
    } else {
      updater(updateFn);
    }
  };

  function handlePanelSelect(id) {
    if (id === meme.activePanelId) return;
    startTransition(() => {
      updateState(prev => ({ ...prev, activePanelId: id }));
    });
  }

  function handleTextChange(id, value) {
    updateState((prev) => {
      const newTexts = prev.texts.map((t) => (t.id === id ? { ...t, content: value } : t));
      const lastText = newTexts[newTexts.length - 1];

      if (lastText.content.trim().length > 0) {
        newTexts.push({
          id: crypto.randomUUID(),
          content: "",
          x: 50,
          y: 50,
          rotation: 0,
          animation: null,
        });
      }

      return {
        ...prev,
        texts: newTexts,
      };
    });
  }

  function handleCenterText() {
    if (!meme.selectedId) return;
    updateState((prev) => ({
      ...prev,
      texts: prev.texts.map((t) => (t.id === meme.selectedId ? { ...t, x: 50, y: 50 } : t)),
    }));
  }

  function handleAnimationChange(animationId) {
    // Apply animation to ALL texts with content
    updateState((prev) => ({
      ...prev,
      texts: prev.texts.map((t) => (
        (t.content || "").trim().length > 0
          ? { ...t, animation: animationId === 'none' ? null : animationId }
          : t
      )),
    }));
  }

  function handleStickerAnimationChange(animationId) {
    updateState((prev) => ({
      ...prev,
      stickers: prev.stickers.map((s) => ({
        ...s,
        animation: animationId === 'none' ? null : animationId
      })),
    }));
  }

  function resetFilters() {
    startTransition(() => {
      updateState((prev) => {
        return {
          ...prev,
          panels: prev.panels.map(p =>
            p.id === prev.activePanelId ? { ...p, filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 } : p
          )
        };
      });
    });
    toast("Filters reset", { icon: "🎨" });
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
        panels: prev.panels.map(p =>
          p.id === prev.activePanelId
            ? { ...p, filters: { ...p.filters, [name]: value } }
            : p
        )
      }));
    });
  }

  function handleStyleCommit() {
    updateState((prev) => prev);
  }

  function handleDrawCommit(newPath) {
    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        drawings: [...prev.drawings, newPath],
      }));
    });
  }

  function handleClearDrawings() {
    startTransition(() => {
      updateState((prev) => ({ ...prev, drawings: [] }));
    });
    toast.success("Drawings cleared");
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const isGif = file.type === "image/gif";
      const isVideo = file.type.startsWith("video/");

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        updateState((prev) => {
          const newPanels = prev.panels.map(p =>
            p.id === prev.activePanelId
              ? { ...p, url: dataUrl, isVideo: isVideo || isGif, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
              : p
          );
          return {
            ...prev,
            panels: newPanels,
            name: file.name.split(".")[0],
            mode: isGif || isVideo ? "video" : "image",
          };
        });
      };
      reader.readAsDataURL(file);
    }
  }

  const handleCanvasDrop = useCallback((file, panelId) => {
    const isGif = file.type === "image/gif";
    const isVideo = file.type.startsWith("video/");

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      startTransition(() => {
        updateState((prev) => {
          const newPanels = prev.panels.map(p =>
            p.id === panelId
              ? { ...p, url: dataUrl, isVideo: isVideo || isGif, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
              : p
          );
          return {
            ...prev,
            panels: newPanels,
            activePanelId: panelId,
            mode: newPanels.some(p => p.isVideo) ? "video" : "image"
          };
        });
      });
    };
    reader.readAsDataURL(file);
  }, [updateState]);

  const handleClearPanel = useCallback((panelId) => {
    startTransition(() => {
      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === panelId
            ? { ...p, url: null, sourceUrl: null, isVideo: false, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
            : p
        );
        return {
          ...prev,
          panels: newPanels,
        };
      });
    });
  }, [updateState]);

  const togglePanelFit = useCallback((panelId) => {
    startTransition(() => {
      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === panelId
            ? { ...p, objectFit: p.objectFit === "contain" ? "cover" : "contain" }
            : p
        );
        return { ...prev, panels: newPanels };
      });
    });
  }, [updateState]);

  const handleToolbarExpand = useCallback(() => {
    if (canvasContainerRef.current) {
      const yCoord = canvasContainerRef.current.getBoundingClientRect().top + window.scrollY - 16;
      window.scroll({
        top: yCoord,
        behavior: 'smooth'
      });
    }
  }, []);

  function handleReset() {
    triggerFlash("red");
    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        texts: [
          { id: "top", content: "", x: 50, y: 5, rotation: 0, animation: null },
          { id: "bottom", content: "", x: 50, y: 95, rotation: 0, animation: null },
        ],
        stickers: [],
        drawings: [],
        fontSize: 30,
        fontFamily: "Impact",
        paddingTop: 0,
        drawColor: "#ff0000",
        drawWidth: 5,
        textColor: "#ffffff",
        textBgColor: "transparent",
        panels: prev.panels.map(p => ({ ...p, filters: { ...DEFAULT_FILTERS } }))
      }));
    });
  }

  function addSticker(urlOrEmoji, type = "emoji", isAnimated = false) {
    updateState((prev) => ({
      ...prev,
      stickers: [...prev.stickers, { id: crypto.randomUUID(), url: urlOrEmoji, type, x: 50, y: 50, isAnimated, animation: null }],
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
    startTransition(() => {
      updateState((prev) => ({ ...prev, selectedId: null }));
    });
    globalLastTapRef.current = 0;
  }

  function handleFineTune(axis, value) {
    if (!meme.selectedId) return;

    startTransition(() => {
      updateTransient((prev) => ({
        ...prev,
        texts: prev.texts.map((t) => (t.id === meme.selectedId ? { ...t, [axis]: parseFloat(value) } : t)),
      }));
    });
  }

  const handleFineTuneCommit = () => {
    updateState((prev) => prev);
  };

  function generateMagicCaption() {
    setIsMagicGenerating(true);

    setTimeout(() => {
      const category = MEME_QUOTES[meme.name] || MEME_QUOTES["generic"];
      const randomIndex = Math.floor(Math.random() * category.length);
      const captions = category[randomIndex];

      updateState((prev) => {
        const newTexts = prev.texts.map((t, i) => ({
          ...t,
          content: captions[i] || "",
        }));

        const lastText = newTexts[newTexts.length - 1];
        if (lastText && lastText.content.trim().length > 0) {
          newTexts.push({
            id: crypto.randomUUID(),
            content: "",
            x: 50,
            y: 50,
          });
        }

        return {
          ...prev,
          texts: newTexts,
        };
      });

      toast("Magic logic applied! ✨", {
        icon: "🪄",
        duration: 2000,
      });
      setStatusMessage("Magic captions generated.");
      setIsMagicGenerating(false);
    }, 800);
  }

  const handlePointerDown = useCallback(
    (e, id) => {
      e.stopPropagation();

      startPosRef.current = { x: e.clientX, y: e.clientY };
      const isSticker = meme.stickers.some((s) => s.id === id);
      const isText = meme.texts.some((t) => t.id === id);

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
      } else if (isText) {
        longPressTimerRef.current = setTimeout(() => {
          startTransition(() => {
            updateState((prev) => ({ ...prev, selectedId: id }));
          });
          setDraggedId(null);
          if (navigator.vibrate) navigator.vibrate(50);
          toast("Text Selected!", { icon: "✨", duration: 1000 });
        }, 350);
      }

      setDraggedId(id);
      if (navigator.vibrate) navigator.vibrate(20);
    },
    [meme.stickers, meme.texts, updateState],
  );

  // --- EXPORT HELPER FUNCTIONS ---

  // Helper: Execute GIF export
  const doGifExport = useCallback(async (options = {}) => {
    if (!memeRef.current) return;

    const { stickersOnly = false } = options;
    const isDeepFrying = meme.panels.some(p => (p.filters?.deepFry || 0) > 0);
    const loadingMsg = stickersOnly ? "Exporting stickers..." : (isDeepFrying ? "Deep frying frames... (this takes longer) 🍟" : "Encoding GIF...");

    const promise = (async () => {
      const exportMeme = { ...meme, stickersOnly };
      const blob = await exportGif(exportMeme, meme.texts, meme.stickers);
      if (meme.id) registerShare(meme.id, searchQuery);

      const safeName = (meme.name || 'meme')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50)
        || 'meme';

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeName}-${stickersOnly ? 'stickers' : ''}-${Date.now()}.gif`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      triggerFireworks();
    })();

    toast.promise(promise, {
      loading: loadingMsg,
      success: "Downloaded!",
      error: (err) => {
        console.error("GIF Export Error:", err);
        return "Export failed";
      },
    });
  }, [meme, searchQuery]);

  // Helper: Execute static PNG export
  const doStaticExport = useCallback(async (options = {}) => {
    if (!memeRef.current) return;

    const { stickersOnly = false, forceStatic = false } = options;

    // Special Case: Static Sticker Export via PNG (Transparent)
    if (stickersOnly) {
      const promise = (async () => {
        // Use our new direct PNG exporter!
        const blob = await exportStickersAsPng(meme, meme.stickers);

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `stickers-${Date.now()}.png`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        triggerFireworks();
      })();

      toast.promise(promise, {
        loading: "Exporting sticker...",
        success: "Downloaded!",
        error: "Export failed"
      });
      return;
    }

    const promise = (async () => {
      const canvas = await html2canvas(memeRef.current, { useCORS: true, backgroundColor: "#000000", scale: 2 });
      const finalDataUrl = canvas.toDataURL("image/png");

      const safeName = (meme.name || 'meme')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50)
        || 'meme';

      const link = document.createElement("a");
      link.href = finalDataUrl;
      link.download = `${safeName}-${Date.now()}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      triggerFireworks();
    })();

    toast.promise(promise, {
      loading: "Generating...",
      success: "Downloaded!",
      error: (err) => {
        console.error("Image Export Error:", err);
        return "Export failed";
      },
    });
  }, [meme.name]);

  async function handleDownload() {
    if (!memeRef.current) return;

    // Determine content types
    const hasVideoPanel = meme.panels.some(p => p.isVideo || (p.url && p.url.includes('.gif')));
    const hasGifSticker = meme.stickers.some(s => s.type === 'image' && (s.isAnimated || s.url.includes('.gif')));
    const hasAnimatedTextContent = hasAnimatedText(meme.texts);
    const hasAnyStickers = meme.stickers.length > 0;

    // If the base image is already animated (GIF/video), always export as GIF
    if (hasVideoPanel) {
      doGifExport();
      return;
    }

    // If static image has animated content, show confirmation modal
    if (hasGifSticker || hasAnimatedTextContent || hasAnyStickers) {
      setShowExportModal(true);
      return;
    }

    // Pure static image with no animated content - export as PNG
    doStaticExport();
  }

  async function handleExportStickers() {
    if (!memeRef.current) return;
    setIsStickerExport(true);

    const hasAnimatedSticker = meme.stickers.some(s => s.animation && s.animation !== 'none');
    const hasGifSticker = meme.stickers.some(s => s.type === 'image' && (s.isAnimated || s.url.includes('.gif')));

    // If we have animated content, ask the user what to do
    if (hasAnimatedSticker || hasGifSticker) {
      setShowExportModal(true);
    } else {
      // Static stickers only -> Auto-export as static
      doStaticExport({ stickersOnly: true, forceStatic: true });
    }
  }

  async function handleShare() {
    if (!memeRef.current) return;

    try {
      const canvas = await html2canvas(memeRef.current, { useCORS: true, backgroundColor: "#000000", scale: 2 });
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], `meme.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        toast.success("Shared!");
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Copied!");
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Share Error:", e);
        toast.error("Share failed");
      }
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSuggestions([]);
    if (allMemes.length === 0) {
      setLoading(true);
      fetch("https://api.imgflip.com/get_memes")
        .then((r) => r.json())
        .then((d) => {
          setAllMemes(d.data.memes);
          setLoading(false);
        });
    }
  }

  const selectedText = meme.selectedId ? meme.texts.find((t) => t.id === meme.selectedId) : null;

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 animate-in fade-in duration-500 relative">
      <div
        className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200 ${flashColor ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundColor: flashColor === "red" ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.08)" }}
      />

      {/* Export Confirmation Modal */}
      <ExportConfirmModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setIsStickerExport(false); }}
        onExportGif={() => doGifExport({ stickersOnly: isStickerExport })}
        onExportStatic={() => doStaticExport({ stickersOnly: isStickerExport, forceStatic: isStickerExport })}
        isStickerOnly={isStickerExport}
      />

      <div className="lg:col-span-5 space-y-8 order-2 lg:order-1 lg:sticky lg:top-8 self-start">
        <MemeInputs
          texts={meme.texts}
          handleTextChange={handleTextChange}
          onAddSticker={addSticker}
          onMagicCaption={generateMagicCaption}
          isMagicGenerating={isMagicGenerating}
          onChaos={handleChaos}
          hasStickers={meme.stickers.length > 0}
          onExportStickers={handleExportStickers}
        />
        <Suspense fallback={<div className="h-16 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
          <MemeActions
            onFileUpload={handleFileUpload}
            onDownload={handleDownload}
            onShare={handleShare}
          />
        </Suspense>
      </div>

      <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Suspense fallback={<div className="h-12 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
            <ModeSelector
              mode={meme.mode}
              onModeChange={(e) => {
                const m = e.target.value;
                startTransition(() => {
                  updateState((prev) => ({ ...prev, mode: m }));
                  if (m === "image") clearSearch();
                  getMemeImage(m);
                });
              }}
            />
          </Suspense>
          <LayoutSelector
            layout={meme.layout}
            onLayoutChange={handleLayoutChange}
          />
        </div>

        {/* --- DYNAMIC SEARCH BAR (Switches based on Mode) --- */}

        {/* CASE 1: VIDEO MODE (Existing Tenor Search) */}
        {meme.mode === "video" && (
          <Suspense fallback={<div className="h-12 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
            <GifSearch
              searchQuery={searchQuery}
              onSearchInput={handleSearchInput}
              onFocus={() => setShowSuggestions(true)}
              onClear={clearSearch}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              categories={categories}
              onSelectSuggestion={selectSuggestion}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setShowSuggestions(false);
                  performSearch(searchQuery);
                }
              }}
              containerRef={searchContainerRef}
              placeholder={isMobileScreen ? "Search GIFs..." : "Search GIFs (e.g. funny cat, dancing)..."}
            />
          </Suspense>
        )}

        {/* CASE 2: IMAGE MODE (New Imgflip Search) */}
        {meme.mode === "image" && (
          <div className="relative z-50" ref={memeSearchRef}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder={isMobileScreen ? "Search images..." : "Search images (e.g. Drake, Distracted Boyfriend)..."}
                value={memeSearchQuery}
                onChange={(e) => {
                  setMemeSearchQuery(e.target.value);
                  setShowMemeSuggestions(true);
                }}
                onFocus={() => setShowMemeSuggestions(true)}
                className="w-full bg-slate-900/50 border-2 border-slate-800 text-white pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all placeholder:text-slate-500 placeholder:text-xs md:placeholder:text-sm"
              />
              {memeSearchQuery && (
                <button
                  onClick={() => setMemeSearchQuery("")}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showMemeSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[60]">
                {!memeSearchQuery && (
                  <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-brand" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Popular Images</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium italic">Scroll to browse</span>
                  </div>
                )}
                {memeSearchQuery && filteredMemes.length > 0 && (
                  <div className="px-4 py-2 border-b border-slate-800 bg-brand/5">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Search Results</span>
                  </div>
                )}
                {filteredMemes.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
                    <Search className="w-10 h-10 opacity-20" />
                    <p>No images found for "{memeSearchQuery}"</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto p-3 custom-scrollbar relative">
                    <div className="grid grid-cols-3 gap-3">
                      {filteredMemes.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            loadSelectedMeme(m);
                            setHoveredMeme(null);
                          }}
                          onMouseEnter={() => setHoveredMeme(m)}
                          onMouseLeave={() => setHoveredMeme(null)}
                          className="group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border-2 border-transparent hover:border-brand transition-all active:scale-95 focus:outline-none focus:border-brand"
                          title={m.name}
                        >
                          <img
                            src={`https://wsrv.nl/?url=${encodeURIComponent(m.url)}&w=300&h=300&fit=cover`}
                            alt={m.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            loading="lazy"
                            crossOrigin="anonymous"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <p className="text-[10px] text-white font-medium truncate w-full">
                              {m.name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Floating Preview Pane (Visible on Large Screens) */}
                    {hoveredMeme && (
                      <div className="fixed left-[calc(100%+1rem)] top-0 w-64 p-3 bg-slate-900 border-2 border-brand rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 hidden xl:block z-[70] pointer-events-none">
                        <div className="relative aspect-auto rounded-lg overflow-hidden border border-slate-800">
                          <img
                            src={`https://wsrv.nl/?url=${encodeURIComponent(hoveredMeme.url)}&w=600`}
                            className="w-full h-auto max-h-[400px] object-contain"
                            alt="Preview"
                            crossOrigin="anonymous"
                          />
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="text-sm font-bold text-white truncate">{hoveredMeme.name}</p>
                          <p className="text-[10px] text-brand font-black uppercase tracking-widest opacity-80">Click to load Image</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col shadow-2xl rounded-2xl border-2 border-slate-800 bg-slate-900/50 overflow-hidden">
          <MemeToolbar
            meme={{ ...meme, filters: activePanel?.filters || DEFAULT_FILTERS }}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            handleStyleChange={handleStyleChange}
            handleFilterChange={handleFilterChange}
            handleStyleCommit={handleStyleCommit}
            onResetFilters={resetFilters}
            onClearDrawings={handleClearDrawings}
            onDrawerExpand={handleToolbarExpand}
            onAnimationChange={handleAnimationChange}
            onStickerAnimationChange={handleStickerAnimationChange}
          />
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(30);
              setPingKey(Date.now());
              getMemeImage();
            }}
            disabled={loading || generating}
            className={`relative z-20 w-full text-white font-bold py-3 flex items-center justify-center gap-2 group border-y border-slate-800 bg-brand hover:bg-brand-dark transition-all active:scale-[0.98] ${generating ? "animate-pulse-ring" : ""}`}
          >
            {pingKey && <span key={pingKey} className="absolute inset-0 animate-radar pointer-events-none" />}
            <div className="relative z-10 flex items-center justify-center gap-2">
              {generating ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : meme.mode === "video" ? (
                <Video className="w-5 h-5" />
              ) : (
                <RefreshCcw className="w-5 h-5" />
              )}
              <span className="text-lg">
                {generating ? "Cooking..." : meme.mode === "video" ? "Get Random GIF" : "Get Random Image"}
              </span>
            </div>
          </button>
          <div ref={canvasContainerRef} className="scroll-mt-4">
            <MemeCanvas
              ref={memeRef}
              meme={meme}
              loading={loading}
              isProcessing={isProcessing}
              draggedId={draggedId}
              selectedId={meme.selectedId}
              activeTool={activeTool}
              onDrawCommit={handleDrawCommit}
              onFineTune={handleFineTune}
              onFineTuneCommit={handleFineTuneCommit}
              onCenterText={handleCenterText}
              onPointerDown={handlePointerDown}
              onRemoveSticker={removeSticker}
              onCanvasPointerDown={handleCanvasPointerDown}

              // New Props
              activePanelId={meme.activePanelId}
              onPanelSelect={handlePanelSelect}
              layouts={DEFAULT_LAYOUTS}
              onDrop={handleCanvasDrop}
              onClearPanel={handleClearPanel}
              onToggleFit={togglePanelFit}
              onPanelPosChange={handlePanelPosChange}
            />
          </div>
          {selectedText && (
            <Suspense fallback={null}>
              <div ref={fineTuneRef}>
                <MemeFineTune
                  selectedText={selectedText}
                  onFineTune={handleFineTune}
                  onFineTuneCommit={handleFineTuneCommit}
                  onCenterText={handleCenterText}
                />
              </div>
            </Suspense>
          )}
        </div>

        {/* Remix Carousel */}
        <Suspense fallback={<div className="h-14 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
          <RemixCarousel
            onChaos={handleChaos}
            onCaptionRemix={handleCaptionRemix}
            onStyleShuffle={handleStyleShuffle}
            onFilterFrenzy={handleFilterFrenzy}
            onVibeCheck={handleVibeCheck}
            onExtremeDeepFry={handleExtremeDeepFry}
            deepFryLevel={currentDeepFryLevel}
          />
        </Suspense>

        {/* Undo / Redo Controls */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="bg-slate-800 disabled:opacity-50 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
          >
            <Undo2 className="w-4 h-4" /> Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="bg-slate-800 disabled:opacity-50 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
          >
            <Redo2 className="w-4 h-4" /> Redo
          </button>
          <button
            onClick={() => toast("Tip: Ctrl+Z/Y work too!", { icon: "💡" })}
            className="w-12 flex items-center justify-center bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-400 transition-all active:scale-95"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleReset}
          className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 font-semibold py-3 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-red-900/50"
        >
          <Eraser className="w-4 h-4" /> <span>Remove Everything</span>
        </button>
      </div>
    </main>
  );
}
