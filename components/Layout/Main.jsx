import { useState, useEffect, useRef, useTransition, Suspense, useCallback, lazy, useDeferredValue, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { RefreshCcw, Loader2, Video, Undo2, Redo2, HelpCircle, Search, X, TrendingUp, Eraser } from "lucide-react";
import toast from "react-hot-toast";
import { triggerFireworks, triggerConfettiBurst } from "../ui/Confetti";
import useHistory from "../../hooks/useHistory";
import { searchGiphy, registerShare, getAutocomplete, getCategories } from "../../services/giphy";
import { exportGif, exportStickersAsPng, exportImageAsPng } from "../../services/gifExporter";
import { hasAnimatedText } from "../../constants/textAnimations";
import { deepFryImage } from "../../services/imageProcessor";
import { processFileInWorker } from "../../services/fileLoader";
import { MEME_QUOTES } from "../../constants/memeQuotes";
import { STICKER_KEYWORDS } from "../../constants/stickerKeywords";

import MemeCanvas from "../MemeEditor/MemeCanvas";
import MemeToolbar from "../MemeEditor/MemeToolbar";

import { LayoutSelector } from "../MemeEditor/LayoutSelector";
import { ExportConfirmModal } from "../Modals/ExportConfirmModal";
import { SnippetSuccessModal } from "../Modals/SnippetSuccessModal";
import { saveState, loadState } from "../../services/storage";
const RemixCarousel = lazy(() => import("../MemeEditor/RemixCarousel"));

const MemeActions = lazy(() => import("../MemeEditor/MemeActions").then((module) => ({ default: module.MemeActions })));
const GifSearch = lazy(() => import("../MemeEditor/GifSearch").then((module) => ({ default: module.GifSearch })));
const ModeSelector = lazy(() =>
  import("../MemeEditor/ModeSelector").then((module) => ({ default: module.ModeSelector })),
);
const ColorControls = lazy(() => import("../MemeEditor/ColorControls"));
const MemeFineTune = lazy(() => import("../MemeEditor/MemeFineTune"));
import { ToastIcon } from "../ui/ToastIcon";
import { MemeStickerSection } from "../MemeEditor/MemeStickerSection";
import { ProductHuntBadge } from "../ui/ProductHuntBadge";



// Cleanup delay after triggering a download (milliseconds)
const DOWNLOAD_CLEANUP_DELAY = 100;

/**
 * Detects if the current browser is running on iOS (iPhone, iPad, iPod)
 * Uses multiple detection methods for reliability:
 * - User agent string check (primary)
 * - Platform + touch points check (for iPad Pro which identifies as Mac)
 * @returns {boolean} True if running on iOS Safari
 */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Converts a Blob to a Data URL using FileReader
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} Promise that resolves to the Data URL
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Triggers a download using appropriate method based on platform
 * @param {Blob} blob - The file blob to download
 * @param {string} filename - The desired filename
 */
async function triggerDownload(blob, filename) {
  const isiOS = isIOS();

  if (isiOS) {
    // iOS Safari: Use Data URL approach
    const dataUrl = await blobToDataURL(blob);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(link);
    }, DOWNLOAD_CLEANUP_DELAY);
  } else {
    // Other browsers: Use Blob URL approach
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, DOWNLOAD_CLEANUP_DELAY);
  }
}

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

const TOAST_ANIMATIONS = [
  "/animations/broom.json",
  "/animations/filter-frenzy.json",
  "/animations/performing-arts.json",
  "/animations/speech-bubble.json",
  "/animations/vibe-check-toast.json",
  "/animations/waste-basket.json",
  // Preload new remix button animations
  "/animations/stickerfy.json",
  "/animations/nuclear.json",
  "/animations/time-warp.json",
  "/animations/glitch.json",
  "/animations/confetti.json",
  "/animations/cursed.json"
];

