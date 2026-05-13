import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const R2_PUBLIC_URL = (
  Deno.env.get("R2_PUBLIC_URL") ??
  Deno.env.get("VITE_R2_PUBLIC_URL") ??
  ""
).replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isAllowedR2Url(candidate: string): boolean {
  if (!R2_PUBLIC_URL) return false;
  try {
    const requestedUrl = new URL(candidate);
    const allowedUrl = new URL(R2_PUBLIC_URL);
    const allowedPath = allowedUrl.pathname.replace(/\/$/, "");
    const requestedPath = requestedUrl.pathname.replace(/\/$/, "");

    if (requestedUrl.origin !== allowedUrl.origin) return false;
    if (
      requestedPath !== allowedPath &&
      !requestedPath.startsWith(`${allowedPath}/`)
    ) {
      return false;
    }
    if (requestedPath.includes("..")) return false;
    if (!/^[a-zA-Z0-9/_.\-]+$/.test(requestedPath)) return false;
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!R2_PUBLIC_URL) {
    return new Response("R2 não configurado", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const requestUrl = new URL(req.url);
  const mediaUrl = requestUrl.searchParams.get("url");

  if (!mediaUrl) {
    return new Response("Parâmetro url é obrigatório", {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!isAllowedR2Url(mediaUrl)) {
    return new Response("URL não permitida", {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const upstream = await fetch(mediaUrl, {
      headers: { Accept: "image/*,video/*,*/*;q=0.8" },
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("Mídia não encontrada", {
        status: upstream.status || 404,
        headers: corsHeaders,
      });
    }

    const contentType =
      upstream.headers.get("Content-Type") || "application/octet-stream";
    if (
      !contentType.startsWith("image/") &&
      !contentType.startsWith("video/")
    ) {
      return new Response("Recurso não é uma imagem ou vídeo", {
        status: 415,
        headers: corsHeaders,
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("image-proxy error:", error);
    return new Response("Erro ao processar mídia", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
