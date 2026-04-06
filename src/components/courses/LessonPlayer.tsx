import { AspectRatio } from "@/components/ui/aspect-ratio";
import { parseIframeEmbed, resolveLessonVideoUrl } from "@/lib/video";
import type { CourseLesson } from "@/types/course";

interface LessonPlayerProps {
  lesson: CourseLesson;
}

export function LessonPlayer({ lesson }: LessonPlayerProps) {
  if (lesson.videoType === "none" || !lesson.videoUrl) {
    return null;
  }

  if (lesson.videoType === "embed") {
    const parsedEmbed = parseIframeEmbed(lesson.videoUrl);

    if (parsedEmbed) {
      return (
        <AspectRatio ratio={16 / 9}>
          <iframe
            src={parsedEmbed.src}
            title={parsedEmbed.title || lesson.title}
            className="h-full w-full rounded-none border-0 sm:rounded-xl sm:border"
            allow={
              parsedEmbed.allow ||
              "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            }
            allowFullScreen={parsedEmbed.allowFullScreen}
          />
        </AspectRatio>
      );
    }
  }

  const embedUrl = resolveLessonVideoUrl(lesson.videoType, lesson.videoUrl);
  if (!embedUrl) {
    return null;
  }

  return (
    <AspectRatio ratio={16 / 9}>
      <iframe
        src={embedUrl}
        title={lesson.title}
        className="h-full w-full rounded-none border-0 sm:rounded-xl sm:border"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </AspectRatio>
  );
}
