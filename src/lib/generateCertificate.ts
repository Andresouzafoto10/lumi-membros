import html2canvas from "html2canvas";
import { toast } from "sonner";
import { isR2Url, fetchR2AsDataUrl } from "@/lib/r2Upload";

// ---------------------------------------------------------------------------
// Layer 1: Edge Function proxy (R2 URLs only)
// Server-side fetch via r2-presigned → no CORS restrictions.
// ---------------------------------------------------------------------------

async function fetchViaProxy(url: string): Promise<string> {
  return await fetchR2AsDataUrl(url);
}

// ---------------------------------------------------------------------------
// Layer 2: Direct fetch with credentials omitted
// Works when R2 bucket has CORS properly configured.
// ---------------------------------------------------------------------------

async function fetchDirectAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    mode: "cors",
    credentials: "omit",
    cache: "no-cache",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Layer 3: Canvas-based <img crossOrigin="anonymous"> fallback
// Loads image via DOM element, draws to canvas, extracts base64.
// ---------------------------------------------------------------------------

async function fetchViaCanvas(url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/webp"));
    };
    img.onerror = reject;
    // Cache-bust to avoid stale no-cors cached responses
    img.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
  });
}

// ---------------------------------------------------------------------------
// fetchAsDataUrl — tries all layers in order until one succeeds
// ---------------------------------------------------------------------------

async function fetchAsDataUrl(url: string): Promise<string> {
  // Layer 1: Edge Function proxy (most reliable for R2 URLs)
  if (isR2Url(url)) {
    try {
      return await fetchViaProxy(url);
    } catch (e) {
      console.warn("[Certificate] Layer 1 (proxy) failed:", e);
    }
  }

  // Layer 2: Direct fetch with CORS
  try {
    return await fetchDirectAsDataUrl(url);
  } catch (e) {
    console.warn("[Certificate] Layer 2 (direct fetch) failed:", e);
  }

  // Layer 3: Canvas-based fallback
  try {
    return await fetchViaCanvas(url);
  } catch (e) {
    console.warn("[Certificate] Layer 3 (canvas) failed:", e);
  }

  throw new Error(`All image fetch strategies failed for: ${url}`);
}

// ---------------------------------------------------------------------------
// isCrossOrigin
// ---------------------------------------------------------------------------

function isCrossOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// proxyCrossOriginImages — convert cross-origin images to data URLs so
// html2canvas can render them. Returns a restore function and a flag
// indicating whether any image failed all strategies.
// ---------------------------------------------------------------------------

async function proxyCrossOriginImages(
  container: HTMLElement
): Promise<{ restore: () => void; hadFailures: boolean }> {
  const restores: Array<() => void> = [];
  let hadFailures = false;

  // 1) Handle <img> elements
  const images = container.querySelectorAll("img");
  const imgPromises = Array.from(images).map(async (img) => {
    const originalSrc = img.src;
    if (!originalSrc || !isCrossOrigin(originalSrc)) return;

    try {
      const dataUrl = await fetchAsDataUrl(originalSrc);
      img.src = dataUrl;
      restores.push(() => {
        img.src = originalSrc;
      });
    } catch {
      console.error(
        "[Certificate] All strategies failed for image:",
        originalSrc
      );
      hadFailures = true;

      // Layer 4: Solid color fallback — hide broken img, paint parent
      const parent = img.parentElement;
      if (parent) {
        const originalBg = parent.style.backgroundColor;
        const originalDisplay = img.style.display;
        parent.style.backgroundColor = "#00C2CB";
        img.style.display = "none";
        restores.push(() => {
          parent.style.backgroundColor = originalBg;
          img.style.display = originalDisplay;
        });
      }
    }
  });

  // 2) Handle elements with background-image (via data-bg-src attribute)
  const bgElements = container.querySelectorAll<HTMLElement>("[data-bg-src]");
  const bgPromises = Array.from(bgElements).map(async (el) => {
    const originalUrl = el.dataset.bgSrc;
    if (!originalUrl || !isCrossOrigin(originalUrl)) return;

    try {
      const dataUrl = await fetchAsDataUrl(originalUrl);
      const originalBg = el.style.backgroundImage;
      el.style.backgroundImage = `url(${dataUrl})`;
      restores.push(() => {
        el.style.backgroundImage = originalBg;
      });
    } catch {
      console.error(
        "[Certificate] All strategies failed for background:",
        originalUrl
      );
      hadFailures = true;
    }
  });

  await Promise.all([...imgPromises, ...bgPromises]);

  return {
    restore: () => restores.forEach((fn) => fn()),
    hadFailures,
  };
}

// ---------------------------------------------------------------------------
// waitForImages — wait for all <img> elements to finish loading
// ---------------------------------------------------------------------------

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );
}

// ---------------------------------------------------------------------------
// downloadCertificateAsPng — render element to PNG and trigger download.
// Cross-origin images are automatically proxied via Edge Function.
// ---------------------------------------------------------------------------

export async function downloadCertificateAsPng(
  elementOrId: HTMLElement | string,
  filename: string
): Promise<void> {
  const element =
    typeof elementOrId === "string"
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!element) throw new Error("Container não encontrado");

  // Convert cross-origin images to data URLs (layered strategy)
  const { restore, hadFailures } = await proxyCrossOriginImages(element);

  // Wait for swapped images to finish loading
  await waitForImages(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();

    if (hadFailures) {
      toast.warning("Certificado baixado sem imagem de fundo (erro de CORS)");
    }
  } finally {
    restore();
  }
}
