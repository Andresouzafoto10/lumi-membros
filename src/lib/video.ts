import type { CourseVideoType } from "@/types/course";

const IFRAME_TAG_REGEX = /<iframe\b/i;
const IFRAME_SRC_REGEX = /<iframe\b[^>]*\bsrc=(['"])(.*?)\1/i;
const IFRAME_TITLE_REGEX = /<iframe\b[^>]*\btitle=(['"])(.*?)\1/i;
const IFRAME_ALLOW_REGEX = /<iframe\b[^>]*\ballow=(['"])(.*?)\1/i;
const IFRAME_ALLOW_FULLSCREEN_REGEX = /<iframe\b[^>]*\ballowfullscreen(?:=(['"])(.*?)\1)?/i;

export type LessonEmbedMode = "iframe" | "url";

export type ParsedIframeEmbed = {
  src: string;
  title?: string;
  allow?: string;
  allowFullScreen: boolean;
};

export function isIframeEmbed(value: string): boolean {
  return IFRAME_TAG_REGEX.test(value.trim());
}

export function extractIframeSrc(value: string): string | null {
  const match = value.match(IFRAME_SRC_REGEX);
  return match?.[2]?.trim() || null;
}

export function inferEmbedMode(value: string | null | undefined): LessonEmbedMode {
  return value && isIframeEmbed(value) ? "iframe" : "url";
}

export function parseIframeEmbed(value: string): ParsedIframeEmbed | null {
  const src = extractIframeSrc(value);
  if (!src) {
    return null;
  }

  const title = value.match(IFRAME_TITLE_REGEX)?.[2]?.trim();
  const allow = value.match(IFRAME_ALLOW_REGEX)?.[2]?.trim();
  const allowFullScreen = IFRAME_ALLOW_FULLSCREEN_REGEX.test(value);

  return {
    src,
    ...(title && { title }),
    ...(allow && { allow }),
    allowFullScreen,
  };
}

export function normalizeExternalVideoUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (isIframeEmbed(trimmed)) {
    return extractIframeSrc(trimmed) ?? "";
  }

  return trimmed;
}

export function resolveLessonVideoUrl(
  videoType: CourseVideoType,
  videoUrl: string
): string {
  const normalizedUrl =
    videoType === "embed" ? normalizeExternalVideoUrl(videoUrl) : videoUrl.trim();

  if (!normalizedUrl) {
    return "";
  }

  if (videoType === "youtube") {
    let videoId: string | null = null;

    try {
      const url = new URL(normalizedUrl);

      if (url.hostname === "youtu.be") {
        videoId = url.pathname.slice(1);
      } else if (
        url.hostname.includes("youtube.com") ||
        url.hostname.includes("youtube-nocookie.com")
      ) {
        if (url.pathname.startsWith("/embed/")) {
          return normalizedUrl;
        }
        videoId = url.searchParams.get("v");
      }
    } catch {
      videoId = normalizedUrl;
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    return normalizedUrl;
  }

  if (videoType === "vimeo") {
    try {
      const url = new URL(normalizedUrl);

      if (url.hostname === "player.vimeo.com") {
        return normalizedUrl;
      }

      const match = url.pathname.match(/\/(\d+)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    } catch {
      if (/^\d+$/.test(normalizedUrl)) {
        return `https://player.vimeo.com/video/${normalizedUrl}`;
      }
    }

    return normalizedUrl;
  }

  return normalizedUrl;
}
