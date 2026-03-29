import { useRef, useState, useEffect } from "react";
import type { CertificateTemplate, CertificateBlock } from "@/types/student";
import { cn } from "@/lib/utils";

const REFERENCE_WIDTH = 1920;

export type CertificateData = {
  studentName: string;
  courseName: string;
  completionDate: string;
  courseHours: number;
  platformName: string;
};

type CertificateRendererProps = {
  template: CertificateTemplate;
  data: CertificateData;
  containerId?: string;
  className?: string;
  scale?: number;
};

function resolveBlockContent(
  block: CertificateBlock,
  data: CertificateData
): string {
  switch (block.type) {
    case "certificate_title":
      return "Certificado de Conclusão";
    case "platform_name":
      return data.platformName;
    case "student_name":
      return data.studentName;
    case "course_name":
      return data.courseName;
    case "completion_date":
      return data.completionDate;
    case "course_hours":
      return `${data.courseHours} horas`;
    case "custom_text":
      return block.content || "";
    default:
      return "";
  }
}

export function CertificateRenderer({
  template,
  data,
  containerId,
  className,
  scale,
}: CertificateRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontScale, setFontScale] = useState(1);
  const hasBackground = !!template.backgroundUrl;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setFontScale(width / REFERENCE_WIDTH);
      }
    });
    observer.observe(el);

    // Initial measurement
    setFontScale(el.offsetWidth / REFERENCE_WIDTH);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      id={containerId}
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{
        aspectRatio: "16 / 9",
        ...(scale
          ? { transform: `scale(${scale})`, transformOrigin: "top left" }
          : {}),
      }}
    >
      {hasBackground ? (
        <img
          src={template.backgroundUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
      )}

      {template.blocks.map((block) => (
        <div
          key={block.id}
          style={{
            position: "absolute",
            top: `${block.top}%`,
            left: `${block.left}%`,
            width: `${block.width}%`,
            fontSize: `${Math.max(block.fontSize * fontScale, 1)}px`,
            fontWeight: block.fontWeight,
            color: block.color,
            textAlign: block.textAlign,
            lineHeight: 1.3,
          }}
        >
          {resolveBlockContent(block, data)}
        </div>
      ))}
    </div>
  );
}
