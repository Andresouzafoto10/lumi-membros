import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const passwordStrong = password.length >= 6;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!passwordStrong) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setError(null);
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }

    // Supabase may require email confirmation depending on project settings.
    // Show success message; if auto-confirm is on, redirect to /cursos.
    setDone(true);
    setTimeout(() => navigate("/cursos", { replace: true }), 2500);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3 animate-fade-in">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          <h2 className="text-xl font-semibold">Cadastro realizado!</h2>
          <p className="text-sm text-muted-foreground">
            Verifique seu e-mail para confirmar a conta.
            <br />
            Redirecionando…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Criar conta — Lumi Membros</title>
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* Glow */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 overflow-hidden"
        >
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 mb-4">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-primary"
                fill="currentColor"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Crie sua conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesso gratuito à plataforma
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-xl shadow-black/10">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                  className="h-11"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-11"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className={cn(
                      "h-11 pr-10",
                      password && !passwordStrong && "border-destructive/50"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {password && !passwordStrong && (
                  <p className="text-xs text-destructive">
                    Mínimo 6 caracteres
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  className={cn(
                    "h-11",
                    confirmPassword && !passwordsMatch && "border-destructive/50"
                  )}
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive">
                    As senhas não coincidem
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 font-semibold mt-2 shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
                disabled={
                  loading ||
                  !name ||
                  !email ||
                  !password ||
                  !confirmPassword ||
                  !passwordsMatch ||
                  !passwordStrong
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta…
                  </>
                ) : (
                  "Criar conta grátis"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link
                to="/login"
                className="text-primary font-medium hover:underline underline-offset-4"
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
