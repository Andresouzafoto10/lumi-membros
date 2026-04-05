import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageCropDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (croppedFile: File) => void;
  /** Temporary URL from URL.createObjectURL */
  imageSrc: string;
  /** Aspect ratio: 1 for square/avatar, 16/9 for cover */
  aspect: number;
  /** 'round' shows circular crop (avatar), 'rect' rectangular (cover) */
  shape?: "rect" | "round";
  /** Dialog title */
  title?: string;
  /** Object fit mode for the cropper. Default: "contain". Use "horizontal-cover" for banner crops. */
  cropObjectFit?: "contain" | "cover" | "horizontal-cover" | "vertical-cover";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCroppedFile(
  imageSrc: string,
  crop: Area,
  quality: number
): Promise<File> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/webp",
      quality
    );
  });

  return new File([blob], "cropped.webp", { type: "image/webp" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImageCropDialog({
  open,
  onClose,
  onConfirm,
  imageSrc,
  aspect,
  shape = "rect",
  title = "Ajustar imagem",
  cropObjectFit = "contain",
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback(
    (_: Area, croppedPixels: Area) => {
      setCroppedArea(croppedPixels);
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const quality = shape === "round" ? 0.9 : 0.85;
      const file = await getCroppedFile(imageSrc, croppedArea, quality);
      onConfirm(file);
    } catch (err) {
      console.error("[ImageCropDialog]", err);
    } finally {
      setProcessing(false);
    }
  }, [croppedArea, imageSrc, onConfirm, shape]);

  const handleClose = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden sm:rounded-xl">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Ajuste a area de recorte e clique em confirmar.
          </DialogDescription>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full bg-black" style={{ height: "min(60vh, 420px)" }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={shape === "round" ? "round" : "rect"}
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit={cropObjectFit}
              style={{
                containerStyle: { background: "#000" },
              }}
            />
          )}
        </div>

        {/* Zoom slider + buttons */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground shrink-0 w-10">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary h-1.5 cursor-pointer"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={processing}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing || !croppedArea}
              className="flex-1 sm:flex-none"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar recorte"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
