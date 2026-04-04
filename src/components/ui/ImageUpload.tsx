import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ImageUploadProps = {
  /** Current image URL */
  value: string;
  /** Called with the new public URL after upload, or "" on remove */
  onChange: (url: string) => void;
  /** Supabase Storage bucket name */
  bucket: string;
  /** Aspect ratio hint for the container */
  aspect?: "square" | "banner" | "cover";
  /** Max file size in MB (default: 5) */
  maxSizeMB?: number;
  /** Additional class names for the container */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
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
}: ImageUploadProps) {
  const { uploadFile, uploading, progress } = useUpload();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!user) return;
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const result = await uploadFile(file, {
        bucket,
        path,
        maxSizeBytes: maxSizeMB * 1024 * 1024,
      });
      if (result) {
        onChange(result.url);
      }
    },
    [user, bucket, maxSizeMB, uploadFile, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be re-selected
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

  const handleRemove = useCallback(() => {
    onChange("");
  }, [onChange]);

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
            src={value}
            alt="Upload preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors group">
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
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
    </div>
  );
}
