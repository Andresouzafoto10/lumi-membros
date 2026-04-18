import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  deleteFromR2,
  optimizeImage,
  putFileToPresignedUrl,
  requestR2UploadUrl,
  type ImagePreset,
} from "@/lib/r2Upload";

type UploadArgs = {
  file: File;
  folder: string;
  previousUrl?: string;
  preset?: ImagePreset;
  errorMessage?: string;
};

function sanitizeFolder(folder: string): string {
  return folder
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
  return sanitized || "file";
}

function buildObjectKey(folder: string, fileName: string): string {
  const safeFolder = sanitizeFolder(folder);
  const safeFileName = sanitizeFileName(fileName);
  if (!safeFolder) {
    throw new Error("Pasta de upload inválida.");
  }
  return `${safeFolder}/${Date.now()}-${safeFileName}`;
}

export function useR2Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async ({
      file,
      folder,
      previousUrl,
      preset = "banner",
      errorMessage = "Erro no upload. Tente novamente.",
    }: UploadArgs): Promise<string> => {
      try {
        setUploading(true);
        setProgress(15);

        const finalFile = file.type.startsWith("image/")
          ? await optimizeImage(file, preset)
          : file;

        const key = buildObjectKey(folder, finalFile.name);
        setProgress(35);

        const contentType = finalFile.type || "application/octet-stream";
        let { uploadUrl, publicUrl } = await requestR2UploadUrl({
          key,
          contentType,
        });

        setProgress(60);

        try {
          await putFileToPresignedUrl(uploadUrl, finalFile);
        } catch (error) {
          const shouldRetry =
            error instanceof Error &&
            /Falha no upload para R2: (400|403)/.test(error.message);

          if (!shouldRetry) throw error;

          const retry = await requestR2UploadUrl({ key, contentType });
          uploadUrl = retry.uploadUrl;
          publicUrl = retry.publicUrl;
          await putFileToPresignedUrl(uploadUrl, finalFile);
        }

        if (previousUrl) {
          await deleteFromR2(previousUrl);
        }

        setProgress(100);
        return publicUrl;
      } catch (error) {
        console.error("[useR2Upload]", error);
        toast.error(errorMessage);
        throw error;
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    []
  );

  return {
    uploadFile,
    uploading,
    progress,
  };
}
