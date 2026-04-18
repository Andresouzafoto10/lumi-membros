import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3";
import { makeCorsHeaders } from "../_shared/cors.ts";

const R2_ENDPOINT = Deno.env.get("R2_ENDPOINT") ?? "";
const R2_ACCESS_KEY =
  Deno.env.get("R2_ACCESS_KEY") ??
  Deno.env.get("R2_ACCESS_KEY_ID") ??
  "";
const R2_SECRET_KEY =
  Deno.env.get("R2_SECRET_KEY") ??
  Deno.env.get("R2_SECRET_ACCESS_KEY") ??
  "";
const R2_BUCKET = Deno.env.get("R2_BUCKET_NAME") ?? "";
const R2_PUBLIC_URL = (
  Deno.env.get("R2_PUBLIC_URL") ??
  Deno.env.get("VITE_R2_PUBLIC_URL") ??
  ""
).replace(/\/$/, "");

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

type UploadRequestBody = {
  key?: string;
  contentType?: string;
  action?: string;
  folder?: string;
  fileName?: string;
};

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function normalizeUploadKey(body: UploadRequestBody): string | null {
  if (body.key) {
    const key = sanitizePathSegment(body.key);
    if (!key || key.includes("..")) return null;
    return key;
  }

  if (body.action === "upload" && body.folder && body.fileName) {
    const folder = sanitizePathSegment(body.folder);
    const fileName = sanitizeFileName(body.fileName);
    if (!folder || !fileName) return null;
    return `${folder}/${Date.now()}-${fileName}`;
  }

  return null;
}

serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET) {
      return new Response("R2 não configurado nas secrets da Edge Function", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const body = await req.json() as UploadRequestBody;
    const { action } = body;

    // Generate presigned PUT URL for upload
    if (!action || action === "upload") {
      const uploadKey = normalizeUploadKey(body);
      const contentType = typeof body.contentType === "string" ? body.contentType : "";

      if (!uploadKey || !contentType) {
        return new Response("key e contentType são obrigatórios", {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (!R2_PUBLIC_URL) {
        return new Response("R2_PUBLIC_URL não configurado", {
          status: 500,
          headers: corsHeaders,
        });
      }

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: uploadKey,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      const publicUrl = `${R2_PUBLIC_URL}/${uploadKey}`;

      return new Response(
        JSON.stringify({
          uploadUrl,
          publicUrl,
          presignedUrl: uploadUrl,
          key: uploadKey,
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Delete a file by key
    if (action === "delete") {
      const key = typeof body.key === "string" ? body.key : "";
      if (!key) {
        return new Response("key é obrigatório", { status: 400, headers: corsHeaders });
      }

      await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Proxy-fetch a file from R2 and return with CORS headers.
    // Used by certificate download (html2canvas) to bypass R2 CORS restrictions.
    if (action === "proxy") {
      const key = typeof body.key === "string" ? body.key : "";
      if (!key) {
        return new Response("key é obrigatório", { status: 400, headers: corsHeaders });
      }

      const obj = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));

      if (!obj.Body) {
        return new Response("File not found", { status: 404, headers: corsHeaders });
      }

      return new Response(obj.Body as ReadableStream, {
        headers: {
          "Content-Type": obj.ContentType || "application/octet-stream",
          "Cache-Control": "public, max-age=3600",
          ...corsHeaders,
        },
      });
    }

    return new Response("action inválida. Use 'upload', 'delete' ou 'proxy'", {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
