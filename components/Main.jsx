import { useState, useEffect, useRef, useTransition, Suspense, useCallback, lazy, useDeferredValue } from "react";
import html2canvas from "html2canvas-pro";
import { RefreshCcw, Loader2, Video, Undo2, Redo2, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";
import { triggerFireworks } from "./Confetti";
import useHistory from "../hooks/useHistory";
import { searchTenor, registerShare, getAutocomplete, getCategories } from "../services/tenor";
import { exportGif } from "../services/gifExporter";
import { deepFryImage } from "../services/imageProcessor";
import { MEME_QUOTES } from "../constants/memeQuotes";

import MemeCanvas from "./MemeEditor/MemeCanvas";
import MemeToolbar from "./MemeEditor/MemeToolbar";
import MemeInputs from "./MemeEditor/MemeInputs";
import { LayoutSelector } from "./MemeEditor/LayoutSelector";

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
                url: "http://i.imgflip.com/1bij.jpg", 
                sourceUrl: null,
                isVideo: false,
                objectFit: "cover",
                posX: 50,
                posY: 50,
                filters: { ...DEFAULT_FILTERS }
              }
            ],
      
            texts: [        { id: "top", content: "", x: 50, y: 5, rotation: 0 },
        { id: "bottom", content: "", x: 50, y: 95, rotation: 0 },
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
        // Ensure existing panels have posX/posY
        if (parsed.panels) {
            parsed.panels = parsed.panels.map(p => ({
                ...p,
                posX: p.posX ?? 50,
                posY: p.posY ?? 50
            }));
        }

        if (parsed.texts) {
          parsed.texts = parsed.texts.map((t) => ({ ...t, rotation: t.rotation ?? 0 }));
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
  const [activeTool, setActiveTool] = useState("move"); 
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
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  const [pingKey, setPingKey] = useState(null);
  const [isMagicGenerating, setIsMagicGenerating] = useState(false);
  const fineTuneRef = useRef(null);


  const activePanel = meme.panels.find(p => p.id === meme.activePanelId) || meme.panels[0];
  const deferredDeepFry = useDeferredValue(activePanel?.filters?.deepFry);

  useEffect(() => {
    const level = parseInt(deferredDeepFry || 0, 10);
    const controller = new AbortController();

    if (!activePanel) return;

    if (level === 0) {
      if (activePanel.processedImage) {
        if (activePanel.processedImage.startsWith("blob:")) {
          URL.revokeObjectURL(activePanel.processedImage);
        }
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

    const timer = setTimeout(async () => {
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

      try {
        const fried = await deepFryImage(activePanel.url, level, controller.signal);
        startTransition(() => {
          updateState((prev) => {
            const currentPanel = prev.panels.find((p) => p.id === activePanel.id);
            if (
              currentPanel?.processedImage &&
              currentPanel.processedImage.startsWith("blob:") &&
              currentPanel.processedImage !== fried
            ) {
              URL.revokeObjectURL(currentPanel.processedImage);
            }

            return {
              ...prev,
              panels: prev.panels.map((p) =>
                p.id === activePanel.id
                  ? { ...p, processedImage: fried, processedDeepFryLevel: level }
                  : p
              ),
            };
          });
        });
      } catch (e) {
        if (e.message !== "Aborted") {
          console.error("Deep Fry Failed", e);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      controller.abort();
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

  const calculateSmartFontSize = useCallback(() => {
    return 30;
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            const oldP = prev.panels.find(p => p.id === prev.activePanelId);
            if (oldP?.processedImage && oldP.processedImage.startsWith("blob:")) {
                URL.revokeObjectURL(oldP.processedImage);
            }

            const newPanels = prev.panels.map(p => 
                p.id === prev.activePanelId 
                ? { ...p, url: newMeme.url, sourceUrl: newMeme.shareUrl, isVideo: false, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
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
                const oldP = prev.panels.find(p => p.id === prev.activePanelId);
                if (oldP?.processedImage && oldP.processedImage.startsWith("blob:")) {
                    URL.revokeObjectURL(oldP.processedImage);
                }

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

  const handlePanelPosChange = useCallback((id, x, y, isTransient = false) => {
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
  }, [updateState, updateTransient]);

  function handlePanelSelect(id) {
    if (id === meme.activePanelId) return;
    startTransition(() => {
        updateState(prev => ({ ...prev, activePanelId: id }));
    });
  }

  function handleTextChange(id, value) {
    startTransition(() => {
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
          });
        }

        return {
          ...prev,
          texts: newTexts,
        };
      });
    });
  }

  function handleCenterText() {
    if (!meme.selectedId) return;
    updateState((prev) => ({
      ...prev,
      texts: prev.texts.map((t) => (t.id === meme.selectedId ? { ...t, x: 50, y: 50 } : t)),
    }));
  }

  function resetFilters() {
    startTransition(() => {
      updateState((prev) => {
        const panel = prev.panels.find(p => p.id === prev.activePanelId);
        if (panel?.processedImage && panel.processedImage.startsWith("blob:")) {
            URL.revokeObjectURL(panel.processedImage);
        }

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
      const localUrl = URL.createObjectURL(file);
      const isGif = file.type === "image/gif";
      const isVideo = file.type.startsWith("video/");

      updateState((prev) => {
          const newPanels = prev.panels.map(p => 
            p.id === prev.activePanelId 
            ? { ...p, url: localUrl, isVideo: isVideo || isGif, objectFit: "cover", filters: { ...DEFAULT_FILTERS } }
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

  const handleCanvasDrop = useCallback((file, panelId) => {
      const localUrl = URL.createObjectURL(file);
      const isGif = file.type === "image/gif";
      const isVideo = file.type.startsWith("video/");
      
      startTransition(() => {
        updateState((prev) => {
            const oldP = prev.panels.find(p => p.id === panelId);
            if (oldP?.processedImage && oldP.processedImage.startsWith("blob:")) {
                URL.revokeObjectURL(oldP.processedImage);
            }

            const newPanels = prev.panels.map(p => 
                p.id === panelId
                ? { ...p, url: localUrl, isVideo: isVideo || isGif, objectFit: "cover", filters: { ...DEFAULT_FILTERS }, processedImage: null, processedDeepFryLevel: 0 }
                : p
            );
            return {
                ...prev,
                panels: newPanels,
                activePanelId: panelId,
                mode: isGif || isVideo ? "video" : "image"
            };
        });
      });
  }, [updateState]);

  const handleClearPanel = useCallback((panelId) => {
      startTransition(() => {
        updateState((prev) => {
            const panel = prev.panels.find(p => p.id === panelId);
            if (panel?.processedImage && panel.processedImage.startsWith("blob:")) {
                URL.revokeObjectURL(panel.processedImage);
            }

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

  function handleReset() {
    triggerFlash("red");
    startTransition(() => {
      updateState((prev) => ({
        ...prev,
        texts: [
          { id: "top", content: "", x: 50, y: 5, rotation: 0 },
          { id: "bottom", content: "", x: 50, y: 95, rotation: 0 },
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

  function addSticker(emoji, type = "emoji") {
    updateState((prev) => ({
      ...prev,
      stickers: [...prev.stickers, { id: crypto.randomUUID(), url: emoji, type, x: 50, y: 50 }],
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

  async function handleDownload() {
    if (!memeRef.current) return;
    
    const activePanel = meme.panels.find(p => p.id === meme.activePanelId) || meme.panels[0];
    // Support GIF export if we have at least one video/gif panel
    const hasVideo = meme.panels.some(p => p.isVideo);
    const canExportGif = meme.mode === "video" && hasVideo;

    if (canExportGif) {
      // Check if ANY panel is deep frying
      const isDeepFrying = meme.panels.some(p => (p.filters?.deepFry || 0) > 0);
      const loadingMsg = isDeepFrying ? "Deep frying frames... (this takes longer) 🍟" : "Encoding GIF...";

      const promise = (async () => {
        // Construct a export meme object (we pass the whole meme now)
        const exportMeme = { ...meme };

        const blob = await exportGif(exportMeme, meme.texts, meme.stickers);
        if (meme.id) registerShare(meme.id, searchQuery);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${meme.name}-${Date.now()}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
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
    } else {
      const promise = (async () => {
        const canvas = await html2canvas(memeRef.current, { useCORS: true, backgroundColor: "#000000", scale: 2 });
        // Note: html2canvas captures the visual state of the DOM, including CSS filters on video elements.
        // Deep fry logic is visual-only here.
        const finalDataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `${meme.name}-${Date.now()}.png`; 
        link.href = finalDataUrl;
        link.click();
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

      <div className="lg:col-span-5 space-y-8 order-2 lg:order-1 lg:sticky lg:top-8 self-start">
        <MemeInputs
          texts={meme.texts}
          handleTextChange={handleTextChange}
          onAddSticker={addSticker}
          onMagicCaption={generateMagicCaption}
          isMagicGenerating={isMagicGenerating}
        />
        <Suspense fallback={<div className="h-16 w-full bg-slate-900/50 animate-pulse rounded-xl" />}>
          <MemeActions
            onFileUpload={handleFileUpload}
            onReset={handleReset}
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
            />
          </Suspense>
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
          <MemeCanvas
            ref={memeRef}
            meme={meme}
            loading={loading}
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
      </div>
    </main>
  );
}
