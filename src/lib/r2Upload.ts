import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// ---------------------------------------------------------------------------
// R2 Client (singleton)
// ---------------------------------------------------------------------------

const R2_BUCKET = import.meta.env.VITE_R2_BUCKET_NAME as string | undefined;
const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT as string | undefined;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID as string | undefined;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY as string | undefined;

const isR2Configured = Boolean(
  R2_BUCKET && R2_PUBLIC_URL && R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
);

let s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!isR2Configured) {
    throw new Error(
      "Cloudflare R2 não configurado. Defina VITE_R2_BUCKET_NAME, VITE_R2_PUBLIC_URL, VITE_R2_ENDPOINT, VITE_R2_ACCESS_KEY_ID e VITE_R2_SECRET_ACCESS_KEY."
    );
  }

  if (!s3) {
    const endpoint = R2_ENDPOINT as string;
    const accessKeyId = R2_ACCESS_KEY_ID as string;
    const secretAccessKey = R2_SECRET_ACCESS_KEY as string;

    s3 = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3;
}

// ---------------------------------------------------------------------------
// Image optimisation presets
// ---------------------------------------------------------------------------

export type ImagePreset = "avatar" | "banner" | "cover" | "thumbnail";

const PRESET_CONFIG: Record<ImagePreset, { maxWidth: number; quality: number }> = {
  avatar: { maxWidth: 400, quality: 0.9 },
  banner: { maxWidth: 1920, quality: 0.85 },
  cover: { maxWidth: 1920, quality: 0.85 },
  thumbnail: { maxWidth: 800, quality: 0.85 },
};

// ---------------------------------------------------------------------------
// optimizeImage — Canvas-based resize + WebP conversion
// ---------------------------------------------------------------------------

export async function optimizeImage(
  file: File,
  preset: ImagePreset = "banner"
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const { maxWidth, quality } = PRESET_CONFIG[preset];

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/webp", quality });
  const optimisedName = file.name.replace(/\.[^.]+$/, ".webp");
  return new File([blob], optimisedName, { type: "image/webp" });
}

// ---------------------------------------------------------------------------
// uploadToR2 — upload a file, optionally deleting the previous one
// ---------------------------------------------------------------------------

export async function uploadToR2(
  file: File,
  folder: string,
  options?: { oldUrl?: string; preset?: ImagePreset }
): Promise<string> {
  if (!isR2Configured) {
    throw new Error(
      "Cloudflare R2 não configurado para upload no ambiente atual."
    );
  }

  const { oldUrl, preset } = options ?? {};

  // Optimise images
  const finalFile = file.type.startsWith("image/")
    ? await optimizeImage(file, preset ?? "banner")
    : file;

  const ext = finalFile.name.split(".").pop() ?? "bin";
  const uid = crypto.randomUUID();
  const key = `${folder}/${uid}-${Date.now()}.${ext}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: await finalFile.arrayBuffer().then((b) => new Uint8Array(b)),
      ContentType: finalFile.type,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  // Delete old file after successful upload
  if (oldUrl) {
    await deleteFromR2(oldUrl);
  }

  return `${R2_PUBLIC_URL}/${key}`;
}

// ---------------------------------------------------------------------------
// deleteFromR2 — silently remove a file by its public URL
// ---------------------------------------------------------------------------

export async function deleteFromR2(url: string): Promise<void> {
  if (!isR2Configured || !url || !url.startsWith(R2_PUBLIC_URL)) return;

  const key = url.replace(`${R2_PUBLIC_URL}/`, "");
  if (!key) return;

  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
  } catch {
    // Silencioso — não quebra o fluxo
    console.warn("[R2] Falha ao deletar:", key);
  }
}

// ---------------------------------------------------------------------------
// isR2Url — helper to check if a URL belongs to our R2 bucket
// ---------------------------------------------------------------------------

export function isR2Url(url: string): boolean {
  return isR2Configured && !!url && url.startsWith(R2_PUBLIC_URL);
}

// ---------------------------------------------------------------------------
// fetchR2AsDataUrl — fetch an R2 image via S3 API (CORS-enabled) and return
// as a data URL. Used by certificate download to bypass public URL CORS issues.
// ---------------------------------------------------------------------------

export async function fetchR2AsDataUrl(publicUrl: string): Promise<string> {
  if (!isR2Configured) {
    throw new Error("Cloudflare R2 não configurado no ambiente atual.");
  }
  if (!isR2Url(publicUrl)) throw new Error("Not an R2 URL");

  const key = publicUrl.replace(`${R2_PUBLIC_URL}/`, "");
  const { Body, ContentType } = await getS3Client().send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
  );

  const blob = await new Response(Body as ReadableStream).blob();
  const typedBlob = ContentType ? new Blob([blob], { type: ContentType }) : blob;

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(typedBlob);
  });
}
