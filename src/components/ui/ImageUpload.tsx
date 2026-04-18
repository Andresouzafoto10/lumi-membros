import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import { deleteFromR2, isR2Url, type ImagePreset } from "@/lib/r2Upload";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

type ImageUploadProps = {
  /** Current image URL */
  value: string;
  /** Called with the new public URL after upload, or "" on remove */
  onChange: (url: string) => void;
  /** R2 folder (e.g. "avatars", "banners"). Legacy: Supabase bucket name also accepted */
  bucket: string;
  /** Aspect ratio hint for the container */
  aspect?: "square" | "banner" | "cover";
  /** Max file size in MB (default: 5) */
  maxSizeMB?: number;
  /** Additional class names for the container */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Image optimisation preset */
  imagePreset?: ImagePreset;
};

const ASPECT_CLASSES: Record<string, string> = {
  square: "aspect-square",
  banner: "aspect-[21/9]",
  cover: "aspect-[3/1]",
};

export function ImageUpload({
  value,
  onChange,
  bucket,
  aspect = "square",
  maxSizeMB = 5,
  className,
  placeholder = "Clique ou arraste uma imagem",
  imagePreset = "banner",
}: ImageUploadProps) {
  const { uploadFile, uploading, progress } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const previewSrc = getProxiedImageUrl(value);

  const handleFile = useCallback(
    async (file: File) => {
      const result = await uploadFile(file, {
        folder: bucket,
        maxSizeBytes: maxSizeMB * 1024 * 1024,
        previousUrl: value,
        preset: imagePreset,
      });
      if (result) {
        onChange(result.url);
      }
    },
    [bucket, maxSizeMB, uploadFile, onChange, value, imagePreset]
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
      if (file && file.type.startsWith("image/")) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleRemoveConfirmed = useCallback(async () => {
    if (value && isR2Url(value)) {
      setDeleting(true);
      try {
        await deleteFromR2(value);
        toast.success("Imagem removida.");
      } catch {
        console.warn("[ImageUpload] Falha ao deletar do R2");
      } finally {
        setDeleting(false);
      }
    }
    onChange("");
    setConfirmRemoveOpen(false);
  }, [value, onChange]);

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />

      {value ? (
        <div
          className={cn(
            "relative rounded-lg overflow-hidden border border-border/50 bg-muted",
            ASPECT_CLASSES[aspect]
          )}
        >
          <img
            src={previewSrc}
            alt="Upload preview"
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors group">
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || deleting}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
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
            dragOver && "border-primary/60 bg-primary/5",
            ASPECT_CLASSES[aspect]
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <Progress value={progress} className="w-32 h-1.5" />
              <span className="text-xs text-muted-foreground">
                Enviando...
              </span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {placeholder}
              </span>
              <span className="text-xs text-muted-foreground/60">
                JPG, PNG ou WebP (max {maxSizeMB}MB)
              </span>
            </>
          )}
        </button>
      )}

      {/* Confirm remove dialog */}
      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover imagem</AlertDialogTitle>
            <AlertDialogDescription>
              {isR2Url(value)
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
