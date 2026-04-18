import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff, Loader2, CheckCircle2, Mail, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { getProxiedImageUrl } from "@/lib/imageProxy";

type Mode = "login" | "forgot" | "magic";

export default function LoginPage() {
  const { signIn, resetPassword, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem("lumi:rememberMe") !== "false"
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/cursos";
  const { settings } = usePlatformSettings();
  const logoSrc = getProxiedImageUrl(settings.logoUploadUrl || settings.logoUrl || null);
  const coverUrl = getProxiedImageUrl(settings.loginCoverUrl || null);

  // Handle beforeunload sign-out when rememberMe is off
  useEffect(() => {
    const stored = localStorage.getItem("lumi:rememberMe");
    if (stored === "false") {
      const handler = () => {
        supabase.auth.signOut();
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, []);

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

    localStorage.setItem("lumi:rememberMe", rememberMe ? "true" : "false");

    if (!rememberMe) {
      window.addEventListener("beforeunload", () => {
        supabase.auth.signOut();
      }, { once: true });
    }

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
        <img src={logoSrc} alt={settings.name} width={180} height={48} className="mx-auto h-12 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      ) : (
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="text-center text-xs text-muted-foreground/60 space-y-0.5">
      <p>&copy; {new Date().getFullYear()} {settings.name}. Todos os direitos reservados.</p>
    </div>
  );

  // Sent confirmation screen (forgot / magic)
  if (sent) {
    return (
      <>
        <Helmet><title>E-mail enviado</title></Helmet>
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
          {/* Cover side — desktop only */}
          {coverUrl && (
            <div className="hidden lg:block lg:w-[60%] xl:w-[65%] relative">
              <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-top" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
            </div>
          )}
          {/* Form side */}
          <div className={cn(
            "flex flex-1 items-center justify-center p-6",
            !coverUrl && "w-full"
          )}>
            <div className="text-center space-y-4 animate-fade-in max-w-sm">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">E-mail enviado!</h2>
              <p className="text-sm text-muted-foreground">
                {mode === "forgot"
                  ? "Verifique sua caixa de entrada e clique no link para redefinir a senha."
                  : "Verifique sua caixa de entrada e clique no link magico para entrar."}
              </p>
              <button
                onClick={() => { setSent(false); setMode("login"); }}
                className="text-sm text-primary hover:underline underline-offset-4"
              >
                Voltar ao login
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {mode === "login" ? "Entrar" : mode === "forgot" ? "Recuperar senha" : "Link magico"}
        </title>
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        {/* ── COVER IMAGE (left side, desktop only) ── */}
        {coverUrl ? (
          <div className="hidden lg:block lg:w-[60%] xl:w-[65%] relative overflow-hidden">
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
          </div>
        ) : (
          <div
            className="hidden lg:block lg:w-[60%] xl:w-[65%] relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
            }}
          >
            {/* Decorative glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[120px]" />
          </div>
        )}

        {/* ── FORM SIDE (right side) ── */}
        <div className="flex flex-1 flex-col min-h-screen lg:min-h-0">
          {/* Form content — centered */}
          <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
            <div className="w-full max-w-sm">
              {logo}

              {mode !== "login" && (
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-bold text-foreground">
                    {mode === "forgot" ? "Recuperar senha" : "Entrar sem senha"}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mode === "forgot"
                      ? "Enviaremos um link para redefinir sua senha"
                      : "Enviaremos um link magico para o seu e-mail"}
                  </p>
                </div>
              )}

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
                      className={cn(
                        "h-11 bg-muted/30 border-border/50",
                        error && "border-destructive/50"
                      )}
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
                        className={cn(
                          "h-11 pr-10 bg-muted/30 border-border/50",
                          error && "border-destructive/50"
                        )}
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

                  {/* Remember me */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(v) => setRememberMe(v === true)}
                    />
                    <label
                      htmlFor="remember-me"
                      className="text-sm text-muted-foreground cursor-pointer select-none"
                    >
                      Lembrar de mim
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-full font-semibold shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
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
                    className="w-full h-11 rounded-full bg-muted/20 hover:bg-muted/30 border-border"
                    onClick={() => switchMode("magic")}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Entrar sem senha
                  </Button>

                  {/* Register link */}
                  <p className="text-center text-sm text-muted-foreground">
                    Não tem uma conta?{" "}
                    <Link to="/cadastro" className="text-primary font-medium hover:underline underline-offset-4">
                      Cadastre-se grátis
                    </Link>
                  </p>
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
                      className="h-11 bg-muted/30 border-border/50"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-full font-semibold shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
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
                      className="h-11 bg-muted/30 border-border/50"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-full font-semibold shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
                    disabled={loading || !email}
                  >
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</> : (
                      <><Mail className="mr-2 h-4 w-4" />Enviar link magico</>
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
            </div>
          </div>

          {/* Footer — pinned to bottom of right panel (desktop), above hero image (mobile) */}
          <div className="pb-6 px-6">
            {footer}
          </div>
        </div>

        {/* ── MOBILE HERO IMAGE (below form) ── */}
        {coverUrl ? (
          <div className="lg:hidden relative min-h-[40vh]">
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-black/60" />
          </div>
        ) : (
          <div
            className="lg:hidden relative min-h-[40vh]"
            style={{
              background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-background to-transparent h-16" />
          </div>
        )}
      </div>
    </>
  );
}
