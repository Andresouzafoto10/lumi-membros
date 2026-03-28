import { cn } from "@/lib/utils";

interface CourseProgressTopBarProps {
  percent: number;
  className?: string;
}

export function CourseProgressTopBar({
  percent,
  className,
}: CourseProgressTopBarProps) {
  return (
    <div className={cn("w-full h-1 bg-muted rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
