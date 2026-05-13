import { useEffect, useCallback, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];

export function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;
  const [zoomIdx, setZoomIdx] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIdx];
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const resetZoom = useCallback(() => setZoomIdx(0), []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) {
        resetZoom();
        onNavigate(currentIndex - 1);
      }
      if (e.key === "ArrowRight" && hasNext) {
        resetZoom();
        onNavigate(currentIndex + 1);
      }
      if (e.key === "+" || e.key === "=") setZoomIdx((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
      if (e.key === "-") setZoomIdx((i) => Math.max(i - 1, 0));
      if (e.key === "0") resetZoom();
    },
    [onClose, onNavigate, currentIndex, hasPrev, hasNext, resetZoom]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  useEffect(() => {
    resetZoom();
  }, [currentIndex, resetZoom]);

  function handleWheel(e: React.WheelEvent) {
    if (e.deltaY < 0) setZoomIdx((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
    else if (e.deltaY > 0) setZoomIdx((i) => Math.max(i - 1, 0));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1 || !scrollRef.current) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
    };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    scrollRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    scrollRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
  }
  function handleMouseUp() {
    isDraggingRef.current = false;
  }

  const canZoomIn = zoomIdx < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIdx > 0;

  const content = (
    <div
      className="fixed inset-0 z-[200] animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/95" />

      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors ring-1 ring-white/15"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Zoom controls */}
      <div
        className="absolute top-4 left-4 sm:top-5 sm:left-5 z-30 flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full ring-1 ring-white/15 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setZoomIdx((i) => Math.max(i - 1, 0))}
          disabled={!canZoomOut}
          aria-label="Diminuir zoom"
          className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ZoomOut className="h-4 w-4 text-white" />
        </button>
        <span className="text-white/90 text-xs font-medium tabular-nums w-9 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoomIdx((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1))}
          disabled={!canZoomIn}
          aria-label="Aumentar zoom"
          className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ZoomIn className="h-4 w-4 text-white" />
        </button>
        {zoomIdx > 0 && (
          <button
            onClick={resetZoom}
            aria-label="Resetar zoom"
            className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="h-4 w-4 text-white" />
          </button>
        )}
      </div>

      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
            onNavigate(currentIndex - 1);
          }}
          aria-label="Imagem anterior"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors ring-1 ring-white/15"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
            onNavigate(currentIndex + 1);
          }}
          aria-label="Próxima imagem"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors ring-1 ring-white/15"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-full ring-1 ring-white/15">
          <span className="text-white/90 text-xs font-medium tabular-nums">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto flex items-center justify-center px-14 py-20 sm:px-16 sm:py-14"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDraggingRef.current ? "grabbing" : "grab") : "default" }}
      >
        <img
          src={images[currentIndex]}
          alt={`Imagem ${currentIndex + 1}`}
          className="block max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl select-none transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setZoomIdx((i) => (i === 0 ? 2 : 0));
          }}
          draggable={false}
          onError={(e) => {
            e.currentTarget.alt = "Erro ao carregar imagem";
            e.currentTarget.style.padding = "2rem";
            e.currentTarget.style.color = "white";
          }}
        />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
