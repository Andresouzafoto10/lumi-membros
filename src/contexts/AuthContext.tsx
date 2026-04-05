import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
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
    name: string,
    cpf?: string
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

async function fetchProfile(
  user: User,
  lastKnown: AuthUser | null
): Promise<AuthUser> {
  const fb = lastKnown ?? fallbackUser(user);
  try {
    const timeout = new Promise<AuthUser>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 5000)
    );
    // avatar_url is intentionally excluded here — it can be a large base64 string
    // that would slow down auth. The avatar is loaded separately via useProfiles.
    const query = supabase
      .from("profiles")
      .select("name, role, status")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return fb;
        const d = data as { name?: string; role?: string; status?: string };
        return {
          id: user.id,
          email: user.email ?? "",
          name: d.name ?? user.email ?? "",
          role: d.role ?? fb.role,
          status: d.status ?? "active",
          avatarUrl: "",
        };
      });
    return await Promise.race([query, timeout]);
  } catch {
    // On failure keep the last known good profile so admin doesn't get demoted
    return fb;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastKnownProfile = useRef<AuthUser | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Primary initialization — fetch persisted session once
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        const profile = await fetchProfile(session.user, lastKnownProfile.current);
        if (!mounted) return;
        lastKnownProfile.current = profile;
        setUser(profile);
      } else {
        lastKnownProfile.current = null;
        setUser(null);
      }
      setLoading(false);
      initializedRef.current = true;
    });

    // Listener for subsequent auth changes only (sign-in, sign-out, etc.)
    // TOKEN_REFRESHED and USER_UPDATED are skipped entirely to avoid
    // unnecessary re-renders that cause the "Verificando sessão" flicker.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;

      setSession(session);
      if (session?.user) {
        const profile = await fetchProfile(session.user, lastKnownProfile.current);
        if (!mounted) return;
        lastKnownProfile.current = profile;
        setUser(profile);
      } else {
        lastKnownProfile.current = null;
        setUser(null);
      }

      // Only set loading false if getSession() hasn't resolved yet (race condition)
      if (!initializedRef.current) {
        setLoading(false);
        initializedRef.current = true;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    async (email: string, password: string, name: string, cpf?: string) => {
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
          cpf: cpf || "",
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
    lastKnownProfile.current = null;
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
