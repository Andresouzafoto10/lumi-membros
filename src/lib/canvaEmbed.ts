import type { CourseBannerMediaType } from "@/types/course";

const CANVA_DESIGN_RE = /^https?:\/\/(?:www\.)?canva\.com\/design\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)(?:\/[^?#]*)?(?:[?#].*)?$/;
const VIDEO_EXT_RE = /\.(mp4|webm|mov)(?:[?#].*)?$/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#].*)?$/i;

export function isCanvaDesignUrl(url: string): boolean {
  return CANVA_DESIGN_RE.test(url);
}

export function normalizeCanvaEmbedUrl(url: string): string {
  const match = url.match(CANVA_DESIGN_RE);
  if (!match) return url;
  const [, id, token] = match;
  return `https://www.canva.com/design/${id}/${token}/view?embed`;
}

export function detectMediaTypeFromUrl(url: string): CourseBannerMediaType {
  if (isCanvaDesignUrl(url)) return "embed";
  if (VIDEO_EXT_RE.test(url)) return "video";
  if (IMAGE_EXT_RE.test(url)) return "image";
  return "image";
}

export function detectMediaTypeFromFile(file: File): CourseBannerMediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "image";
}
