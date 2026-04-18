import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { deleteFromR2 } from "@/lib/r2Upload";
import { useR2Upload } from "@/hooks/useR2Upload";
import type { LessonMaterial } from "@/types/course";

export function useLessonMaterials(lessonId: string | undefined) {
  const qc = useQueryClient();
  const { uploadFile } = useR2Upload();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["lesson-materials", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_materials")
        .select("*")
        .eq("lesson_id", lessonId!)
        .order("created_at");
      if (error) throw error;
      return data as LessonMaterial[];
    },
    enabled: !!lessonId,
  });

  const uploadMaterial = useMutation({
    mutationFn: async ({
      file,
      title,
      drmEnabled,
    }: {
      file: File;
      title: string;
      drmEnabled: boolean;
    }) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const fileType: LessonMaterial["file_type"] = ["pdf"].includes(ext)
        ? "pdf"
        : ["zip", "rar", "7z"].includes(ext)
          ? "zip"
          : ["mp3", "wav", "ogg", "m4a"].includes(ext)
            ? "mp3"
            : ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)
              ? "image"
              : "other";

      // Upload to R2 (no image optimisation for documents)
      const url = await uploadFile({
        file,
        folder: `materials/${lessonId}`,
        errorMessage: "Erro no upload do material.",
      });

      const { error: dbError } = await supabase
        .from("lesson_materials")
        .insert({
          lesson_id: lessonId,
          title,
          file_path: url,
          file_type: fileType,
          file_size_bytes: file.size,
          drm_enabled: drmEnabled && fileType === "pdf",
        });
      if (dbError) {
        // Rollback: remove arquivo do R2 se o insert no banco falhar
        await deleteFromR2(url);
        throw dbError;
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["lesson-materials", lessonId] }),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (material: LessonMaterial) => {
      await deleteFromR2(material.file_path);
      const { error } = await supabase
        .from("lesson_materials")
        .delete()
        .eq("id", material.id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["lesson-materials", lessonId] }),
  });

  return { materials, isLoading, uploadMaterial, deleteMaterial };
}
