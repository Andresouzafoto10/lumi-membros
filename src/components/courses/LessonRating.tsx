import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useLessonRatings,
  useLessonLikeCount,
  useAdminLessonRatings,
} from "@/hooks/useLessonRatings";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useAuth } from "@/contexts/AuthContext";

interface LessonRatingProps {
  lessonId: string;
  ratingsEnabled?: boolean;
  /** @deprecated kept for callers; YouTube-style pill no longer renders a label */
  hideLabel?: boolean;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    return v >= 100
      ? `${Math.round(v)} mil`
      : `${v.toFixed(1).replace(".", ",")} mil`;
  }
  const v = n / 1_000_000;
  return v >= 100
    ? `${Math.round(v)} mi`
    : `${v.toFixed(1).replace(".", ",")} mi`;
}

export function LessonRating({ lessonId, ratingsEnabled = true }: LessonRatingProps) {
  const { settings } = usePlatformSettings();
  const { getRating, setRating } = useLessonRatings();
  const { isAdmin } = useAuth();
  const publicLikeCount = useLessonLikeCount(isAdmin ? null : lessonId);
  const { getCounts } = useAdminLessonRatings();

  if (!settings.ratingsEnabled || !ratingsEnabled) {
    return null;
  }

  const current = getRating(lessonId);
  const adminCounts = isAdmin ? getCounts(lessonId) : null;
  const likes = adminCounts ? adminCounts.likes : publicLikeCount;
  const dislikes = adminCounts
    ? adminCounts.dislikes
    : current === "dislike"
      ? 1
      : 0;

  return (
    <div className="inline-flex items-center h-9 rounded-full border border-border bg-transparent overflow-hidden">
      <button
        onClick={() => setRating(lessonId, current === "like" ? null : "like")}
        className={cn(
          "flex items-center gap-1.5 h-full px-3 text-sm transition-colors active:scale-[0.96]",
          current === "like"
            ? "text-primary"
            : "text-foreground hover:text-primary"
        )}
        title="Curti"
      >
        <ThumbsUp
          className={cn("h-4 w-4", current === "like" && "fill-current")}
        />
        {likes > 0 && <span>{formatCount(likes)}</span>}
      </button>
      <div className="h-5 w-px bg-border" />
      <button
        onClick={() =>
          setRating(lessonId, current === "dislike" ? null : "dislike")
        }
        className={cn(
          "flex items-center gap-1.5 h-full px-3 text-sm transition-colors active:scale-[0.96]",
          current === "dislike"
            ? "text-destructive"
            : "text-foreground hover:text-destructive"
        )}
        title="Não curti"
      >
        <ThumbsDown
          className={cn("h-4 w-4", current === "dislike" && "fill-current")}
        />
        {dislikes > 0 && <span>{formatCount(dislikes)}</span>}
      </button>
    </div>
  );
}
