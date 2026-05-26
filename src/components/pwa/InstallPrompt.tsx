import { useEffect, useMemo, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "lumi-membros:pwa-dismissed";
const SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000; // re-exibe após 7 dias
const ENGAGE_MS = 20_000; // espera engajamento antes de mostrar

function isDismissed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    if (v === "installed") return true;
    const ts = Number(v);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < SUPPRESS_MS;
  } catch {
    return false;
  }
}

function rememberDismiss(value: "now" | "installed") {
  try {
    localStorage.setItem(
      DISMISS_KEY,
      value === "installed" ? "installed" : String(Date.now())
    );
  } catch {
    /* ignore */
  }
}

export function InstallPrompt() {
  const { settings } = usePlatformSettings();
  const { canInstall, promptInstall, isIOS, isIOSSafari, isStandalone, installed } =
    usePwaInstall();

  const [engaged, setEngaged] = useState(false);
  const [dismissed, setDismissed] = useState(isDismissed);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);

  // Timer de engajamento — só mostra após o aluno usar um pouco
  useEffect(() => {
    const t = setTimeout(() => setEngaged(true), ENGAGE_MS);
    return () => clearTimeout(t);
  }, []);

  // App instalado durante a sessão → não insistir mais
  useEffect(() => {
    if (installed) {
      rememberDismiss("installed");
      setDismissed(true);
    }
  }, [installed]);

  const appName = settings.pwaName || settings.name || "o app";
  const iconUrl = useMemo(
    () => (settings.pwaIconUrl ? getProxiedImageUrl(settings.pwaIconUrl) : null),
    [settings.pwaIconUrl]
  );

  // iOS só via Safari consegue adicionar à tela de início
  const iosEligible = isIOS && isIOSSafari;

  const shouldShow =
    settings.pwaEnabled === true &&
    !isStandalone &&
    !installed &&
    engaged &&
    !dismissed &&
    (canInstall || iosEligible);

  if (!shouldShow) return null;

  const handleInstall = async () => {
    if (iosEligible && !canInstall) {
      setIosSheetOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "dismissed") {
      rememberDismiss("now");
      setDismissed(true);
    }
    // "accepted" → evento appinstalled cuida do resto
  };

  const handleDismiss = () => {
    rememberDismiss("now");
    setDismissed(true);
  };

  return (
    <>
      <div
        className={cn(
          "fixed z-[60] animate-fade-in-up",
          // mobile: acima da bottom-nav; desktop: canto inferior direito
          "inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)]",
          "md:inset-x-auto md:right-4 md:bottom-4 md:w-[22rem]"
        )}
        role="dialog"
        aria-label={`Instalar ${appName}`}
      >
        <div className="relative flex items-start gap-3 rounded-2xl border border-border bg-popover p-4 shadow-xl shadow-black/20">
          <button
            onClick={handleDismiss}
            aria-label="Fechar"
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="shrink-0">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt=""
                className="h-12 w-12 rounded-xl border border-border/60 object-contain bg-muted"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Download className="h-6 w-6" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-4">
            <p className="text-sm font-semibold leading-tight">
              Instale {appName} no seu dispositivo
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Acesso rápido pela tela inicial, como um aplicativo.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="h-8 gap-1.5 text-xs shadow-sm shadow-primary/15 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                Instalar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 text-xs text-muted-foreground active:scale-95"
              >
                Agora não
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Instruções manuais para iOS (Safari não tem prompt nativo) */}
      <Dialog open={iosSheetOpen} onOpenChange={setIosSheetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar à tela de início</DialogTitle>
            <DialogDescription>
              No iPhone/iPad, instale {appName} em 3 passos pelo Safari:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 py-2">
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                1
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                Toque no ícone
                <Share className="inline h-4 w-4 text-primary" />
                <span className="font-medium">Compartilhar</span>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                2
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                Escolha
                <Plus className="inline h-4 w-4 text-primary" />
                <span className="font-medium">Adicionar à Tela de Início</span>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                3
              </span>
              <span className="text-sm">
                Confirme em <span className="font-medium">Adicionar</span>
              </span>
            </li>
          </ol>
          <Button
            onClick={() => {
              setIosSheetOpen(false);
              handleDismiss();
            }}
            className="w-full"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
