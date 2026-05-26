import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff, Loader2, CheckCircle2, Tag, AlertTriangle } from "lucide-react";
import { isPast, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isValidCpf, formatCpf } from "@/lib/cpf";
import { isPasswordStrong } from "@/lib/password";
import type { InviteLink } from "@/types/student";
import { getProxiedImageUrl } from "@/lib/imageProxy";

type Mode = "signup" | "login";

// Calls the accept-invite Edge Function (server-side enrollment + use tracking +
// source + email). Returns an error message or null. The function runs with the
// caller's session, so signUp/signIn must have completed first.
async function acceptInvite(slug: string, isNew: boolean): Promise<string | null> {
  // Pass the access token explicitly: right after signUp/signIn the supabase
  // client may not have propagated the new session to its functions client yet,
  // which would make the call hit accept-invite with only the anon key (→ 401).
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const { data, error } = await supabase.functions.invoke("accept-invite", {
    body: { slug, isNew },
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (error) {
    let msg = "Não foi possível liberar o acesso. Tente novamente.";
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      const parsed = ctx?.json ? await ctx.json() : null;
      if (parsed?.error) msg = parsed.error;
    } catch {
      /* keep generic message */
    }
    return msg;
  }
  if (data && (data as { error?: string }).error) {
    return (data as { error: string }).error;
  }
  return null;
}

export default function InviteRegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { settings } = usePlatformSettings();

  const logoSrc = getProxiedImageUrl(settings.logoUploadUrl || settings.logoUrl || null);
  const coverUrl = getProxiedImageUrl(settings.loginCoverUrl || null);

  // Invite link state
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);

  // Form state
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const passwordCheck = isPasswordStrong(password);
  const passwordStrong = passwordCheck.valid;
  const cpfValid = isValidCpf(cpf);

  const classNames =
    (inviteLink?.class_names && inviteLink.class_names.length > 0)
      ? inviteLink.class_names
      : inviteLink?.class_name
      ? [inviteLink.class_name]
      : [];

  // Fetch invite link on mount
  useEffect(() => {
    if (!slug) {
      setInviteError("Link de convite inválido.");
      setInviteLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("invite_links")
          .select("*, classes(name)")
          .eq("slug", slug)
          .single();

        if (fetchError || !data || !data.is_active) {
          setInviteError("Este link de convite não é válido ou expirou.");
          setInviteLoading(false);
          return;
        }

        if (data.expires_at && isPast(parseISO(data.expires_at))) {
          setInviteError("Este link de convite não é válido ou expirou.");
          setInviteLoading(false);
          return;
        }

        if (data.max_uses != null && data.use_count >= data.max_uses) {
          setInviteError("Este link atingiu o limite máximo de usos.");
          setInviteLoading(false);
          return;
        }

        const classIds = ((data.class_ids as string[] | null) ?? []).filter(Boolean);
        const effectiveClassIds = classIds.length > 0
          ? classIds
          : data.class_id
          ? [data.class_id as string]
          : [];

        let resolvedNames: string[] = [];
        if (effectiveClassIds.length > 0) {
          const { data: cls } = await supabase
            .from("classes")
            .select("name")
            .in("id", effectiveClassIds);
          resolvedNames = (cls ?? []).map((c) => c.name as string).filter(Boolean);
        }

        setInviteLink({
          id: data.id,
          name: data.name,
          slug: data.slug,
          class_id: data.class_id,
          class_ids: effectiveClassIds,
          created_by: data.created_by,
          max_uses: data.max_uses,
          use_count: data.use_count,
          expires_at: data.expires_at,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at,
          class_name: (data as { classes?: { name?: string } | null }).classes?.name ?? undefined,
          class_names: resolvedNames,
        });
        setInviteLoading(false);
      } catch {
        setInviteError("Erro ao carregar link de convite.");
        setInviteLoading(false);
      }
    })();
  }, [slug]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  // New account → create, then claim the invite.
  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    if (!inviteLink || !slug) return;
    if (!name || !email || !password || !confirmPassword || !cpfValid) return;
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!passwordStrong) {
      setError(passwordCheck.reason ?? "Senha fraca.");
      return;
    }

    setError(null);
    setNotice(null);
    setLoading(true);

    const { error: signUpError } = await signUp(email, password, name, cpf.replace(/\D/g, ""));
    if (signUpError) {
      // Already registered → switch to login so they can claim the invite.
      if (/cadastrad/i.test(signUpError)) {
        setLoading(false);
        switchMode("login");
        setNotice("Esse e-mail já tem conta. Entre com sua senha para liberar o acesso do convite.");
        return;
      }
      setError(signUpError);
      setLoading(false);
      return;
    }

    const claimError = await acceptInvite(slug, true);
    setLoading(false);
    if (claimError) {
      setError(claimError);
      return;
    }
    finish();
  }

  // Existing account → login, then claim the invite.
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!inviteLink || !slug) return;
    if (!email || !password) return;

    setError(null);
    setNotice(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    const claimError = await acceptInvite(slug, false);
    setLoading(false);
    if (claimError) {
      setError(claimError);
      return;
    }
    finish();
  }

  function finish() {
    setDone(true);
    setTimeout(() => navigate("/cursos", { replace: true }), 2200);
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

  if (inviteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-orange-400" />
          <h2 className="text-lg font-semibold">{inviteError}</h2>
          <Link to="/login">
            <Button variant="outline" className="mt-2">Ir para login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        {coverPanel}
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center space-y-3 animate-fade-in">
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
            <h2 className="text-xl font-semibold">Acesso liberado!</h2>
            <p className="text-sm text-muted-foreground">
              Suas turmas já estão disponíveis.
              <br />
              Redirecionando…
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isLogin = mode === "login";

  return (
    <>
      <Helmet>
        <title>{isLogin ? "Entrar — Convite" : "Criar conta — Convite"}</title>
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        {coverPanel}

        <div className="flex flex-1 flex-col min-h-screen lg:min-h-0">
          <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
            <div className="w-full max-w-sm">
              {logo}

              {/* Invite badge + classes */}
              <div className="mb-4 flex flex-col items-center gap-2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1 gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Convite
                </Badge>
                {classNames.length > 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Você receberá acesso a:{" "}
                    <strong className="text-foreground">{classNames.join(", ")}</strong>
                  </p>
                )}
              </div>

              {notice && (
                <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
                  {notice}
                </div>
              )}
              {error && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {isLogin ? (
                /* ---------------- LOGIN MODE (existing account) ---------------- */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
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

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        className="h-11 pr-10 bg-muted/30 border-border/50"
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
                    <div className="text-right">
                      <Link to="/redefinir-senha" className="text-xs text-primary hover:underline underline-offset-4">
                        Esqueci minha senha
                      </Link>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-full font-semibold mt-2 shadow-sm shadow-primary/20 active:scale-[0.98] transition-transform"
                    disabled={loading || !email || !password}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Liberando acesso…</>
                    ) : (
                      "Entrar e liberar acesso"
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Não tem conta?{" "}
                    <button type="button" onClick={() => switchMode("signup")} className="text-primary font-medium hover:underline underline-offset-4">
                      Criar conta
                    </button>
                  </p>
                </form>
              ) : (
                /* ---------------- SIGNUP MODE (new account) ---------------- */
                <form onSubmit={handleSignup} className="space-y-4">
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

                  <p className="text-center text-sm text-muted-foreground">
                    Já tem uma conta?{" "}
                    <button type="button" onClick={() => switchMode("login")} className="text-primary font-medium hover:underline underline-offset-4">
                      Entrar para liberar
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          <div className="pb-6 px-6">
            {footer}
          </div>
        </div>

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
