import html2canvas from "html2canvas";
import { isR2Url, fetchR2AsDataUrl } from "@/lib/r2Upload";

/**
 * Convert cross-origin <img> elements to data URLs so html2canvas
 * can render them. R2 images go through the S3 API (CORS-enabled);
 * other cross-origin images use a regular fetch() fallback.
 * Returns a function that restores the original src attributes.
 */
async function proxyCrossOriginImages(
  container: HTMLElement
): Promise<() => void> {
  const images = container.querySelectorAll("img");
  const restores: Array<() => void> = [];

  await Promise.all(
    Array.from(images).map(async (img) => {
      const originalSrc = img.src;
      if (!originalSrc) return;

      try {
        let dataUrl: string;

        if (isR2Url(originalSrc)) {
          // Fetch via S3 API endpoint (has CORS configured)
          dataUrl = await fetchR2AsDataUrl(originalSrc);
        } else {
          // Check if cross-origin
          try {
            const imgUrl = new URL(originalSrc, window.location.href);
            if (imgUrl.origin === window.location.origin) return;
          } catch {
            return;
          }
          // Try regular fetch for non-R2 cross-origin images
          const res = await fetch(originalSrc);
          const blob = await res.blob();
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        img.src = dataUrl;
        restores.push(() => {
          img.src = originalSrc;
        });
      } catch {
        // If all methods fail, leave original — image won't appear in PNG
        console.warn("[Certificate] Failed to proxy image:", originalSrc);
      }
    })
  );

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
