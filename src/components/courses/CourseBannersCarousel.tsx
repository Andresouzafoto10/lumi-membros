import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CourseBanner } from "@/types/course";

interface CourseBannersCarouselProps {
  banners: CourseBanner[];
}

export function CourseBannersCarousel({ banners }: CourseBannersCarouselProps) {
  const activeBanners = banners.filter((b) => b.isActive);

  const [currentIndex, setCurrentIndex] = useState(1); // starts at 1 because of leading clone
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef(0);

  // Clone first and last for infinite loop (empty-safe: avoids index -1 when no banners)
  const slides =
    activeBanners.length > 0
      ? [activeBanners[activeBanners.length - 1], ...activeBanners, activeBanners[0]]
      : [];
  const totalSlides = slides.length;

  const goTo = useCallback(
    (index: number, animate = true) => {
      setIsTransitioning(animate);
      setCurrentIndex(index);
    },
    []
  );

  const goNext = useCallback(() => {
    goTo(currentIndex + 1);
  }, [currentIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  // Handle infinite loop jump after transition
  useEffect(() => {
    if (!isTransitioning) return;
    const timeout = setTimeout(() => {
      if (currentIndex === 0) {
        setIsTransitioning(false);
        setCurrentIndex(totalSlides - 2);
      } else if (currentIndex === totalSlides - 1) {
        setIsTransitioning(false);
        setCurrentIndex(1);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [currentIndex, isTransitioning, totalSlides]);

  // Auto-play
  useEffect(() => {
    if (isPaused || activeBanners.length <= 1) return;
    const interval = setInterval(goNext, 4000);
    return () => clearInterval(interval);
  }, [isPaused, goNext, activeBanners.length]);

  // Early return AFTER all hooks are declared (preserves Rules of Hooks ordering)
  if (activeBanners.length === 0) return null;

  // Pointer drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragDeltaX.current = 0;
    setIsPaused(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    dragDeltaX.current = e.clientX - dragStartX.current;
  };

  const handlePointerUp = () => {
    if (dragStartX.current === null) return;
    if (dragDeltaX.current > 40) {
      goPrev();
    } else if (dragDeltaX.current < -40) {
      goNext();
    }
    dragStartX.current = null;
    dragDeltaX.current = 0;
    setIsPaused(false);
  };

  // Dot index mapped to actual banner index (0-based)
  const dotIndex =
    currentIndex === 0
      ? activeBanners.length - 1
      : currentIndex === totalSlides - 1
        ? 0
        : currentIndex - 1;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl h-[220px] sm:h-[280px] lg:h-[400px] group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Track */}
      <div
        ref={trackRef}
        className={cn(
          "flex h-full",
          isTransitioning && "transition-transform duration-400 ease-in-out"
        )}
        style={{
          width: `${totalSlides * 100}%`,
          transform: `translateX(-${(currentIndex / totalSlides) * 100}%)`,
        }}
      >
        {slides.map((banner, idx) => (
          <div
            key={`${banner.id}-${idx}`}
            className="relative h-full flex-shrink-0"
            style={{ width: `${100 / totalSlides}%` }}
          >
            <img
              src={banner.imageUrl}
              alt={banner.title ?? ""}
              className="h-full w-full object-cover select-none pointer-events-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/10" />

            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-14">
              {banner.title && (
                <h2 className="text-xl sm:text-3xl font-bold text-white leading-tight max-w-xl">
                  {banner.title}
                </h2>
              )}
              {banner.subtitle && (
                <p className="mt-2 text-sm sm:text-base text-white/85 max-w-lg">
                  {banner.subtitle}
                </p>
              )}
              {banner.buttonLabel && banner.targetType === "course" && banner.targetCourseId && (
                <div className="mt-4">
                  <Button asChild size="lg">
                    <Link to={`/cursos/${banner.targetCourseId}`}>
                      {banner.buttonLabel}
                    </Link>
                  </Button>
                </div>
              )}
              {banner.buttonLabel && banner.targetType === "url" && banner.targetUrl && (
                <div className="mt-4">
                  <Button asChild size="lg">
                    <a
                      href={banner.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {banner.buttonLabel}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next buttons */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-md hover:bg-black/50 hover:text-white transition-all opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-90"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-md hover:bg-black/50 hover:text-white transition-all opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-90"
            aria-label="Proximo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Pill indicators */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 rounded-full bg-black/20 backdrop-blur-sm px-2 py-1.5">
          {activeBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx + 1)}
              className={cn(
                "h-2 rounded-full transition-all duration-300 ease-out",
                idx === dotIndex
                  ? "w-7 bg-white shadow-sm"
                  : "w-2 bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Ir para banner ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
