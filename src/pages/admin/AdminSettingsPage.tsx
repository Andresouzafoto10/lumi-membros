import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Save, Eye, Award, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import type { ThemeColors } from "@/types/student";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// hex -> HSL utilities (for CSS variable injection)
// ---------------------------------------------------------------------------
function hexToHsl(hex: string): string {
  const m = hex.replace("#", "").match(/([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
  if (!m) return "0 0% 0%";
  let r = parseInt(m[1], 16) / 255;
  let g = parseInt(m[2], 16) / 255;
  let b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyThemeToCss(dark: ThemeColors, light: ThemeColors) {
  let el = document.getElementById("lumi-custom-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "lumi-custom-theme";
    document.head.appendChild(el);
  }
  el.textContent = [
    ":root {",
    `  --primary: ${hexToHsl(light.primary)};`,
    `  --background: ${hexToHsl(light.background)};`,
    `  --card: ${hexToHsl(light.card)};`,
    `  --foreground: ${hexToHsl(light.foreground)};`,
    `  --ring: ${hexToHsl(light.primary)};`,
    "}",
    ".dark {",
    `  --primary: ${hexToHsl(dark.primary)};`,
    `  --background: ${hexToHsl(dark.background)};`,
    `  --card: ${hexToHsl(dark.card)};`,
    `  --foreground: ${hexToHsl(dark.foreground)};`,
    `  --ring: ${hexToHsl(dark.primary)};`,
    "}",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Color field component
// ---------------------------------------------------------------------------
type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
};

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const inputId = `color-picker-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-md border shrink-0"
          style={{ backgroundColor: value }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="font-mono text-sm h-8 flex-1"
        />
        <input
          id={inputId}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
          title="Escolher cor"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Theme preview
// ---------------------------------------------------------------------------
function ThemePreview({ colors, label }: { colors: ThemeColors; label: string }) {
  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{ backgroundColor: colors.background, color: colors.foreground }}
    >
      <p className="text-xs font-medium opacity-60">{label}</p>
      <div className="rounded-md p-3 space-y-2" style={{ backgroundColor: colors.card }}>
        <p className="text-sm font-semibold" style={{ color: colors.foreground }}>
          Card de exemplo
        </p>
        <p className="text-xs opacity-70" style={{ color: colors.foreground }}>
          Texto de descrição do conteúdo.
        </p>
        <button
          className="mt-1 rounded-md px-3 py-1.5 text-xs font-medium"
          style={{ backgroundColor: colors.primary, color: "#fff" }}
        >
          Botão primário
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Certificate preview
// ---------------------------------------------------------------------------
function CertPreview({
  backgroundUrl,
  text,
  platformName,
}: {
  backgroundUrl: string;
  text: string;
  platformName: string;
}) {
  const rendered = text
    .replace("{{nome}}", "Ana Paula Ferreira")
    .replace("{{curso}}", "Fotografia para Iniciantes")
    .replace("{{horas}}", "20");

  return (
    <div
      className="relative w-full rounded-lg border overflow-hidden"
      style={{ aspectRatio: "16/9" }}
    >
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          alt="Fundo do certificado"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center bg-black/10">
        <p className="text-xs uppercase tracking-widest text-white/80 drop-shadow">
          {platformName}
        </p>
        <h2 className="text-2xl font-bold text-white drop-shadow">
          Certificado de Conclusão
        </h2>
        <p className="text-sm text-white/90 max-w-md leading-relaxed drop-shadow">
          {rendered}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, updateThemeColors } = usePlatformSettings();

  const [name, setName] = useState(settings.name);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [defaultTheme, setDefaultTheme] = useState<"dark" | "light">(settings.defaultTheme);
  const [darkColors, setDarkColors] = useState<ThemeColors>({ ...settings.theme.dark });
  const [lightColors, setLightColors] = useState<ThemeColors>({ ...settings.theme.light });
  const [ratingsEnabled, setRatingsEnabled] = useState(settings.ratingsEnabled);
  const [certBg, setCertBg] = useState(settings.certificateBackgroundUrl);
  const [certText, setCertText] = useState(settings.certificateDefaultText);

  // Apply saved theme on first load
  useEffect(() => {
    applyThemeToCss(settings.theme.dark, settings.theme.light);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  function handleSaveAppearance() {
    updateSettings({ name, logoUrl, defaultTheme });
    updateThemeColors("dark", darkColors);
    updateThemeColors("light", lightColors);
    applyThemeToCss(darkColors, lightColors);
    toast.success("Aparência salva e aplicada.");
  }

  function handleSaveRatings() {
    updateSettings({ ratingsEnabled });
    toast.success(
      ratingsEnabled ? "Avaliações habilitadas." : "Avaliações desabilitadas."
    );
  }

  function handleSaveCertificate() {
    updateSettings({
      certificateBackgroundUrl: certBg,
      certificateDefaultText: certText,
    });
    toast.success("Configurações de certificado salvas.");
  }

  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb
        items={[{ label: "Admin", to: "/admin" }, { label: "Configurações" }]}
      />

      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Personalize a plataforma Lumi Membros
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="aparencia"
        onValueChange={(v) => {
          if (v === "perfis") navigate("/admin/configuracoes/perfis");
        }}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="aparencia" className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="avaliacoes" className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="certificados" className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" />
            Certificados
          </TabsTrigger>
          <TabsTrigger value="perfis" className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Perfis de Acesso
          </TabsTrigger>
        </TabsList>

        {/* ========================== APARÊNCIA ========================== */}
        <TabsContent value="aparencia" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Identidade da plataforma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="plat-name">Nome da plataforma</Label>
                <Input
                  id="plat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Lumi Membros"
                />
                <p className="text-xs text-muted-foreground">
                  Exibido no cabeçalho da área do aluno.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plat-logo">URL do logotipo</Label>
                <Input
                  id="plat-logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Preview do logo"
                    className="h-10 object-contain rounded border bg-muted p-1"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Tema padrão</Label>
                <Select
                  value={defaultTheme}
                  onValueChange={(v) => setDefaultTheme(v as "dark" | "light")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="light">Claro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cores — Tema Escuro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  label="Cor primária"
                  value={darkColors.primary}
                  onChange={(v) => setDarkColors((p) => ({ ...p, primary: v }))}
                />
                <ColorField
                  label="Background principal"
                  value={darkColors.background}
                  onChange={(v) => setDarkColors((p) => ({ ...p, background: v }))}
                />
                <ColorField
                  label="Background do card"
                  value={darkColors.card}
                  onChange={(v) => setDarkColors((p) => ({ ...p, card: v }))}
                />
                <ColorField
                  label="Cor do texto"
                  value={darkColors.foreground}
                  onChange={(v) => setDarkColors((p) => ({ ...p, foreground: v }))}
                />
              </div>
              <ThemePreview colors={darkColors} label="Preview — Tema Escuro" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cores — Tema Claro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  label="Cor primária"
                  value={lightColors.primary}
                  onChange={(v) => setLightColors((p) => ({ ...p, primary: v }))}
                />
                <ColorField
                  label="Background principal"
                  value={lightColors.background}
                  onChange={(v) => setLightColors((p) => ({ ...p, background: v }))}
                />
                <ColorField
                  label="Background do card"
                  value={lightColors.card}
                  onChange={(v) => setLightColors((p) => ({ ...p, card: v }))}
                />
                <ColorField
                  label="Cor do texto"
                  value={lightColors.foreground}
                  onChange={(v) => setLightColors((p) => ({ ...p, foreground: v }))}
                />
              </div>
              <ThemePreview colors={lightColors} label="Preview — Tema Claro" />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveAppearance}>
              <Save className="mr-1.5 h-4 w-4" />
              Salvar aparência
            </Button>
          </div>
        </TabsContent>

        {/* ========================== AVALIAÇÕES ========================== */}
        <TabsContent value="avaliacoes">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Avaliação de aulas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Habilitar avaliação de aulas na plataforma
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Quando ativo, os alunos podem curtir ou descurtir aulas.
                    Quando desativado, o componente fica oculto em toda a
                    plataforma.
                  </p>
                </div>
                <Switch
                  checked={ratingsEnabled}
                  onCheckedChange={setRatingsEnabled}
                />
              </div>

              <Separator />

              <div
                className="rounded-lg border p-4 flex items-center gap-3 transition-opacity"
                style={{ opacity: ratingsEnabled ? 1 : 0.35 }}
              >
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                    👍 12
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
                    👎 2
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Preview do componente de avaliação
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveRatings}>
                  <Save className="mr-1.5 h-4 w-4" />
                  Salvar configuração
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== CERTIFICADOS ========================= */}
        <TabsContent value="certificados">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Configuração de certificados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="cert-bg">URL da imagem de fundo</Label>
                <Input
                  id="cert-bg"
                  value={certBg}
                  onChange={(e) => setCertBg(e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Recomendado: 1920×1080px.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cert-text">Texto padrão do certificado</Label>
                <Textarea
                  id="cert-text"
                  rows={4}
                  value={certText}
                  onChange={(e) => setCertText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    {"{{nome}}"}
                  </code>{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    {"{{curso}}"}
                  </code>{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    {"{{horas}}"}
                  </code>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Preview</p>
                <CertPreview
                  backgroundUrl={certBg}
                  text={certText}
                  platformName={name}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis substituídas por valores de exemplo.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCertificate}>
                  <Save className="mr-1.5 h-4 w-4" />
                  Salvar certificado
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
