import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  GetObjectCommand,
  S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3";

const R2_ENDPOINT =
  Deno.env.get("R2_ENDPOINT") ??
  Deno.env.get("VITE_R2_ENDPOINT") ??
  "";
const R2_ACCESS_KEY =
  Deno.env.get("R2_ACCESS_KEY") ??
  Deno.env.get("R2_ACCESS_KEY_ID") ??
  "";
const R2_SECRET_KEY =
  Deno.env.get("R2_SECRET_KEY") ??
  Deno.env.get("R2_SECRET_ACCESS_KEY") ??
  "";
const R2_BUCKET =
  Deno.env.get("R2_BUCKET_NAME") ??
  Deno.env.get("VITE_R2_BUCKET_NAME") ??
  "";
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

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

function extractAllowedR2Key(candidate: string): string | null {
  if (!R2_PUBLIC_URL) return null;

  try {
    const requestedUrl = new URL(candidate);
    const allowedUrl = new URL(R2_PUBLIC_URL);
    const allowedPath = allowedUrl.pathname.replace(/\/$/, "");
    const requestedPath = requestedUrl.pathname.replace(/\/$/, "");

    if (requestedUrl.origin !== allowedUrl.origin) return null;

    if (
      requestedPath !== allowedPath &&
      !requestedPath.startsWith(`${allowedPath}/`)
    ) {
      return null;
    }

    const rawKey = requestedUrl.pathname
      .slice(allowedPath.length)
      .replace(/^\/+/, "");
    const key = decodeURIComponent(rawKey);

    if (!key || key.includes("..")) return null;
    return key;
  } catch {
    return null;
  }
}

async function fetchPublicImageFallback(imageUrl: string): Promise<Response | null> {
  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        Accept: "image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok || !upstream.body) return null;

    const contentType =
      upstream.headers.get("Content-Type") || "application/octet-stream";
    if (!contentType.startsWith("image/")) return null;

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return null;
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

  if (!R2_PUBLIC_URL || !R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET) {
    return new Response("R2 não configurado", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const requestUrl = new URL(req.url);
  const imageUrl = requestUrl.searchParams.get("url");

  if (!imageUrl) {
    return new Response("Parâmetro url é obrigatório", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const objectKey = extractAllowedR2Key(imageUrl);
  if (!objectKey) {
    return new Response("URL não permitida", {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: objectKey,
      }),
    );

    if (!object.Body) {
      return new Response("Imagem não encontrada", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const contentType = object.ContentType || "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return new Response("Recurso não é uma imagem", {
        status: 415,
        headers: corsHeaders,
      });
    }

    return new Response(object.Body as ReadableStream, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const message = String(error);
    if (/NoSuchKey|NotFound|404/.test(message)) {
      const fallback = await fetchPublicImageFallback(imageUrl);
      if (fallback) return fallback;
    }

    const status = /NoSuchKey|NotFound|404/.test(message) ? 404 : 500;

    return new Response(JSON.stringify({ error: message, key: objectKey }), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
