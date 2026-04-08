import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CourseAccess } from "@/types/course";

interface CourseCardProps {
  to: string;
  title: string;
  description: string;
  bannerUrl: string;
  progressPercent?: number;
  isDisabled?: boolean;
  createdAt?: string;
  /** When true, shows grayscale + lock overlay */
  locked?: boolean;
  /** Course access config — used for no-access behavior */
  access?: CourseAccess;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const CourseCard = memo(function CourseCard({
  to,
  title,
  description,
  bannerUrl,
  progressPercent,
  isDisabled,
  createdAt,
  locked,
  access,
}: CourseCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const isNew =
    createdAt != null &&
    Date.now() - new Date(createdAt).getTime() < SEVEN_DAYS_MS;

  const noAccessAction = access?.no_access_action ?? "nothing";
  const supportUrl = access?.no_access_support_url ?? "";
  const redirectUrl = access?.no_access_redirect_url ?? "";

  function handleLockedClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (noAccessAction === "redirect" && redirectUrl) {
      window.open(redirectUrl, "_blank");
    } else {
      setModalOpen(true);
    }
  }

  const cardContent = (
    <Card className="overflow-hidden border border-border/50 shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/5 group-hover:-translate-y-1 group-hover:border-primary/20">
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          <img
            src={bannerUrl}
            alt={title}
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105",
              locked && "grayscale"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </AspectRatio>
        {locked && (
          <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm shadow-lg">
            <Lock className="h-4 w-4 text-white" />
          </div>
        )}
        {isNew && !locked && (
          <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground shadow-lg shadow-primary/25 animate-pulse-soft">
            Novo
          </Badge>
        )}
      </div>

      <CardContent className="p-5">
        <h3 className="text-base font-semibold leading-snug line-clamp-2">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>

        {progressPercent != null && !locked && (
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
  );

  // Locked card — not a Link, uses onClick
  if (locked) {
    return (
      <>
        <button
          type="button"
          onClick={handleLockedClick}
          className="block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group cursor-pointer active:scale-[0.98] transition-transform"
        >
          {cardContent}
        </button>

        {/* Restricted access modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <div className="flex justify-center py-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <DialogTitle className="text-center">Acesso restrito</DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-muted-foreground">
              Entre em contato com o suporte para saber como ter acesso.
            </p>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {supportUrl && (
                <Button
                  onClick={() => window.open(supportUrl, "_blank")}
                  className="w-full"
                >
                  Falar com suporte
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
                className="w-full"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Normal card — Link
  return (
    <Link
      to={to}
      className={cn(
        "block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group active:scale-[0.98] transition-transform",
        isDisabled && "opacity-60 pointer-events-none"
      )}
      tabIndex={isDisabled ? -1 : undefined}
      aria-disabled={isDisabled}
    >
      {cardContent}
    </Link>
  );
});
