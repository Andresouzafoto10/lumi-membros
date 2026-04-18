import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isValidCpf, formatCpf } from "@/lib/cpf";
import { isPasswordStrong } from "@/lib/password";
import { getProxiedImageUrl } from "@/lib/imageProxy";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { settings } = usePlatformSettings();

  const logoSrc = getProxiedImageUrl(settings.logoUploadUrl || settings.logoUrl || null);
  const coverUrl = getProxiedImageUrl(settings.loginCoverUrl || null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const passwordCheck = isPasswordStrong(password);
  const passwordStrong = passwordCheck.valid;
  const cpfValid = isValidCpf(cpf);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword || !cpfValid) return;
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!passwordStrong) {
      setError(passwordCheck.reason ?? "Senha fraca.");
      return;
    }
    if (!cpfValid) {
      setError("CPF inválido. Verifique os dígitos.");
      return;
    }

    setError(null);
    setLoading(true);
    const { error } = await signUp(email, password, name, cpf.replace(/\D/g, ""));
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }

    setDone(true);
    setTimeout(() => navigate("/cursos", { replace: true }), 2500);
  }

  const logo = (
    <div className="mb-6 text-center">
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

  const coverPanel = coverUrl ? (
    <div className="hidden lg:block lg:w-[60%] xl:w-[65%] relative overflow-hidden">
      <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-top" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
    </div>
  ) : (
    <div
      className="hidden lg:block lg:w-[60%] xl:w-[65%] relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)" }}
    >
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[120px]" />
    </div>
  );

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        {coverPanel}
        <div className="flex flex-1 items-center justify-center p-6">
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
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Criar conta</title>
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        {/* ── COVER IMAGE (left side, desktop only) ── */}
        {coverPanel}

        {/* ── FORM SIDE (right side) ── */}
        <div className="flex flex-1 flex-col min-h-screen lg:min-h-0">
          {/* Form content — centered */}
          <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
            <div className="w-full max-w-sm">
              {logo}

              {/* Error */}
              {error && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="h-11 bg-muted/30 border-border/50"
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
                    className="h-11 bg-muted/30 border-border/50"
                  />
                </div>

                {/* CPF */}
                <div className="space-y-1.5">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    autoComplete="off"
                    maxLength={14}
                    value={formatCpf(cpf)}
                    onChange={(e) => setCpf(e.target.value)}
                    disabled={loading}
                    required
                    className={cn(
                      "h-11 bg-muted/30 border-border/50",
                      cpf && !cpfValid && "border-destructive/50"
                    )}
                  />
                  {cpf && !cpfValid && (
                    <p className="text-xs text-destructive">CPF é obrigatório</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres (letras e números)"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      className={cn(
                        "h-11 pr-10 bg-muted/30 border-border/50",
                        password && !passwordStrong && "border-destructive/50"
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
                  {password && !passwordStrong && (
                    <p className="text-xs text-destructive">{passwordCheck.reason}</p>
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
                      "h-11 bg-muted/30 border-border/50",
                      confirmPassword && !passwordsMatch && "border-destructive/50"
                    )}
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive">As senhas não coincidem</p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-11 rounded-full font-semibold mt-2 shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
                  disabled={
                    loading ||
                    !name ||
                    !email ||
                    !cpfValid ||
                    !password ||
                    !confirmPassword ||
                    !passwordsMatch ||
                    !passwordStrong
                  }
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta…</>
                  ) : (
                    "Criar conta grátis"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline underline-offset-4">
                  Entrar
                </Link>
              </p>
            </div>
          </div>

          {/* Footer — pinned to bottom */}
          <div className="pb-6 px-6">
            {footer}
          </div>
        </div>

        {/* ── MOBILE HERO IMAGE (below form) ── */}
        {coverUrl ? (
          <div className="lg:hidden relative min-h-[30vh]">
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-top" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-black/60" />
          </div>
        ) : (
          <div
            className="lg:hidden relative min-h-[30vh]"
            style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-background to-transparent h-16" />
          </div>
        )}
      </div>
    </>
  );
}
