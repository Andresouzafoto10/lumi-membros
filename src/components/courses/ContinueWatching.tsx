import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContinueWatchingProps {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
}

export function ContinueWatching({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
}: ContinueWatchingProps) {
  return (
    <Link
      to={`/cursos/${courseId}?lesson=${lessonId}`}
      className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 hover:bg-primary/10 transition-colors group"
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground shrink-0 group-hover:scale-105 transition-transform">
        <Play className="h-3.5 w-3.5 ml-0.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-primary uppercase tracking-wider leading-none mb-1">
          Continue de onde parou
        </p>
        <p className="text-sm font-medium truncate leading-tight">{courseTitle}</p>
        <p className="text-xs text-muted-foreground truncate leading-tight">{lessonTitle}</p>
      </div>
    </Link>
  );
}
