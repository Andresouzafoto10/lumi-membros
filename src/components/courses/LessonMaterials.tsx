import { useState } from "react";
import {
  FileText,
  Archive,
  Music,
  ImageIcon,
  File,
  Download,
  Loader2,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import { useLessonMaterials } from "@/hooks/useLessonMaterials";
import { downloadMaterial } from "@/lib/downloadMaterial";
import type { LessonMaterial } from "@/types/course";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function fileTypeIcon(type: LessonMaterial["file_type"]) {
  switch (type) {
    case "pdf":
      return <FileText className="h-4 w-4 text-red-500" />;
    case "zip":
      return <Archive className="h-4 w-4 text-amber-500" />;
    case "mp3":
      return <Music className="h-4 w-4 text-purple-500" />;
    case "image":
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(type: LessonMaterial["file_type"]): string {
  switch (type) {
    case "pdf":
      return ".pdf";
    case "zip":
      return ".zip";
    case "mp3":
      return ".mp3";
    case "image":
      return ".png";
    default:
      return "";
  }
}

export function LessonMaterials({ lessonId }: { lessonId: string }) {
  const { materials, isLoading } = useLessonMaterials(lessonId);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (isLoading || materials.length === 0) return null;

  async function handleDownload(material: LessonMaterial) {
    setDownloadingId(material.id);
    try {
      const ext = fileExtension(material.file_type);
      const fileName = `${material.title}${ext}`;
      await downloadMaterial(material.id, fileName);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao baixar material.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Download className="h-4 w-4" /> Materiais
      </h3>
      <div className="flex flex-col gap-1.5">
        {materials.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2 hover:border-border hover:bg-muted/30 transition-all"
          >
            {fileTypeIcon(m.file_type)}
            <span className="text-sm flex-1 truncate">{m.title}</span>
            {m.file_size_bytes && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatSize(m.file_size_bytes)}
              </span>
            )}
            {m.drm_enabled && m.file_type === "pdf" && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 border-primary/30 text-primary shrink-0"
              >
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                Protegido
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs shrink-0"
              disabled={downloadingId === m.id}
              onClick={() => handleDownload(m)}
            >
              {downloadingId === m.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
