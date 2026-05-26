import { useCallback, useEffect, useState } from "react";

/**
 * Evento `beforeinstallprompt` (não tipado nas libs DOM padrão).
 * Disparado por Chrome/Edge/Android quando a PWA é instalável.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari expõe navigator.standalone quando aberto pela homescreen
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(displayMode || iosStandalone);
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIosDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ se identifica como Mac; detectar via touch points
  const isIpadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIosDevice || isIpadOS;
}

/**
 * iOS só permite "Adicionar à Tela de Início" pelo Safari.
 * Chrome (CriOS), Firefox (FxiOS) e Edge (EdgiOS) no iOS não conseguem.
 */
function detectIOSSafari(isIOS: boolean): boolean {
  if (!isIOS || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

export interface PwaInstallState {
  /** true quando o prompt nativo (Android/Desktop) está disponível */
  canInstall: boolean;
  /** dispara o prompt nativo; retorna o desfecho */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  /** dispositivo iOS (precisa de instruções manuais) */
  isIOS: boolean;
  /** iOS via Safari — único que suporta adicionar à tela de início */
  isIOSSafari: boolean;
  /** já está rodando como app instalado (display-mode standalone) */
  isStandalone: boolean;
  /** instalado durante esta sessão (evento appinstalled) */
  installed: boolean;
}

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(detectStandalone);

  const isIOS = detectIOS();
  const isIOSSafari = detectIOSSafari(isIOS);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Impede o mini-infobar padrão; mostramos nossa própria UI
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayChange = () => setIsStandalone(detectStandalone());
    mql?.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mql?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome;
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null,
    promptInstall,
    isIOS,
    isIOSSafari,
    isStandalone,
    installed,
  };
}
