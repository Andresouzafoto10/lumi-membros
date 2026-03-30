// ---------------------------------------------------------------------------
// useCurrentUser — shim de compatibilidade sobre AuthContext
//
// Mantém a interface { currentUserId } para todos os componentes que já
// a usavam, agora lendo o usuário autenticado real via Supabase.
// ---------------------------------------------------------------------------

import { useAuth } from "@/contexts/AuthContext";

export function useCurrentUser() {
  const { user } = useAuth();
  return {
    currentUserId: user?.id ?? "",
  };
}
