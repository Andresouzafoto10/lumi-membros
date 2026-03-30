import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AccessProfile } from "@/types/student";

// System profiles are hardcoded — never stored in DB
const SYSTEM_PROFILES: AccessProfile[] = [
  {
    id: "system-aluno",
    name: "Aluno",
    description: "Acesso ao conteúdo da plataforma como estudante.",
    permissions: {
      courses: false,
      students: false,
      classes: false,
      settings: false,
      community: true,
    },
  },
  {
    id: "system-moderador",
    name: "Moderador",
    description: "Moderação de conteúdo e suporte aos alunos.",
    permissions: {
      courses: true,
      students: true,
      classes: false,
      settings: false,
      community: true,
    },
  },
  {
    id: "system-admin",
    name: "Administrador",
    description: "Acesso total à plataforma.",
    permissions: {
      courses: true,
      students: true,
      classes: true,
      settings: true,
      community: true,
    },
  },
];

const QK = ["access-profiles"] as const;

async function fetchCustomProfiles(): Promise<AccessProfile[]> {
  const { data, error } = await supabase
    .from("access_profiles")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    permissions: p.permissions as AccessProfile["permissions"],
  }));
}

export function useAccessProfiles() {
  const queryClient = useQueryClient();

  const { data: customProfiles = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchCustomProfiles,
    staleTime: 1000 * 60 * 10,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const createProfile = useCallback(
    async (data: Omit<AccessProfile, "id">) => {
      const { data: row, error } = await supabase
        .from("access_profiles")
        .insert({
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        })
        .select()
        .single();
      if (error) throw error;
      invalidate();
      return {
        id: row.id as string,
        name: row.name as string,
        description: row.description as string,
        permissions: row.permissions as AccessProfile["permissions"],
      };
    },
    [invalidate]
  );

  const updateProfile = useCallback(
    async (id: string, patch: Partial<AccessProfile>) => {
      const { error } = await supabase
        .from("access_profiles")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.description !== undefined && {
            description: patch.description,
          }),
          ...(patch.permissions !== undefined && {
            permissions: patch.permissions,
          }),
        })
        .eq("id", id);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("access_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  return {
    systemProfiles: SYSTEM_PROFILES,
    customProfiles,
    loading: isLoading,
    createProfile,
    updateProfile,
    deleteProfile,
  };
}
