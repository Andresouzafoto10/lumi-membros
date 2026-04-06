import { Link } from "react-router-dom";
import { Play, ChevronRight } from "lucide-react";

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
      className="flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/8 to-primary/3 px-3 py-3 hover:from-primary/12 hover:to-primary/6 hover:border-primary/30 transition-all duration-300 group animate-fade-in-up active:scale-[0.98] sm:gap-4 sm:px-4"
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shrink-0 group-hover:scale-105 transition-all duration-300 shadow-sm shadow-primary/25">
        <Play className="h-4 w-4 ml-0.5 fill-current" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest leading-none mb-1.5">
          Continue assistindo
        </p>
        <p className="text-sm font-semibold leading-tight line-clamp-2">{courseTitle}</p>
        <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{lessonTitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
