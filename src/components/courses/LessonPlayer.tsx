import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { CourseLesson } from "@/types/course";

interface LessonPlayerProps {
  lesson: CourseLesson;
}

function parseVideoUrl(
  videoType: CourseLesson["videoType"],
  videoUrl: string
): string {
  if (videoType === "youtube") {
    // Handle various YouTube URL formats
    let videoId: string | null = null;

    try {
      const url = new URL(videoUrl);

      if (url.hostname === "youtu.be") {
        videoId = url.pathname.slice(1);
      } else if (
        url.hostname.includes("youtube.com") ||
        url.hostname.includes("youtube-nocookie.com")
      ) {
        // Already an embed URL
        if (url.pathname.startsWith("/embed/")) {
          return videoUrl;
        }
        videoId = url.searchParams.get("v");
      }
    } catch {
      // If URL parsing fails, try to extract ID directly
      videoId = videoUrl;
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return videoUrl;
  }

  if (videoType === "vimeo") {
    // Handle various Vimeo URL formats
    try {
      const url = new URL(videoUrl);

      // Already a player URL
      if (url.hostname === "player.vimeo.com") {
        return videoUrl;
      }

      // Extract video ID from vimeo.com URLs
      const match = url.pathname.match(/\/(\d+)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    } catch {
      // If URL parsing fails, assume it's a video ID
      if (/^\d+$/.test(videoUrl)) {
        return `https://player.vimeo.com/video/${videoUrl}`;
      }
    }
    return videoUrl;
  }

  // embed or fallback
  return videoUrl;
}

export function LessonPlayer({ lesson }: LessonPlayerProps) {
  if (lesson.videoType === "none" || !lesson.videoUrl) {
    return null;
  }

  const embedUrl = parseVideoUrl(lesson.videoType, lesson.videoUrl);

  return (
    <AspectRatio ratio={16 / 9}>
      <iframe
        src={embedUrl}
        title={lesson.title}
        className="h-full w-full rounded-none border-0 sm:rounded-xl sm:border"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </AspectRatio>
  );
}
