import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff, Loader2, CheckCircle2, Mail, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "login" | "forgot" | "magic";

export default function LoginPage() {
  const { signIn, resetPassword, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/cursos";
  const { settings } = usePlatformSettings();
  const logoSrc = settings.logoUploadUrl || settings.logoUrl || null;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSent(false);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { setError(error); return; }
    navigate(from, { replace: true });
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) { setError(error); return; }
    setSent(true);
  }

  async function handleMagic(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setLoading(true);
    const { error } = await sendMagicLink(email);
    setLoading(false);
    if (error) { setError(error); return; }
    setSent(true);
  }

  const logo = (
    <div className="mb-8 text-center">
      {logoSrc ? (
        <img src={logoSrc} alt={settings.name} className="mx-auto mb-4 h-12 object-contain" />
      ) : (
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 mb-4">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      )}
      {mode === "login" && (
        <>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre na sua conta para continuar aprendendo</p>
        </>
      )}
      {mode === "forgot" && (
        <>
          <h1 className="text-2xl font-bold text-foreground">Recuperar senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link para redefinir sua senha</p>
        </>
      )}
      {mode === "magic" && (
        <>
          <h1 className="text-2xl font-bold text-foreground">Entrar sem senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link mágico para o seu e-mail</p>
        </>
      )}
    </div>
  );

  // Sent confirmation screen (forgot / magic)
  if (sent) {
    return (
      <>
        <Helmet><title>E-mail enviado</title></Helmet>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4 animate-fade-in max-w-sm">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">E-mail enviado!</h2>
            <p className="text-sm text-muted-foreground">
              {mode === "forgot"
                ? "Verifique sua caixa de entrada e clique no link para redefinir a senha."
                : "Verifique sua caixa de entrada e clique no link mágico para entrar."}
            </p>
            <button
              onClick={() => { setSent(false); setMode("login"); }}
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              Voltar ao login
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {mode === "login" ? "Entrar" : mode === "forgot" ? "Recuperar senha" : "Link mágico"}
        </title>
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {logo}

          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-xl shadow-black/10">
            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
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
                    className={cn("h-11", error && "border-destructive/50")}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Esqueci a senha
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      className={cn("h-11 pr-10", error && "border-destructive/50")}
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

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
                  disabled={loading || !email || !password}
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando…</> : "Entrar"}
                </Button>

                {/* Divider */}
                <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex-1 border-t border-border/50" />
                  <span>ou</span>
                  <div className="flex-1 border-t border-border/50" />
                </div>

                {/* Magic link button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => switchMode("magic")}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Entrar sem senha
                </Button>
              </form>
            )}

            {/* ── FORGOT PASSWORD FORM ── */}
            {mode === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email-forgot">E-mail</Label>
                  <Input
                    id="email-forgot"
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
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
                  disabled={loading || !email}
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</> : (
                    <><KeyRound className="mr-2 h-4 w-4" />Enviar link de recuperação</>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Voltar ao login
                </button>
              </form>
            )}

            {/* ── MAGIC LINK FORM ── */}
            {mode === "magic" && (
              <form onSubmit={handleMagic} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email-magic">E-mail</Label>
                  <Input
                    id="email-magic"
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
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
                  disabled={loading || !email}
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</> : (
                    <><Mail className="mr-2 h-4 w-4" />Enviar link mágico</>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Voltar ao login
                </button>
              </form>
            )}

            {/* Footer link */}
            {mode === "login" && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <Link to="/cadastro" className="text-primary font-medium hover:underline underline-offset-4">
                  Cadastre-se grátis
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
