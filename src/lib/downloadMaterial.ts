import { supabase } from "@/lib/supabase";

export async function downloadMaterial(materialId: string, fileName: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Não autenticado");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-material?materialId=${materialId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao baixar material");
  }

  // Se houve redirect (non-PDF), o fetch segue automaticamente
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
