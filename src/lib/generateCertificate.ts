import html2canvas from "html2canvas";
import { isR2Url, fetchR2AsDataUrl } from "@/lib/r2Upload";

/**
 * Fetch a cross-origin URL and return it as a data URL.
 * Tries the S3 API first for R2 URLs, then falls back to regular fetch.
 */
async function fetchAsDataUrl(url: string): Promise<string> {
  // Try S3 API first for R2 URLs (CORS-enabled endpoint)
  if (isR2Url(url)) {
    try {
      return await fetchR2AsDataUrl(url);
    } catch {
      // S3 API failed — fall through to regular fetch
    }
  }

  // Fallback: regular fetch on the public URL
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function isCrossOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Convert cross-origin images to data URLs so html2canvas can render them.
 * Handles both <img> elements and elements with background-image CSS
 * (identified via data-bg-src attribute).
 * Returns a function that restores original values.
 */
async function proxyCrossOriginImages(
  container: HTMLElement
): Promise<() => void> {
  const restores: Array<() => void> = [];

  // 1) Handle <img> elements
  const images = container.querySelectorAll("img");
  const imgPromises = Array.from(images).map(async (img) => {
    const originalSrc = img.src;
    if (!originalSrc || !isCrossOrigin(originalSrc)) return;

    try {
      const dataUrl = await fetchAsDataUrl(originalSrc);
      img.src = dataUrl;
      restores.push(() => { img.src = originalSrc; });
    } catch {
      console.warn("[Certificate] Failed to proxy <img>:", originalSrc);
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
      restores.push(() => { el.style.backgroundImage = originalBg; });
    } catch {
      console.warn("[Certificate] Failed to proxy background-image:", originalUrl);
    }
  });

  await Promise.all([...imgPromises, ...bgPromises]);

  return () => restores.forEach((fn) => fn());
}

/**
 * Wait for all <img> elements inside the container to finish loading.
 */
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

/**
 * Render an element to PNG and trigger browser download.
 * Accepts either a direct HTMLElement ref or a containerId string.
 *
 * Cross-origin images (R2 etc.) are automatically fetched as data URLs
 * before rendering so html2canvas can capture them.
 */
export async function downloadCertificateAsPng(
  elementOrId: HTMLElement | string,
  filename: string
): Promise<void> {
  const element =
    typeof elementOrId === "string"
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!element) throw new Error("Container não encontrado");

  // Convert cross-origin images to data URLs
  const restoreImages = await proxyCrossOriginImages(element);

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
  } finally {
    restoreImages();
  }
}
