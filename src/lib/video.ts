import type { CourseVideoType } from "@/types/course";

const IFRAME_TAG_REGEX = /<iframe\b/i;
const IFRAME_SRC_REGEX = /<iframe\b[^>]*\bsrc=(['"])(.*?)\1/i;

export function extractIframeSrc(value: string): string | null {
  const match = value.match(IFRAME_SRC_REGEX);
  return match?.[2]?.trim() || null;
}

export function normalizeLessonVideoInput(
  _videoType: CourseVideoType,
  value: string
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (IFRAME_TAG_REGEX.test(trimmed)) {
    return extractIframeSrc(trimmed) ?? "";
  }

  return trimmed;
}

export function resolveLessonVideoUrl(
  videoType: CourseVideoType,
  videoUrl: string
): string {
  const normalizedUrl = normalizeLessonVideoInput(videoType, videoUrl);

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
