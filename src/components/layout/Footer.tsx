import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export function Footer() {
  const { settings } = usePlatformSettings();
  const platformName = settings.name || "Tribos Membros";

  return (
    <footer className="border-t border-border/30 py-4 text-center text-sm text-muted-foreground">
      Feito com amor ❤️ {platformName}
    </footer>
  );
}
