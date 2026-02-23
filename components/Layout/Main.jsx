import { useState, useEffect, useRef, useTransition, Suspense, useCallback, lazy, useDeferredValue, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { RefreshCcw, Loader2, Video, Undo2, Redo2, HelpCircle, Search, X, Eraser, Sparkles, ImagePlus } from "lucide-react";
import toast from "react-hot-toast";
// Services - Imported dynamically when needed
import { removeImageBackground } from "../../services/backgroundRemover";
import { triggerFireworks, triggerConfettiBurst } from "../ui/Confetti";
import useHistory from "../../hooks/useHistory";
import { useExportToast } from '../../hooks/useExportToast';
import { searchGiphy, registerShare, getAutocomplete, getCategories } from "../../services/giphy";
import { searchImages, trackUnsplashDownload, getRandomImage, searchPexelsVideos, getRandomPexelsVideo } from "../../services/imageSearch";
import VideoSourceTabs from "../MemeEditor/VideoSourceTabs";
// gifExporter is now lazy loaded
import { hasAnimatedText } from "../../constants/textAnimations";
import { deepFryImage } from "../../services/imageProcessor";
import { processFileInWorker } from "../../services/fileLoader";
import { MEME_QUOTES } from "../../constants/memeQuotes";
import { TEMPLATE_KEYWORDS, TRENDING_TEMPLATES, MEME_IQ_THRESHOLD } from "../../constants/memeIQKeywords";
import { STICKER_KEYWORDS } from "../../constants/stickerKeywords";
import { COMPILED_EMOJI_MAP, FALLBACK_EMOJIS } from "../../constants/emojiSauceMap";
import { TONE_BANK, TONE_NAMES, TONE_LABELS } from "../../constants/toneBank";
import { computeAutoLayout } from "../../services/autoLayoutService";
import { saveState, loadState } from "../../services/storage"; // moved up from below

// Lazy load heavy components to reduce initial bundle size
const MemeCanvas = lazy(() => import("../MemeEditor/MemeCanvas"));
const MemeDropdownGrid = lazy(() => import("../MemeEditor/MemeDropdownGrid"));
const ImageSourceTabs = lazy(() => import("../MemeEditor/ImageSourceTabs"));
const MemeToolbar = lazy(() => import("../MemeEditor/MemeToolbar"));
import { STYLE_DNA_PRESETS, STYLE_KEYWORDS } from "../../constants/styleDna";

const LayoutSelector = lazy(() => import("../MemeEditor/LayoutSelector").then(module => ({ default: module.LayoutSelector })));
import { ShareQualityModal } from "../Modals/ShareQualityModal";
const ExportConfirmModal = lazy(() => import("../Modals/ExportConfirmModal").then(module => ({ default: module.ExportConfirmModal })));
const SnippetSuccessModal = lazy(() => import("../Modals/SnippetSuccessModal").then(module => ({ default: module.SnippetSuccessModal })));
import { ToastIcon } from "../ui/ToastIcon";
const MemeStickerSection = lazy(() => import("../MemeEditor/MemeStickerSection").then(module => ({ default: module.MemeStickerSection })));

// Lazy-loaded editor tools
const MemeActions = lazy(() => import("../MemeEditor/MemeActions").then((module) => ({ default: module.MemeActions })));
const GifSearch = lazy(() => import("../MemeEditor/GifSearch").then((module) => ({ default: module.GifSearch })));
const ModeSelector = lazy(() =>
  import("../MemeEditor/ModeSelector").then((module) => ({ default: module.ModeSelector })),
);
const ColorControls = lazy(() => import("../MemeEditor/ColorControls"));
const MemeFineTune = lazy(() => import("../MemeEditor/MemeFineTune"));
const RemixCarousel = lazy(() => import("../MemeEditor/RemixCarousel"));
const MobileBottomBar = lazy(() => import("../MobileEditor/MobileBottomBar"));
const MobileTopBar = lazy(() => import("../MobileEditor/MobileTopBar"));



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

const safeImport = async (importFn, retries = 3, interval = 1000) => {
  try {
    return await importFn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((r) => setTimeout(r, interval));
    return safeImport(importFn, retries - 1, interval);
  }
};

export default function Main({ onOpenInstructions }) {
  const [isPending, startTransition] = useTransition();
  // NEW: Track hydration status to prevent overwriting DB with default state
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Defer toast animation preloads until the browser is idle.
    // These 12 fetches were firing during the critical loading phase,
    // competing with Lottie/storage for main thread time.
    const preloadAnimations = () => {
      // Skip preloading on slow/metered connections to avoid competing for bandwidth
      if (navigator.connection?.saveData ||
          (navigator.connection?.effectiveType &&
           ['slow-2g', '2g', '3g'].includes(navigator.connection.effectiveType))) {
        return;
      }
      TOAST_ANIMATIONS.forEach(src => {
        fetch(src).catch(() => { });
      });
    };
    const idleId = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(preloadAnimations, { timeout: 5000 })
      : setTimeout(preloadAnimations, 2000);

    // Hydrate state from IndexedDB
    loadState().then((saved) => {
      if (saved) {
        // Apply migration logic similar to before, but now async
        try {
          // If we have a full history stack (v2), hydrate it directly
          if (saved.version >= 2 && saved.present) {
             // Validate arrays before passing to hook
             const validHistory = {
               past: Array.isArray(saved.past) ? saved.past : [],
               // STRICT MERGE: Ensure present has all default fields (Arrays!)
               present: { ...defaultState, ...saved.present, stickers: saved.present.stickers || [], drawings: saved.present.drawings || [], shapes: saved.present.shapes || [], texts: saved.present.texts || [] },
               future: Array.isArray(saved.future) ? saved.future : []
             };
             hydrateHistory(validHistory);
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
        url: "https://i.imgflip.com/1bij.jpg",
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
    shapes: [],
    shapeFill: null,
    shapeStroke: '#ff0000',
    shapeStrokeWidth: 3,
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

  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Export toast feedback system
  const exportToast = useExportToast();

  const [allMemes, setAllMemes] = useState([]);
  const [allGifs, setAllGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [draggedId, setDraggedId] = useState(null);
  const [activeTool, setActiveTool] = useState("move");
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [flashColor, setFlashColor] = useState(null);
  const [editingId, setEditingId] = useState(null); // Track actively edited text (shows blinking cursor)
  const hoverBorderRef = useRef(null); // Direct DOM ref for hover border overlay
  const setIsHoveringCanvasElement = useRef((hovering) => {
    if (hoverBorderRef.current) {
      hoverBorderRef.current.style.display = hovering ? '' : 'none';
    }
  }).current;
  const memeRef = useRef(null);
  const lastTapRef = useRef({ id: null, time: 0 });
  const globalLastTapRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const snapGuidesRef = useRef({ x: null, y: null });
  const snapPointsCacheRef = useRef(null); // Pre-computed snap points for current drag
  const requestCounterRef = useRef(0);
  const canvasContainerRef = useRef(null);
  const remixClickCountRef = useRef({ chaos: 0, caption: 0, style: 0, filter: 0, vibe: 0, deepfry: 0 });
  const [activeEffects, setActiveEffects] = useState({}); // Track active toggle effects per panel { panelId: 'nuked' | 'cursed' | 'glitch' | 'timewarp' | null }
  const [lastClickedEffect, setLastClickedEffect] = useState(null); // Track last clicked effect ID for active state display
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

  // Deselect shape when switching to a tool that's not compatible with shape manipulation
  useEffect(() => {
    if (activeTool === 'pen' || activeTool === 'eraser' || (activeTool && activeTool.startsWith('shape-'))) {
      setSelectedShapeId(null);
    }
  }, [activeTool]);

  const [imageDeck, setImageDeck] = useState([]);
  const [videoDeck, setVideoDeck] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareQualityModal, setShowShareQualityModal] = useState(false);
  const shareQualityResolveRef = useRef(null);
  const exportResolveRef = useRef(null);
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
  const memeSearchRef = useRef(null);
  const memeDropdownRef = useRef(null);

  // Image Search State
  const imageSearchControllerRef = useRef(null);
  const abortControllerRef = useRef(null); // For Pexels video search cancellation
  const [imageSource, setImageSource] = useState("imgflip");
  const [imageSearchResults, setImageSearchResults] = useState([]);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageSearchPage, setImageSearchPage] = useState(1);
  const [imageSearchTotalPages, setImageSearchTotalPages] = useState(0);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);

  // Video Search State (Pexels)
  const [videoSource, setVideoSource] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("meme_video_source") || "giphy";
    }
    return "giphy";
  });
  const [pexelsVideoResults, setPexelsVideoResults] = useState([]);
  const [pexelsVideoQuery, setPexelsVideoQuery] = useState("");
  const [pexelsVideoPage, setPexelsVideoPage] = useState(1);
  const [pexelsVideoTotalPages, setPexelsVideoTotalPages] = useState(0);
  const [pexelsVideoLoading, setPexelsVideoLoading] = useState(false);
  const [showPexelsVideoSuggestions, setShowPexelsVideoSuggestions] = useState(false);
  const pexelsVideoContainerRef = useRef(null);

  // Dropdown Positioning with Callback Ref to handle Suspense swaps
  const positionDropdown = useCallback((node) => {
    if (!node || !memeSearchRef.current) return;
    const input = memeSearchRef.current;
    const rect = input.getBoundingClientRect();
    node.style.position = 'fixed';
    node.style.top = `${rect.bottom + 8}px`;
    node.style.left = `${rect.left + 12}px`;
    node.style.width = `${rect.width - 24}px`;
    node.style.zIndex = '9999';

    // Update ref for other usages
    memeDropdownRef.current = node;
  }, []);

  // Also keep the effect for scroll/resize
  const updateDropdownPosition = useCallback(() => {
    positionDropdown(memeDropdownRef.current);
  }, [positionDropdown]);

  // Calculate Image mode dropdown position based on input container
  useLayoutEffect(() => {
    if (showMemeSuggestions && memeDropdownRef.current) {
        updateDropdownPosition();
    }
  }, [showMemeSuggestions, updateDropdownPosition]);

  // ... (keep scroll/resize listeners)


  // Update position on scroll/resize for Image mode dropdown (throttled)
  useEffect(() => {
    if (!showMemeSuggestions) return;

    let rafId = null;
    const onUpdate = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateDropdownPosition();
      });
    };

    window.addEventListener('scroll', onUpdate, true);
    window.addEventListener('resize', onUpdate);

    return () => {
      window.removeEventListener('scroll', onUpdate, true);
      window.removeEventListener('resize', onUpdate);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [showMemeSuggestions, updateDropdownPosition]);

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

      // Video Mode logic (Pexels)
      if (pexelsVideoContainerRef.current && !pexelsVideoContainerRef.current.contains(e.target)) {
        setShowPexelsVideoSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dedicated function to load a SPECIFIC meme (reusing your CORS logic)
  async function loadSelectedMeme(memeData) {
    setGenerating(true);
    try {
      // Track Unsplash download for API compliance (fire-and-forget)
      if (memeData.source === "unsplash") trackUnsplashDownload(memeData);

      // Bypass proxy for videos (Pexels supports CORS)
      if (memeData.isVideo) {
        updateSelectedPanel(memeData.url, memeData, null);
        return;
      }

      // Fetch via Weserv to avoid Tainted Canvas and COEP issues
      const response = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(memeData.url)}`);
      if (!response.ok) throw new Error("Weserv failed");
      const blob = await response.blob();
      // Use Object URL (O(1)) instead of data URL (O(n) base64 + 33% size bloat)
      const objectUrl = URL.createObjectURL(blob);

      updateSelectedPanel(objectUrl, memeData, blob);
    } catch (e) {
      console.warn("Weserv failed, falling back to direct URL (Canvas might taint)", e);
      updateSelectedPanel(memeData.url, memeData, null);
    } finally {
      setGenerating(false);
      setShowMemeSuggestions(false);
      setMemeSearchQuery("");
    }
  }

  // Debounced API search for Unsplash/Pexels (400ms)
  const handleImageSearch = useCallback((query, source, page = 1) => {
    // Cancel any in-flight request
    if (imageSearchControllerRef.current) {
      imageSearchControllerRef.current.abort();
    }

    // Imgflip is local only
    if (source === "imgflip") {
      setImageSearchResults([]);
      setImageSearchPage(1);
      setImageSearchTotalPages(0);
      return;
    }

    const controller = new AbortController();
    imageSearchControllerRef.current = controller;

    const doSearch = async () => {
      setImageSearchLoading(true);
      try {
        const { results, totalPages } = await searchImages(source, query, page, controller.signal);
        if (controller.signal.aborted) return;

        if (page === 1) {
          setImageSearchResults(results);
        } else {
          // Append for "Load More"
          setImageSearchResults(prev => [...prev, ...results]);
        }
        setImageSearchPage(page);
        setImageSearchTotalPages(totalPages);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Image search error:", err);
      } finally {
        if (!controller.signal.aborted) setImageSearchLoading(false);
      }
    };

    // Debounce only for page 1 WITH NON-EMPTY QUERY.
    // Instant for Load More OR Empty Query (Popular/Curated)
    const isPopularFetch = !query?.trim();
    if (page === 1 && !isPopularFetch) {
      const timer = setTimeout(doSearch, 400);
      // Store cleanup in controller so abort cancels the timeout too
      const originalAbort = controller.abort.bind(controller);
      controller.abort = () => {
        clearTimeout(timer);
        originalAbort();
      };
    } else {
      doSearch();
    }
  }, []);

  // Image source switch handler — persist preference + reset state
  const handleImageSourceChange = useCallback((source) => {
    setImageSource(source);
    localStorage.setItem("meme_img_source", source);
    setImageSearchResults([]);
    setImageSearchPage(1);
    setImageSearchTotalPages(0);
    setMemeSearchQuery("");
    // Show dropdown immediately (for imgflip: browse, for API: type hint)
    setShowMemeSuggestions(true);
    // Determine if we should fetch popular immediately
    if (source !== "imgflip") {
      // Set loading immediately to show skeleton
      setImageSearchLoading(true);
      // Determine if we should trigger search (we can't call handleImageSearch directly here effectively because of closure staleness if not careful,
      // but since handleImageSearch is a callback dep, we can use it if we add it to deps, OR just set triggers)
      // Actually, handleImageSearch is stable.
      handleImageSearch("", source, 1);
    }
  }, [handleImageSearch]);

  // Random Image Handler for Unsplash/Pexels
  const handleRandomImage = async () => {
    setGenerating(true);
    try {
      const result = await getRandomImage(imageSource);
      if (result) {
        await loadSelectedMeme(result);
      } else {
        toast.error(`Failed to get random ${imageSource} image`);
      }
    } catch (e) {
      console.error("Random image error:", e);
      toast.error("Error fetching random image");
    } finally {
      setGenerating(false);
    }
  };

  // Pexels Video Search Handler
  const handlePexelsVideoSearch = async (query, page = 1) => {
    // Allow empty query to fetch popular videos
    // if (!query.trim()) return;

    // 400ms debounce
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    // Clear previous results if new search
    if (page === 1) {
      setPexelsVideoResults([]);
      setPexelsVideoTotalPages(0);
    }

    setPexelsVideoLoading(true);
    setPexelsVideoPage(page);
    setPexelsVideoQuery(query);

    searchTimeoutRef.current = setTimeout(async () => {
      // Abort previous
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        const { results, totalPages } = await searchPexelsVideos(
          query,
          page,
          abortControllerRef.current.signal
        );

        if (page === 1) {
          setPexelsVideoResults(results);
        } else {
          setPexelsVideoResults(prev => [...prev, ...results]);
        }
        setPexelsVideoTotalPages(totalPages);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error(e);
          toast.error("Failed to search Pexels videos");
        }
      } finally {
        setPexelsVideoLoading(false);
      }
    }, 400);
  };

  // Random Video Handler (Pexels)
  const handleRandomVideo = async () => {
    setGenerating(true);
    try {
      const result = await getRandomPexelsVideo();
      if (result) {
        await loadSelectedMeme(result);
      } else {
        toast.error("Failed to get random video");
      }
    } catch (e) {
      console.error("Random video error:", e);
      toast.error("Error fetching random video");
    } finally {
      setGenerating(false);
    }
  };

  const updateSelectedPanel = (url, memeData, blob) => {
    updateState((prev) => {
      const newPanels = prev.panels.map((p) =>
        p.id === prev.activePanelId
          ? {
            ...p,
            url: url,
            isVideo: memeData.isVideo || false,
            isGif: memeData.isGif || false, // Fix: Don't assume non-video is GIF. Only set if explicitly true.
            source: memeData.source || 'upload', // PERSIST SOURCE for export logic
            sourceUrl: memeData.shareUrl || memeData.sourceUrl || null, // Fix: Clear stale sourceUrl from previous GIFs
            sourceBlob: blob,
            objectFit: "cover",
            posX: 50,
            posY: 50,
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
  const [isVibeShifting, setIsVibeShifting] = useState(false);
  const [isStyleDnaing, setIsStyleDnaing] = useState(false);
  const [isAutoLayouting, setIsAutoLayouting] = useState(false);
  const [isMemeIQing, setIsMemeIQing] = useState(false);
  const [isEmojiSaucing, setIsEmojiSaucing] = useState(false);
  const vibeShiftIndexRef = useRef(0);
  const styleDnaIndexRef = useRef(0);
  const fineTuneRef = useRef(null);
  const mobileCollapseRef = useRef(null);

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

    // SKIP PRE-PROCESSING FOR VIDEOS/GIFS
    // They are rendered per-frame in renderService.js (applyDeepFry) to support animation.
    // Trying to deep-fry a video as a static image in the worker will fail with encoding errors.
    const isGif = activePanel.url.toLowerCase().includes('.gif') || activePanel.url.startsWith('data:image/gif');
    if (activePanel.isVideo || isGif) {
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
          const yCoord = canvasContainerRef.current.getBoundingClientRect().top + window.scrollY - 56; // 48px mobile top bar + 8px breathing room
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
        // Stop movement immediately if long-press has triggered
        if (longPressTriggeredRef.current) return;

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
          let rawX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffsetRef.current.x;
          let rawY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffsetRef.current.y;
          // Boundary clamping: creates invisible walls at edges
          const hasTopCaption = (meme.paddingTop || 0) > 0;
          const hasBottomCaption = (meme.paddingBottom || 0) > 0;
          const minY = hasTopCaption ? 2 : 5;
          const maxY = hasBottomCaption ? 98 : 95;

          rawX = Math.max(10, Math.min(90, rawX));
          rawY = Math.max(minY, Math.min(maxY, rawY));
          const shiftHeld = e.shiftKey;

          updateTransient((prev) => {
            let x = rawX;
            let y = rawY;

            // Snap-to-guide calculation (hold Shift to disable)
            if (!shiftHeld) {
              const SNAP_THRESHOLD = 2;
              // Use pre-computed snap points from drag start (avoids 5 array allocations per frame)
              const cached = snapPointsCacheRef.current;
              const snapXPoints = cached ? cached.x : [33.33, 50, 66.67];
              const snapYPoints = cached ? cached.y : [33.33, 50, 66.67];

              let closestX = null, minDistX = SNAP_THRESHOLD;
              for (const pt of snapXPoints) {
                const d = Math.abs(x - pt);
                if (d < minDistX) { minDistX = d; closestX = pt; }
              }
              let closestY = null, minDistY = SNAP_THRESHOLD;
              for (const pt of snapYPoints) {
                const d = Math.abs(y - pt);
                if (d < minDistY) { minDistY = d; closestY = pt; }
              }

              if (closestX !== null) x = closestX;
              if (closestY !== null) y = closestY;
              snapGuidesRef.current = { x: closestX, y: closestY };
            } else {
              snapGuidesRef.current = { x: null, y: null };
            }

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
        snapGuidesRef.current = { x: null, y: null };
        snapPointsCacheRef.current = null;
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

  // Debounced save - prevents flooding IndexedDB on every keystroke/drag
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!isHydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveState(memeHistory);
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
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
                isVideo: !!isVideo,
                isGif: !isVideo,
                source: first.source || 'giphy',
                sourceBlob: null,
                objectFit: "cover",
                posX: 50,
                posY: 50,
                filters: { ...DEFAULT_FILTERS }
              }
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
    const panelId = meme.activePanelId;
    setGenerating(true);
    // Clear any active toggle effects when loading new image
    setActiveEffects(prev => ({ ...prev, [panelId]: null }));
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
              ? { ...p, url: newMeme.url, sourceUrl: newMeme.shareUrl, isVideo: isVideo, isGif: !isVideo, source: newMeme.source || 'giphy', sourceBlob: null, objectFit: "cover", posX: 50, posY: 50, filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
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

        const updatePanelWithImage = (url, blob = null) => {
          updateState((prev) => {
            const newPanels = prev.panels.map(p =>
              p.id === prev.activePanelId
                ? { ...p, url, isVideo: false, sourceBlob: blob, objectFit: "cover", posX: 50, posY: 50, filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
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
          const response = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(newMeme.url)}`);
          if (!response.ok) throw new Error();
          const blob = await response.blob();
          // Use Object URL instead of data URL — avoids 33% base64 bloat
          const objectUrl = URL.createObjectURL(blob);
          if (requestId !== requestCounterRef.current) return;
          updatePanelWithImage(objectUrl, blob);
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
    setLastClickedEffect('chaos');
    // --- SPAM PROTECTION: 800ms cooldown (Heavy operations) ---
    const now = Date.now();
    if (now - chaosThrottleRef.current < 800) {
      return;
    }
    chaosThrottleRef.current = now;

    // Safety check for memes (Imgflip fallback)
    if (!allMemes || allMemes.length === 0) {
      toast.error("Memes are still loading...");
      return;
    }

    try {
      // 1. DECIDE SOURCE: Equal probability (25% each)
      // Sources: 'imgflip', 'giphy', 'unsplash', 'pexels'
      const sources = ['imgflip', 'giphy', 'unsplash', 'pexels'];
      const selectedSource = sources[Math.floor(Math.random() * sources.length)];

      let selectedMedia = null;
      let isVideo = false;
      let sourceUrl = null;
      let finalSource = selectedSource;
      let activeSourceBlob = null; // For Pexels/Unsplash if we fetch separately

      // HELPER: Random Chaos Keyword
      const getChaosKeyword = () => {
        const chaosKeywords = [
          "funny", "cat", "fail", "chaos", "reaction", "coding",
          "meme", "bruh", "shocked", "rage", "crying", "dance",
          "explosion", "fire", "based", "sus", "cursed", "skibidi",
          "dog", "animal", "wtf", "weird", "clown", "party"
        ];
        return chaosKeywords[Math.floor(Math.random() * chaosKeywords.length)];
      };

      // --- SOURCE LOGIC ---
      if (selectedSource === 'giphy') {
        const keyword = getChaosKeyword();
        // Use search, fallback to trending if empty result (unlikely with these keywords)
        let results = await searchGiphy(keyword);

        if (!results || results.length === 0) {
           // Fallback to trending
           results = await searchGiphy("");
        }

        if (results && results.length > 0) {
          const randomGif = results[Math.floor(Math.random() * results.length)];
          selectedMedia = randomGif.url;
          sourceUrl = randomGif.shareUrl;
          // Check if it's actually a video file (Giphy sometimes returns mp4s in direct urls)
          isVideo = !!selectedMedia.match(/\.(mp4|webm|mov)$/i);
          finalSource = 'giphy';
        }

      } else if (selectedSource === 'unsplash') {
         // Random Unsplash Image
         // We use the service function which handles tracking
         const randomImage = await getRandomImage('unsplash');
         if (randomImage) {
            // Unsplash requires track download trigger
            trackUnsplashDownload(randomImage);

            // For Unsplash/Pexels images, we want to try loading via Weserv or Blob to avoid taint if possible,
            // but `loadSelectedMeme` logic is complex to duplicate.
            // Let's use the URL directly for now, or fetch blob if we want to be safe.
            // Main.jsx's loadSelectedMeme does fetch blob. Let's replicate that safety.
            try {
              const response = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(randomImage.url)}`);
              if (response.ok) {
                 const blob = await response.blob();
                 selectedMedia = URL.createObjectURL(blob);
                 activeSourceBlob = blob;
              } else {
                 selectedMedia = randomImage.url;
              }
            } catch (e) {
               selectedMedia = randomImage.url;
            }

            sourceUrl = randomImage.photographerUrl; // Credit photographer in source
            isVideo = false;
            finalSource = 'unsplash';
         }

      } else if (selectedSource === 'pexels') {
         // 50% Photo, 50% Video
         const isPexelsVideo = Math.random() > 0.5;

         if (isPexelsVideo) {
            const randomVideo = await getRandomPexelsVideo();
            if (randomVideo) {
               selectedMedia = randomVideo.url;
               sourceUrl = randomVideo.photographerUrl;
               isVideo = true;
               finalSource = 'pexels_video';
            }
         } else {
            const randomPhoto = await getRandomImage('pexels');
             if (randomPhoto) {
                // Fetch blob for safety
                try {
                  const response = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(randomPhoto.url)}`);
                  if (response.ok) {
                     const blob = await response.blob();
                     selectedMedia = URL.createObjectURL(blob);
                     activeSourceBlob = blob;
                  } else {
                     selectedMedia = randomPhoto.url;
                  }
                } catch (e) {
                   selectedMedia = randomPhoto.url;
                }

                sourceUrl = randomPhoto.photographerUrl;
                isVideo = false;
                finalSource = 'pexels';
             }
         }
      }

      // --- FALLBACK: DEFAULT TO IMGFLIP ---
      // If any of the above failed to return media, or if 'imgflip' was selected
      if (!selectedMedia) {
        // Pick random from local meme deck
        const randomMeme = allMemes[Math.floor(Math.random() * allMemes.length)];

        // Fetch blob for Imgflip to avoid taint (reusing existing pattern)
        try {
           const response = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(randomMeme.url)}`);
           if (response.ok) {
              const blob = await response.blob();
              selectedMedia = URL.createObjectURL(blob);
              activeSourceBlob = blob;
           } else {
              selectedMedia = randomMeme.url;
           }
        } catch (e) {
           selectedMedia = randomMeme.url;
        }

        sourceUrl = null;
        isVideo = false;
        finalSource = 'imgflip';
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
        // Hue rotate animation is handled in CSS/Render, here we just set initial state or extreme values
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
              // If it's a video, it's NOT a GIF unless explicitly checked.
              // Logic check: Giphy returns isVideo=true/false based on file extension.
              // If it's NOT video, but has sourceUrl and is from Giphy, it's likely a GIF.
              isGif: !isVideo && finalSource === 'giphy',
              source: finalSource,
              sourceBlob: activeSourceBlob,
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

        const newTexts = randomQuote.map((line, idx) => {
          let baseY = idx === 0 ? 10 : (idx === 1 ? 50 : 90);
          if (randomQuote.length === 2) {
            baseY = idx === 0 ? 10 : 90;
          }

          return {
          id: crypto.randomUUID(),
          content: line,
          x: 50,
          y: baseY,
          rotation: 0,
          animation: null,
        };
      });

        // Add empty text input to ensure editor is active
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
        icon: chaosIcon,
        id: "chaos-mode",
        duration: 2000
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
    setLastClickedEffect('caption');
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

      const newTexts = randomQuote.map((line, idx) => {
        let yPos = idx === 0 ? 10 : (idx === 1 ? 50 : 90);
        if (randomQuote.length === 2) {
          yPos = idx === 0 ? 10 : 90;
        }

        return {
        id: crypto.randomUUID(),
        content: line,
        x: 50,
        y: yPos,
        rotation: 0,
        animation: currentAnimation, // Preserve animation!
      };
    });
      newTexts.push({ id: crypto.randomUUID(), content: "", x: 50, y: 90, rotation: 0, animation: currentAnimation });
      return { ...prev, texts: newTexts };
    });
    remixClickCountRef.current.caption++;
    toast("Caption remixed!", {
      icon: (
        <ToastIcon src="/animations/speech-bubble.json" />
      ),
      id: "remix-caption",
      duration: 2000
    });

    showLongPressHint();
  }

  function handleStyleShuffle() {
    setLastClickedEffect('style');
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
      ),
      id: "remix-style",
      duration: 2000
    });
  }

  function handleStyleDna() {
    setIsStyleDnaing(true);
    setLastClickedEffect('styledna');

    // 1. Tokenize meme.name (which contains API metadata like Giphy title, Imgflip name)
    const allText = (meme.name || "").toLowerCase();
    const tokens = new Set(allText.split(/\W+/).filter(Boolean));

    // 2. Score each style against the tokens
    let topStyleId = null;
    let topScore = 0;
    for (const [styleId, keywords] of Object.entries(STYLE_KEYWORDS)) {
      const score = keywords.filter(kw => {
        return kw.includes(" ") ? allText.includes(kw) : tokens.has(kw);
      }).length;
      if (score > topScore) { topScore = score; topStyleId = styleId; }
    }

    // 3. Select the best preset, or fallback to cycling
    let currentPreset;

    if (topScore > 0 && topStyleId && STYLE_DNA_PRESETS[topStyleId]) {
      // Pick a random variation from the matching category, but ensure it's not the same as the last one!
      const categoryPresets = STYLE_DNA_PRESETS[topStyleId];
      let randomIndex = Math.floor(Math.random() * categoryPresets.length);

      // Prevent picking the exact same variation twice in a row
      if (categoryPresets.length > 1 && randomIndex === styleDnaIndexRef.current) {
        randomIndex = (randomIndex + 1) % categoryPresets.length;
      }

      currentPreset = categoryPresets[randomIndex];
      styleDnaIndexRef.current = randomIndex;
    }

    if (!currentPreset) {
      // Fallback: Randomly pick from a safe, versatile list of categories, AND a random variation inside it.
      const safeFallbackIds = ['retro-vhs', 'corporate-minimal', 'cinematic', 'vintage-polaroid', 'neon-noir', 'lofi-late-night'];

      let randomCatIndex = Math.floor(Math.random() * safeFallbackIds.length);
      // Prevent picking the exact same fallback category twice in a row
      if (randomCatIndex === styleDnaIndexRef.current) {
        randomCatIndex = (randomCatIndex + 1) % safeFallbackIds.length;
      }
      styleDnaIndexRef.current = randomCatIndex;

      const fallbackCategoryId = safeFallbackIds[randomCatIndex];
      const fallbackPresets = STYLE_DNA_PRESETS[fallbackCategoryId] || STYLE_DNA_PRESETS["retro-vhs"];

      // Pick a random variation from that randomly chosen safe category
      currentPreset = fallbackPresets[Math.floor(Math.random() * fallbackPresets.length)];
    }

    // Trigger visual shimmer effect immediately
    triggerConfettiBurst(); // Let's use confetti while we build the real shimmer as fallback? Actually, req says 500ms shimmer overlay.
    // We already have 500ms shimmer overlay in the layout below via isStyleDnaing state true/false

    // Process updates
    startTransition(() => {
        // Apply global text properties and text animation
        updateState((prev) => {
            // Check if active panel is video or gif to allow animation
            const activePanel = prev.panels.find(p => p.id === prev.activePanelId) || prev.panels[0];
            const isAnimatedMeme = activePanel?.isVideo || activePanel?.isGif;

            return {
                ...prev,
                fontFamily: currentPreset.fontFamily,
                textColor: currentPreset.textColor,
                textBgColor: currentPreset.textBgColor,
                textShadow: currentPreset.textShadow,
                letterSpacing: currentPreset.letterSpacing,
                texts: prev.texts.map(t => {
                  let assignedAnimation = t.animation;
                  if (t.content.trim()) {
                      if (currentPreset.animation === 'none') {
                          assignedAnimation = null;
                      } else if (isAnimatedMeme) {
                          assignedAnimation = currentPreset.animation;
                      }
                      // If it's a static image and the preset has an animation, we just leave it as null (or whatever it was)
                      // This ensures we don't apply new animations to static images via Style DNA.
                  }

                  return {
                      ...t,
                      animation: assignedAnimation
                  };
                }),
                // Apply Image filters to ALL panels
                panels: prev.panels.map(p => ({
                    ...p,
                    filters: { ...p.filters, ...currentPreset.filters },
                    processedImage: null,
                    processedDeepFryLevel: 0
                }))
            };
        });
    });

    // Remove variation numbers (e.g. "Retro VHS 1" -> "Retro VHS")
    const displayName = currentPreset.name.replace(/\s+\d+$/, '');

    toast(`Style DNA applied: ${displayName}`, {
      icon: <ToastIcon src="/animations/performing-arts.json" />,
      id: "styledna",
      duration: 2000
    });

    // Remove shimmer after 500ms
    setTimeout(() => {
        setIsStyleDnaing(false);
    }, 500);
  }

  function handleFilterFrenzy() {
    setLastClickedEffect('filter');
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
      ),
      id: "filter-mode",
      duration: 2000
    });
  }

  function handleVibeCheck() {
    setLastClickedEffect('vibe');
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
      ),
      id: "vibe-check",
      duration: 2000
    });
  }

  function handleExtremeDeepFry() {
    setLastClickedEffect('deepfry');
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
        ),
        id: "deep-fry",
        duration: 2000
      });
    } else {
      toast("Deep Fry removed", {
        icon: (
          <ToastIcon src="/animations/broom.json" />
        ),
        id: "deep-fry",
        duration: 2000
      });
    }
  }

  // ========== NEW REMIX HANDLERS ==========

  async function handleStickerfy() {
    setLastClickedEffect('stickerfy');
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
        icon: <ToastIcon src="/animations/filter-frenzy.json" />,
        id: "stickerfy",
        duration: 2000
      });
    } catch (error) {
      console.error("Stickerfy error:", error);
      toast("Failed to load stickers", {
        icon: <ToastIcon src="/animations/filter-frenzy.json" />
      });
    }
  }

  function handleNuked() {
    setLastClickedEffect('nuked');
    const panelId = meme.activePanelId;
    const isActive = activeEffects[panelId] === 'nuked';

    if (isActive) {
      // Toggle off - reset to default filters
      startTransition(() => {
        updateState((prev) => ({
          ...prev,
          panels: prev.panels.map(p =>
            p.id === panelId
              ? { ...p, filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
              : p
          )
        }));
      });
      setActiveEffects(prev => ({ ...prev, [panelId]: null }));
      toast("Nuked removed", {
        icon: <ToastIcon src="/animations/filter-frenzy.json" />,
        id: "nuked",
        duration: 2000
      });
      return;
    }

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
          p.id === panelId
            ? { ...p, filters: nukedFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });

    setActiveEffects(prev => ({ ...prev, [panelId]: 'nuked' }));
    remixClickCountRef.current.nuked = (remixClickCountRef.current.nuked || 0) + 1;
    toast("Nuked applied", {
      icon: <ToastIcon src="/animations/filter-frenzy.json" />,
      id: "nuked",
      duration: 2000
    });
  }

  function handleGlitch() {
    setLastClickedEffect('glitch');
    const panelId = meme.activePanelId;

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

    const currentIndex = remixClickCountRef.current.glitch || 0;

    // After cycling through all presets, reset to defaults
    if (currentIndex >= glitchPresets.length) {
      startTransition(() => {
        updateState((prev) => ({
          ...prev,
          panels: prev.panels.map(p =>
            p.id === panelId
              ? { ...p, filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
              : p
          )
        }));
      });
      setActiveEffects(prev => ({ ...prev, [panelId]: null }));
      remixClickCountRef.current.glitch = 0;
      toast("Glitch removed", {
        icon: <ToastIcon src="/animations/filter-frenzy.json" />,
        id: "glitch",
        duration: 2000
      });
      return;
    }

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
          p.id === panelId
            ? { ...p, filters: glitchFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });

    setActiveEffects(prev => ({ ...prev, [panelId]: 'glitch' }));
    remixClickCountRef.current.glitch = currentIndex + 1;
    toast(`${preset.name} glitch applied (${currentIndex + 1}/${glitchPresets.length})`, {
      icon: <ToastIcon src="/animations/filter-frenzy.json" />,
      id: "glitch",
      duration: 2000
    });
  }

  function handleCursed() {
    setLastClickedEffect('cursed');
    const panelId = meme.activePanelId;
    const isActive = activeEffects[panelId] === 'cursed';

    if (isActive) {
      // Toggle off - reset to default filters
      startTransition(() => {
        updateState((prev) => ({
          ...prev,
          panels: prev.panels.map(p =>
            p.id === panelId
              ? { ...p, filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
              : p
          )
        }));
      });
      setActiveEffects(prev => ({ ...prev, [panelId]: null }));
      toast("Cursed removed", {
        icon: <ToastIcon src="/animations/filter-frenzy.json" />,
        id: "cursed",
        duration: 2000
      });
      return;
    }

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
          p.id === panelId
            ? { ...p, filters: cursedFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });

    setActiveEffects(prev => ({ ...prev, [panelId]: 'cursed' }));
    remixClickCountRef.current.cursed = (remixClickCountRef.current.cursed || 0) + 1;
    toast("Cursed applied", {
      icon: <ToastIcon src="/animations/filter-frenzy.json" />,
      id: "cursed",
      duration: 2000
    });
  }

  function handleConfettiBlast() {
    setLastClickedEffect('confetti');
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
      icon: <ToastIcon src="/animations/confetti.json" />,
      id: "confetti",
      duration: 2000
    });
  }

  function handleTimeWarp() {
    setLastClickedEffect('timewarp');
    const panelId = meme.activePanelId;

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

    const currentIndex = remixClickCountRef.current.timewarp || 0;

    // After cycling through all presets, reset to defaults
    if (currentIndex >= timePresets.length) {
      startTransition(() => {
        updateState((prev) => ({
          ...prev,
          panels: prev.panels.map(p =>
            p.id === panelId
              ? { ...p, filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
              : p
          )
        }));
      });
      setActiveEffects(prev => ({ ...prev, [panelId]: null }));
      remixClickCountRef.current.timewarp = 0;
      toast("Time Warp removed", {
        icon: <ToastIcon src="/animations/filter-frenzy.json" />,
        id: "time-warp",
        duration: 2000
      });
      return;
    }

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
          p.id === panelId
            ? { ...p, filters: warpFilters, processedImage: null, processedDeepFryLevel: 0 }
            : p
        )
      }));
    });

    setActiveEffects(prev => ({ ...prev, [panelId]: 'timewarp' }));
    remixClickCountRef.current.timewarp = currentIndex + 1;
    toast(`${preset.name} applied (${currentIndex + 1}/${timePresets.length})`, {
      icon: <ToastIcon src="/animations/filter-frenzy.json" />,
      id: "time-warp",
      duration: 2000
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
    // Use transient update during typing to avoid flooding undo history
    // History commit happens on blur via handleStyleCommit
    updateTransient((prev) => {
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
      if (newTexts.length < visibleCount) {
        newTexts = [...newTexts];
        while (newTexts.length < visibleCount) {
          newTexts.push({
            id: crypto.randomUUID(),
            content: "",
            x: 50,
            y: 50,
            rotation: 0,
            scale: 1,
            animation: null
          });
        }
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
    const panelId = meme.activePanelId;
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
    // Clear any active toggle effects for this panel
    setActiveEffects(prev => ({ ...prev, [panelId]: null }));
    toast("Filters reset", {
      icon: (
        <ToastIcon src="/animations/performing-arts.json" />
      ),
      id: "filters-reset",
      duration: 2000
    });
  }

  function handleStyleChange(event, shouldCommit = false) {
    const { value, name } = event.currentTarget;

    // If we have a selected shape and we're changing shape properties, update it directly
    if (selectedShapeId && (name === 'shapeFill' || name === 'shapeStroke' || name === 'shapeStrokeWidth')) {
       // Also update global state so next shape uses this too
       const shapeUpdate = (prev) => {
         const updatedShapes = (prev.shapes || []).map(s =>
           s.id === selectedShapeId
             ? {
                 ...s,
                 // Map the global property name to the shape property (e.g. shapeFill -> fill)
                 stroke: name === 'shapeStroke' ? value : s.stroke,
                 fill: name === 'shapeFill' ? value : s.fill,
                 strokeWidth: name === 'shapeStrokeWidth' ? parseInt(value) : s.strokeWidth
               }
             : s
         );
         return { ...prev, [name]: value, shapes: updatedShapes };
       };

       if (shouldCommit) {
         updateState(shapeUpdate);
       } else {
         startTransition(() => {
           updateTransient(shapeUpdate);
         });
       }
       return;
    }

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
    const panelId = meme.activePanelId;
    // Clear active toggle effect when user manually adjusts filters
    if (activeEffects[panelId]) {
      setActiveEffects(prev => ({ ...prev, [panelId]: null }));
    }
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
    updateState((prev) => ({ ...prev }));
  }

  function handleDrawCommit(newPath) {
    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        drawings: [...prev.drawings, newPath],
      }));
    });
  }

  function handleAddShape(newShape) {
    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        shapes: [...(prev.shapes || []), newShape],
        // Also update global styles to match the new shape (so next one matches)
        shapeStroke: newShape.stroke,
        shapeFill: newShape.fill,
        shapeStrokeWidth: newShape.strokeWidth,
      }));
      // Auto-select the new shape
      setSelectedShapeId(newShape.id);
    });
  }

  function handleShapeSelect(shapeId) {
    if (!shapeId) {
      setSelectedShapeId(null);
      return;
    }

    const shape = meme.shapes?.find(s => s.id === shapeId);
    if (shape) {
      // Sync global state to match selected shape so UI controls reflect it
      startTransition(() => {
        updateTransient((prev) => ({
          ...prev,
          shapeStroke: shape.stroke,
          shapeFill: shape.fill,
          shapeStrokeWidth: shape.strokeWidth
        }));
      });
    }
    setSelectedShapeId(shapeId);
  }

  function handleUpdateShape(id, updates) {
    updateState((prev) => ({
      ...prev,
      shapes: (prev.shapes || []).map((s) => (s.id === id ? { ...s, ...(typeof updates === 'function' ? updates(s) : updates) } : s)),
    }));
  }

  function handleDeleteShape(id) {
    updateState((prev) => ({
      ...prev,
      shapes: (prev.shapes || []).filter((s) => s.id !== id),
    }));
    setSelectedShapeId(null);
  }

  function handleClearDrawings() {
    startTransition(() => {
      updateState((prev) => ({ ...prev, drawings: [], shapes: [] }));
      setSelectedShapeId(null);
    });
    toast.success("Drawings & Shapes cleared");
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
      const { exportImageAsPng } = await import("../../services/gifExporter");
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
    if (!file) return;

    event.target.value = ''; // Reset input
    const isGif = file.type === "image/gif";
    const isVideo = file.type.startsWith("video/");

    // Helper to apply image to canvas
    const applyImageToCanvas = (imageSource, isProcessed = false) => {
      const objectUrl = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === prev.activePanelId
            ? {
                ...p,
                url: objectUrl,
                sourceBlob: isProcessed ? null : file,
                isVideo: isVideo,
                isGif: isGif,
                source: 'upload',
                objectFit: "cover",
                posX: 50,
                posY: 50,
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
    };

    // Show background removal prompt for images (not GIFs or videos)
    if (!isGif && !isVideo) {
      toast((t) => (
        <div className="flex flex-col gap-3 min-w-[200px]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            <span className="font-bold text-sm">Remove background?</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const toastId = toast.loading("Removing background...", { style: { minWidth: '250px' } });
                try {
                  const { removeImageBackground } = await import("../../services/backgroundRemover");
                  const blob = await removeImageBackground(file);
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    applyImageToCanvas(reader.result, true);
                    toast.success("Background removed!", { id: toastId });
                  };
                  reader.onerror = () => {
                    toast.error("Failed to process image", { id: toastId });
                    applyImageToCanvas(file);
                  };
                  reader.readAsDataURL(blob);
                } catch (err) {
                  console.error(err);
                  toast.error("Failed. Using original.", { id: toastId });
                  applyImageToCanvas(file);
                }
              }}
              className="flex-1 bg-brand text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors"
            >
              Yes, Magic
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                applyImageToCanvas(file);
              }}
              className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors"
            >
              No, Original
            </button>
          </div>
        </div>
      ), { duration: 8000, position: 'top-center', style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } });
    } else {
      // For GIFs and videos, apply directly without background removal prompt
      applyImageToCanvas(file);
    }
  }

  const handleCanvasDrop = useCallback(async (file, panelId) => {
    const isGif = file.type === "image/gif";
    const isVideo = file.type.startsWith("video/");

    // Helper to apply image to canvas panel
    const applyImageToPanel = (imageSource, isProcessed = false) => {
      const objectUrl = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
      startTransition(() => {
        updateState((prev) => {
          const newPanels = prev.panels.map(p =>
            p.id === panelId
              ? {
                  ...p,
                  url: objectUrl,
                  sourceBlob: isProcessed ? null : file,
                  isVideo: isVideo,
                  isGif: isGif,
                  source: 'upload',
                  objectFit: "cover",
                  posX: 50,
                  posY: 50,
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
            mode: newPanels.some(p => p.isVideo || p.isGif) ? "video" : "image"
          };
        });
      });
    };

    // Show background removal prompt for images (not GIFs or videos)
    if (!isGif && !isVideo) {
      toast((t) => (
        <div className="flex flex-col gap-3 min-w-[200px]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            <span className="font-bold text-sm">Remove background?</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const toastId = toast.loading("Removing background...", { style: { minWidth: '250px' } });
                try {
                  const { removeImageBackground } = await import("../../services/backgroundRemover");
                  const blob = await removeImageBackground(file);
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    applyImageToPanel(reader.result, true);
                    toast.success("Background removed!", { id: toastId });
                  };
                  reader.onerror = () => {
                    toast.error("Failed to process image", { id: toastId });
                    applyImageToPanel(file);
                  };
                  reader.readAsDataURL(blob);
                } catch (err) {
                  console.error(err);
                  toast.error("Failed. Using original.", { id: toastId });
                  applyImageToPanel(file);
                }
              }}
              className="flex-1 bg-brand text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors"
            >
              Yes, Magic
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                applyImageToPanel(file);
              }}
              className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors"
            >
              No, Original
            </button>
          </div>
        </div>
      ), { duration: 8000, position: 'top-center', style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } });
    } else {
      // For GIFs and videos, apply directly without background removal prompt
      applyImageToPanel(file);
    }
  }, [updateState]);

  // Clipboard paste: Ctrl+V to paste images onto active panel
  useEffect(() => {
    const onPaste = (e) => {
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;

      const clipboard = e.clipboardData;
      if (!clipboard) return;

      // Check items (Chrome, Edge, modern browsers)
      if (clipboard.items && clipboard.items.length > 0) {
        for (let i = 0; i < clipboard.items.length; i++) {
          if (clipboard.items[i].type.startsWith('image/')) {
            e.preventDefault();
            const file = clipboard.items[i].getAsFile();
            if (file) handleCanvasDrop(file, meme.activePanelId);
            return;
          }
        }
      }

      // Fallback: check files (Firefox, Safari)
      if (clipboard.files && clipboard.files.length > 0) {
        const file = clipboard.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          handleCanvasDrop(file, meme.activePanelId);
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleCanvasDrop, meme.activePanelId]);

  // Full-page drag-and-drop: show overlay when dragging files over the window
  useEffect(() => {
    const onDragEnter = (e) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer?.types?.includes('Files')) setIsDragOver(true);
    };
    const onDragLeave = (e) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragOver(false);
      }
    };
    const onDragOver = (e) => e.preventDefault();
    // Capture-phase: always reset overlay (even if panel stopPropagation'd the bubble)
    const onDropReset = () => {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    };
    // Bubble-phase: handle files dropped outside canvas panels
    const onDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        handleCanvasDrop(file, meme.activePanelId);
      }
    };
    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDropReset, true);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDropReset, true);
      document.removeEventListener('drop', onDrop);
    };
  }, [handleCanvasDrop, meme.activePanelId]);

  const handleClearPanel = useCallback((panelId) => {
    startTransition(() => {
      updateState((prev) => {
        const newPanels = prev.panels.map(p =>
          p.id === panelId
            ? { ...p, url: null, sourceUrl: null, isVideo: false, isGif: false, objectFit: "cover", posX: 50, posY: 50, filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
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
        shapes: [],
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
    toast.success("Effects cleared!", { id: "effects-cleared", duration: 2000 });
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
  }

  function addSticker(content, type = "emoji", isAnimated = false, sourceBlob = null) {
    let url = content;
    let finalSourceBlob = sourceBlob;

    // Handle case where content IS the blob (e.g. from clipboard or dragdrop)
    if (content instanceof Blob || content instanceof File) {
        url = URL.createObjectURL(content);
        finalSourceBlob = content;
    }

    updateState((prev) => ({
      ...prev,
      stickers: [...prev.stickers, {
          id: crypto.randomUUID(),
          url,
          type,
          x: 50,
          y: 50,
          scale: 1,
          isAnimated,
          animation: null,
          sourceBlob: finalSourceBlob
      }],
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
      ),
      id: "sticker-removed",
      duration: 2000
    });
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
    toast.success("Text removed", { id: "text-removed", duration: 2000 });
  }

  function handleCanvasPointerDown() {
    // Guard: only update state if something would actually change
    // Avoids creating unnecessary history entries + re-renders on every canvas touch
    if (meme.selectedId || editingId) {
      startTransition(() => {
        updateState((prev) => {
          if (prev.selectedId === null) return prev; // Identity check - no new object
          return { ...prev, selectedId: null };
        });
      });
      setEditingId(null);
    }
    // Deselect any selected shape when clicking on non-shape canvas area.
    // Shape tool clicks stop propagation in handleDrawStart so they won't reach here.
    setSelectedShapeId(null);
    globalLastTapRef.current = 0;
    // Collapse mobile bottom bar layers on canvas tap
    mobileCollapseRef.current?.();
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
        icon: <ToastIcon src="/animations/filter-frenzy.json" />,
        id: "magic-logic"
      });
      setIsMagicGenerating(false);

      showLongPressHint();
    }, 800);
  }

  function handleVibeShift() {
    setIsVibeShifting(true);

    setTimeout(() => {
      const toneKey = TONE_NAMES[vibeShiftIndexRef.current % TONE_NAMES.length];
      vibeShiftIndexRef.current++;
      const captions = TONE_BANK[toneKey];
      const randomIndex = Math.floor(Math.random() * captions.length);
      const picked = captions[randomIndex];

      updateState((prev) => {
        const newTexts = prev.texts.map((t, i) => ({
          ...t,
          content: picked[i] || "",
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

        return { ...prev, texts: newTexts };
      });

      toast(`Vibe shifted to ${TONE_LABELS[toneKey]}`, {
        duration: 2000,
        icon: <ToastIcon src="/animations/vibe-check-toast.json" />,
        id: "vibe-shift"
      });
      setIsVibeShifting(false);
      showLongPressHint();
    }, 600);
  }

  function handleAutoLayout() {
    const url = activePanel?.url;
    if (!url) {
      toast.error("Load an image first", { id: "auto-layout-err" });
      return;
    }

    if (activePanel?.isVideo) {
      toast.error("Auto Layout works on images only", { id: "auto-layout-err" });
      return;
    }

    const filledTexts = (meme.texts || []).filter(t => (t.content || "").trim().length > 0);
    if (filledTexts.length === 0) {
      toast.error("Add some text first", { id: "auto-layout-err" });
      return;
    }

    setIsAutoLayouting(true);

    setTimeout(async () => {
      try {
        const positions = await computeAutoLayout(url, filledTexts.length, meme.textColor || "#ffffff");

        updateState((prev) => {
          const filled = prev.texts.filter(t => (t.content || "").trim().length > 0);
          const empty = prev.texts.filter(t => (t.content || "").trim().length === 0);

          const repositioned = filled.map((t, i) => ({
            ...t,
            x: positions[i]?.x ?? t.x,
            y: positions[i]?.y ?? t.y,
          }));

          return { ...prev, texts: [...repositioned, ...empty] };
        });

        toast("Layout optimized", {
          duration: 2000,
          icon: <ToastIcon src="/animations/filter-frenzy.json" />,
          id: "auto-layout"
        });
      } catch (err) {
        console.warn("Auto layout failed:", err);
        toast.error("Could not analyze image", { id: "auto-layout-err" });
      } finally {
        setIsAutoLayouting(false);
      }
    }, 500);
  }

  // --- 11. AI FEATURE: EMOJI SAUCE (Context-Aware Stickers) ---
  function handleEmojiSauce() {
    setIsEmojiSaucing(true);

    try {
      // 1. Tokenize all text currently on the canvas
      const allText = (meme.texts || []).map(t => t.content).join(" ").toLowerCase();

      if (allText.trim().length === 0) {
        toast("Type some text first to add Emoji Sauce!", { icon: "✍️", duration: 3000 });
        setIsEmojiSaucing(false);
        return;
      }

      updateState((prev) => {
        const prevTexts = prev.texts || [];

        const updatedTexts = prevTexts.map(t => {
          const content = t.content || "";
          if (content.trim().length > 0) {
            // Strip trailing whitespace and extended pictographics (emojis)
            // so clicking the button multiple times acts as a "reroll" rather than stacking infinitely
            let cleanContent = content.replace(/[\s\p{Extended_Pictographic}]+$/gu, "");
            if (cleanContent.length === 0) cleanContent = content.trim();

            // 1. Prepare text with spaces explicitly so word bounds \b can match edges securely
            const textToTest = " " + cleanContent.toLowerCase() + " ";

            // 2. Find matching emojis using pre-compiled regex arrays
            let matchedEmojis = [];
            for (const { emojis, regexes } of COMPILED_EMOJI_MAP) {
              for (const regex of regexes) {
                if (regex.test(textToTest)) {
                  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                  matchedEmojis.push(randomEmoji);
                  break; // Move to next category for diversity
                }
              }
            }

            // 3. Determine how many emojis to add (1 to 2 max)
            let emojisToAdd = [];
            const uniqueMatched = [...new Set(matchedEmojis)];

            if (uniqueMatched.length > 0) {
              // Only take 1 or 2 matched emojis to keep it clean
              const count = Math.random() > 0.5 ? 1 : 2;
              emojisToAdd = uniqueMatched.slice(0, count);
            } else {
              // Fallback for this line (only 1 or 2 universal emojis)
              const count = Math.random() > 0.6 ? 1 : 2;
              const shuffledFallback = [...FALLBACK_EMOJIS].sort(() => 0.5 - Math.random());
              emojisToAdd = shuffledFallback.slice(0, count);
            }

            // Append natively to the raw cleaned string
            const suffix = " " + emojisToAdd.join("");

            return {
              ...t,
              content: cleanContent + suffix
            };
          }
          return t;
        });

        return {
          ...prev,
          texts: updatedTexts
        };
      });

      toast.success("Emoji Sauce applied! 💥");

    } catch (e) {
      console.error(e);
      toast.error("Failed to add Emoji Sauce");
    } finally {
      setIsEmojiSaucing(false);
    }
  }


  function handleMemeIQ() {
    setIsMemeIQing(true);

    setTimeout(() => {
      // 1. Collect & tokenize all text content
      const allText = (meme.texts || [])
        .map(t => (t.content || "").toLowerCase())
        .join(" ");
      const tokens = new Set(allText.split(/\W+/).filter(Boolean));

      // 2. Score each template in our keyword map against user text
      let topTemplate = null;
      let topScore = 0;
      for (const [templateName, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
        const score = keywords.filter(kw => {
          // Support multi-word keywords too
          return kw.includes(" ") ? allText.includes(kw) : tokens.has(kw);
        }).length;
        if (score > topScore) { topScore = score; topTemplate = templateName; }
      }

      const isMatch = topScore >= MEME_IQ_THRESHOLD && topTemplate !== null;
      const suggestionName = isMatch
        ? topTemplate
        : TRENDING_TEMPLATES[Math.floor(Math.random() * TRENDING_TEMPLATES.length)];

      const message = isMatch
        ? `Meme IQ says: This caption is perfect for "${suggestionName}"`
        : `This would slap on "${suggestionName}"\u2014just saying`;

      // 3. Find the matching template from the already-loaded allMemes list
      const templateMeme = allMemes.find(m =>
        m.name.toLowerCase() === suggestionName.toLowerCase()
      );

      toast(message, {
        duration: 5000,
        icon: "\uD83E\uDDE0",
        id: "meme-iq",
      });

      // 4. Auto-load the suggested template
      if (templateMeme) {
        loadSelectedMeme(templateMeme);
      }

      setIsMemeIQing(false);
    }, 700);
  }

  const handlePointerDown = useCallback(
    (e, id) => {
      e.stopPropagation();

      startPosRef.current = { x: e.clientX, y: e.clientY };
      longPressTriggeredRef.current = false;

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
          longPressTriggeredRef.current = true;
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
              id: "sticker-selected",
              duration: 1000
            });
          }, 350);
        }, 600); // 600ms for long press on sticker (slightly longer to distinguish from drag/tap)

      } else if (isText) {
        longPressTimerRef.current = setTimeout(() => {
          longPressTriggeredRef.current = true;
          startTransition(() => {
            updateState((prev) => ({ ...prev, selectedId: id }));
          });
          setDraggedId(null);
          if (navigator.vibrate) navigator.vibrate(50);
          toast("Text Selected!", {
            icon: (
              <ToastIcon src="/animations/filter-frenzy.json" />
            ),
            id: "text-selected",
            duration: 1000
          });
        }, 700);
      }

      setDraggedId(id);
      // Pre-compute snap points once at drag start (avoids rebuilding 60x/sec during drag)
      const STATIC_LINES = [33.33, 50, 66.67];
      const siblings = [...meme.texts, ...meme.stickers].filter(item => item.id !== id);
      snapPointsCacheRef.current = {
        x: [...STATIC_LINES, ...siblings.map(s => s.x)],
        y: [...STATIC_LINES, ...siblings.map(s => s.y)],
      };
      if (navigator.vibrate) navigator.vibrate(20);
    },
    [meme.stickers, meme.texts, updateState],
  );



  // Helper: Sanitize Filename
  const getSafeFilename = (name) => {
    return (name || 'meme')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
      || 'meme';
  };

  // Helper: Execute GIF export
  const doGifExport = useCallback(async (options = {}) => {
    if (!memeRef.current) return;

    const { stickersOnly = false } = options;

    exportToast.start('download', 'gif');

    try {
      const exportMeme = { ...meme, stickersOnly };
      const { exportMemeAsGif: exportGif } = await safeImport(() => import("../../services/gifExporter"));

      const onProgress = ({ stage, progress }) => {
        exportToast.setStage(stage, { progress });
      };

      const blob = await exportGif(exportMeme, meme.texts, meme.stickers, onProgress);

      if (meme.id) registerShare(meme.id, searchQuery);

      exportToast.setStage('finalizing');

      const safeName = getSafeFilename(meme.name);
      const filename = `${safeName}-${stickersOnly ? 'stickers' : ''}-${Date.now()}.gif`;
      await triggerDownload(blob, filename);
      triggerFireworks();

      exportToast.success("Downloaded!");
    } catch (err) {
      console.error("GIF Export Error:", err);
      const isChunkError = err.message?.includes("failed to fetch") || err.message?.includes("Importing a module script failed");
      if (isChunkError) {
        exportToast.error("Update available! Please refresh the page.");
      } else {
        exportToast.error("Export failed");
      }
    }
  }, [meme, searchQuery, exportToast]);

  // Helper: Execute MP4 export
  const handleExportMp4 = useCallback(async () => {
    if (!memeRef.current) return;

    exportToast.start('download', 'mp4');

    try {
      const { exportMemeAsMp4 } = await safeImport(() => import("../../services/mp4Exporter"));

      const onProgress = ({ stage, progress }) => {
        exportToast.setStage(stage, { progress });
      };

      const blob = await exportMemeAsMp4(meme, meme.texts, meme.stickers, onProgress);

      if (meme.id) registerShare(meme.id, searchQuery);

      exportToast.setStage('finalizing');

      const safeName = getSafeFilename(meme.name);
      const filename = `${safeName}-${Date.now()}.mp4`;
      await triggerDownload(blob, filename);
      triggerFireworks();

      exportToast.success("MP4 Downloaded!");
    } catch (err) {
      console.error("MP4 Export Error:", err);
      const isChunkError = err.message?.includes("failed to fetch") || err.message?.includes("Importing a module script failed");
      if (isChunkError) {
        exportToast.error("Update available! Please refresh the page.");
      } else {
        exportToast.error("Export failed: " + err.message);
      }
    }
  }, [meme, searchQuery, exportToast]);

  // Helper: Execute static PNG export
  const doStaticExport = useCallback(async (options = {}) => {
    if (!memeRef.current) return;

    const { stickersOnly = false, forceStatic = false } = options;

    exportToast.start('download', 'png');

    try {
      exportToast.setStage('preparing');

      if (stickersOnly) {
        exportToast.setStage('rendering');
        const { exportStickersAsPng } = await safeImport(() => import("../../services/gifExporter"));
        const blob = await exportStickersAsPng(meme, meme.stickers);

        exportToast.setStage('finalizing');
        const filename = `stickers-${Date.now()}.png`;
        await triggerDownload(blob, filename);
        triggerFireworks();
        exportToast.success("Downloaded!");
      } else {
        exportToast.setStage('rendering');
        const { exportImageAsPng } = await safeImport(() => import("../../services/gifExporter"));
        const blob = await exportImageAsPng(meme, meme.texts, meme.stickers);

        if (meme.id) registerShare(meme.id, searchQuery);

        exportToast.setStage('finalizing');
        const safeName = getSafeFilename(meme.name);
        const filename = `${safeName}-${Date.now()}.png`;
        await triggerDownload(blob, filename);
        triggerFireworks();
        exportToast.success("Downloaded!");
      }
    } catch (err) {
      console.error("PNG Export Error:", err);
      const isChunkError = err.message?.includes("failed to fetch");
      if (isChunkError) {
        exportToast.error("Update available! Please refresh.");
      } else {
        exportToast.error("Export failed");
      }
    }
  }, [meme, searchQuery, exportToast]);

  async function handleDownload() {
    if (!memeRef.current) return;

    // Determine content types
    const hasVideoPanel = meme.panels.some(p => p.isVideo || p.isGif || (p.url && p.url.includes('.gif')));
    const hasGifSticker = meme.stickers.some(s => s.type === 'image' && (s.isAnimated || s.url.includes('.gif')));
    const hasAnimatedTextContent = hasAnimatedText(meme.texts);
    const hasAnyStickers = meme.stickers.length > 0;

    // If the base image is already animated (GIF/video), always export as GIF
    // Update: Now we offer MP4 option too, so show modal
    if (hasVideoPanel) {
      // doGifExport(); // OLD: Auto-export GIF
      setShowExportModal(true); // NEW: Show choice
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

    // 1. DETECT CONTENT TYPE & STATE
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
    const isUnmodified = !hasTextContent && !hasStickers && !hasDrawings && !hasFilterChanges;

    // Check if we can start with an existing public URL (Pass-through optimization)
    const isTenorGif = activePanel?.sourceUrl && activePanel.isVideo && activePanel.source !== 'pexels_video';
    const isGenericGif = activePanel?.url?.toLowerCase().includes('.gif') || activePanel?.sourceUrl?.toLowerCase().includes('.gif');
    let existingPublicUrl = null;
    if (isUnmodified && (isTenorGif || activePanel?.source === 'giphy' || (isGenericGif && activePanel?.sourceUrl?.startsWith('http')))) {
         existingPublicUrl = activePanel.sourceUrl || activePanel.url;
    }

    // Determine Animation Status
    const hasVideoPanel = meme.panels.some(p => p.isVideo || p.isGif || (p.url && p.url.includes('.gif')));
    const hasGifSticker = meme.stickers.some(s => s.type === 'image' && (s.isAnimated || s.url.includes('.gif')));
    const hasAnimatedTextContent = hasAnimatedText(meme.texts);
    const isAnimated = hasVideoPanel || hasGifSticker || hasAnimatedTextContent;

    // Determine Format (MP4 vs GIF)
    // MP4 only for: Pexels videos OR user-uploaded MP4s (NOT GIFs)
    let isMp4 = false;
    if (isAnimated) {
       const hasTrueVideo = meme.panels.some(p =>
         p.source === 'pexels_video' ||
         (p.source === 'upload' && p.isVideo && !p.isGif)
       );
       if (hasTrueVideo) isMp4 = true;
    }

    const isGifToExport = isAnimated && !isMp4 && !existingPublicUrl;

    // 2. SPECULATIVE CLIPBOARD RESERVATION (Desktop/GIF only)
    // We must do this synchronously within the user gesture (click event) BEFORE any await.
    // We create unresolved promises that we will fulfil later with the exported blob/url.
    // CRITICAL: On Mobile, we must NOT do this, because calling clipboard.write() consumes
    // the user gesture, causing navigator.share() (Native Share) to fail or hang.
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && /mobile|tablet|ip(ad|hone|od)|android/i.test(navigator.userAgent));

    let clipboardResolver = {
        resolveHtml: null,
        rejectHtml: null,
        resolveText: null,
        rejectText: null,
        writePromise: null,
        isReserved: false
    };

    if (isGifToExport && !isMobile && typeof ClipboardItem !== "undefined") {
        try {
            // Check if browser supports Promise-based ClipboardItem (Chrome 98+, Safari 13.1+)
            // Firefox only added support recently (v127), so this try-catch is essential.
            const htmlPromise = new Promise((resolve, reject) => {
                clipboardResolver.resolveHtml = resolve;
                clipboardResolver.rejectHtml = reject;
            });
            const textPromise = new Promise((resolve, reject) => {
                clipboardResolver.resolveText = resolve;
                clipboardResolver.rejectText = reject;
            });

            const item = new ClipboardItem({
                "text/html": htmlPromise,
                "text/plain": textPromise
            });

            // Fire and forget the write attempt (we'll await it later or catch its failure)
            clipboardResolver.writePromise = navigator.clipboard.write([item]);
            clipboardResolver.isReserved = true;
            console.log("Clipboard gesture reserved successfully.");
        } catch (err) {
            console.warn("Clipboard reservation skipped (browser may not support Promise-based ClipboardItem):", err);
            // We will fall back to manual copy or non-speculative write later
        }
    }

    exportToast.start('share', isAnimated ? (isMp4 ? 'mp4' : 'gif') : 'png');

    try {
      let blob, file, filename;

      // 3. GENERATE / FETCH CONTENT
      if (isAnimated) {
        const onProgress = ({ stage, progress }) => {
          exportToast.setStage(stage === 'rendering' ? 'encoding_gif' : stage, { progress });
        };

        if (isMp4) {
           // ... MP4 Logic (Existing) ...
           if (activePanel?.source === 'pexels_video' && isUnmodified && meme.layout === 'single') {
             try {
               exportToast.setStage('encoding');
               const res = await fetch(activePanel.url);
               if (!res.ok) throw new Error("Failed to fetch video");
               blob = await res.blob();
               filename = `${getSafeFilename(meme.name)}-${Date.now()}.mp4`;
               file = new File([blob], filename, { type: "video/mp4" });
             } catch (err) { console.warn("Pass-through failed", err); }
           }

           if (!blob) {
             const quality = await new Promise((resolve) => {
                shareQualityResolveRef.current = resolve;
                setShowShareQualityModal(true);
             });
             setShowShareQualityModal(false);
             shareQualityResolveRef.current = null;
             if (!quality) {
               exportToast.error("Share cancelled");
               return;
             }

             exportToast.setStage('encoding');
             const { exportMemeAsMp4 } = await safeImport(() => import("../../services/mp4Exporter"));

             const onProgressMp4 = ({ stage, progress }) => {
               exportToast.setStage(stage, { progress });
             };

             blob = await exportMemeAsMp4(meme, meme.texts, meme.stickers, onProgressMp4, quality, 'share');
             filename = `${getSafeFilename(meme.name)}-${Date.now()}.mp4`;
             file = new File([blob], filename, { type: "video/mp4" });
           }
        } else {
           // ... GIF Logic ...
           if (existingPublicUrl) {
                // Pass-through optimization
                exportToast.setStage('encoding_gif');
                const res = await fetch(existingPublicUrl);
                blob = await res.blob();
                filename = `${getSafeFilename(meme.name)}-${Date.now()}.gif`;
                file = new File([blob], filename, { type: "image/gif" });
           } else {
                // Encode GIF
                exportToast.setStage('encoding_gif');
                const { exportMemeAsGif } = await safeImport(() => import("../../services/gifExporter"));
                // speed=10 for fastest encoding possible
                blob = await exportMemeAsGif(meme, meme.texts, meme.stickers, onProgress, 10, 'share');
                filename = `${getSafeFilename(meme.name)}-${Date.now()}.gif`;
                file = new File([blob], filename, { type: "image/gif" });
           }
        }
      } else {
        // Static PNG
        exportToast.setStage('rendering');
        const { exportImageAsPng } = await import("../../services/gifExporter");
        blob = await exportImageAsPng(meme, meme.texts, meme.stickers);
        filename = `${getSafeFilename(meme.name)}-${Date.now()}.png`;
        file = new File([blob], filename, { type: "image/png" });
      }

      // 4. UPLOAD & CLIPBOARD RESOLUTION

      // Try Web Share API First (Mobile)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // If we reserved clipboard but ended up sharing natively, we should reject the clipboard promises to clean up
        if (clipboardResolver.isReserved) {
            clipboardResolver.rejectHtml && clipboardResolver.rejectHtml(new Error("Used Web Share instead"));
            clipboardResolver.rejectText && clipboardResolver.rejectText(new Error("Used Web Share instead"));
        }

        try {
          await navigator.share({ files: [file] });
          exportToast.success("Shared!");
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            exportToast.error("Share cancelled");
            return;
          }
          // Fall back to desktop flow if share fails
        }
      }

      // START BACKGROUND UPLOAD (for URL generation)
      let uploadPromise = null;
      if (isAnimated && !existingPublicUrl) {
         uploadPromise = (async () => {
             try {
                const formData = new FormData();
                formData.append('file', blob, filename);
                const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: formData });
                if (res.ok) {
                    const json = await res.json();
                    if (json?.data?.url) {
                        return json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                    }
                }
             } catch (e) { console.warn("Background upload failed:", e); }
             return null;
         })();
      }

      // HANDLE CLIPBOARD (GIF/Video/Static)
      if (isAnimated && !isMp4) {
          // GIF Strategy:
          // 1. If we reserved clipboard, resolve it now.
          // 2. Resolve with Base64 if small (<4MB) for speed, OR wait for Upload if large (avoid size limits).

          let publicUrl = existingPublicUrl;
          let resolveWithUrl = false;

          // Decide whether to wait for URL
          if (!publicUrl && uploadPromise) {
              // On mobile, or if file is large, we prefer the link
              // If < 4MB on desktop, we typically just use base64, but for robustness:

              const isLarge = blob.size > 4 * 1024 * 1024;
              // User specifically mentioned "Generating link" toast gap.
              // We should show this status if we are waiting on the upload.
              if (isLarge || isMobile) {
                  exportToast.setStage('uploading');
                  publicUrl = await uploadPromise;
                  if (publicUrl) {
                    exportToast.setStage('generating_link');
                  }
                  resolveWithUrl = !!publicUrl;
              }
          }

          // Generate HTML Content
          let htmlContent, textContent;
          if (publicUrl) {
              const proxyUrl = `${window.location.origin}/.netlify/functions/share?url=${encodeURIComponent(publicUrl)}&type=gif&title=${encodeURIComponent(meme.name)}`;
              htmlContent = `<img src="${publicUrl}" alt="Meme GIF" />`;
              textContent = proxyUrl; // Use Proxy for text pasting (Discord/iMessage)
          } else {
              // Convert to Base64 (Fast path for small GIFs, or fallback)
              const base64 = await new Promise(r => {
                  const reader = new FileReader();
                  reader.onloadend = () => r(reader.result);
                  reader.readAsDataURL(blob);
              });
              htmlContent = `<img src="${base64}" alt="Meme GIF" />`;
              textContent = ""; // No link yet

              // If we didn't get a publicUrl yet, we can try to get it from the background upload later for the toast
              if (uploadPromise && !publicUrl) {
                  uploadPromise.then(url => {
                      if (url) {
                          console.log("Background upload completed:", url);
                          const proxyUrl = `${window.location.origin}/.netlify/functions/share?url=${encodeURIComponent(url)}&type=gif&title=${encodeURIComponent(meme.name)}`;
                          // We can't update the clipboard asynchronously after the fact easily due to browser security,
                          // but we can log it or potentially update UI if we had a "Copy Link" button that was waiting.
                          // For now, the user just gets the image on clipboard.
                      }
                  });
              }
          }

          const htmlBlob = new Blob([htmlContent], { type: "text/html" });
          const textBlob = new Blob([textContent], { type: "text/plain" });

          if (clipboardResolver.isReserved) {
              // FULFILL THE RESERVED PROMISES
              clipboardResolver.resolveHtml(htmlBlob);
              clipboardResolver.resolveText(textBlob);

              try {
                  exportToast.setStage('finalizing_clipboard');
                  await clipboardResolver.writePromise;
                  exportToast.success(resolveWithUrl ? "Link copied to clipboard!" : "Copied to clipboard!");
              } catch (writeErr) {
                  console.warn("Speculative write failed:", writeErr);
                  // Fallback to manual
                  throw new Error("Clipboard write failed");
              }
          } else {
              // Standard write (if reservation skipped/failed check)
              // This might fail if too much time passed, but we try anyway
              exportToast.setStage('finalizing_clipboard');
              const item = new ClipboardItem({
                  "text/html": htmlBlob,
                  "text/plain": textBlob
              });
              await navigator.clipboard.write([item]);
              exportToast.success("Copied to clipboard!");
          }
      } else if (isMp4) {
          // MP4: Link only
          let publicUrl = existingPublicUrl;
          if (!publicUrl && uploadPromise) {
              exportToast.setStage('uploading');
              publicUrl = await uploadPromise;
              if (publicUrl) {
                exportToast.setStage('generating_link');
              }
          }

          if (publicUrl) {
              exportToast.setStage('finalizing_clipboard');
              const proxyUrl = `${window.location.origin}/.netlify/functions/share?url=${encodeURIComponent(publicUrl)}&type=video&title=${encodeURIComponent(meme.name)}`;
              await navigator.clipboard.writeText(proxyUrl);
              exportToast.success("Video Link Copied!");
          } else {
              throw new Error("Could not generate video link (Upload failed)");
          }
      } else {
          // Static PNG
          exportToast.setStage('finalizing_clipboard');
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          exportToast.success("Copied!");
      }

    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Share failed:", e);
        exportToast.error("Share failed - try downloading instead");
      } else {
        exportToast.error("Share cancelled");
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

  // HYDRATION SKELETON: Show a layout skeleton until IndexedDB state is restored
  if (!isHydrated) {
    const SkeletonPulse = ({ className = "", style = {} }) => (
      <div
        className={`animate-pulse rounded-xl ${className}`}
        style={{ background: "linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)", backgroundSize: "400px 100%", ...style }}
      />
    );
    return (
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 animate-in fade-in duration-300">
        {/* LEFT: Toolbar skeleton (desktop) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
            <SkeletonPulse className="h-11" />
            <SkeletonPulse className="h-11" />
            <SkeletonPulse className="h-11 w-11" />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-[#2f3336]">
            <SkeletonPulse className="flex-1 h-11 rounded-none" />
            <SkeletonPulse className="flex-1 h-11 rounded-none" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonPulse key={i} className="h-[72px]" />)}
          </div>
          <SkeletonPulse className="h-11" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonPulse className="h-11" />
            <SkeletonPulse className="h-11" />
          </div>
        </div>

        {/* CENTER: Canvas skeleton */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <SkeletonPulse className="h-11" />
            <SkeletonPulse className="h-11" />
          </div>
          <SkeletonPulse className="h-11" />
          <div className="h-11 bg-brand/30 rounded-none" />
          <SkeletonPulse className="h-[400px] border-2 border-dashed border-[#2f3336]" />
        </div>

        {/* RIGHT: Sidebar skeleton (desktop) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
          <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-[#2f3336]">
            <SkeletonPulse className="h-11 rounded-none" />
            <SkeletonPulse className="h-11 rounded-none" />
            <SkeletonPulse className="h-11 rounded-none" />
          </div>
          <SkeletonPulse className="h-[380px]" />
        </div>
      </main>
    );
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 animate-in fade-in duration-500 relative">
      <div
        className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200 ${flashColor ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundColor: flashColor === "red" ? "rgba(239, 68, 68, 0.15)" : flashColor === "teal" ? "rgba(20, 184, 166, 0.15)" : "rgba(34, 197, 94, 0.08)" }}
      />

      {/* Full-page drag-and-drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 p-10 rounded-2xl border-2 border-dashed border-brand animate-pulse">
            <ImagePlus className="w-16 h-16 text-brand" />
            <p className="text-white text-lg font-bold">Drop image here</p>
            <p className="text-slate-400 text-sm">Image will be added to the active panel</p>
          </div>
        </div>
      )}

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
              activeEffect={activeEffects[meme.activePanelId] || null}
              lastClickedEffect={lastClickedEffect}
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
            {/* Quality Selection Modal */}
      <ShareQualityModal
        isOpen={showShareQualityModal}
        onClose={() => {
          setShowShareQualityModal(false);
          if (shareQualityResolveRef.current) {
            shareQualityResolveRef.current(null);
            shareQualityResolveRef.current = null;
          }
        }}
        onSelect={(quality) => {
          setShowShareQualityModal(false);
          if (shareQualityResolveRef.current) {
            shareQualityResolveRef.current(quality);
            shareQualityResolveRef.current = null;
          }
        }}
      />

      {/* Export Confirmation Modal */}
            <Suspense fallback={null}>
              <ExportConfirmModal
                isOpen={showExportModal}
                onClose={() => { setShowExportModal(false); setIsStickerExport(false); }}
                onExportGif={() => doGifExport({ stickersOnly: isStickerExport })}
                onExportMp4={handleExportMp4}
                onExportStatic={() => doStaticExport({ stickersOnly: isStickerExport, forceStatic: isStickerExport })}
                isStickerOnly={isStickerExport}
                hasVideo={meme.panels.some(p => p.isVideo)}
              />
            </Suspense>

            {/* Snippet Success Modal */}
            <Suspense fallback={null}>
              <SnippetSuccessModal
                isOpen={showSnippetModal}
                onClose={handleCropCancel}
                onRetry={handleCropRetry}
                onExport={handleCropExport}
                croppedImageUrl={croppedImageUrl}
              />
            </Suspense>

            <div className="hidden lg:block lg:col-span-4 space-y-6 order-2 lg:order-1 lg:sticky lg:top-8 self-start">
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
            </div>

            <div
              className="lg:col-span-4 order-1 lg:order-2 flex flex-col gap-4 lg:sticky lg:top-8 self-start overflow-visible mobile-canvas-pad"
              data-finetune-active={isMobileScreen && !!selectedText ? true : undefined}
            >
              <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
                <Suspense fallback={<div className="h-12 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
                  <ModeSelector
                    mode={meme.mode}
                    onModeChange={(e) => {
                      const m = e.target.value;
                      startTransition(() => {
                        updateState((prev) => ({ ...prev, mode: m }));
                        if (m === "image") {
                          clearSearch();
                          getMemeImage(m);
                        } else {
                          // Respect persisted video source preference
                          if (videoSource === "pexels") {
                            handleRandomVideo();
                          } else {
                            getMemeImage(m);
                          }
                        }
                      });
                    }}
                  />
                </Suspense>
                <Suspense fallback={<div className="h-12 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
                  <LayoutSelector
                    layout={meme.layout}
                    onLayoutChange={handleLayoutChange}
                  />
                </Suspense>
              </div>
              <div className="relative flex flex-col shadow-2xl rounded-t-2xl border border-[#2f3336] card-bg overflow-hidden">
                {/* MemeToolbar - Hidden on mobile (replaced by MobileBottomBar) */}
                <div className="hidden">
                  <Suspense fallback={<div className="h-20 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
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
                      onVibeShift={handleVibeShift}
                      isVibeShifting={isVibeShifting}
                      onAutoLayout={handleAutoLayout}
                      isAutoLayouting={isAutoLayouting}
                      onMemeIQ={handleMemeIQ}
                      isMemeIQing={isMemeIQing}
                      onStyleDna={handleStyleDna}
                      isStyleDnaing={isStyleDnaing}
                      onEmojiSauce={handleEmojiSauce}
                      isEmojiSaucing={isEmojiSaucing}
                      onChaos={handleChaos}
                      onExportStickers={handleExportStickers}
                      onEditingChange={setEditingId}
                      onStartCrop={handleStartCrop}
                      isCropping={isCropping}
                    />
                  </Suspense>
                </div>

                {/* --- DYNAMIC SEARCH BAR (Switches based on Mode) --- */}

                {/* Mobile-only: Mode selector above source tabs */}
                <div className="lg:hidden px-3 pt-3 pb-1">
                  <Suspense fallback={<div className="h-12 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
                    <ModeSelector
                      mode={meme.mode}
                      onModeChange={(e) => {
                        const m = e.target.value;
                        startTransition(() => {
                          updateState((prev) => ({ ...prev, mode: m }));
                          if (m === "image") {
                            clearSearch();
                            getMemeImage(m);
                          } else {
                            if (videoSource === "pexels") {
                              handleRandomVideo();
                            } else {
                              getMemeImage(m);
                            }
                          }
                        });
                      }}
                    />
                  </Suspense>
                </div>

                {/* CASE 1: VIDEO MODE (GIFs or Pexels) */}
                {meme.mode === "video" && (
                  <div className="relative border-b border-[#2f3336]">
                    {/* Video Source Tabs */}
                    <div className="px-3 pt-3 pb-2">
                       <Suspense fallback={<div className="h-9 bg-[#111]/60 rounded-xl animate-pulse" />}>
                         <VideoSourceTabs
                           activeSource={videoSource}
                           onSourceChange={(source) => {
                             setVideoSource(source);
                             localStorage.setItem("meme_video_source", source);
                             // Reset states when switching
                             if (source === "giphy") {
                               setSearchQuery("");
                               setSuggestions([]);
                                // Auto-load a random GIF for immediate feedback (Parity with Pexels)
                               getMemeImage("video");
                             } else {
                               setPexelsVideoQuery("");
                               setPexelsVideoResults([]);
                               // Auto-load a random Pexels video for immediate feedback
                               handleRandomVideo();
                             }
                           }}
                         />
                       </Suspense>
                    </div>

                    {videoSource === "giphy" ? (
                      <Suspense fallback={<div className="h-12 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
                        <div className="p-3 pt-0">
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
                    ) : (
                      <div className="px-3 pb-3">
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
                            <Search className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            placeholder="Search Pexels videos..."
                            value={pexelsVideoQuery}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPexelsVideoQuery(val);
                               // Set loading immediately to show skeleton
                              setPexelsVideoLoading(true);
                              handlePexelsVideoSearch(val, 1);
                              setShowPexelsVideoSuggestions(true);
                            }}
                            className="w-full input-field pl-10 pr-10 py-3 placeholder:text-xs md:placeholder:text-sm"
                            onFocus={() => {
                              setShowPexelsVideoSuggestions(true);
                              // Trigger popular videos if empty
                              if (!pexelsVideoQuery) {
                                // Set loading immediately
                                setPexelsVideoLoading(true);
                                handlePexelsVideoSearch("", 1);
                              }
                            }}
                          />

                          {/* Reuse MemeDropdownGrid for Pexels Videos - INLINE (No Portal) */}
                          {/* Render immediately if suggestion state is true */}
                          {showPexelsVideoSuggestions && (
                            <div className="absolute top-full left-0 z-[9999] w-full mt-2" ref={pexelsVideoContainerRef}>
                              {/* Add Skeleton Fallback for Pexels Video Search */}
                              <Suspense fallback={
                                 <div className="card-bg border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden p-3">
                                   <div className="grid grid-cols-3 gap-3">
                                      {Array.from({ length: 9 }).map((_, i) => (
                                        <div key={i} className="aspect-square rounded-xl bg-[#181818] animate-pulse" />
                                      ))}
                                   </div>
                                 </div>
                              }>
                                <MemeDropdownGrid
                                  filteredMemes={pexelsVideoResults}
                                  memeSearchQuery={pexelsVideoQuery}
                                  onSelectMeme={(meme) => {
                                    loadSelectedMeme(meme);
                                    setShowPexelsVideoSuggestions(false);
                                  }}
                                  dropdownRef={null} // Not using the ref for positioning anymore
                                  source="pexels_video"
                                  isLoading={pexelsVideoLoading}
                                  hasMore={pexelsVideoPage < pexelsVideoTotalPages}
                                  onLoadMore={() => handlePexelsVideoSearch(pexelsVideoQuery, pexelsVideoPage + 1)}
                                />
                              </Suspense>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CASE 2: IMAGE MODE (Multi-Source Search) */}
                {meme.mode === "image" && (
                  <div className="relative border-b border-[#2f3336]" ref={memeSearchRef}>
                    {/* Source Tabs */}
                    <div className="px-3 pt-3 pb-2">
                      <Suspense fallback={<div className="h-9 bg-[#111]/60 rounded-xl animate-pulse" />}>
                        <ImageSourceTabs
                          activeSource={imageSource}
                          onSourceChange={handleImageSourceChange}
                        />
                      </Suspense>
                    </div>

                    {/* Search Input */}
                    <div className="px-3 pb-3">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
                          <Search className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          placeholder={
                            imageSource === "imgflip" ? "Search memes..."
                            : imageSource === "unsplash" ? "Search Unsplash photos..."
                            : "Search Pexels photos..."
                          }
                          value={memeSearchQuery}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMemeSearchQuery(val);
                            setShowMemeSuggestions(true);
                            // Trigger API search for Unsplash/Pexels
                            if (imageSource !== "imgflip") {
                              setImageSearchLoading(true); // Set loading immediately
                              handleImageSearch(val, imageSource, 1);
                            }
                          }}
                          onFocus={() => {
                            setShowMemeSuggestions(true);
                            if (imageSource !== "imgflip" && !memeSearchQuery) {
                               setImageSearchLoading(true);
                               handleImageSearch("", imageSource, 1);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && imageSource !== "imgflip" && memeSearchQuery.trim()) {
                              handleImageSearch(memeSearchQuery, imageSource, 1);
                            }
                          }}
                          className="w-full input-field pl-10 pr-10 py-3 placeholder:text-xs md:placeholder:text-sm"
                        />
                        {memeSearchQuery && (
                          <button
                            onClick={() => {
                              setMemeSearchQuery("");
                              setImageSearchResults([]);
                              setImageSearchPage(1);
                            }}
                            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dropdown Results - Portaled to document.body */}
                    {/* Dropdown Results - Portaled to document.body */}
                    {showMemeSuggestions && createPortal(
                      /* Add Skeleton Fallback for Image Search */
                      <Suspense fallback={
                        <div
                          ref={positionDropdown}
                          data-meme-dropdown-portal
                          className="card-bg border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden p-3"
                          style={{ zIndex: 9999 }} // Ensure visibility even before position calc
                        >
                           <div className="grid grid-cols-3 gap-3">
                              {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="aspect-square rounded-xl bg-[#181818] animate-pulse" />
                              ))}
                           </div>
                        </div>
                      }>
                        <MemeDropdownGrid
                          filteredMemes={imageSource === "imgflip" ? filteredMemes : imageSearchResults}
                          memeSearchQuery={memeSearchQuery}
                          onSelectMeme={loadSelectedMeme}
                          dropdownRef={positionDropdown}
                          source={imageSource}
                          isLoading={imageSearchLoading}
                          hasMore={imageSource !== "imgflip" && imageSearchPage < imageSearchTotalPages}
                          onLoadMore={() => handleImageSearch(memeSearchQuery, imageSource, imageSearchPage + 1)}
                        />
                      </Suspense>,
                      document.body
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(30);
                    setPingKey(Date.now());

                    if (meme.mode === "image") {
                      if (imageSource === "imgflip") {
                        getMemeImage();
                      } else {
                        handleRandomImage();
                      }
                    } else {
                      // Video Mode
                      if (videoSource === "giphy") {
                         getMemeImage(); // Existing Giphy Random
                      } else {
                         handleRandomVideo(); // New Pexels Random
                      }
                    }
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
                      {generating ? "Cooking..." : meme.mode === "video" ? (videoSource === "giphy" ? "Get Random GIF" : "Get Random Video") : "Get Random Image"}
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
                  <div
                    ref={hoverBorderRef}
                    data-html2canvas-ignore="true"
                    className="absolute inset-0 border-2 border-dashed border-white z-[101] pointer-events-none"
                    style={{ display: draggedId ? '' : 'none' }}
                  />

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

                  <Suspense fallback={<div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>}>
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
                      snapGuides={draggedId ? snapGuidesRef.current : null}
                      selectedShapeId={selectedShapeId}
                      onShapeIdSelect={handleShapeSelect}
                      onAddShape={handleAddShape}
                      onUpdateShape={handleUpdateShape}
                      onDeleteShape={handleDeleteShape}
                      shapeFill={meme.shapeFill}
                      shapeStroke={meme.shapeStroke}
                      shapeStrokeWidth={meme.shapeStrokeWidth}
                    />
                  </Suspense>
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

              {/* MOBILE: Hidden - replaced by MobileBottomBar */}
              <div className="hidden">
                {remixActionControls}

                {remixCarouselControl}

                {/* Mobile-Only Sticker Section */}
                <div className="card-bg rounded-2xl border border-white/5 shadow-xl backdrop-blur-sm p-4 relative z-50">
                  <Suspense fallback={<div className="h-32 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
                    <MemeStickerSection
                      onAddSticker={addSticker}
                      hasStickers={meme.stickers?.length > 0}
                      onExportStickers={handleExportStickers}
                    />
                  </Suspense>
                </div>
              </div>

            </div>

            {/* NEW: Right Toolbar Column - Desktop Only */}
            <div className="hidden lg:flex lg:col-span-4 order-3 flex-1">
              <div className="sticky top-8 w-full flex flex-col">
                <div className="toolbar-sidebar flex-1 w-full">
                  <Suspense fallback={<div className="h-full w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
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
                      onVibeShift={handleVibeShift}
                      isVibeShifting={isVibeShifting}
                      onAutoLayout={handleAutoLayout}
                      isAutoLayouting={isAutoLayouting}
                      onMemeIQ={handleMemeIQ}
                      isMemeIQing={isMemeIQing}
                      onStyleDna={handleStyleDna}
                      isStyleDnaing={isStyleDnaing}
                      onEmojiSauce={handleEmojiSauce}
                      isEmojiSaucing={isEmojiSaucing}
                      onChaos={handleChaos}
                      onExportStickers={handleExportStickers}
                      onEditingChange={setEditingId}
                      onStartCrop={handleStartCrop}
                      isCropping={isCropping}
                    />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Mobile Top Bar - Upload/Undo/Redo/Save/More */}
            <Suspense fallback={null}>
              <MobileTopBar
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                onUpload={handleFileUpload}
                onDownload={handleDownload}
                onShare={handleShare}
                onRemoveAll={handleReset}
                onRemoveEffects={handleRemoveEffects}
                onOpenInstructions={onOpenInstructions}
                layout={meme.layout}
                onLayoutChange={handleLayoutChange}
                mode={meme.mode}
                onModeChange={(modeId) => {
                  startTransition(() => {
                    updateState((prev) => ({ ...prev, mode: modeId }));
                    if (modeId === "image") {
                      clearSearch();
                      getMemeImage(modeId);
                    } else {
                      if (videoSource === "pexels") {
                        handleRandomVideo();
                      } else {
                        getMemeImage(modeId);
                      }
                    }
                  });
                }}
              />
            </Suspense>

            {/* Mobile Bottom Bar - Samsung-style 3-layer system */}
            <Suspense fallback={null}>
              <MobileBottomBar
                meme={{ ...meme, filters: activePanel?.filters || DEFAULT_FILTERS }}
                handleStyleChange={handleStyleChange}
                handleFilterChange={handleFilterChange}
                handleStyleCommit={handleStyleCommit}
                onAnimationChange={handleAnimationChange}
                onStartCrop={handleStartCrop}
                isCropping={isCropping}
                onMagicCaption={generateMagicCaption}
                isMagicGenerating={isMagicGenerating}
                onVibeShift={handleVibeShift}
                isVibeShifting={isVibeShifting}
                onAutoLayout={handleAutoLayout}
                isAutoLayouting={isAutoLayouting}
                onMemeIQ={handleMemeIQ}
                isMemeIQing={isMemeIQing}
                onStyleDna={handleStyleDna}
                isStyleDnaing={isStyleDnaing}
                onEmojiSauce={handleEmojiSauce}
                isEmojiSaucing={isEmojiSaucing}
                onAddText={() => addTextAtPosition(50, 50)}
                onAddSticker={addSticker}
                canvasActiveTool={activeTool}
                setCanvasActiveTool={setActiveTool}
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
                onRemoveAll={handleReset}
                onRemoveEffects={handleRemoveEffects}
                onClearDrawings={handleClearDrawings}
                selectedShapeId={selectedShapeId}
                collapseRef={mobileCollapseRef}
              />
            </Suspense>
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
