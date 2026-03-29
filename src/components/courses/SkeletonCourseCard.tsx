import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function SkeletonCourseCard() {
  return (
    <Card className="overflow-hidden border border-border/50 shadow-md">
      <AspectRatio ratio={16 / 9}>
        <div className="h-full w-full bg-muted shimmer-overlay" />
      </AspectRatio>
      <CardContent className="p-5 space-y-3">
        <div className="h-4 w-3/4 bg-muted rounded shimmer-overlay" />
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-muted rounded shimmer-overlay" />
          <div className="h-3 w-1/2 bg-muted rounded shimmer-overlay" />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="h-2.5 w-16 bg-muted rounded shimmer-overlay" />
          <div className="h-2.5 w-8 bg-muted rounded shimmer-overlay" />
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full shimmer-overlay" />
      </CardContent>
    </Card>
  );
}
