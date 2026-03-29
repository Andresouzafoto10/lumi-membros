import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLessonRatings } from "@/hooks/useLessonRatings";

interface LessonRatingProps {
  lessonId: string;
}

export function LessonRating({ lessonId }: LessonRatingProps) {
  const { getRating, setRating } = useLessonRatings();
  const current = getRating(lessonId);

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1.5">Avaliar:</span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full transition-all active:scale-90",
          current === "like"
            ? "bg-primary/15 text-primary hover:bg-primary/20 shadow-sm shadow-primary/10"
            : "hover:text-primary"
        )}
        onClick={() => setRating(lessonId, current === "like" ? null : "like")}
        title="Curti"
      >
        <ThumbsUp
          className={cn(
            "h-4 w-4 transition-transform",
            current === "like" ? "fill-primary scale-110" : ""
          )}
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full transition-all active:scale-90",
          current === "dislike"
            ? "bg-destructive/15 text-destructive hover:bg-destructive/20 shadow-sm shadow-destructive/10"
            : "hover:text-destructive"
        )}
        onClick={() =>
          setRating(lessonId, current === "dislike" ? null : "dislike")
        }
        title="Descurti"
      >
        <ThumbsDown
          className={cn(
            "h-4 w-4 transition-transform",
            current === "dislike" ? "fill-destructive scale-110" : ""
          )}
        />
      </Button>
    </div>
  );
}
