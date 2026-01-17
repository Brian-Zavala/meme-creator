import { useTransition, useState } from "react";
import {
  Sun,
  Contrast,
  CloudFog as Blur,
  SunDim as Grayscale,
  Timer as Sepia,
  Aperture as HueRotate,
  Droplet as Saturate,
  FlipVertical as Invert,
  RefreshCcw,
  Flame,
  Scissors,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import OptimizedSlider from "../ui/OptimizedSlider";

export default function ImageFiltersPanel({
  filters,
  onFilterChange,
  onStyleCommit,
  onResetFilters,
  onStartCrop,
  isCropping,
}) {
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(true);

  return (
    <div
      id="image-tools-panel"
      role="tabpanel"
      className="flex flex-col gap-6 w-full items-center"
    >
      {/* Show/Hide Filters Toggle */}
      <button
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(10);
          startTransition(() => setShowFilters(!showFilters));
        }}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#181818] border border-[#2f3336] text-slate-400 hover:text-white hover:border-[#3e4347] focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all active:scale-[0.98] mb-4"
      >
        {showFilters ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
        <span className="text-xs font-bold uppercase tracking-wider">
          {showFilters ? 'Hide' : 'Show'} Filters
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
      </button>

      {/* Collapsible Filters Drawer */}
      <div
        className={`w-full grid transition-[grid-template-rows] duration-300 ease-out ${showFilters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden w-full">
          <div className={`w-full flex flex-col items-center transition-opacity duration-200 ${showFilters ? 'opacity-100' : 'opacity-0'}`}>
            {/* Global Filter Reset */}
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(15);
                startTransition(() => onResetFilters());
              }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95 text-xs font-bold uppercase tracking-wide mb-6 animate-in fade-in slide-in-from-top-2"
            >
              <RefreshCcw className="w-3 h-3" /> Reset All Filters
            </button>

            {/* Desktop: Vertical stacked layout with more breathing room */}
            {/* Mobile/Tablet: 2-column grid layout */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-6 lg:gap-y-8 w-full">
              {/* Contrast */}
              <div className="flex items-center gap-3">
                <Contrast
                  className="w-5 h-5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <OptimizedSlider
                  min="0"
                  max="200"
                  name="contrast"
                  value={filters?.contrast ?? 100}
                  onChange={onFilterChange}
                  onCommit={onStyleCommit}
                  className="range-slider w-full cursor-pointer h-2 rounded-full"
                  title="Contrast"
                />
              </div>

              {/* Brightness */}
              <div className="flex items-center gap-3">
                <Sun
                  className="w-5 h-5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <OptimizedSlider
                  min="0"
                  max="200"
                  name="brightness"
                  value={filters?.brightness ?? 100}
                  onChange={onFilterChange}
                  onCommit={onStyleCommit}
                  className="range-slider w-full cursor-pointer h-2 rounded-full"
                  title="Brightness"
                />
              </div>

              {/* Blur */}
              <div className="flex items-center gap-3">
                <Blur
                  className="w-5 h-5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <OptimizedSlider
                  min="0"
                  max="10"
                  step="0.5"
                  name="blur"
                  value={filters?.blur ?? 0}
                  onChange={onFilterChange}
                  onCommit={onStyleCommit}
                  className="range-slider w-full cursor-pointer h-2 rounded-full"
                  title="Blur"
                />
              </div>

              {/* Grayscale */}
              <div className="flex items-center gap-3">
                <Grayscale
                  className="w-5 h-5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <OptimizedSlider
                  min="0"
                  max="100"
                  name="grayscale"
                  value={filters?.grayscale ?? 0}
                  onChange={onFilterChange}
                  onCommit={onStyleCommit}
                  className="range-slider w-full cursor-pointer h-2 rounded-full"
                  title="Grayscale"
                />
              </div>

              {/* Sepia */}
              <div className="flex items-center gap-3">
                <Sepia
                  className="w-5 h-5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <OptimizedSlider
                  min="0"
                  max="100"
                  name="sepia"
                  value={filters?.sepia ?? 0}
                  onChange={onFilterChange}
                  onCommit={onStyleCommit}
                  className="range-slider w-full cursor-pointer h-2 rounded-full"
                  title="Sepia"
                />
              </div>

              {/* Saturation */}
              <div className="flex items-center gap-3">
                <Saturate
                  className="w-5 h-5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <OptimizedSlider
                  min="0"
                  max="300"
                  name="saturate"
                  value={filters?.saturate ?? 100}
                  onChange={onFilterChange}
                  onCommit={onStyleCommit}
                  className="range-slider w-full cursor-pointer h-2 rounded-full"
                  title="Saturation"
                />
              </div>

              {/* Hue Rotate */}
              <div className="flex items-center gap-3">
                <HueRotate
                  className="w-5 h-5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <OptimizedSlider
                  min="0"
                  max="360"
                  name="hueRotate"
                  value={filters?.hueRotate ?? 0}
                  onChange={onFilterChange}
                  onCommit={onStyleCommit}
                  className="range-slider w-full cursor-pointer h-2 rounded-full"
                  title="Hue Rotate"
                />
              </div>

              {/* Invert */}
              <div className="flex items-center gap-3">
                <Invert
                  className="w-5 h-5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <OptimizedSlider
                  min="0"
                  max="100"
                  name="invert"
                  value={filters?.invert ?? 0}
                  onChange={onFilterChange}
                  onCommit={onStyleCommit}
                  className="range-slider w-full cursor-pointer h-2 rounded-full"
                  title="Invert"
                />
              </div>
            </div>

            <div
              className="w-full h-px bg-[#181818] shrink-0 my-6"
              aria-hidden="true"
            />

            {/* Deep Fry Control */}
            <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-red-500 tracking-wider flex items-center gap-2">
                  Deep Fry
                </span>
                {filters?.deepFry > 0 && (
                  <span className="text-[10px] font-bold text-red-400">
                    {filters.deepFry}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 w-full">
                <Flame
                  className={`w-5 h-5 transition-colors ${
                    filters?.deepFry > 0
                      ? "text-red-500 animate-pulse"
                      : "text-slate-600"
                  }`}
                />
                <OptimizedSlider
                  min="0"
                  max="100"
                  name="deepFry"
                  value={filters?.deepFry ?? 0}
                  onChange={onFilterChange}
                  onCommit={onStyleCommit}
                  filledColor="#ef4444"
                  trackColor="rgba(255, 255, 255, 0.1)"
                  className="range-slider w-full cursor-pointer h-2 rounded-full accent-red-500"
                  title="Deep Fry Level"
                />
              </div>
            </div>

            <div
              className="w-full h-px bg-[#181818] shrink-0 my-6"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Crop Canvas Tool */}
      <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider flex items-center gap-2">
            Crop Canvas
          </span>
        </div>
        <button
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(10);
            if (onStartCrop) onStartCrop();
          }}
          disabled={isCropping}
          className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl transition-all active:scale-[0.98] font-bold uppercase tracking-wider ${
            isCropping
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/50 cursor-not-allowed"
              : "bg-[#181818] text-slate-300 border border-[#2f3336] hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/10"
          }`}
          style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)' }}
        >
          <Scissors className={`w-4 h-4 sm:w-5 sm:h-5 ${isCropping ? 'animate-pulse' : ''}`} />
          <span className="text-xs sm:text-sm">
            {isCropping ? "Select Area..." : "Crop Canvas"}
          </span>
        </button>
        <p className="text-slate-500 text-[10px] sm:text-xs text-center">
          Select an area to capture as a snippet
        </p>
      </div>
    </div>
  );
}
