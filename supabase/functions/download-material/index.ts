import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const materialId = url.searchParams.get("materialId");
    if (!materialId) {
      return new Response("materialId required", { status: 400, headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Valida JWT e pega user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // Busca material
    const { data: material, error: matError } = await supabase
      .from("lesson_materials")
      .select("*, course_lessons(id, title, module_id)")
      .eq("id", materialId)
      .single();
    if (matError || !material) {
      return new Response("Material not found", { status: 404, headers: corsHeaders });
    }

    // Verifica acesso do aluno via matrícula (classes → enrollments)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, name, email, cpf")
      .eq("id", user.id)
      .single();

    const isAdmin =
      profile?.role &&
      ["owner", "admin", "support"].includes(profile.role);

    if (!isAdmin) {
      // Busca o course_id a partir da lesson
      const { data: lessonChain } = await supabase
        .from("course_lessons")
        .select("module_id, course_modules(course_id)")
        .eq("id", material.lesson_id)
        .single();

      const courseId = (lessonChain?.course_modules as any)?.course_id;
      if (!courseId) {
        return new Response("Access denied", { status: 403, headers: corsHeaders });
      }

      // Verifica se o aluno está matriculado em alguma turma que contém esse curso
      const { data: classes } = await supabase
        .from("classes")
        .select("id")
        .contains("course_ids", [courseId]);

      if (!classes || classes.length === 0) {
        return new Response("Access denied", { status: 403, headers: corsHeaders });
      }

      const classIds = classes.map((c: any) => c.id);
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", user.id)
        .eq("status", "active")
        .in("class_id", classIds)
        .limit(1)
        .single();

      if (!enrollment) {
        return new Response("Access denied", { status: 403, headers: corsHeaders });
      }
    }

    const userName = profile?.name ?? user.email ?? "Aluno";
    const userEmail = profile?.email ?? user.email ?? "";
    const userCpf = profile?.cpf ?? "Não informado";

    // Baixa o arquivo do Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("lesson-materials")
      .download(material.file_path);
    if (fileError || !fileData) {
      return new Response("File not found", { status: 404, headers: corsHeaders });
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    const isPdf = material.file_type === "pdf";
    const safeTitle = material.title.replace(/[^a-zA-Z0-9\-_\s]/g, "_").trim();

    if (isPdf && material.drm_enabled) {
      // Injeta DRM Social em cada página
      const pdfDoc = await PDFDocument.load(fileBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const watermarkText = `${userName} | ${userEmail} | CPF: ${userCpf}`;
      const fontSize = 8;
      const textColor = rgb(0, 0, 0);
      const opacity = 0.35;

      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        const xCenter = (width - textWidth) / 2;

        // Topo
        page.drawText(watermarkText, {
          x: xCenter,
          y: height - 14,
          size: fontSize,
          font,
          color: textColor,
          opacity,
        });

        // Rodapé
        page.drawText(watermarkText, {
          x: xCenter,
          y: 6,
          size: fontSize,
          font,
          color: textColor,
          opacity,
        });
      }

      const pdfBytes = await pdfDoc.save();

      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
        },
      });
    }

    // Arquivo não-PDF ou DRM desabilitado: signed URL com 60s
    const { data: signedUrl } = await supabase.storage
      .from("lesson-materials")
      .createSignedUrl(material.file_path, 60);

    if (!signedUrl?.signedUrl) {
      return new Response("Failed to generate download URL", {
        status: 500,
        headers: corsHeaders,
      });
    }

    return Response.redirect(signedUrl.signedUrl, 302);
  } catch (err) {
    console.error(err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
