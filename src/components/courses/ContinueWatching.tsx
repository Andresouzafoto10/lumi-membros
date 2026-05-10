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
      className="flex h-10 items-center gap-2 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/8 to-primary/3 px-2 hover:from-primary/12 hover:to-primary/6 hover:border-primary/30 transition-all duration-300 group animate-fade-in-up active:scale-[0.98] sm:h-auto sm:gap-4 sm:px-4 sm:py-3"
    >
      <div className="flex items-center justify-center h-7 w-7 sm:h-10 sm:w-10 rounded-full bg-primary text-primary-foreground shrink-0 group-hover:scale-105 transition-all duration-300 shadow-sm shadow-primary/25">
        <Play className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5 fill-current" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[8px] sm:text-[10px] font-bold text-primary/70 uppercase tracking-widest leading-none mb-0.5 sm:mb-1.5">
          <span className="sm:hidden">Continue</span>
          <span className="hidden sm:inline">Continue assistindo</span>
        </p>
        <p className="text-[11px] sm:text-sm font-semibold leading-tight line-clamp-1 sm:line-clamp-2">{courseTitle}</p>
        <p className="hidden sm:block text-xs text-muted-foreground truncate leading-tight mt-0.5">{lessonTitle}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
