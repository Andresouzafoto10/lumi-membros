import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type UploadOptions = {
  bucket: string;
  /** Path inside the bucket (e.g. "avatars/user-123.jpg") */
  path: string;
  /** Max file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Previous file path to delete after successful upload */
  previousPath?: string;
};

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (
      file: File,
      options: UploadOptions
    ): Promise<{ url: string; path: string } | null> => {
      const { bucket, path, maxSizeBytes = 5 * 1024 * 1024, previousPath } = options;

      // Validate size
      if (file.size > maxSizeBytes) {
        const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
        toast.error(`Arquivo muito grande. Máximo: ${maxMB}MB`);
        return null;
      }

      setUploading(true);
      setProgress(0);

      try {
        // Delete previous file if exists
        if (previousPath) {
          await supabase.storage.from(bucket).remove([previousPath]);
        }

        setProgress(30);

        // Upload new file
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          toast.error(`Erro no upload: ${uploadError.message}`);
          return null;
        }

        setProgress(80);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        setProgress(100);

        return { url: urlData.publicUrl, path };
      } catch (err) {
        toast.error("Erro inesperado no upload.");
        console.error(err);
        return null;
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    []
  );

  const deleteFile = useCallback(
    async (bucket: string, path: string) => {
      await supabase.storage.from(bucket).remove([path]);
    },
    []
  );

  return { uploadFile, deleteFile, uploading, progress };
}
