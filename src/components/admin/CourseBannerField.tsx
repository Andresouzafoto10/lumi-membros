import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Loader2, Upload, Trash2, ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { toast } from "sonner";

import { useR2Upload } from "@/hooks/useR2Upload";
import { deleteFromR2, isR2Url } from "@/lib/r2Upload";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

// Lazy-load ImageCropDialog (pulls in react-easy-crop, only needed when cropping)
const ImageCropDialog = lazy(() =>
  import("@/components/ui/ImageCropDialog").then((m) => ({ default: m.ImageCropDialog }))
);

type CourseBannerFieldProps = {
  label: string;
  description: string;
  orientation: "horizontal" | "vertical";
  value: string;
  onChange: (url: string) => void;
  /** Marks the banner currently shown to students (matches the session format). */
  active?: boolean;
};

/**
 * Single course banner uploader (upload / crop / external URL / remove) for one
 * orientation. A course keeps both a horizontal (16:9) and a vertical (9:16)
 * banner; the session's card orientation decides which one students see.
 */
export function CourseBannerField({
  label,
  description,
  orientation,
  value,
  onChange,
  active = false,
}: CourseBannerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { uploadFile } = useR2Upload();

  const isVertical = orientation === "vertical";
  const aspect = isVertical ? 9 / 16 : 16 / 9;
  const previewSrc = getProxiedImageUrl(value);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Maximo: 5MB");
      return;
    }
    setCropSrc(URL.createObjectURL(file));
    setCropOpen(true);
  }, []);

  const handleCropConfirm = useCallback(
    async (croppedFile: File) => {
      setCropOpen(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc("");
      setUploading(true);
      try {
        const url = await uploadFile({
          file: croppedFile,
          folder: "courses/banners",
          previousUrl: value,
          preset: "banner",
          errorMessage: "Erro no upload. Tente novamente.",
        });
        onChange(url);
        toast.success("Banner atualizado!");
      } catch (err) {
        console.error("[CourseBannerField]", err);
      } finally {
        setUploading(false);
      }
    },
    [cropSrc, value, uploadFile, onChange]
  );

  const handleCropCancel = useCallback(() => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc("");
  }, [cropSrc]);

  const handleRemove = useCallback(async () => {
    setConfirmRemove(false);
    if (value && isR2Url(value)) {
      setDeleting(true);
      try {
        await deleteFromR2(value);
      } catch {
        // silent
      } finally {
        setDeleting(false);
      }
    }
    onChange("");
    toast.success("Banner removido.");
  }, [value, onChange]);

  const handleUrlConfirm = useCallback(() => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    if (value && isR2Url(value)) deleteFromR2(value).catch(() => {});
    onChange(trimmed);
    setUrlDraft("");
    setShowUrl(false);
  }, [urlDraft, value, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {active && (
          <Badge variant="default" className="shrink-0 text-[10px]">
            Em uso
          </Badge>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {value ? (
        <div className="relative group">
          <div
            className={cn(
              "overflow-hidden rounded-xl border bg-muted",
              active ? "border-primary/50 ring-1 ring-primary/30" : "border-border/50",
              isVertical ? "mx-auto aspect-[9/16] max-w-[200px]" : "aspect-video"
            )}
          >
            <img
              src={previewSrc}
              alt={`Preview ${label}`}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
          {/* Hover overlay with actions */}
          <div
            className={cn(
              "absolute rounded-xl bg-black/0 transition-colors group-hover:bg-black/40",
              isVertical ? "inset-y-0 left-1/2 w-full max-w-[200px] -translate-x-1/2" : "inset-0"
            )}
          >
            <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || deleting}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={() => setConfirmRemove(true)}
                disabled={uploading || deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-muted/30 transition-colors hover:border-primary/40 hover:bg-muted/50",
            isVertical ? "mx-auto aspect-[9/16] w-full max-w-[200px]" : "aspect-video w-full"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <span className="text-xs text-muted-foreground">Enviando...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para enviar</span>
              <span className="text-xs text-muted-foreground/60">Max 5MB</span>
            </>
          )}
        </button>
      )}

      {/* URL externa toggle */}
      {!uploading && (
        <>
          {showUrl ? (
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
                  setShowUrl(false);
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
              onClick={() => setShowUrl(true)}
            >
              <LinkIcon className="h-3 w-3" />
              Usar URL externa
            </button>
          )}
        </>
      )}

      {/* Crop dialog (lazy) */}
      <Suspense fallback={null}>
        <ImageCropDialog
          open={cropOpen}
          onClose={handleCropCancel}
          onConfirm={handleCropConfirm}
          imageSrc={cropSrc}
          aspect={aspect}
          shape="rect"
          title={isVertical ? "Recortar banner vertical" : "Recortar banner horizontal"}
          cropObjectFit={isVertical ? "vertical-cover" : "contain"}
        />
      </Suspense>

      {/* Confirm remove dialog */}
      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover banner</AlertDialogTitle>
            <AlertDialogDescription>
              {isR2Url(value)
                ? "A imagem sera excluida permanentemente do servidor. Deseja continuar?"
                : "A referencia da imagem sera removida. Deseja continuar?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
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
