import { cn } from "@/lib/utils";

interface CourseProgressTopBarProps {
  percent: number;
  className?: string;
}

export function CourseProgressTopBar({
  percent,
  className,
}: CourseProgressTopBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Progresso geral
        </span>
        <span className="text-xs font-semibold text-primary">
          {Math.round(clamped)}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
