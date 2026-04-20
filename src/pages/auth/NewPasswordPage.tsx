// Supabase redirect URL for this page must be configured manually:
// Authentication → Email Templates → Reset Password → "Redirect To"
// Set: https://membrosmaster.com.br/nova-senha (prod) and http://localhost:5174/nova-senha (dev)

import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PageState = "verificando" | "token_invalido" | "formulario" | "sucesso";

export default function NewPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { settings } = usePlatformSettings();
  const platformName = settings?.name ?? "Lumi Membros";

  const [state, setState] = useState<PageState>("verificando");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Timeout: if PASSWORD_RECOVERY event doesn't arrive in 3s, token is invalid
    const timeout = setTimeout(() => {
      if (mounted && state === "verificando") setState("token_invalido");
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        clearTimeout(timeout);
        setState("formulario");
      }
    });

    // Handle case where session is already established (page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        clearTimeout(timeout);
        setState("formulario");
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setState("sucesso");
    setTimeout(() => navigate("/cursos", { replace: true }), 3000);
  }

  const passwordsMatch = !confirm || password === confirm;

  if (state === "verificando") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando link…</p>
        </div>
      </div>
    );
  }

  if (state === "token_invalido") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 animate-fade-in max-w-sm">
          <XCircle className="mx-auto h-14 w-14 text-destructive" />
          <h2 className="text-xl font-semibold">Link inválido ou expirado</h2>
          <p className="text-sm text-muted-foreground">
            Este link de recuperação não é mais válido. Solicite um novo para redefinir sua senha.
          </p>
          <Button asChild className="w-full h-11">
            <Link to="/redefinir-senha">Solicitar novo link</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (state === "sucesso") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3 animate-fade-in">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          <h2 className="text-xl font-semibold">Senha atualizada!</h2>
          <p className="text-sm text-muted-foreground">Redirecionando para seus cursos…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Nova Senha — {platformName}</title></Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="mb-8 text-center">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt={platformName} className="mx-auto mb-4 h-12 object-contain" />
            ) : (
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 mb-4">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">Nova senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">Escolha uma senha segura para sua conta</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-xl shadow-black/10">
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    required
                    className={cn("h-11 pr-10", confirm && !passwordsMatch && "border-destructive/50")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirm && !passwordsMatch && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
                disabled={loading || !password || !confirm || !passwordsMatch}
              >
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</>
                  : "Redefinir senha"
                }
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
