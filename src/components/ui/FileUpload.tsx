import { useCallback, useRef, useState } from "react";
import {
  Upload,
  X,
  Loader2,
  ImageIcon,
  Link as LinkIcon,
  FileUp,
  Trash2,
} from "lucide-react";
import { uploadToR2, deleteFromR2, isR2Url, type ImagePreset } from "@/lib/r2Upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileUploadProps {
  /** Current URL (preview) */
  value?: string;
  /** Called with the new public URL after upload, or "" on remove */
  onChange: (url: string) => void;
  /** R2 folder path (e.g. "banners", "avatars", "courses/banners") */
  folder: string;
  /** File accept string (default: "image/*") */
  accept?: string;
  /** Max file size in MB (default: 10) */
  maxSizeMB?: number;
  /** Aspect ratio for preview container (e.g. "16/9", "1/1") */
  aspectRatio?: string;
  /** Max height for preview (e.g. "160px"). Overrides aspectRatio on the preview container. */
  previewMaxHeight?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Show URL input toggle (default: true) */
  allowUrl?: boolean;
  /** Image optimisation preset */
  imagePreset?: ImagePreset;
  /** Additional class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUpload({
  value,
  onChange,
  folder,
  accept = "image/*",
  maxSizeMB = 10,
  aspectRatio,
  previewMaxHeight,
  placeholder = "Clique ou arraste um arquivo",
  allowUrl = true,
  imagePreset = "banner",
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  // -----------------------------------------------------------------------
  // Upload handler
  // -----------------------------------------------------------------------

  const handleFile = useCallback(
    async (file: File) => {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        toast.error(`Arquivo muito grande. Maximo: ${maxSizeMB}MB`);
        return;
      }

      setUploading(true);
      setProgress(20);

      try {
        setProgress(40);
        const url = await uploadToR2(file, folder, {
          oldUrl: value,
          preset: imagePreset,
        });
        setProgress(100);
        onChange(url);
        toast.success("Upload concluido!");
      } catch (err) {
        console.error("[FileUpload]", err);
        toast.error("Erro no upload. Tente novamente.");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [folder, value, imagePreset, maxSizeMB, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // -----------------------------------------------------------------------
  // Remove handler — confirm + delete from R2
  // -----------------------------------------------------------------------

  const handleRemoveConfirmed = useCallback(async () => {
    if (value && isR2Url(value)) {
      setDeleting(true);
      try {
        await deleteFromR2(value);
        toast.success("Arquivo removido.");
      } catch {
        console.warn("[FileUpload] Falha ao deletar do R2");
      } finally {
        setDeleting(false);
      }
    }
    onChange("");
    setConfirmRemoveOpen(false);
  }, [value, onChange]);

  const handleUrlConfirm = useCallback(() => {
    const trimmed = urlDraft.trim();
    if (trimmed) {
      // Se tinha arquivo R2 antes e esta trocando por URL externa, deletar o antigo
      if (value && isR2Url(value)) {
        deleteFromR2(value).catch(() => {});
      }
      onChange(trimmed);
      setUrlDraft("");
      setShowUrlInput(false);
    }
  }, [urlDraft, value, onChange]);

  // -----------------------------------------------------------------------
  // Aspect ratio style
  // -----------------------------------------------------------------------

  const aspectStyle = aspectRatio ? { aspectRatio } : undefined;
  const previewStyle = previewMaxHeight
    ? { maxHeight: previewMaxHeight }
    : aspectStyle;
  const isImage = accept.includes("image");

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Preview */}
      {value ? (
        <div
          className="relative rounded-lg overflow-hidden border border-border/50 bg-muted"
          style={previewStyle}
        >
          {isImage ? (
            <img
              src={value}
              alt="Preview"
              className={cn(
                "w-full",
                previewMaxHeight ? "h-auto object-contain" : "h-full object-cover"
              )}
            />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[80px] p-4">
              <FileUp className="h-8 w-8 text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {value.split("/").pop()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors group">
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || deleting}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={() => setConfirmRemoveOpen(true)}
                disabled={uploading || deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          disabled={uploading}
          className={cn(
            "w-full rounded-lg border-2 border-dashed border-border/60 bg-muted/30",
            "flex flex-col items-center justify-center gap-2 p-6 cursor-pointer",
            "hover:border-primary/40 hover:bg-muted/50 transition-colors",
            dragOver && "border-primary/60 bg-primary/5"
          )}
          style={aspectStyle}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <Progress value={progress} className="w-32 h-1.5" />
              <span className="text-xs text-muted-foreground">Enviando...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {placeholder}
              </span>
              <span className="text-xs text-muted-foreground/60">
                Max {maxSizeMB}MB
              </span>
            </>
          )}
        </button>
      )}

      {/* URL input toggle */}
      {allowUrl && !uploading && (
        <>
          {showUrlInput ? (
            <div className="flex gap-2">
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://..."
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleUrlConfirm();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleUrlConfirm}
                disabled={!urlDraft.trim()}
              >
                OK
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowUrlInput(false);
                  setUrlDraft("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowUrlInput(true)}
            >
              <LinkIcon className="h-3 w-3" />
              Usar URL externa
            </button>
          )}
        </>
      )}

      {/* Confirm remove dialog */}
      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover imagem</AlertDialogTitle>
            <AlertDialogDescription>
              {isR2Url(value ?? "")
                ? "A imagem sera excluida permanentemente do servidor. Deseja continuar?"
                : "A referencia da imagem sera removida. Deseja continuar?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
