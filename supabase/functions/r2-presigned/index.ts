import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, DeleteObjectCommand, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3";

const ALLOWED_ORIGIN = Deno.env.get("APP_URL") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const R2_ENDPOINT = Deno.env.get("R2_ENDPOINT") ?? "";
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
const R2_BUCKET = Deno.env.get("R2_BUCKET_NAME") ?? "";

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const { action, folder, fileName, contentType, key } = await req.json();

    // Generate presigned PUT URL for upload
    if (action === "upload") {
      if (!folder || !fileName || !contentType) {
        return new Response("folder, fileName e contentType são obrigatórios", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const ext = fileName.split(".").pop() ?? "bin";
      const fileKey = `${folder}/${crypto.randomUUID()}-${Date.now()}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      });

      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

      return new Response(JSON.stringify({ presignedUrl, key: fileKey }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Delete a file by key
    if (action === "delete") {
      if (!key) {
        return new Response("key é obrigatório", { status: 400, headers: corsHeaders });
      }

      await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response("action inválida. Use 'upload' ou 'delete'", {
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
