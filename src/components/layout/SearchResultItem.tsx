import type { LucideIcon } from "lucide-react";

interface SearchResultItemProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge: string;
  badgeColor?: string;
  query: string;
  onClick: () => void;
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <strong key={i} className="font-semibold text-primary">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export function SearchResultItem({
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeColor = "bg-muted text-muted-foreground",
  query,
  onClick,
}: SearchResultItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent active:scale-[0.99]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {highlightMatch(title, query)}
          </p>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badgeColor}`}
          >
            {badge}
          </span>
        </div>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
