import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  to: string;
  title: string;
  description: string;
  bannerUrl: string;
  progressPercent?: number;
  isDisabled?: boolean;
  createdAt?: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function CourseCard({
  to,
  title,
  description,
  bannerUrl,
  progressPercent,
  isDisabled,
  createdAt,
}: CourseCardProps) {
  const isNew =
    createdAt != null &&
    Date.now() - new Date(createdAt).getTime() < SEVEN_DAYS_MS;

  return (
    <Link
      to={to}
      className={cn(
        "block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group",
        isDisabled && "opacity-60 pointer-events-none"
      )}
      tabIndex={isDisabled ? -1 : undefined}
      aria-disabled={isDisabled}
    >
      <Card className="overflow-hidden border border-border/50 shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/5 group-hover:-translate-y-1 group-hover:border-primary/20">
        <div className="relative">
          <AspectRatio ratio={16 / 9}>
            <img
              src={bannerUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </AspectRatio>
          {isNew && (
            <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground shadow-lg shadow-primary/25 animate-pulse-soft">
              Novo
            </Badge>
          )}
        </div>

        <CardContent className="p-5">
          <h3 className="text-base font-semibold leading-snug">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          {progressPercent != null && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Progresso
                </span>
                <span className="text-xs font-semibold text-primary">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
