import { useRef, useState, useEffect } from "react";
import type { CertificateTemplate, CertificateBlock } from "@/types/student";
import { cn } from "@/lib/utils";
import { getProxiedImageUrl } from "@/lib/imageProxy";

// A4 landscape at 150 DPI: 1754 x 1240
const REFERENCE_WIDTH = 1754;

// A4 landscape ratio: 297mm / 210mm ≈ 1.414
const A4_ASPECT_RATIO = "1.414 / 1";

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
  const backgroundSrc = getProxiedImageUrl(template.backgroundUrl);

  const bgFit = template.backgroundConfig?.fit ?? "cover";
  const bgPosition = template.backgroundConfig?.position ?? "50% 50%";

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
      className={cn("relative", className)}
      style={{
        aspectRatio: A4_ASPECT_RATIO,
        overflow: "hidden",
        borderRadius: 0,
        border: "none",
        boxShadow: "none",
        backgroundColor: "#1a1a2e",
        ...(scale
          ? { transform: `scale(${scale})`, transformOrigin: "top left" }
          : {}),
      }}
    >
      {hasBackground ? (
        <img
          key={backgroundSrc}
          src={backgroundSrc}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: bgFit === "fill" ? "fill" : bgFit,
            objectPosition: bgPosition,
            borderRadius: 0,
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }}
        />
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
