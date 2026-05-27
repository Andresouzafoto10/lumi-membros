import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CourseCardOrientation } from "@/types/course";

const AUTOPLAY_INTERVAL_MS = 5000;

type CourseCarouselSectionProps = {
  title: string;
  description?: string;
  courseCount: number;
  orientation?: CourseCardOrientation;
  autoplay?: boolean;
  children: ReactNode;
};

export function CourseCarouselSection({
  title,
  description,
  courseCount,
  orientation = "horizontal",
  autoplay = false,
  children,
}: CourseCarouselSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoplayTimeoutRef = useRef<number | null>(null);
  const [autoplayCycle, setAutoplayCycle] = useState(0);
  const items = useMemo(() => Children.toArray(children), [children]);

  const clearAutoplayTimeout = useCallback(() => {
    if (autoplayTimeoutRef.current === null) return;

    window.clearTimeout(autoplayTimeoutRef.current);
    autoplayTimeoutRef.current = null;
  }, []);

  const restartAutoplayCycle = useCallback(() => {
    clearAutoplayTimeout();
    setAutoplayCycle((cycle) => cycle + 1);
  }, [clearAutoplayTimeout]);

  const scroll = useCallback((direction: "previous" | "next", wrap = false) => {
    const el = scrollRef.current;
    if (!el) return;

    const track = el.firstElementChild;
    const itemElements = track
      ? Array.from(track.children).filter(
          (child): child is HTMLElement => child instanceof HTMLElement
        )
      : [];

    if (itemElements.length === 0) return;

    const maxScrollLeft = Math.max(el.scrollWidth - el.clientWidth, 0);
    const isAtEnd = el.scrollLeft >= maxScrollLeft - 12;
    const isAtStart = el.scrollLeft <= 12;

    if (wrap && direction === "next" && isAtEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    if (wrap && direction === "previous" && isAtStart) {
      el.scrollTo({ left: maxScrollLeft, behavior: "smooth" });
      return;
    }

    if (!wrap && direction === "next" && isAtEnd) return;
    if (!wrap && direction === "previous" && isAtStart) return;

    const firstItemLeft = itemElements[0]?.offsetLeft ?? 0;
    const snapPositions = itemElements.map((item) =>
      Math.min(Math.max(item.offsetLeft - firstItemLeft, 0), maxScrollLeft)
    );

    const currentIndex = snapPositions.reduce((closestIndex, position, index) => {
      const closestDistance = Math.abs(snapPositions[closestIndex] - el.scrollLeft);
      const distance = Math.abs(position - el.scrollLeft);
      return distance < closestDistance ? index : closestIndex;
    }, 0);

    const targetIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, itemElements.length - 1)
        : Math.max(currentIndex - 1, 0);

    el.scrollTo({
      left: snapPositions[targetIndex],
      behavior: "smooth",
    });
  }, []);

  const handleManualScroll = useCallback(
    (direction: "previous" | "next") => {
      scroll(direction);
      if (autoplay) restartAutoplayCycle();
    },
    [autoplay, restartAutoplayCycle, scroll]
  );

  useEffect(() => {
    clearAutoplayTimeout();

    if (!autoplay || items.length <= 1) return;

    autoplayTimeoutRef.current = window.setTimeout(() => {
      autoplayTimeoutRef.current = null;
      scroll("next", true);
      setAutoplayCycle((cycle) => cycle + 1);
    }, AUTOPLAY_INTERVAL_MS);

    return clearAutoplayTimeout;
  }, [autoplay, autoplayCycle, clearAutoplayTimeout, items.length, scroll]);

  const itemClassName =
    orientation === "vertical"
      ? "w-[46vw] min-w-[168px] max-w-[260px] sm:w-[220px] lg:w-[238px] xl:w-[260px]"
      : "w-[82vw] min-w-[260px] sm:w-[360px] lg:w-[420px] xl:w-[440px]";

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 h-6 w-1 rounded-full bg-primary" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {courseCount} {courseCount === 1 ? "curso" : "cursos"}
              </span>
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        {items.length > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            {autoplay && (
              <div
                className="grid h-9 w-9 place-items-center text-foreground/80"
                aria-label={`Proximo curso de ${title} em 5 segundos`}
                title="Proximo curso em 5 segundos"
              >
                <svg className="h-7 w-7" viewBox="0 0 36 36" aria-hidden="true">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.2"
                  />
                  <circle
                    key={autoplayCycle}
                    className="carousel-autoplay-ring"
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="100"
                    strokeDashoffset="100"
                  />
                </svg>
              </div>
            )}
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-lg bg-muted/70"
              aria-label={`Voltar cursos de ${title}`}
              onClick={() => handleManualScroll("previous")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-lg bg-muted/70"
              aria-label={`Avancar cursos de ${title}`}
              onClick={() => handleManualScroll("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="-mx-4 overflow-x-auto scroll-smooth px-4 pb-1 scrollbar-none sm:-mx-6 sm:px-6"
      >
        <div
          className={cn(
            "flex snap-x snap-mandatory gap-3 sm:gap-5",
            orientation === "vertical" ? "items-start" : "items-stretch"
          )}
        >
          {items.map((child, index) => (
            <div
              key={index}
              className={cn("shrink-0 snap-start", itemClassName)}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
