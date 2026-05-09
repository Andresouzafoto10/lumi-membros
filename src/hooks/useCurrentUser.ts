// ---------------------------------------------------------------------------
// useCurrentUser — shim de compatibilidade sobre AuthContext
//
// Mantém a interface { currentUserId } para todos os componentes que já
// a usavam, agora lendo o usuário autenticado real via Supabase.
// ---------------------------------------------------------------------------

import { useAuth } from "@/contexts/AuthContext";

// NOTE: returns "" only briefly during AuthProvider loading state.
// All consumers are inside ProtectedRoute, so user is normally present.
// Mutation callers that rely on a real id MUST early-return if empty
// (see useLessonProgress.updateWatchPosition for example pattern).
export function useCurrentUser() {
  const { user } = useAuth();
  return {
    currentUserId: user?.id ?? "",
  };
}