export default function Main() {
  const [isPending, startTransition] = useTransition();
  // NEW: Track hydration status to prevent overwriting DB with default state
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Preload toast animations
    TOAST_ANIMATIONS.forEach(src => {
      fetch(src).catch(() => { });
    });

    // Hydrate state from IndexedDB
    loadState().then((saved) => {
      if (saved) {
        // Apply migration logic similar to before, but now async
        try {
          // If we have a full history stack (v2), hydrate it directly
          if (saved.version === 2 && saved.present) {
             hydrateHistory(saved);
             setIsHydrated(true);
             return;
          }

          // Legacy (v1) logic
          // We can assume saved is the object proper if we stored it that way
          // But if we need migration logic, we should apply it here.
          // Since we just swapped storage backend, the logic is likely the same.
          // However, let's keep it robust.
          let parsed = saved;

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
                posY: p.posY ?? 50,
                // Clear processedImage on reload - blob URLs aren't valid across sessions
                processedImage: null,
                processedDeepFryLevel: 0
              };
            });
          }

          if (parsed.texts) {
            parsed.texts = parsed.texts.map((t) => ({ ...t, rotation: t.rotation ?? 0, animation: t.animation ?? null }));
          }

          // Hydrate!
          updateState(prev => ({ ...defaultState, ...parsed }));
        } catch (e) {
          console.error("Hydration failed", e);
        }
      }
      setIsHydrated(true);
    });

  }, []);

  /*
    Updated to use IndexedDB via storage.js for better persistence of large images (Data URLs).
    The initial state is now pure default, and we hydrate asynchronously.
  */
  const defaultState = useMemo(() => ({
    id: null,
    name: "Meme Name",
    mode: "image",

    // Global Styles
    textColor: "#ffffff",
    textBgColor: "transparent",
    textShadow: "#000000",
    fontFamily: "Roboto",
    fontSize: 40,
    paddingTop: 0,
    paddingBottom: 0,
    paddingTopColor: "#ffffff",
    paddingBottomColor: "#ffffff",
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
        objectFit: "contain",
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
  }), []);



  const {
    state: meme,
    updateState,
    updateTransient,
    undo,
    redo,
    canUndo,
    canRedo,
    replaceState, // We might need to expose this from useHistory if not already, or just use updateState with absolute value
    hydrateHistory,
    history: memeHistory
  } = useHistory(() => defaultState);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl (PC) or Meta (Mac)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault(); // Prevent browser default undo
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault(); // Prevent browser default redo
          e.stopPropagation(); // Stop event bubbling which might cause scroll
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const [allMemes, setAllMemes] = useState([]);
  const [allGifs, setAllGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [draggedId, setDraggedId] = useState(null);
  const [activeTool, setActiveTool] = useState("move");
  const [flashColor, setFlashColor] = useState(null);
  const [editingId, setEditingId] = useState(null); // Track actively edited text (shows blinking cursor)
  const [isHoveringCanvasElement, setIsHoveringCanvasElement] = useState(false); // Track text/sticker hover for border
  const memeRef = useRef(null);
  const lastTapRef = useRef({ id: null, time: 0 });
  const globalLastTapRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [statusMessage, setStatusMessage] = useState("");
  const requestCounterRef = useRef(0);
  const canvasContainerRef = useRef(null);
  const remixClickCountRef = useRef({ chaos: 0, caption: 0, style: 0, filter: 0, vibe: 0, deepfry: 0 });
  const vibeThrottleRef = useRef(0); // Spam protection for vibe-check button
  const chaosThrottleRef = useRef(0); // Spam protection for chaos button
  const filterThrottleRef = useRef(0); // Spam protection for filter button
  const vibeIndexRef = useRef(0); // Cycle through vibes
  const filterFrenzyIndexRef = useRef(0); // Cycle through chaos strategies
  const lastFriedImageRef = useRef(null); // Cleanup memory leaks from deep fry
  const longPressHintShownRef = useRef(localStorage.getItem('longPressHintShown') === 'true');

  // Helper to show long-press hint once per device
  const showLongPressHint = useCallback(() => {
    if (longPressHintShownRef.current) return;
    longPressHintShownRef.current = true;
    localStorage.setItem('longPressHintShown', 'true');

    setTimeout(() => {
      toast('Tip: Long-press text to fine-tune position', {
        duration: 4000,
        icon: '👆',
        id: 'long-press-hint'
      });
    }, 1500); // Delay slightly so it doesn't overlap with action toast
  }, []);

  const [imageDeck, setImageDeck] = useState([]);
  const [videoDeck, setVideoDeck] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isStickerExport, setIsStickerExport] = useState(false);

  // Cropper state
  const [isCropping, setIsCropping] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const [showSnippetModal, setShowSnippetModal] = useState(false);
  const [cropSelection, setCropSelection] = useState(null); // {startX, startY, endX, endY}
  const cropStartRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);


  const [memeSearchQuery, setMemeSearchQuery] = useState("");
  const [showMemeSuggestions, setShowMemeSuggestions] = useState(false);
  const [hoveredMeme, setHoveredMeme] = useState(null);
  const memeSearchRef = useRef(null);
  const [memeDropdownStyle, setMemeDropdownStyle] = useState({});

  // Calculate Image mode dropdown position based on input container
  useLayoutEffect(() => {
    if (showMemeSuggestions && memeSearchRef.current) {
      const rect = memeSearchRef.current.getBoundingClientRect();
      setMemeDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left + 12, // account for padding
        width: rect.width - 24, // account for padding on both sides
        zIndex: 9999
      });
    }
  }, [showMemeSuggestions]);

  // Update position on scroll/resize for Image mode dropdown
  useEffect(() => {
    if (!showMemeSuggestions) return;

    const updatePosition = () => {
      if (memeSearchRef.current) {
        const rect = memeSearchRef.current.getBoundingClientRect();
        setMemeDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left + 12,
          width: rect.width - 24,
          zIndex: 9999
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showMemeSuggestions]);

  // Filter the ~100 memes locally. Instant.
  const filteredMemes = useMemo(() => {
    if (!memeSearchQuery) return allMemes.slice(0, 100);
    const lower = memeSearchQuery.toLowerCase();
    return allMemes.filter((m) => m.name.toLowerCase().includes(lower));
  }, [allMemes, memeSearchQuery]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check for GIF search portal (rendered via createPortal to document.body)
      const gifPortalDropdown = document.querySelector('[data-gif-dropdown-portal]');
      // Only close GIF suggestions if click is outside BOTH the container AND the portal
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target) && (!gifPortalDropdown || !gifPortalDropdown.contains(e.target))) {
        setShowSuggestions(false);
      }
      // Logic for Imgflip search (need to also check if click was inside portal)
      const portalDropdown = document.querySelector('[data-meme-dropdown-portal]');
      if (memeSearchRef.current && !memeSearchRef.current.contains(e.target) && (!portalDropdown || !portalDropdown.contains(e.target))) {
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
            sourceBlob: null,
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



  const panelMap = useMemo(() => new Map((meme.panels || []).map(p => [p.id, p])), [meme.panels]);
  const textMap = useMemo(() => new Map((meme.texts || []).map(t => [t.id, t])), [meme.texts]);
  const stickerMap = useMemo(() => new Map((meme.stickers || []).map(s => [s.id, s])), [meme.stickers]);

  const activePanel = panelMap.get(meme.activePanelId) || (meme.panels && meme.panels[0]);
  const deferredDeepFry = useDeferredValue(activePanel?.filters?.deepFry);


  useEffect(() => {
    const level = parseInt(deferredDeepFry || 0, 10);
    const controller = new AbortController();
    const signal = controller.signal;

    if (!activePanel) return;

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

    if (activePanel.processedImage && activePanel.processedDeepFryLevel === level) {
      return;
    }

    // Track if this specific effect instance started processing
    let didStartProcessing = false;

    const processDeepFry = async () => {
      // Early exit if already aborted before we even start
      if (signal.aborted) return;

      try {
        didStartProcessing = true;
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

        // Call your service with a timeout wrapper
        const timeoutMs = 15000; // 15 second max for entire operation
        const fried = await Promise.race([
          deepFryImage(activePanel.url, level, signal),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Deep fry timeout')), timeoutMs)
          )
        ]);

        if (signal.aborted) {
          URL.revokeObjectURL(fried);
          return;
        }

        // Revoke previous URL to prevent memory leak
        if (lastFriedImageRef.current) URL.revokeObjectURL(lastFriedImageRef.current);
        lastFriedImageRef.current = fried;

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
        if (error.name === 'AbortError' || error.message === 'Aborted' || error.message?.includes('aborted')) {
          return;
        }

        console.error("Deep Fry Error:", error);

        // Show user-friendly error for timeout
        if (error.message === 'Deep fry timeout') {
          toast.error("Processing took too long - try a smaller image");
        } else {
          toast.error("Effect failed");
        }
      } finally {
        // CRITICAL FIX: Always reset isProcessing if this effect instance started it
        // This prevents the "stuck processing" bug when effects are aborted
        if (didStartProcessing) {
          setIsProcessing(false);
        }
      }
    };

    let taskAbortController;

    if ('scheduler' in window) {
      taskAbortController = new AbortController();
      window.scheduler.postTask(() => processDeepFry(), {
        delay: 400,
        priority: 'background',
        signal: taskAbortController.signal
      }).catch(err => {
        // Ignore abort errors
        if (err.name !== 'AbortError') console.error(err);
      });
    } else {
      // Fallback for older browsers
      const timerId = setTimeout(processDeepFry, 400);
      taskAbortController = { abort: () => clearTimeout(timerId) };
    }

    // Cleanup function
    return () => {
      if (taskAbortController) taskAbortController.abort();
      controller.abort();    // Cancel any running process
    };
  }, [deferredDeepFry, activePanel?.url, activePanel?.id]);

  // Handle visibility chance to clear stale blob URLs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When page becomes visible again, check if any processedImage URLs are stale
        // Blob URLs may become invalid if browser garbage collected them
        // We can't easily detect if a blob is valid, so we check if IT IS a blob URL
        updateTransient((prev) => {
          const hasStaleUrls = prev.panels.some(p =>
            p.processedImage && p.processedImage.startsWith('blob:')
          );

          if (!hasStaleUrls) return prev;

          // Clear all processedImage fields to force re-render with base URLs
          return {
            ...prev,
            panels: prev.panels.map(p => ({
              ...p,
              processedImage: null,
              processedDeepFryLevel: 0
            }))
          };
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [updateTransient]);



  // Handle auto-scroll when a text element is selected (fine-tuner opens)
  useEffect(() => {
    if (meme.selectedId && canvasContainerRef.current) {
      // Small delay to allow the layout to settle/render (selection modal opening)
      const timer = setTimeout(() => {
        if (canvasContainerRef.current) {
          const yCoord = canvasContainerRef.current.getBoundingClientRect().top + window.scrollY - 32;
          window.scroll({
            top: Math.max(0, yCoord),
            behavior: 'smooth'
          });
        }
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
    return 40;
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
          let x = ((e.clientX - rect.left) / rect.width) * 100 - dragOffsetRef.current.x;
          let y = ((e.clientY - rect.top) / rect.height) * 100 - dragOffsetRef.current.y;
          // Boundary clamping: creates invisible walls at edges
          // Horizontal bounds more aggressive (10-90%) since text extends wider
          // Vertical bounds adjust based on caption bars - allow text in caption areas
          const hasTopCaption = (meme.paddingTop || 0) > 0;
          const hasBottomCaption = (meme.paddingBottom || 0) > 0;

          // When caption bars exist, extend boundaries to allow text in caption areas
          // Default: 5-95%, With caption: 2-98% (allowing text to reach caption edges)
          const minY = hasTopCaption ? 2 : 5;
          const maxY = hasBottomCaption ? 98 : 95;

          x = Math.max(10, Math.min(90, x));
          y = Math.max(minY, Math.min(maxY, y));

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
    if (!isHydrated) return;
    saveState(memeHistory);
  }, [memeHistory, isHydrated]);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    // Cancel previous task (supports both AbortController and TimeoutID)
    if (searchTimeoutRef.current) {
      if (searchTimeoutRef.current.abort) searchTimeoutRef.current.abort();
      else clearTimeout(searchTimeoutRef.current);
    }

    if (val.length >= 2) {
      if ('scheduler' in window) {
        // Modern: Prioritized Task
        const controller = new AbortController();
        searchTimeoutRef.current = controller;

        window.scheduler.postTask(async () => {
          const autoResults = await getAutocomplete(val);
          startTransition(() => {
            setSuggestions(autoResults);
            setShowSuggestions(true);
          });
        }, {
          delay: 300,
          priority: 'user-visible',
          signal: controller.signal
        }).catch(() => { }); // Ignore aborts
      } else {
        // Fallback: Legacy Timeout
        searchTimeoutRef.current = setTimeout(async () => {
          const autoResults = await getAutocomplete(val);
          startTransition(() => {
            setSuggestions(autoResults);
            setShowSuggestions(true);
          });
        }, 300);
      }
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
    // FIX: Use searchGiphy instead of searchTenor
    const results = await searchGiphy(term);
    if (results.length > 0) {
      setAllGifs(results);
      setVideoDeck([]);
      const first = results[0];

      // FIX: Dynamically detect if it's a video or GIF
      const isVideo = first.url.match(/\.(mp4|webm|mov)$/i);

      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === prev.activePanelId
            ? {
                ...p,
                url: first.url,
                sourceUrl: first.shareUrl,
                isVideo: !!isVideo, // Set correct flag
                sourceBlob: null,
                objectFit: "cover",
                filters: { ...DEFAULT_FILTERS }
              }
            : p
        );
        return {
          ...prev,
          panels: newPanels,
          name: first.name.replace(/\s+/g, "-"),
          // Keep mode as video if it's a video, otherwise determine best mode or keep current?
          // Actually if it's a GIF, 'video' mode is usually fine as it implies "Time-based media"
          // But let's check if 'gif' mode exists.
          // Looking at defaultState, mode is "image".
          // If we load a GIF/Video, users usually expect "video" controls (timeline etc).
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
          const results = await searchGiphy("");
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

        // FIX: Detect video type dynamically
        const isVideo = !!newMeme.url.match(/\.(mp4|webm|mov)$/i);

        updateState((prev) => {
          const newPanels = prev.panels.map(p =>
            p.id === prev.activePanelId
              ? { ...p, url: newMeme.url, sourceUrl: newMeme.shareUrl, isVideo: isVideo, sourceBlob: null, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
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
                ? { ...p, url, isVideo: false, sourceBlob: null, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
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
    // --- SPAM PROTECTION: 800ms cooldown (Heavy operations) ---
    const now = Date.now();
    if (now - chaosThrottleRef.current < 800) {
      return;
    }
    chaosThrottleRef.current = now;

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
          "explosion", "fire", "based", "sus", "cursed", "skibidi"
        ];
        const keyword = chaosKeywords[Math.floor(Math.random() * chaosKeywords.length)];
        const results = await searchGiphy(keyword);

        if (results && results.length > 0) {
          const randomGif = results[Math.floor(Math.random() * results.length)];
          selectedMedia = randomGif.url;
          sourceUrl = randomGif.shareUrl;
          isVideo = !!selectedMedia.match(/\.(mp4|webm|mov)$/i);
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

      // 3. CHAOS EVENTS (Special wild combinations)
      // 20% chance of a named chaos event
      const eventRoll = Math.random();
      let chaosFilters = { ...DEFAULT_FILTERS };
      let eventName = null;

      if (eventRoll < 0.05) {
        // THE VOID
        eventName = "THE VOID";
        chaosFilters = { ...DEFAULT_FILTERS, invert: 100, grayscale: 100, contrast: 150, brightness: 80 };
      } else if (eventRoll < 0.10) {
        // RAINBOW SEIZURE
        eventName = "RAINBOW SEIZURE";
        chaosFilters = { ...DEFAULT_FILTERS, hueRotate: Math.floor(Math.random() * 360), saturate: 300, contrast: 120 };
      } else if (eventRoll < 0.15) {
        // DEEP FRYER EXPLODED
        eventName = "DEEP FRYER EXPLODED";
        chaosFilters = { ...DEFAULT_FILTERS, deepFry: 40, saturate: 200, contrast: 150, sepia: 50, hueRotate: -30 };
      } else if (eventRoll < 0.20) {
        // CURSED IMAGE
        eventName = "CURSED IMAGE";
        chaosFilters = { ...DEFAULT_FILTERS, blur: 2, contrast: 200, brightness: 90, hueRotate: 180, saturate: 50 };
      } else {
        // Standard Randomized Chaos
        chaosFilters = {
          ...DEFAULT_FILTERS,
          deepFry: Math.random() < 0.4 ? 5 + Math.floor(Math.random() * 20) : 0,
          hueRotate: Math.random() < 0.3 ? Math.floor(Math.random() * 360) : 0,
          brightness: Math.random() < 0.6 ? 80 + Math.floor(Math.random() * 60) : 100,
          contrast: Math.random() < 0.6 ? 80 + Math.floor(Math.random() * 80) : 100,
          saturate: Math.random() < 0.4 ? 50 + Math.floor(Math.random() * 200) : 100
        };
      }

      // 4. Update State
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

        // Random text with mixed fonts/styles (Chaos Text)
        const fonts = ["Impact", "Anton", "Archivo Black", "Bangers", "Comic Neue", "Creepster", "Oswald", "Permanent Marker", "Cinzel", "Bebas Neue", "Luckiest Guy", "Bungee", "Russo One", "Righteous", "Fredoka", "Press Start 2P", "Black Ops One"];
        const colors = ["#ffffff", "#ffff00", "#00ff00", "#ff00ff", "#00ffff", "#ff6600", "#ff0000", "#000000"];

        const newTexts = randomQuote.map((line, idx) => ({
          id: crypto.randomUUID(),
          content: line,
          x: 50 + (Math.random() * 10 - 5), // Slight jiggle
          y: idx === 0 ? 10 + (Math.random() * 10 - 5) : (idx === 1 ? 50 : 90 + (Math.random() * 10 - 5)),
          rotation: Math.floor(Math.random() * 20 - 10), // Random rotation -10 to 10
          animation: null,
        }));

        // Add empty text input
        newTexts.push({
          id: crypto.randomUUID(),
          content: "",
          x: 50,
          y: 50,
          rotation: 0,
          animation: null,
        });

        const chaosFontSize = 24 + Math.floor(Math.random() * 20);

        return {
          ...prev,
          panels: newPanels,
          mode: isVideo ? "video" : "image",
          texts: newTexts,
          fontSize: chaosFontSize,
          fontFamily: fonts[Math.floor(Math.random() * fonts.length)],
          textColor: colors[Math.floor(Math.random() * colors.length)],
          textShadow: "#000000" // Keep shadow consistent for readability
        };
      });

      remixClickCountRef.current.chaos++;
      const chaosIcon = (
        <picture>
          <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a3/512.webp" type="image/webp" />
          <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a3/512.gif" alt="💣" width="32" height="32" />
        </picture>
      );
      toast(eventName ? `${eventName} ACTIVATED!` : "CHAOS MODE ACTIVATED!", {
        icon: chaosIcon
      });
    } catch (e) {
      console.error("Chaos failed", e);
      toast.error("Chaos missed!");
    }
  }



  const allCaptions = useMemo(() => Object.values(MEME_QUOTES).flat(), []);
  const [captionDeck, setCaptionDeck] = useState([]);

  // Pre-generate all unique style combinations for the deck
  const allStyles = useMemo(() => {
    // Curated Chaos Palettes for better aesthetics
    const palettes = [
      { name: "Neon", colors: ["#00ff00", "#ff00ff", "#00ffff", "#ffff00"], shadows: ["#000000", "#ff00ff", "#0000ff"] },
      { name: "Goth", colors: ["#ffffff", "#ff0000", "#a0a0a0", "#800080"], shadows: ["#000000", "#300000"] },
      { name: "Pastel", colors: ["#ffb3ba", "#baffc9", "#bae1ff", "#ffffba"], shadows: ["#666666", "#000000"] },
      { name: "Classic", colors: ["#ffffff"], shadows: ["#000000"] },
      { name: "Warning", colors: ["#ffff00", "#ff6600", "#000000"], shadows: ["#000000", "#ffff00"] }
    ];

    const fonts = ["Impact", "Anton", "Archivo Black", "Bangers", "Comic Neue", "Creepster", "Oswald", "Pacifico", "Permanent Marker", "Cinzel", "Montserrat", "Roboto", "Bebas Neue", "Luckiest Guy", "Bungee", "Lato", "Russo One", "Righteous", "Fredoka", "Rubik Mono One", "Press Start 2P", "Special Elite", "Black Ops One", "Carter One"];

    const styles = [];
    for (const font of fonts) {
      for (const palette of palettes) {
        const color = palette.colors[Math.floor(Math.random() * palette.colors.length)];
        const shadow = palette.shadows[Math.floor(Math.random() * palette.shadows.length)];

        // Fix visibility
        if (color === shadow) continue;

        styles.push({ fontFamily: font, textColor: color, textShadow: shadow, paletteName: palette.name });
      }
    }
    // Shuffle logic below will mix them up
    return styles;
  }, []);
  const [styleDeck, setStyleDeck] = useState([]);


  function handleCaptionRemix() {
    // Generate new captions, preserve current media AND animations
    if (allCaptions.length === 0) return;

    // Use deck system to ensure no repeats until all are shown
    const randomQuote = getNextItem(allCaptions, captionDeck, setCaptionDeck);

    updateState((prev) => {
      // Preserve existing animation from texts that have one
      const existingAnimations = prev.texts
        .filter(t => t.animation)
        .map(t => t.animation);
      const currentAnimation = existingAnimations[0] || null;

      const newTexts = randomQuote.map((line, idx) => ({
        id: crypto.randomUUID(),
        content: line,
        x: 50,
        y: idx === 0 ? 10 : (idx === 1 ? 50 : 90),
        rotation: 0,
        animation: currentAnimation, // Preserve animation!
      }));
      newTexts.push({ id: crypto.randomUUID(), content: "", x: 50, y: 90, rotation: 0, animation: currentAnimation });
      return { ...prev, texts: newTexts };
    });
    remixClickCountRef.current.caption++;
    toast("Caption remixed!", {
      icon: (
        <ToastIcon src="/animations/speech-bubble.json" />
      )
    });

    showLongPressHint();
  }

  function handleStyleShuffle() {
    // Get unique style combo from deck
    const nextStyle = getNextItem(allStyles, styleDeck, setStyleDeck);

    if (!nextStyle) {
      console.error("Shuffle Error: No style returned from getNextItem");
      return;
    }

    // Calculate safe font size based on text length
    const maxTextLength = Math.max(...meme.texts.map(t => (t.content || "").length), 0);
    let maxSafeSize = 60;
    if (maxTextLength > 100) maxSafeSize = 25;
    else if (maxTextLength > 50) maxSafeSize = 35;
    else if (maxTextLength > 20) maxSafeSize = 50;

    const minSafeSize = Math.max(20, maxSafeSize - 15);

    const maxSpacing = maxTextLength > 30 ? 2 : 10;
    const randomSpacing = Math.floor(Math.random() * maxSpacing);
    const randomSize = minSafeSize + Math.floor(Math.random() * (maxSafeSize - minSafeSize));

    updateState((prev) => ({
      ...prev,
      fontFamily: nextStyle.fontFamily,
      textColor: nextStyle.textColor,
      textShadow: nextStyle.textShadow,
      letterSpacing: randomSpacing,
      fontSize: randomSize,
    }));
    remixClickCountRef.current.style++;
    toast(`Style: ${nextStyle.paletteName} ${nextStyle.fontFamily}`, {
      icon: (
        <ToastIcon src="/animations/performing-arts.json" />
      )
    });
  }

  function handleFilterFrenzy() {
    // --- SPAM PROTECTION: 500ms cooldown ---
    const now = Date.now();
    if (now - filterThrottleRef.current < 500) {
      return;
    }
    filterThrottleRef.current = now;

    // Chaos Archetypes: Distinct strategies for "Frenzy"
    const strategies = [
      // 1. The "Nuked" (High Saturation, High Contrast, Deep Fry)
      () => ({
        name: "Nuked",
        contrast: 150 + Math.floor(Math.random() * 50),
        saturate: 200 + Math.floor(Math.random() * 100),
        brightness: 100 + Math.floor(Math.random() * 50),
        hueRotate: Math.floor(Math.random() * 360),
        deepFry: 20 + Math.floor(Math.random() * 30),
        blur: 0
      }),
      // 2. The "Cursed" (Inverted, Weird Hue)
      () => ({
        name: "Cursed",
        invert: 100,
        hueRotate: Math.floor(Math.random() * 360),
        contrast: 120,
        brightness: 110,
        saturate: 100,
        grayscale: 0,
        deepFry: 0
      }),
      // 3. The "Ghost" (High Brightness, Blur, Low Saturation)
      () => ({
        name: "Ghost",
        brightness: 140 + Math.floor(Math.random() * 40),
        blur: 1 + Math.random() * 2,
        saturate: Math.floor(Math.random() * 50),
        contrast: 80,
        deepFry: 0
      }),
      // 4. The "Crunchy" (High Contrast, Sharpen via artifacts)
      () => ({
        name: "Crunchy",
        contrast: 200,
        brightness: 100,
        grayscale: 100,
        deepFry: 50,
        saturate: 0
      }),
      // 5. "Thermal Vision" (Invert + Hue Shift + High Contrast)
      () => ({
        name: "Thermal",
        invert: 100,
        hueRotate: 180,
        contrast: 150,
        saturate: 200,
        brightness: 100,
        deepFry: 0
      }),
      // 6. "Night Vision" (Green Tint + Grain vibe)
      () => ({
        name: "Night Vision",
        sepia: 100,
        hueRotate: 90, // Greenish
        contrast: 120,
        brightness: 110,
        saturate: 150,
        deepFry: 5 // Add slight grain
      }),
      // 7. "Bad Photocopy" (High Contrast B&W)
      () => ({
        name: "Photocopy",
        grayscale: 100,
        contrast: 300,
        brightness: 120,
        deepFry: 10, // Artifacts
        saturate: 0
      }),
      // 8. "Alien Invasion" (Green tint, high contrast)
      () => ({
        name: "Alien Invasion",
        sepia: 0,
        hueRotate: 90,
        contrast: 150,
        brightness: 110,
        saturate: 200,
        invert: 0,
        deepFry: 5
      }),
      // 9. "Radioactive Melt" (Neon colors, high contrast)
      () => ({
        name: "Radioactive Melt",
        hueRotate: 180,
        contrast: 180,
        saturate: 300,
        brightness: 120,
        blur: 1,
        deepFry: 20
      }),
      // 10. "Solar Flare" (Extreme brightness, yellow tint)
      () => ({
        name: "Solar Flare",
        brightness: 200,
        contrast: 150,
        sepia: 100,
        saturate: 200,
        hueRotate: -30,
        blur: 2
      }),
      // 11. "Neon Demon" (Blue/Pink shift, dark)
      () => ({
        name: "Neon Demon",
        brightness: 80,
        contrast: 150,
        hueRotate: 240,
        saturate: 250,
        invert: 0
      }),
      // 12. "Matrix" (Green code rain feel)
      () => ({
        name: "Matrix",
        grayscale: 100,
        contrast: 200,
        brightness: 80,
        // Hack: emulate with sepia + hue rotate
        sepia: 100,
        hueRotate: 90, // green
        saturate: 500
      }),
      // 13. "Acid Trip" (Wild hue rotation)
      () => ({
        name: "Acid Trip",
        hueRotate: Math.floor(Math.random() * 360),
        saturate: 400,
        contrast: 150,
        brightness: 120,
        invert: 100
      }),
      // 14. "Rusty" (Sepia, high contrast, texturized)
      () => ({
        name: "Rusty",
        sepia: 100,
        saturate: 200,
        contrast: 150,
        hueRotate: -10,
        deepFry: 30
      }),
      // 15. "Frozen" (Blue tint, high brightness)
      () => ({
        name: "Frozen",
        sepia: 0,
        hueRotate: 180,
        contrast: 120,
        brightness: 130,
        saturate: 150,
        blur: 1
      }),
      // 16. "Lava Lamp" (Red/Orange, glossy)
      () => ({
        name: "Lava Lamp",
        hueRotate: -20,
        saturate: 300,
        contrast: 140,
        brightness: 110,
        blur: 2,
        invert: 0
      }),
      // 17. "X-Ray" (Inverted grayscale)
      () => ({
        name: "X-Ray",
        grayscale: 100,
        invert: 100,
        contrast: 150,
        brightness: 100
      }),
      // 18. "TV Static" (Noise, desaturated)
      () => ({
        name: "TV Static",
        grayscale: 100,
        contrast: 200,
        brightness: 150,
        deepFry: 60,
        blur: 0
      }),
      // 19. "Underwater" (Teal shift, blurry)
      () => ({
        name: "Underwater",
        hueRotate: 180,
        sepia: 50,
        saturate: 150,
        brightness: 90,
        blur: 3,
        contrast: 80
      }),
      // 20. "Demon Mode" (Red shift, dark, high contrast)
      () => ({
        name: "Demon Mode",
        grayscale: 100,
        sepia: 100,
        hueRotate: -50, // Red
        saturate: 500,
        contrast: 200,
        brightness: 70
      }),
      // 21. "Holy Light" (Extreme bloom effect)
      () => ({
        name: "Holy Light",
        brightness: 180,
        contrast: 80,
        blur: 5,
        saturate: 50
      }),
      // 22. "Void Stare" (Inverted, high contrast B&W)
      () => ({
        name: "Void Stare",
        grayscale: 100,
        invert: 100,
        contrast: 300,
        brightness: 80
      }),
      // 25. "Moldy" (Green/Yellow tint, grainy)
      () => ({
        name: "Moldy",
        sepia: 50,
        hueRotate: 60,
        saturate: 100,
        contrast: 120,
        deepFry: 25,
        brightness: 90
      })
    ];

    // Cycle strictly through the list.
    const currentIndex = filterFrenzyIndexRef.current % strategies.length;
    const strategy = strategies[currentIndex]();
    filterFrenzyIndexRef.current += 1; // Increment for next click

    const { name, ...filters } = strategy;
    const chaoticFilters = { ...DEFAULT_FILTERS, ...filters };

    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        panels: prev.panels.map(p =>
          p.id === prev.activePanelId
            ? { ...p, filters: chaoticFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });
    remixClickCountRef.current.filter++;
    toast(`${name} Mode applied!`, {
      icon: (
        <ToastIcon src="/animations/filter-frenzy.json" />
      )
    });
  }

  function handleVibeCheck() {
    // --- SPAM PROTECTION: 500ms cooldown ---
    const now = Date.now();
    if (now - vibeThrottleRef.current < 500) {
      return;
    }
    vibeThrottleRef.current = now;

    // Researched aesthetic recipes (CSS Filters)
    const vibes = {
      // Classics
      vintage: { sepia: 80, saturate: 120, contrast: 110, brightness: 90, blur: 0, grayscale: 0, invert: 0, deepFry: 0, hueRotate: 0 },
      cyberpunk: { contrast: 150, saturate: 180, hueRotate: 280, brightness: 120, blur: 0, grayscale: 0, invert: 0, deepFry: 0, sepia: 0 },
      noir: { grayscale: 100, contrast: 180, brightness: 70, blur: 0, sepia: 0, invert: 0, deepFry: 0, hueRotate: 0, saturate: 100 },
      dreamy: { blur: 1.5, brightness: 130, saturate: 80, contrast: 90, grayscale: 0, invert: 0, deepFry: 0, hueRotate: 0, sepia: 0 },
      vaporwave: { hueRotate: 200, saturate: 150, contrast: 120, brightness: 110, blur: 0, grayscale: 0, invert: 0, deepFry: 0, sepia: 0 },

      // Instagram-ish Classics
      clarendon: { contrast: 120, saturate: 125, brightness: 110, sepia: 15, hueRotate: 0, blur: 0, grayscale: 0, invert: 0, deepFry: 0 },
      gingham: { sepia: 20, contrast: 90, brightness: 110, hueRotate: -10, saturate: 100, blur: 0, grayscale: 0, invert: 0, deepFry: 0 },
      lofi: { contrast: 150, saturate: 110, brightness: 90, sepia: 0, hueRotate: 0, blur: 0, grayscale: 0, invert: 0, deepFry: 0 },

      // 2025 Mobile Trends
      y2k: { brightness: 120, contrast: 110, saturate: 130, hueRotate: -20, blur: 0.5, sepia: 20, grayscale: 0, invert: 0, deepFry: 0 }, // Pinkish gloss
      vhs: { sepia: 50, saturate: 250, contrast: 120, brightness: 90, blur: 0.5, hueRotate: -30, grayscale: 0, invert: 0, deepFry: 5 }, // Grainy warm
      goldenHour: { sepia: 40, saturate: 160, brightness: 110, contrast: 110, hueRotate: -10, blur: 0, grayscale: 0, invert: 0, deepFry: 0 },
      radioactive: { hueRotate: 90, saturate: 200, contrast: 150, brightness: 100, sepia: 0, blur: 0, grayscale: 0, invert: 0, deepFry: 0 },
      goth: { saturate: 0, contrast: 150, brightness: 80, hueRotate: 270, sepia: 0, blur: 0, grayscale: 80, invert: 0, deepFry: 0 }, // Purple tint dark
      deepFriedLite: { deepFry: 15, saturate: 200, contrast: 150, brightness: 100, sepia: 0, blur: 0, grayscale: 0, invert: 0, hueRotate: 0 },

      // New 2026 Authentic/Aesthetic Filters
      filmStock: { contrast: 110, saturate: 110, brightness: 100, sepia: 10, blur: 0.2, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 },
      cleanGirl: { contrast: 105, saturate: 100, brightness: 115, sepia: 0, blur: 0, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 },
      cottagecore: { sepia: 30, saturate: 120, brightness: 105, contrast: 90, hueRotate: -10, blur: 0.5, grayscale: 0, invert: 0, deepFry: 0 },
      darkAcademia: { contrast: 130, saturate: 80, brightness: 90, sepia: 20, blur: 0, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 },
      goldenAge: { sepia: 50, saturate: 140, brightness: 110, contrast: 100, hueRotate: 0, blur: 0.5, grayscale: 0, invert: 0, deepFry: 0 },
      polaroid: { contrast: 120, saturate: 120, brightness: 110, sepia: 15, blur: 0.5, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 },
      fade: { contrast: 80, saturate: 90, brightness: 110, sepia: 10, blur: 0, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 },
      cinematic: { contrast: 140, saturate: 130, brightness: 100, sepia: 0, blur: 0, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 },
      disposable: { contrast: 130, saturate: 140, brightness: 110, sepia: 20, blur: 1, hueRotate: 10, grayscale: 0, invert: 0, deepFry: 5 },
      matte: { contrast: 90, saturate: 100, brightness: 120, sepia: 0, blur: 0, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 },
      vivid: { contrast: 150, saturate: 200, brightness: 110, sepia: 0, blur: 0, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 },
      bwMoody: { grayscale: 100, contrast: 150, brightness: 90, sepia: 0, blur: 0, hueRotate: 0, saturate: 0, invert: 0, deepFry: 0 },
      bwSoft: { grayscale: 100, contrast: 90, brightness: 110, sepia: 10, blur: 0.5, hueRotate: 0, saturate: 0, invert: 0, deepFry: 0 },
      sepiaSoft: { sepia: 60, contrast: 100, brightness: 110, saturate: 100, blur: 0, hueRotate: 0, grayscale: 0, invert: 0, deepFry: 0 },
      blueHour: { hueRotate: 200, saturate: 120, contrast: 110, brightness: 100, sepia: 0, blur: 0, grayscale: 0, invert: 0, deepFry: 0 },
      roseGold: { sepia: 30, saturate: 130, hueRotate: -20, contrast: 110, brightness: 115, blur: 0, grayscale: 0, invert: 0, deepFry: 0 },
      mint: { hueRotate: 90, saturate: 110, contrast: 100, brightness: 110, sepia: 0, blur: 0, grayscale: 0, invert: 0, deepFry: 0 },
      peachy: { sepia: 40, saturate: 150, hueRotate: -30, contrast: 110, brightness: 110, blur: 0, grayscale: 0, invert: 0, deepFry: 0 },
      driftwood: { sepia: 20, saturate: 60, contrast: 100, brightness: 110, grayscale: 0, invert: 0, deepFry: 0, hueRotate: 0 }
    };


    const vibeNames = Object.keys(vibes);

    // Cycle strictly through the list.
    const currentIndex = vibeIndexRef.current % vibeNames.length;
    const currentVibe = vibeNames[currentIndex];
    vibeIndexRef.current += 1; // Increment for next click

    const filters = { ...DEFAULT_FILTERS, ...vibes[currentVibe] };

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

    // Nice formatted name
    const formatName = currentVibe.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    toast(`${formatName} vibe applied!`, {
      icon: (
        <ToastIcon src="/animations/vibe-check-toast.json" />
      )
    });
  }

  function handleExtremeDeepFry() {
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
      toast("Extreme Deep Fry applied!", {
        icon: (
          <picture>
            <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp" type="image/webp" />
            <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif" alt="🔥" width="32" height="32" />
          </picture>
        )
      });
    } else {
      toast("Deep Fry removed", {
        icon: (
          <ToastIcon src="/animations/broom.json" />
        )
      });
    }
  }

  // ========== NEW REMIX HANDLERS ==========

  async function handleStickerfy() {
    try {
      // Pick a random keyword to ensure variety
      const randomKeyword = STICKER_KEYWORDS[Math.floor(Math.random() * STICKER_KEYWORDS.length)];

      // Fetch 3-5 random stickers from Giphy based on the keyword
      let stickers = await searchGiphy(randomKeyword, 'sticker');

      // Fallback to trending if no results found for the keyword
      if (!stickers || stickers.length === 0) {
        console.warn(`No stickers found for "${randomKeyword}", falling back to trending`);
        stickers = await searchGiphy('', 'sticker');
      }

      if (!stickers || stickers.length === 0) {
        toast("No stickers available", {
          icon: <ToastIcon src="/animations/filter-frenzy.json" />
        });
        return;
      }

      // Shuffle the results to avoid always picking the top 5
      const shuffled = stickers.sort(() => 0.5 - Math.random());

      const count = 3 + Math.floor(Math.random() * 3); // 3-5 stickers
      const selected = shuffled.slice(0, count);

      // Create all new stickers at once with random properties
      const newStickers = selected.map((sticker) => ({
        id: crypto.randomUUID(),
        url: sticker.url, // The actual GIF URL
        type: 'giphy',
        x: 20 + Math.random() * 60, // 20-80%
        y: 20 + Math.random() * 60,
        scale: 0.3 + Math.random() * 0.5, // 30-80% size
        rotation: -15 + Math.random() * 30, // -15 to +15 degrees
        isAnimated: true,
        animation: null
      }));

      // Add all stickers in one state update
      updateState((prev) => ({
        ...prev,
        stickers: [...prev.stickers, ...newStickers]
      }));

      toast(`Stickerfy: ${randomKeyword}!`, {
        icon: <ToastIcon src="/animations/filter-frenzy.json" />
      });
    } catch (error) {
      console.error("Stickerfy error:", error);
      toast("Failed to load stickers", {
        icon: <ToastIcon src="/animations/filter-frenzy.json" />
      });
    }
  }

  function handleNuked() {
    const nukedFilters = {
      ...DEFAULT_FILTERS,
      deepFry: 75, // Beyond normal max
      saturate: 400,
      contrast: 250,
      brightness: 130,
      blur: 2
    };

    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        panels: prev.panels.map(p =>
          p.id === prev.activePanelId
            ? { ...p, filters: nukedFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });

    remixClickCountRef.current.nuked = (remixClickCountRef.current.nuked || 0) + 1;
    toast("Nuked applied", {
      icon: <ToastIcon src="/animations/filter-frenzy.json" />
    });
  }

  function handleGlitch() {
    // Curated glitch presets - cycles through distinct digital corruption effects
    const glitchPresets = [
      // 1. Cyberpunk Red/Cyan shift
      { name: "RGB Split", hueRotate: 180, saturate: 200, contrast: 140, brightness: 110, invert: 0, sepia: 0, grayscale: 0 },
      // 2. Corrupt Data - harsh magenta
      { name: "Data Corrupt", hueRotate: 300, saturate: 250, contrast: 160, brightness: 95, invert: 0, sepia: 0, grayscale: 0 },
      // 3. VHS Tracking Error - cyan/green tint
      { name: "VHS Error", hueRotate: 120, saturate: 180, contrast: 120, brightness: 105, invert: 0, sepia: 20, grayscale: 0 },
      // 4. Digital Noise - high contrast with slight color shift
      { name: "Digital Noise", hueRotate: 45, saturate: 220, contrast: 180, brightness: 100, invert: 0, sepia: 0, grayscale: 0 },
      // 5. Broken Signal - inverted neon
      { name: "Broken Signal", hueRotate: 240, saturate: 300, contrast: 150, brightness: 120, invert: 100, sepia: 0, grayscale: 0 },
      // 6. Retro CRT - warm distortion
      { name: "CRT Burn", hueRotate: -30, saturate: 160, contrast: 130, brightness: 115, invert: 0, sepia: 30, grayscale: 0 }
    ];

    const currentIndex = (remixClickCountRef.current.glitch || 0) % glitchPresets.length;
    const preset = glitchPresets[currentIndex];

    const glitchFilters = {
      ...DEFAULT_FILTERS,
      ...preset,
      blur: 0,
      deepFry: 0
    };

    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        // Offset text positions slightly for glitch effect
        texts: prev.texts.map(t => ({
          ...t,
          x: t.x + (Math.random() - 0.5) * 6,
          y: t.y + (Math.random() - 0.5) * 6
        })),
        panels: prev.panels.map(p =>
          p.id === prev.activePanelId
            ? { ...p, filters: glitchFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });

    remixClickCountRef.current.glitch = (remixClickCountRef.current.glitch || 0) + 1;
    toast(`${preset.name} glitch applied`, {
      icon: <ToastIcon src="/animations/filter-frenzy.json" />
    });
  }

  function handleCursed() {
    const cursedFilters = {
      ...DEFAULT_FILTERS,
      invert: 100,
      grayscale: 100,
      contrast: 300,
      brightness: 80
    };

    // Scatter texts to random positions
    const positions = [
      { x: 10, y: 10 }, { x: 90, y: 10 },
      { x: 10, y: 90 }, { x: 90, y: 90 },
      { x: 50, y: 10 }, { x: 50, y: 90 }
    ];

    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        texts: prev.texts.map((t, i) => ({
          ...t,
          ...(positions[i % positions.length] || { x: 50, y: 50 })
        })),
        panels: prev.panels.map(p =>
          p.id === prev.activePanelId
            ? { ...p, filters: cursedFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });

    remixClickCountRef.current.cursed = (remixClickCountRef.current.cursed || 0) + 1;
    toast("Cursed applied", {
      icon: <ToastIcon src="/animations/filter-frenzy.json" />
    });
  }

  function handleConfettiBlast() {
    // Trigger visual confetti celebration effect immediately
    triggerConfettiBurst();

    // Add 10-15 confetti-specific emoji particles with animations
    const confettiEmojis = ['🎉', '🎊'];
    const confettiAnimations = ['bounce', 'float', 'spin', 'pulse', 'tada', 'wobble', 'heartbeat', 'jelly'];
    const count = 10 + Math.floor(Math.random() * 6); // 10-15 emojis

    // Create explosion pattern from center with more varied positions
    const newStickers = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.5 - 0.25); // Add some randomness to angle
      const distance = 15 + Math.random() * 30; // 15-45% from center for better spread
      const x = 50 + Math.cos(angle) * distance;
      const y = 50 + Math.sin(angle) * distance;
      const randomEmoji = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
      const randomScale = 0.25 + Math.random() * 0.5; // 25-75% size
      const randomRotation = Math.random() * 360;
      const randomAnimation = confettiAnimations[Math.floor(Math.random() * confettiAnimations.length)];

      newStickers.push({
        id: crypto.randomUUID(),
        url: randomEmoji,
        type: 'emoji',
        x: Math.max(5, Math.min(95, x)), // Clamp to keep within canvas
        y: Math.max(5, Math.min(95, y)),
        scale: randomScale,
        rotation: randomRotation,
        isAnimated: true,
        animation: randomAnimation
      });
    }

    // Add all confetti in one state update
    updateState(prev => ({
      ...prev,
      stickers: [...prev.stickers, ...newStickers]
    }));

    remixClickCountRef.current.confetti = (remixClickCountRef.current.confetti || 0) + 1;
    toast("Confetti Blast! 🎉", {
      icon: <ToastIcon src="/animations/confetti.json" />
    });
  }

  function handleTimeWarp() {
    // Curated time warp presets - cycles through temporal/dreamy effects
    const timePresets = [
      // 1. Motion Blur - fast movement feel
      { name: "Motion Blur", blur: 3, brightness: 110, contrast: 90, saturate: 120, hueRotate: 0, sepia: 0, grayscale: 0, invert: 0 },
      // 2. Slow Motion - dreamy soft focus
      { name: "Slow Motion", blur: 2, brightness: 120, contrast: 85, saturate: 90, hueRotate: 0, sepia: 15, grayscale: 0, invert: 0 },
      // 3. Flashback - warm sepia memory
      { name: "Flashback", blur: 1.5, brightness: 115, contrast: 95, saturate: 80, hueRotate: -10, sepia: 50, grayscale: 0, invert: 0 },
      // 4. Fast Forward - high exposure speed
      { name: "Fast Forward", blur: 4, brightness: 140, contrast: 110, saturate: 70, hueRotate: 0, sepia: 0, grayscale: 0, invert: 0 },
      // 5. Rewind - cool desaturated
      { name: "Rewind", blur: 2.5, brightness: 100, contrast: 80, saturate: 60, hueRotate: 180, sepia: 0, grayscale: 30, invert: 0 },
      // 6. Frozen Moment - ethereal glow
      { name: "Frozen Moment", blur: 5, brightness: 130, contrast: 70, saturate: 110, hueRotate: 0, sepia: 10, grayscale: 0, invert: 0 }
    ];

    const currentIndex = (remixClickCountRef.current.timewarp || 0) % timePresets.length;
    const preset = timePresets[currentIndex];

    const warpFilters = {
      ...DEFAULT_FILTERS,
      ...preset,
      deepFry: 0
    };

    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        panels: prev.panels.map(p =>
          p.id === prev.activePanelId
            ? { ...p, filters: warpFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });

    remixClickCountRef.current.timewarp = (remixClickCountRef.current.timewarp || 0) + 1;
    toast(`${preset.name} applied`, {
      icon: <ToastIcon src="/animations/filter-frenzy.json" />
    });
  }

  // Calculate current deep fry level for the active panel to pass down
  const currentDeepFryLevel = (meme.panels || []).find(p => p.id === meme.activePanelId)?.filters?.deepFry || 0;

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
      let newTexts = prev.texts.map((t) => (t.id === id ? { ...t, content: value } : t));

      // Find the last filled index after this change
      let lastFilledIndex = -1;
      for (let i = newTexts.length - 1; i >= 0; i--) {
        if ((newTexts[i].content || "").trim().length > 0) {
          lastFilledIndex = i;
          break;
        }
      }

      // Calculate how many inputs should be visible (matches MemeInputs logic)
      const visibleCount = Math.max(lastFilledIndex + 2, 2);

      // If we need more inputs than exist, add new empty text items
      while (newTexts.length < visibleCount) {
        const newY = 50; // Default to center
        newTexts = [...newTexts, {
          id: crypto.randomUUID(),
          content: "",
          x: 50,
          y: newY,
          rotation: 0,
          scale: 1,
          animation: null
        }];
      }

      return {
        ...prev,
        texts: newTexts,
      };
    });

    // Show hint when user types their first text
    if (value.length > 0) {
      showLongPressHint();
    }
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
    toast("Filters reset", {
      icon: (
        <ToastIcon src="/animations/performing-arts.json" />
      )
    });
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

  // Crop handlers
  function handleStartCrop() {
    if (!memeRef.current) {
      toast.error("Canvas not ready");
      return;
    }

    setIsCropping(true);
    toast("Draw a selection on the canvas", {
      icon: "✂️",
      duration: 3000,
      id: "crop-start"
    });
  }

  async function handleCropComplete(cropBounds) {
    if (!memeRef.current || !cropBounds) {
      setIsCropping(false);
      return;
    }

    try {
      setIsProcessing(true);
      const { x, y, width, height } = cropBounds;

      // Get the canvas container dimensions for scaling
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (!containerRect) {
        throw new Error("Container not found");
      }

      // First, export the full meme using the existing reliable method
      const fullBlob = await exportImageAsPng(meme, meme.texts, meme.stickers);

      // Load the full image
      const fullImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(fullBlob);
      });

      // Calculate the scale factor between display size and export size
      const scaleX = fullImage.width / containerRect.width;
      const scaleY = fullImage.height / containerRect.height;

      // Create a canvas for the cropped region
      const cropCanvas = document.createElement("canvas");
      const cropWidth = Math.round(width * scaleX);
      const cropHeight = Math.round(height * scaleY);
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;

      const ctx = cropCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw the cropped portion
      ctx.drawImage(
        fullImage,
        Math.round(x * scaleX), // source x
        Math.round(y * scaleY), // source y
        cropWidth, // source width
        cropHeight, // source height
        0, 0, // dest x, y
        cropWidth, // dest width
        cropHeight // dest height
      );

      // Convert to data URL
      const dataUrl = cropCanvas.toDataURL("image/png");

      // Cleanup
      URL.revokeObjectURL(fullImage.src);

      setCroppedImageUrl(dataUrl);
      setShowSnippetModal(true);
      setIsCropping(false);
      setIsProcessing(false);
    } catch (err) {
      console.error("Crop error:", err);
      toast.error("Crop failed - try again");
      setIsCropping(false);
      setIsProcessing(false);
    }
  }

  function handleCropExport() {
    if (!croppedImageUrl) return;

    // Convert data URL to blob and download
    fetch(croppedImageUrl)
      .then(res => res.blob())
      .then(blob => {
        const filename = `${meme.name || "meme"}-snippet-${Date.now()}.png`;
        triggerDownload(blob, filename);
        toast.success("Snippet exported!", { icon: "✂️" });
        setCroppedImageUrl(null);
      })
      .catch(() => {
        toast.error("Export failed");
      });
  }

  function handleCropRetry() {
    setCroppedImageUrl(null);
    setIsCropping(true);
    toast("Draw a new selection", { icon: "✂️", duration: 2000 });
  }

  function handleCropCancel() {
    setIsCropping(false);
    setCroppedImageUrl(null);
    setShowSnippetModal(false);
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      // Instant Render with ObjectURL
      // No Worker needed for display. We just pass the File (Blob) to storage later.
      const isGif = file.type === "image/gif";
      const isVideo = file.type.startsWith("video/");
      const objectUrl = URL.createObjectURL(file);

      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === prev.activePanelId
            ? {
                ...p,
                url: objectUrl,
                // CRITICAL: Attach raw Blob for efficient storage
                sourceBlob: file,
                isVideo: isVideo || isGif,
                isGif: isGif, // Track GIF separately for proper rendering
                objectFit: "cover",
                filters: { ...DEFAULT_FILTERS },
                processedImage: null,
                processedDeepFryLevel: 0
              }
            : p
        );
        return {
          ...prev,
          panels: newPanels,
          name: file.name.split(".")[0],
          mode: isGif || isVideo ? "video" : "image",
        };
      });
    }
  }

  const handleCanvasDrop = useCallback(async (file, panelId) => {
    // OPTIMIZATION: Instant Drop
    const isGif = file.type === "image/gif";
    const isVideo = file.type.startsWith("video/");
    const objectUrl = URL.createObjectURL(file);

    startTransition(() => {
      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === panelId
            ? {
                ...p,
                url: objectUrl,
                // CRITICAL: Attach raw Blob for efficient storage
                sourceBlob: file,
                isVideo: isVideo || isGif,
                isGif: isGif, // Track GIF separately for proper rendering
                objectFit: "cover",
                filters: { ...DEFAULT_FILTERS },
                processedImage: null,
                processedDeepFryLevel: 0
              }
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
  }, [updateState]);

  const handleClearPanel = useCallback((panelId) => {
    startTransition(() => {
      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === panelId
            ? { ...p, url: null, sourceUrl: null, isVideo: false, isGif: false, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
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
      // Scroll to the top of the entire editor area when toolbar expands
      const yCoord = canvasContainerRef.current.getBoundingClientRect().top + window.scrollY - 32;
      window.scroll({
        top: Math.max(0, yCoord),
        behavior: 'smooth'
      });
    }
  }, []);

  // Auto-scroll to fine tuner when element is selected
  useEffect(() => {
    if (meme.selectedId) {
      // Small delay to ensure the FineTune component has mounted and layout is updated
      const timer = setTimeout(() => {
        if (fineTuneRef.current) {
          fineTuneRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [meme.selectedId]);

  function handleReset() {
    triggerFlash("red");
    setActiveTool("move");
    setEditingId(null);
    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        selectedId: null, // Clear fine-tuner state
        texts: [
          { id: "top", content: "", x: 50, y: 5, rotation: 0, animation: null },
          { id: "bottom", content: "", x: 50, y: 95, rotation: 0, animation: null },
        ],
        stickers: [],
        drawings: [],
        fontSize: 40,
        fontFamily: "Impact",
        paddingTop: 0,
        paddingBottom: 0,
        paddingTopColor: "#ffffff",
        paddingBottomColor: "#ffffff",
        drawColor: "#ff0000",
        drawWidth: 5,
        textColor: "#ffffff",
        textBgColor: "transparent",
        textShadow: "#000000",
        letterSpacing: 0,
        maxWidth: 100,
        stickerSize: 100,
        panels: prev.panels.map(p => ({ ...p, filters: { ...DEFAULT_FILTERS } }))
      }));
    });
  }

  // Remove Effects: Clears filters/deep fry and animations, but preserves text content and stickers
  function handleRemoveEffects() {
    triggerFlash("teal");
    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        // Clear text animations but preserve content and positions
        texts: prev.texts.map(t => ({ ...t, animation: null })),
        // Clear sticker animations but keep stickers in place
        stickers: prev.stickers.map(s => ({ ...s, animation: 'none' })),
        // Reset all panel filters (including deep fry)
        panels: prev.panels.map(p => ({
          ...p,
          filters: { ...DEFAULT_FILTERS },
          processedImage: null,
          processedDeepFryLevel: 0
        }))
      }));
    });
    toast.success("Effects cleared!");
  }

  function addTextAtPosition(x, y) {
    const newTextId = crypto.randomUUID();
    updateState((prev) => ({
      ...prev,
      texts: [...prev.texts, { id: newTextId, content: "", x, y, rotation: 0, scale: 1, animation: null }],
      selectedId: null, // Don't select - we're in editing mode
    }));

    // Set editing mode for the new text (shows blinking cursor, no marching ants)
    setEditingId(newTextId);

    // Focus the newly created text input after React re-renders (no scrolling)
    setTimeout(() => {
      const inputElement = document.getElementById(`canvas-input-${newTextId}`);
      if (inputElement) {
        inputElement.focus({ preventScroll: true });
      }
    }, 100);

    toast("Type your meme text below!", {
      icon: (
        <ToastIcon src="/animations/filter-frenzy.json" />
      ),
      duration: 2500
    });
    setStatusMessage("Text added at position.");
  }

  function addSticker(urlOrEmoji, type = "emoji", isAnimated = false) {
    updateState((prev) => ({
      ...prev,
      stickers: [...prev.stickers, { id: crypto.randomUUID(), url: urlOrEmoji, type, x: 50, y: 50, scale: 1, isAnimated, animation: null }],
    }));
  }

  function removeSticker(id) {
    updateState((prev) => ({
      ...prev,
      stickers: prev.stickers.filter((s) => s.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
    }));
    toast.error("Sticker removed", {
      icon: (
        <ToastIcon src="/animations/waste-basket.json" />
      )
    });
    setStatusMessage("Sticker removed.");
  }

  function removeText(id) {
    updateState((prev) => ({
      ...prev,
      texts: prev.texts.filter((t) => t.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
    }));
    // Clear editing state if we're deleting the text being edited
    if (editingId === id) {
      setEditingId(null);
    }
    toast.success("Text removed");
    setStatusMessage("Text removed.");
  }

  function handleCanvasPointerDown() {
    startTransition(() => {
      updateState((prev) => ({ ...prev, selectedId: null }));
    });
    setEditingId(null); // Exit editing mode when clicking on canvas
    globalLastTapRef.current = 0;
  }

  function handleFineTune(axis, value) {
    if (!meme.selectedId) return;

    startTransition(() => {
      updateTransient((prev) => {
        const isText = prev.texts.some((t) => t.id === meme.selectedId);
        if (isText) {
          return {
            ...prev,
            texts: prev.texts.map((t) => (t.id === meme.selectedId ? { ...t, [axis]: parseFloat(value) } : t)),
          };
        }
        return {
          ...prev,
          stickers: prev.stickers.map((s) => (s.id === meme.selectedId ? { ...s, [axis]: parseFloat(value) } : s)),
        };
      });
    });
  }

  const handleFineTuneCommit = () => {
    updateState((prev) => prev);
  };

  function handleQuickPosition(pos) {
    if (!meme.selectedId) return;

    // Calculate vertical positions that account for caption bars
    // When caption bars are present, extend positions into those areas
    const hasTopCaption = (meme.paddingTop || 0) > 0;
    const hasBottomCaption = (meme.paddingBottom || 0) > 0;

    // Vertical positions: extend into caption areas when they exist
    const topY = hasTopCaption ? 8 : 20;      // Closer to edge with caption
    const bottomY = hasBottomCaption ? 92 : 80; // Closer to edge with caption

    // Map string positions to coordinates
    const positions = {
      'top-left': { x: 20, y: topY },
      'top-center': { x: 50, y: topY },
      'top-right': { x: 80, y: topY },
      'center-left': { x: 20, y: 50 },
      'center': { x: 50, y: 50 },
      'center-right': { x: 80, y: 50 },
      'bottom-left': { x: 20, y: bottomY },
      'bottom-center': { x: 50, y: bottomY },
      'bottom-right': { x: 80, y: bottomY },
    };

    const targetPos = typeof pos === 'string' ? positions[pos] : pos;
    if (!targetPos) return;

    updateState((prev) => {
      const isText = prev.texts.some(t => t.id === meme.selectedId);
      if (isText) {
        return {
          ...prev,
          texts: prev.texts.map((t) => t.id === meme.selectedId ? { ...t, x: targetPos.x, y: targetPos.y } : t),
        };
      }
      return {
        ...prev,
        stickers: prev.stickers.map((s) => s.id === meme.selectedId ? { ...s, x: targetPos.x, y: targetPos.y } : s),
      };
    });
  }

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

      toast("Magic logic applied!", {
        duration: 2000,
        icon: <ToastIcon src="/animations/filter-frenzy.json" />
      });
      setStatusMessage("Magic captions generated.");
      setIsMagicGenerating(false);

      showLongPressHint();
    }, 800);
  }

  const handlePointerDown = useCallback(
    (e, id) => {
      e.stopPropagation();

      startPosRef.current = { x: e.clientX, y: e.clientY };

      // Calculate relative pointer position to meme container for drag offset
      if (memeRef.current) {
        const rect = memeRef.current.getBoundingClientRect();
        const pointerPctX = ((e.clientX - rect.left) / rect.width) * 100;
        const pointerPctY = ((e.clientY - rect.top) / rect.height) * 100;

        const sticker = meme.stickers.find((s) => s.id === id);
        const text = meme.texts.find((t) => t.id === id);
        const item = sticker || text;

        if (item) {
          dragOffsetRef.current = {
            x: pointerPctX - item.x,
            y: pointerPctY - item.y,
          };
        } else {
          dragOffsetRef.current = { x: 0, y: 0 };
        }
      }

      const isSticker = meme.stickers.some((s) => s.id === id);
      const isText = meme.texts.some((t) => t.id === id);

      if (isSticker) {
        const now = Date.now();
        if (lastTapRef.current.id === id && now - lastTapRef.current.time < 450) {
          // Double tap to remove - CANCEL long press first
          if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
          removeSticker(id);
          lastTapRef.current = { id: null, time: 0 };
          return;
        }
        lastTapRef.current = { id, time: now };

        // Sticker Long-Press Logic
        longPressTimerRef.current = setTimeout(() => {
          startTransition(() => {
            updateState((prev) => ({ ...prev, selectedId: id }));
          });
          setDraggedId(null);
          if (navigator.vibrate) navigator.vibrate(50);

          // Show toast for sticker selection too
          setTimeout(() => {
            toast("Sticker Selected!", {
              icon: (
                <ToastIcon src="/animations/filter-frenzy.json" />
              ),
              duration: 1000
            });
          }, 350);
        }, 600); // 600ms for long press on sticker (slightly longer to distinguish from drag/tap)

      } else if (isText) {
        longPressTimerRef.current = setTimeout(() => {
          startTransition(() => {
            updateState((prev) => ({ ...prev, selectedId: id }));
          });
          setDraggedId(null);
          if (navigator.vibrate) navigator.vibrate(50);
          toast("Text Selected!", {
            icon: (
              <ToastIcon src="/animations/filter-frenzy.json" />
            ),
            duration: 1000
          });
        }, 350);
      }

      setDraggedId(id);
      if (navigator.vibrate) navigator.vibrate(20);
    },
    [meme.stickers, meme.texts, updateState],
  );



  // Helper: Execute GIF export
  const doGifExport = useCallback(async (options = {}) => {
    if (!memeRef.current) return;

    const { stickersOnly = false } = options;
    const isDeepFrying = meme.panels.some(p => (p.filters?.deepFry || 0) > 0);
    const loadingMsg = stickersOnly ? "Exporting stickers..." : (isDeepFrying ? "Deep frying frames... (this takes longer) 🍟" : "Encoding GIF...");

    const toastId = toast.loading(loadingMsg);

    try {
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

      const filename = `${safeName}-${stickersOnly ? 'stickers' : ''}-${Date.now()}.gif`;
      await triggerDownload(blob, filename);
      triggerFireworks();

      // Artificial delay to let the "Encoding..." toast be visible for a moment longer
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Downloaded!", { id: toastId, duration: 5000 });
    } catch (err) {
      console.error("GIF Export Error:", err);
      toast.error("Export failed", { id: toastId });
    }
  }, [meme, searchQuery]);

  // Helper: Execute static PNG export
  const doStaticExport = useCallback(async (options = {}) => {
    if (!memeRef.current) return;

    const { stickersOnly = false, forceStatic = false } = options;

    // Special Case: Static Sticker Export via PNG (Transparent)
    if (stickersOnly) {
      const toastId = toast.loading("Exporting sticker...");
      try {
        // Use our new direct PNG exporter!
        const blob = await exportStickersAsPng(meme, meme.stickers);
        const filename = `stickers-${Date.now()}.png`;
        await triggerDownload(blob, filename);
        triggerFireworks();
        toast.success("Downloaded!", { id: toastId });
      } catch (e) {
        toast.error("Export failed", { id: toastId });
      }
      return;
    }

    const toastId = toast.loading("Generating...");
    try {
      // REPLACED: html2canvas with native renderer for filter consistency
      const blob = await exportImageAsPng(meme, meme.texts, meme.stickers);

      const safeName = (meme.name || 'meme')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50)
        || 'meme';

      const filename = `${safeName}-${Date.now()}.png`;
      await triggerDownload(blob, filename);
      triggerFireworks();
      toast.success("Downloaded!", { id: toastId });
    } catch (err) {
      console.error("Image Export Error:", err);
      toast.error("Export failed", { id: toastId });
    }
  }, [meme, searchQuery]);

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

    // ROBUST ANIMATION DETECTION:
    // 1. CSS Animation (e.g. Bounce, Spin) - s.animation !== 'none'
    // 2. Native Animation (GIF/WebP) - s.isAnimated OR URL check
    // Note: Background removed stickers (blobs) might lose filename extensions,
    // so we rely on 'isAnimated' passed from upload/tenor, but we also check common extensions just in case.
    const hasAnimatedSticker = meme.stickers.some(s => s.animation && s.animation !== 'none');

    const hasGifSticker = meme.stickers.some(s =>
      s.type === 'image' && (
        s.isAnimated ||
        (s.url && (s.url.toLowerCase().includes('.gif') || s.url.toLowerCase().includes('.webp')))
      )
    );

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

    const toastId = toast.loading("Preparing to share...");
    try {
      // Check if this is an unmodified Tenor GIF (can use URL copy instead of export)
      const activePanel = meme.panels.find(p => p.id === meme.activePanelId) || meme.panels[0];
      const hasTextContent = meme.texts.some(t => t.content.trim());
      const hasStickers = meme.stickers.length > 0;
      const hasDrawings = meme.drawings && meme.drawings.length > 0;
      const hasFilterChanges = activePanel?.filters && (
        activePanel.filters.contrast !== 100 ||
        activePanel.filters.brightness !== 100 ||
        activePanel.filters.blur !== 0 ||
        activePanel.filters.grayscale !== 0 ||
        activePanel.filters.sepia !== 0 ||
        activePanel.filters.hueRotate !== 0 ||
        activePanel.filters.saturate !== 100 ||
        activePanel.filters.invert !== 0 ||
        activePanel.filters.deepFry !== 0
      );
      const isTenorGif = activePanel?.sourceUrl && activePanel.isVideo;
      const isUnmodified = !hasTextContent && !hasStickers && !hasDrawings && !hasFilterChanges;

      // For unmodified Tenor GIFs, copy the URL directly (instant, works everywhere)
      if (isTenorGif && isUnmodified && meme.layout === 'single') {
        try {
          await navigator.clipboard.writeText(activePanel.sourceUrl);
          toast.success("GIF link copied! Paste in Meta/Instagram to embed.", { id: toastId });
          return;
        } catch (clipErr) {
          console.warn("Tenor URL copy failed, falling back to export:", clipErr);
          // Continue to export flow below
        }
      }

      // Determine if content is animated
      const hasVideoPanel = meme.panels.some(p => p.isVideo || (p.url && p.url.includes('.gif')));
      const hasGifSticker = meme.stickers.some(s => s.type === 'image' && (s.isAnimated || s.url.includes('.gif')));
      const hasAnimatedTextContent = hasAnimatedText(meme.texts);
      const isAnimated = hasVideoPanel || hasGifSticker || hasAnimatedTextContent;

      let blob, file;
      if (isAnimated) {
        toast.loading("Encoding GIF...", { id: toastId });
        blob = await exportGif(meme, meme.texts, meme.stickers);
        file = new File([blob], `meme.gif`, { type: "image/gif" });
      } else {
        blob = await exportImageAsPng(meme, meme.texts, meme.stickers);
        file = new File([blob], `meme.png`, { type: "image/png" });
      }

      // Try Web Share API first (works on mobile and some desktop browsers)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          toast.success("Shared!", { id: toastId });
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            toast.dismiss(toastId);
            return;
          }
          console.warn("Native share failed, falling back...", shareErr);
        }
      }

      // Desktop fallback: Clipboard Loophole or Download
      if (isAnimated) {
        // GIF CLIPBOARD LOOPHOLE (Smart Hybrid):
        // Upload to Cloud -> Get URL -> Write URL (plain) + DataURI (html)

        try {
          // A. Convert to Data URI (For HTML Paste - Gmail/Docs)
          const reader = new FileReader();
          const base64Data = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });

          // B. Upload to Cloud (For Chat Paste - Signal/Discord)
          let publicUrl = null;
          try {
            toast.loading("Generating sharable link...", { id: toastId });

            // Try to get original filename for better "Paradigm" / recognition
            let filename = `meme-${Date.now()}.gif`; // Default Safe Fallback

            const activePanel = meme.panels.find(p => p.id === meme.activePanelId) || meme.panels[0];
            if (activePanel?.sourceUrl) {
              try {
                // Extract filename from URL (e.g. .../AAA/Cat-Spin.gif)
                const urlParts = activePanel.sourceUrl.split('/');
                const lastPart = urlParts[urlParts.length - 1];
                // Remove query params
                const potentialName = lastPart.split('?')[0];

                // Only use it if it looks like a normal filename
                if (potentialName && /^[a-zA-Z0-9\-_]+(\.gif)?$/i.test(potentialName)) {
                   // Ensure it ends in .gif
                   const baseName = potentialName.replace(/\.gif$/i, '');
                   filename = `${baseName}-remix.gif`;
                }
              } catch (e) {
                console.warn("Could not extract filename", e);
              }
            } else {
               // User upload or no source URL - use a nice generic name
               filename = `meme-${Date.now()}.gif`;
            }

            const formData = new FormData();
            formData.append('file', blob, filename);

            // DIRECT CLIENT-SIDE UPLOAD (Bypasses Netlify Bandwidth)
            const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
              method: 'POST',
              body: formData
            });

            if (uploadRes.ok) {
              const uploadJson = await uploadRes.json();
              // Tmpfiles returns: { data: { url: "https://tmpfiles.org/..." } }
              // Need to convert to DL link: .../org/dl/...
              if (uploadJson && uploadJson.data && uploadJson.data.url) {
                publicUrl = uploadJson.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
              } else {
                console.warn("Upload response missing url:", uploadJson);
              }
            } else {
              console.warn("Upload failed:", uploadRes.status, uploadRes.statusText);
            }
          } catch (uploadErr) {
            console.warn("Upload network error:", uploadErr);
          }

          // C. Construct Clipboard Items
          const htmlContent = `<img src="${base64Data}" alt="Meme GIF" />`;
          const textContent = publicUrl || "";

          // Attempt Auto-Copy (Might fail if focus lost during upload)
          try {
            const clipboardItem = new ClipboardItem({
              "text/html": new Blob([htmlContent], { type: "text/html" }),
              "text/plain": new Blob([textContent], { type: "text/plain" })
            });
            await navigator.clipboard.write([clipboardItem]);
            toast.success((
              <div className="flex flex-col gap-1">
                <span>{publicUrl ? "Link Copied!" : "Copied to clipboard!"}</span>
                <span className="text-xs opacity-80 font-normal">
                  {publicUrl ? "Ready to paste." : "Paste in Gmail/Docs (Upload failed)"}
                </span>
              </div>
            ), { id: toastId, duration: 4000 });
          } catch (autoCopyErr) {
            // Fallback: Show Button for User Gesture
            console.warn("Auto-copy failed, requesting user gesture", autoCopyErr);
            toast((t) => (
              <div className="flex flex-col items-start gap-2">
                <span className="font-semibold">Link Ready!</span>
                <button
                  className="bg-black text-white px-3 py-1.5 rounded text-sm font-bold active:scale-95 transition-transform cursor-pointer shadow-sm border border-white/20"
                  onClick={() => {
                    const item = new ClipboardItem({
                      "text/html": new Blob([htmlContent], { type: "text/html" }),
                      "text/plain": new Blob([textContent], { type: "text/plain" })
                    });
                    navigator.clipboard.write([item]);
                    toast.success("Link Copied!", { id: t.id });
                  }}
                >
                  Tap to Copy
                </button>
              </div>
            ), { id: toastId, duration: 8000 });
          }

          toast.success((
            <div className="flex flex-col gap-1">
              <span>{publicUrl ? "Link Copied!" : "Copied to clipboard!"}</span>
              <span className="text-xs opacity-80 font-normal">
                {publicUrl ? "Ready to paste." : "Paste in Gmail/Docs (Upload failed)"}
              </span>
            </div>
          ), { id: toastId, duration: 4000 });

        } catch (clipboardErr) {
          // If HTML write fails (browser block or not focused), Fallback to Download
          console.warn("GIF Clipboard trick failed:", clipboardErr);

          await triggerDownload(blob, `meme-${Date.now()}.gif`);

          // Inform user why it downloaded
          toast.success((
            <div className="flex flex-col gap-1">
              <span>GIF downloaded!</span>
              <span className="text-xs opacity-80 font-normal">Apps prevented clipboard copy.</span>
            </div>
          ), { id: toastId });
        }
      } else {
        // PNG: Try clipboard with focus handling
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          toast.success("Copied to clipboard!", { id: toastId });
        } catch (clipboardError) {
          // Clipboard failed (focus lost or not supported) - fall back to download
          console.warn("Clipboard failed, downloading instead:", clipboardError);
          await triggerDownload(blob, `meme-${Date.now()}.png`);
          toast.success("Downloaded! (Clipboard unavailable)", { id: toastId });
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Share Error:", e);
        toast.error("Share failed", { id: toastId });
      } else {
        toast.dismiss(toastId);
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

  const selectedText = meme.selectedId
    ? (meme.texts.find((t) => t.id === meme.selectedId) || meme.stickers.find((s) => s.id === meme.selectedId))
    : null;

  // HYDRATION LOADER: Prevent flickering by showing a loading screen until state is restored
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] flex-col gap-4 animate-in fade-in zoom-in-95 duration-500">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
        <p className="text-slate-400 font-medium text-sm animate-pulse">Restoring Session...</p>
      </div>
    );
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 animate-in fade-in duration-500 relative">
      <div
        className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200 ${flashColor ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundColor: flashColor === "red" ? "rgba(239, 68, 68, 0.15)" : flashColor === "teal" ? "rgba(20, 184, 166, 0.15)" : "rgba(34, 197, 94, 0.08)" }}
      />

      {/* Reusable Remix Controls Group */}
      {(() => {
        const remixCarouselControl = (
          <Suspense fallback={<div className="h-14 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
            <RemixCarousel
              onChaos={handleChaos}
              onCaptionRemix={handleCaptionRemix}
              onStyleShuffle={handleStyleShuffle}
              onFilterFrenzy={handleFilterFrenzy}
              onVibeCheck={handleVibeCheck}
              onExtremeDeepFry={handleExtremeDeepFry}
              onStickerfy={handleStickerfy}
              onNuked={handleNuked}
              onGlitch={handleGlitch}
              onCursed={handleCursed}
              onConfettiBlast={handleConfettiBlast}
              onTimeWarp={handleTimeWarp}
              deepFryLevel={deferredDeepFry}
              isProcessing={isProcessing}
            />
          </Suspense>
        );

        const remixActionControls = (
          <div className="space-y-4">
            {/* Undo / Redo Controls */}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="btn-secondary py-3 px-4 disabled:opacity-50 flex items-center justify-center gap-2 touch-target"
              >
                <Undo2 className="w-4 h-4" /> Undo
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="btn-secondary py-3 px-4 disabled:opacity-50 flex items-center justify-center gap-2 touch-target"
              >
                <Redo2 className="w-4 h-4" /> Redo
              </button>
              <button
                onClick={() => toast("Tip: Ctrl+Z (Undo) and Ctrl+Shift+Z (Redo)", {
                  icon: (
                    <picture>
                      <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a1/512.webp" type="image/webp" />
                      <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a1/512.gif" alt="💡" width="32" height="32" />
                    </picture>
                  ),
                  style: { borderRadius: '10px', background: '#333', color: '#fff' },
                  duration: 4000
                })}
                className="w-12 btn-icon touch-target"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Dual Action: Remove Everything / Remove Effects */}
            <div className="flex w-full rounded-xl overflow-hidden border border-[#2f3336] shadow-lg">
              {/* Left: Remove Everything (Red) */}
              <button
                onClick={handleReset}
                className="flex-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-semibold py-3 px-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-r border-[#2f3336] touch-target"
              >
                <Eraser className="w-4 h-4" />
                <span className="text-sm">Remove All</span>
              </button>

              {/* Right: Remove Effects (Teal) */}
              <button
                onClick={handleRemoveEffects}
                className="flex-1 bg-teal-900/20 hover:bg-teal-900/40 text-teal-400 font-semibold py-3 px-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98] touch-target"
              >
                <div
                  className="w-5 h-5 bg-teal-400"
                  style={{
                    maskImage: 'url("/images/stickers/icons/effects-remover.png")',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskImage: 'url("/images/stickers/icons/effects-remover.png")',
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center'
                  }}
                />
                <span className="text-sm">Remove Effects</span>
              </button>
            </div>
          </div>
        );

        return (
          <>
            {/* Export Confirmation Modal */}
            <ExportConfirmModal
              isOpen={showExportModal}
              onClose={() => { setShowExportModal(false); setIsStickerExport(false); }}
              onExportGif={() => doGifExport({ stickersOnly: isStickerExport })}
              onExportStatic={() => doStaticExport({ stickersOnly: isStickerExport, forceStatic: isStickerExport })}
              isStickerOnly={isStickerExport}
            />

            {/* Snippet Success Modal */}
            <SnippetSuccessModal
              isOpen={showSnippetModal}
              onClose={handleCropCancel}
              onRetry={handleCropRetry}
              onExport={handleCropExport}
              croppedImageUrl={croppedImageUrl}
            />

            <div className="lg:col-span-4 space-y-6 order-2 lg:order-1 lg:sticky lg:top-8 self-start">
              {/* Controls moved to Toolbar */}

                {/* DESKTOP: Remix Controls ABOVE Upload Image (MemeInputs/MemeActions) */}
              <div className="hidden lg:block space-y-4">
                {remixActionControls}
                {remixCarouselControl}
              </div>

              <Suspense fallback={<div className="h-16 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
                <MemeActions
                  onFileUpload={handleFileUpload}
                  onDownload={handleDownload}
                  onShare={handleShare}
                />
              </Suspense>

              {/* Product Hunt Launch Badge */}
              <ProductHuntBadge />
            </div>

            <div className="lg:col-span-4 order-1 lg:order-2 flex flex-col gap-4 lg:sticky lg:top-8 self-start overflow-visible">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
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
              <div className="relative flex flex-col shadow-2xl rounded-t-2xl border border-[#2f3336] card-bg overflow-hidden">
                {/* MemeToolbar - Mobile/Tablet Only (inside card) */}
                <div className="lg:hidden">
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
                    editingId={editingId}
                    handleTextChange={handleTextChange}
                    onAddSticker={addSticker}
                    onMagicCaption={generateMagicCaption}
                    isMagicGenerating={isMagicGenerating}
                    onChaos={handleChaos}
                    onExportStickers={handleExportStickers}
                    onEditingChange={setEditingId}
                    onStartCrop={handleStartCrop}
                    isCropping={isCropping}
                  />
                </div>

                {/* --- DYNAMIC SEARCH BAR (Switches based on Mode) --- */}

                {/* CASE 1: VIDEO MODE (Existing Tenor Search) */}
                {meme.mode === "video" && (
                  <Suspense fallback={<div className="h-12 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
                    <div className="p-3 border-b border-[#2f3336]">
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
                        placeholder={isMobileScreen ? "Search GIFs..." : "Search GIFs..."}
                      />
                    </div>
                  </Suspense>
                )}

                {/* CASE 2: IMAGE MODE (New Imgflip Search) */}
                {meme.mode === "image" && (
                  <div className="relative p-3 border-b border-[#2f3336]" ref={memeSearchRef}>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        placeholder={isMobileScreen ? "Search images..." : "Search images..."}
                        value={memeSearchQuery}
                        onChange={(e) => {
                          setMemeSearchQuery(e.target.value);
                          setShowMemeSuggestions(true);
                        }}
                        onFocus={() => setShowMemeSuggestions(true)}
                        className="w-full input-field pl-10 pr-10 py-3 placeholder:text-xs md:placeholder:text-sm"
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

                    {/* Dropdown Results - Portaled to document.body */}
                    {showMemeSuggestions && createPortal(
                      <div
                        data-meme-dropdown-portal
                        style={memeDropdownStyle}
                        className="card-bg border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2"
                      >
                        {!memeSearchQuery && (
                          <div className="px-4 py-3 border-b border-[#2f3336] bg-[#181818]/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-brand" />
                              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Popular Images</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium italic">Scroll to browse</span>
                          </div>
                        )}
                        {memeSearchQuery && filteredMemes.length > 0 && (
                          <div className="px-4 py-2 border-b border-[#2f3336] bg-brand/5">
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
                                  className="group relative aspect-square rounded-xl overflow-hidden bg-[#181818] border-2 border-transparent hover:border-brand transition-all active:scale-95 focus:outline-none focus:border-brand"
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
                              <div className="fixed left-[calc(100%+1rem)] top-0 w-64 p-3 card-bg border-2 border-brand rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 hidden xl:block z-[70] pointer-events-none">
                                <div className="relative aspect-auto rounded-lg overflow-hidden border border-[#2f3336]">
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
                      </div>,
                      document.body
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(30);
                    setPingKey(Date.now());
                    getMemeImage();
                  }}
                  disabled={loading || generating}
                  className={`relative z-20 w-full text-white font-bold py-3 flex items-center justify-center gap-2 group border-y border-[#2f3336] bg-brand hover:bg-brand-dark transition-all active:scale-[0.98] ${generating ? "animate-pulse-ring" : ""}`}
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
                <div ref={canvasContainerRef} className="relative scroll-mt-4">
                  {/* Active Selection Border Overlay */}
                  {meme.activePanelId && (
                    <div
                      data-html2canvas-ignore="true"
                      className="absolute inset-0 border-2 border-dashed border-brand z-[100] shadow-[0_0_20px_rgba(255,199,0,0.3)] pointer-events-none"
                    />
                  )}
                  {/* Hover Border Overlay - Shows when hovering over OR actively dragging text/stickers */}
                  {(isHoveringCanvasElement || draggedId) && (
                    <div
                      data-html2canvas-ignore="true"
                      className="absolute inset-0 border-2 border-dashed border-white z-[101] pointer-events-none"
                    />
                  )}

                  {/* Crop Selection Overlay */}
                  {isCropping && (
                    <div
                      data-html2canvas-ignore="true"
                      className="absolute inset-0 z-[200] cursor-crosshair bg-black/30"
                      style={{ touchAction: 'none' }}
                      onPointerDown={(e) => {
                        if (!canvasContainerRef.current) return;
                        const rect = canvasContainerRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        cropStartRef.current = { x, y };
                        setCropSelection({ startX: x, startY: y, endX: x, endY: y });
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (!cropStartRef.current || !canvasContainerRef.current) return;
                        const rect = canvasContainerRef.current.getBoundingClientRect();
                        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
                        setCropSelection(prev => prev ? { ...prev, endX: x, endY: y } : null);
                      }}
                      onPointerUp={(e) => {
                        if (!cropStartRef.current || !cropSelection) {
                          cropStartRef.current = null;
                          setCropSelection(null);
                          return;
                        }

                        const { startX, startY, endX, endY } = cropSelection;
                        const width = Math.abs(endX - startX);
                        const height = Math.abs(endY - startY);

                        // Minimum selection size check (5px to avoid accidental taps)
                        if (width < 5 || height < 5) {
                          setCropSelection(null);
                          cropStartRef.current = null;
                          return;
                        }

                        // Calculate bounds
                        const bounds = {
                          x: Math.min(startX, endX),
                          y: Math.min(startY, endY),
                          width,
                          height
                        };

                        cropStartRef.current = null;
                        setCropSelection(null);
                        handleCropComplete(bounds);
                      }}
                    >
                      {/* Selection Rectangle */}
                      {cropSelection && (
                        <div
                          className="absolute border-2 border-dashed border-white bg-white/10 animate-marching-ants"
                          style={{
                            left: Math.min(cropSelection.startX, cropSelection.endX),
                            top: Math.min(cropSelection.startY, cropSelection.endY),
                            width: Math.abs(cropSelection.endX - cropSelection.startX),
                            height: Math.abs(cropSelection.endY - cropSelection.startY),
                          }}
                        >
                          {/* Size indicator */}
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                            {Math.round(Math.abs(cropSelection.endX - cropSelection.startX))} × {Math.round(Math.abs(cropSelection.endY - cropSelection.startY))}
                          </span>
                        </div>
                      )}



                      {/* Instructions */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs sm:text-sm px-4 py-2 rounded-full whitespace-nowrap">
                        Drag to select area
                      </div>
                    </div>
                  )}

                  {/* External Cancel Crop Button - Re-added and positioned absolutely in container */}
                  {isCropping && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Explicitly call the cancel handler
                        handleCropCancel();
                      }}
                      className="absolute top-4 right-4 z-[202] p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
                      title="Cancel Crop"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  <MemeCanvas
                    ref={memeRef}
                    meme={meme}
                    loading={loading}
                    isProcessing={isProcessing}
                    draggedId={draggedId}
                    selectedId={meme.selectedId}
                    editingId={editingId}
                    activeTool={activeTool}
                    onDrawCommit={handleDrawCommit}
                    onFineTune={handleFineTune}
                    onFineTuneCommit={handleFineTuneCommit}
                    onCenterText={handleCenterText}
                    onPointerDown={handlePointerDown}
                    onRemoveSticker={removeSticker}
                    onRemoveText={removeText}
                    onTextChange={handleTextChange}
                    onAddTextAtPosition={addTextAtPosition}
                    onStartEditing={setEditingId}
                    onCanvasPointerDown={handleCanvasPointerDown}
                    onHoverChange={setIsHoveringCanvasElement}

                    // New Props
                    activePanelId={meme.activePanelId}
                    onPanelSelect={handlePanelSelect}
                    layouts={DEFAULT_LAYOUTS}
                    onDrop={handleCanvasDrop}
                    onClearPanel={handleClearPanel}
                    onToggleFit={togglePanelFit}
                    onPanelPosChange={handlePanelPosChange}
                    isCropping={isCropping}
                    onCropCancel={handleCropCancel}
                  />
                </div>
                {selectedText && (
                  <Suspense fallback={null}>
                    <div ref={fineTuneRef} data-fine-tuner>
                      <MemeFineTune
                        selectedElement={selectedText}
                        onFineTune={handleFineTune}
                        onFineTuneCommit={handleFineTuneCommit}
                        onQuickPosition={handleQuickPosition}
                      />
                    </div>
                  </Suspense>
                )}
              </div>

              {/* MOBILE: Remix Carousel -> Stickers -> Actions */}
              <div className="flex flex-col gap-4 lg:hidden">
                {remixActionControls}

                {remixCarouselControl}

                {/* Mobile-Only Sticker Section */}
                <div className="card-bg rounded-2xl border border-white/5 shadow-xl backdrop-blur-sm p-4 relative z-50">
                  <MemeStickerSection
                    onAddSticker={addSticker}
                    hasStickers={meme.stickers.length > 0}
                    onExportStickers={handleExportStickers}
                  />
                </div>
              </div>

            </div>

            {/* NEW: Right Toolbar Column - Desktop Only */}
            <div className="hidden lg:flex lg:col-span-4 order-3 flex-1">
              <div className="sticky top-8 w-full flex flex-col">
                <div className="toolbar-sidebar flex-1 w-full">
                  <MemeToolbar
                    className="h-full glass-panel rounded-2xl shadow-xl"
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
                    editingId={editingId}
                    handleTextChange={handleTextChange}
                    onAddSticker={addSticker}
                    onMagicCaption={generateMagicCaption}
                    isMagicGenerating={isMagicGenerating}
                    onChaos={handleChaos}
                    onExportStickers={handleExportStickers}
                    onEditingChange={setEditingId}
                    onStartCrop={handleStartCrop}
                    isCropping={isCropping}
                  />
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </main>
  );
}

/* --- HELPERS --- */
function getNextItem(allItems, deck, setDeck) {
  let currentDeck = [...deck];
  if (currentDeck.length === 0) {
    // Refill and shuffle
    currentDeck = [...allItems];
    for (let i = currentDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentDeck[i], currentDeck[j]] = [currentDeck[j], currentDeck[i]];
    }
  }
  const item = currentDeck.pop();
  setDeck(currentDeck);
  return item;
}
