import { cn } from "@/lib/utils";

type LevelBadgeProps = {
  iconName: string;
  iconColor: string;
  levelName: string;
  size?: "sm" | "md";
  className?: string;
};

export function LevelBadge({
  iconName,
  iconColor,
  levelName,
  size = "sm",
  className,
}: LevelBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        className
      )}
      style={{
        backgroundColor: `${iconColor}15`,
        color: iconColor,
        borderColor: `${iconColor}30`,
        borderWidth: 1,
      }}
    >
      <span>{iconName}</span>
      <span>{levelName}</span>
    </span>
  );
}
