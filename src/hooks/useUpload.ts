import { useCallback } from "react";
import { deleteFromR2, type ImagePreset } from "@/lib/r2Upload";
import { useR2Upload } from "@/hooks/useR2Upload";
import { toast } from "sonner";

type UploadOptions = {
  /** R2 folder path (e.g. "avatars", "courses/banners") */
  folder: string;
  /** Max file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Previous file URL to delete after successful upload */
  previousUrl?: string;
  /** Image optimisation preset */
  preset?: ImagePreset;

  // Legacy compat (ignored — kept so callers don't break)
  bucket?: string;
  path?: string;
  previousPath?: string;
};

export function useUpload() {
  const { uploadFile: uploadWithR2, uploading, progress } = useR2Upload();

  const uploadFile = useCallback(
    async (
      file: File,
      options: UploadOptions
    ): Promise<{ url: string; path: string } | null> => {
      const {
        folder,
        maxSizeBytes = 5 * 1024 * 1024,
        previousUrl,
        preset,
        // Legacy compat: use bucket as folder fallback
        bucket,
      } = options;

      const effectiveFolder = folder || bucket || "uploads";

      if (file.size > maxSizeBytes) {
        const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
        toast.error(`Arquivo muito grande. Maximo: ${maxMB}MB`);
        return null;
      }

      try {
        const url = await uploadWithR2({
          file,
          folder: effectiveFolder,
          previousUrl,
          preset,
          errorMessage: "Erro no upload.",
        });

        return { url, path: url };
      } catch {
        return null;
      }
    },
    [uploadWithR2]
  );

  const deleteFile = useCallback(async (_bucket: string, urlOrPath: string) => {
    await deleteFromR2(urlOrPath);
  }, []);

  return { uploadFile, deleteFile, uploading, progress };
}
