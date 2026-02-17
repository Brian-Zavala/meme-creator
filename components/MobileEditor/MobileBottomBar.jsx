import { useState, useCallback, lazy, Suspense } from "react";
import { Type, ImageIcon, Pencil, Smile, Zap } from "lucide-react";
import ToolPill from "./ToolPill";

const TextToolRow    = lazy(() => import("./layers/TextToolRow"));
const ImageToolRow   = lazy(() => import("./layers/ImageToolRow"));
const DrawToolRow    = lazy(() => import("./layers/DrawToolRow"));
const StickerToolRow = lazy(() => import("./layers/StickerToolRow"));
const QuickToolRow   = lazy(() => import("./layers/QuickToolRow"));

const TABS = [
  { id: "text",    label: "Text",    icon: Type },
  { id: "image",   label: "Image",   icon: ImageIcon },
  { id: "draw",    label: "Draw",    icon: Pencil },
  { id: "sticker", label: "Sticker", icon: Smile },
  { id: "quick",   label: "Quick",   icon: Zap },
];

export default function MobileBottomBar({
  // Quick tab actions
  onChaos,
  onCaptionRemix,
  onStyleShuffle,
  onRemoveAll,
  onRemoveEffects,
  // Draw tab
  onClearDrawings,
}) {
  const [activeTab,  setActiveTab]  = useState(null);
  const [activeTool, setActiveTool] = useState(null);

  const handleTabTap = useCallback((tabId) => {
    setActiveTab((prev) => {
      if (prev === tabId) {
        setActiveTool(null);
        return null;
      }
      setActiveTool(null);
      return tabId;
    });
  }, []);

  const handleToolTap = useCallback((toolId) => {
    setActiveTool((prev) => (prev === toolId ? null : toolId));
  }, []);

  const toolRowProps = { activeTool, onToolTap: handleToolTap };

  return (
    <div className="lg:hidden" data-html2canvas-ignore="true">
      {/* Layer 1: Tool Row — slides up when a tab is active */}
      <div className="mobile-tool-row" data-visible={activeTab ? true : undefined}>
        <Suspense fallback={null}>
          {activeTab === "text"    && <TextToolRow    {...toolRowProps} />}
          {activeTab === "image"   && <ImageToolRow   {...toolRowProps} />}
          {activeTab === "draw"    && (
            <DrawToolRow
              {...toolRowProps}
              onClearDrawings={onClearDrawings}
            />
          )}
          {activeTab === "sticker" && <StickerToolRow {...toolRowProps} />}
          {activeTab === "quick"   && (
            <QuickToolRow
              onChaos={onChaos}
              onCaptionRemix={onCaptionRemix}
              onStyleShuffle={onStyleShuffle}
              onRemoveAll={onRemoveAll}
              onRemoveEffects={onRemoveEffects}
            />
          )}
        </Suspense>
      </div>

      {/* Layer 0: Main Tab Bar */}
      <nav className="mobile-tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <ToolPill
            key={id}
            icon={<Icon className="w-4 h-4" />}
            label={label}
            isActive={activeTab === id}
            onClick={() => handleTabTap(id)}
            className="mobile-tab-pill"
          />
        ))}
      </nav>
    </div>
  );
}
