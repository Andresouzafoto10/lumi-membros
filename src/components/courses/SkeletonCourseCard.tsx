import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function SkeletonCourseCard() {
  return (
    <Card className="overflow-hidden border-none shadow-md">
      <AspectRatio ratio={16 / 9}>
        <div className="h-full w-full bg-muted animate-pulse" />
      </AspectRatio>
      <CardContent className="p-5 space-y-3">
        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-muted animate-pulse rounded" />
          <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-2 w-full bg-muted animate-pulse rounded mt-3" />
      </CardContent>
    </Card>
  );
}
