import { isR2Url } from "@/lib/r2Upload";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const IMAGE_PROXY_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/image-proxy`
  : "";

export function getProxiedImageUrl(originalUrl: string | null | undefined): string {
  if (!originalUrl) return "";
  if (!IMAGE_PROXY_URL) return originalUrl;
  if (!isR2Url(originalUrl)) return originalUrl;
  if (originalUrl.startsWith(IMAGE_PROXY_URL)) return originalUrl;

  return `${IMAGE_PROXY_URL}?url=${encodeURIComponent(originalUrl)}`;
}
