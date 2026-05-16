import { usePlatformSettings } from "@/hooks/usePlatformSettings";

// Normalizes a Brazilian phone number to E.164-ish digits-only suitable for
// wa.me. Strips everything except digits, prefixes "55" when the number
// looks local (10–11 digits).
function normalizeWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.717 2.722.717.345 0 2.392-.86 2.392-1.504 0-.014 0-.043-.014-.071-.13-.385-2.236-1.21-2.364-1.21zM16.16 4.65c-6.215 0-11.286 5.07-11.286 11.286 0 2.235.585 4.412 1.717 6.32L4.66 28.062c-.044.135-.013.282.086.39a.385.385 0 0 0 .385.097l5.952-1.864c1.832.96 3.872 1.475 5.99 1.475 6.215 0 11.286-5.07 11.286-11.286 0-2.978-1.158-5.78-3.27-7.892C21.94 5.808 19.14 4.65 16.16 4.65z"
      />
    </svg>
  );
}

export default function WhatsAppFloatingButton() {
  const { settings } = usePlatformSettings();
  if (!settings.whatsappEnabled) return null;
  const number = normalizeWhatsappNumber(settings.whatsappNumber ?? "");
  if (!number) return null;

  const message = settings.whatsappMessage?.trim() ?? "";
  const href = `https://wa.me/${number}${
    message ? `?text=${encodeURIComponent(message)}` : ""
  }`;
  const style = settings.whatsappStyle ?? "icon";
  const position = settings.whatsappPosition ?? "left";
  // Side class applied to all variants. Mobile keeps bottom-20 so the chip
  // sits above the fixed bottom nav bar (64px tall).
  const sideClass = position === "right" ? "right-4" : "left-4";

  // The "text" variant is a pill with a small label; the others are a
  // round 56px chip.
  if (style === "text") {
    const label = settings.whatsappButtonText?.trim() || "Falar no WhatsApp";
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={
          `fixed ${sideClass} z-50 bottom-24 sm:bottom-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 transition hover:scale-[1.03] active:scale-95`
        }
      >
        <WhatsAppGlyph className="h-4 w-4" />
        {label}
      </a>
    );
  }

  const transparent = style === "transparent";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className={
        `fixed ${sideClass} z-50 bottom-24 sm:bottom-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:scale-[1.05] active:scale-95 ` +
        (transparent
          ? "bg-[#25D366]/15 text-[#25D366] backdrop-blur-sm border border-[#25D366]/40 hover:bg-[#25D366]/25"
          : "bg-[#25D366] text-white shadow-emerald-500/30 hover:bg-[#1ebe5d]")
      }
    >
      <WhatsAppGlyph className="h-7 w-7" />
    </a>
  );
}
