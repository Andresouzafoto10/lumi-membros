import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Bell, BellRing, Clock3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useCourseLaunchInterest } from "@/hooks/useCourseLaunchInterest";
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
  /** Course ID (required for upcoming launch interest) */
  courseId?: string;
  /** ISO date of upcoming launch */
  launchAt?: string | null;
  /** "upcoming" shows countdown + notify button, "released" shows normal card */
  launchStatus?: "upcoming" | "released";
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
  courseId,
  launchAt,
  launchStatus,
}: CourseCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { isInterested, toggleInterest } = useCourseLaunchInterest();

  const isUpcoming = launchStatus === "upcoming" && !!launchAt;
  const interested = courseId ? isInterested(courseId) : false;

  const isNew =
    !isUpcoming &&
    createdAt != null &&
    Date.now() - new Date(createdAt).getTime() < SEVEN_DAYS_MS;

  const handleNotifyClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!courseId) return;
    try {
      await toggleInterest(courseId);
      toast.success(interested ? "Notificação removida" : "Voce sera notificado no lancamento!");
    } catch {
      toast.error("Erro ao salvar preferencia");
    }
  };

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
              (locked || isUpcoming) && "grayscale"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {isUpcoming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40">
              <Clock3 className="h-6 w-6 text-white" />
              <p className="text-xs font-semibold uppercase tracking-wide text-white">Em breve</p>
              {launchAt && (
                <p className="text-[11px] text-white/80">
                  {formatDistanceToNow(new Date(launchAt), { locale: ptBR, addSuffix: true })}
                </p>
              )}
            </div>
          )}
        </AspectRatio>
        {locked && (
          <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm shadow-lg">
            <Lock className="h-4 w-4 text-white" />
          </div>
        )}
        {isNew && !locked && !isUpcoming && (
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

        {isUpcoming && courseId && (
          <Button
            size="sm"
            variant={interested ? "default" : "outline"}
            className="mt-3 w-full gap-2"
            onClick={handleNotifyClick}
          >
            {interested ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            {interested ? "Vou ser notificado" : "Me notifique"}
          </Button>
        )}

        {progressPercent != null && !locked && !isUpcoming && (
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

  // Upcoming card — not a Link, only notify button is interactive
  if (isUpcoming) {
    return (
      <div className="block rounded-lg group">
        {cardContent}
      </div>
    );
  }

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
