import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  avatarUrl: string;
};

type AuthContextValue = {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  sendMagicLink: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  isAdmin: boolean;
  isAuthenticated: boolean;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helper: map Supabase user + profile → AuthUser
// ---------------------------------------------------------------------------

function fallbackUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.email ?? "",
    role: "student",
    status: "active",
    avatarUrl: "",
  };
}

async function fetchProfile(user: User): Promise<AuthUser> {
  try {
    const timeout = new Promise<AuthUser>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 6000)
    );
    const fetch = supabase
      .from("profiles")
      .select("name, role, status, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => ({
        id: user.id,
        email: user.email ?? "",
        name: (data as { name?: string } | null)?.name ?? user.email ?? "",
        role: (data as { role?: string } | null)?.role ?? "student",
        status: (data as { status?: string } | null)?.status ?? "active",
        avatarUrl: (data as { avatar_url?: string } | null)?.avatar_url ?? "",
      }));
    return await Promise.race([fetch, timeout]);
  } catch {
    return fallbackUser(user);
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from persisted session on mount
  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION in Supabase v2,
    // so this is the single source of truth for auth state.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchProfile(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: translateAuthError(error.message) };
      return { error: null };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        return { error: translateAuthError(error.message) };
      }
      // Create profile row
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          name,
          role: "student",
          status: "active",
          username: email.split("@")[0],
          display_name: name,
          avatar_url: "",
          cover_url: "",
          bio: "",
          link: "",
          location: "",
          followers: [],
          following: [],
        });
      }
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/cursos` },
    });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  }, []);

  const isAdmin =
    !!user && ["owner", "admin", "support", "moderator"].includes(user.role);
  const isAuthenticated = !!session && !!user;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        sendMagicLink,
        updatePassword,
        isAdmin,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Translate Supabase error messages to PT-BR
// ---------------------------------------------------------------------------

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (message.includes("Email not confirmed"))
    return "Confirme seu e-mail antes de entrar.";
  if (message.includes("User already registered"))
    return "Este e-mail já está cadastrado.";
  if (message.includes("Password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (message.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  return message;
}
