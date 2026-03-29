import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Save, Eye, Award, Star, ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useCertificates } from "@/hooks/useCertificates";
import type { ThemeColors, CertificateTemplate } from "@/types/student";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CertificateTemplateDialog } from "@/components/admin/CertificateTemplateDialog";
import { CertificateRenderer } from "@/components/certificates/CertificateRenderer";

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

  // Certificates
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useCertificates();
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

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

  function handleSaveTemplate(
    data: Omit<CertificateTemplate, "id" | "createdAt" | "updatedAt">
  ) {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, data);
      toast.success("Modelo atualizado.");
    } else {
      createTemplate(data);
      toast.success("Modelo criado.");
    }
    setEditingTemplate(null);
  }

  function handleDeleteTemplate() {
    if (!deleteTemplateId) return;
    deleteTemplate(deleteTemplateId);
    toast.success("Modelo removido.");
    setDeleteTemplateId(null);
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
        <TabsContent value="certificados" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Modelos de Certificado</h2>
              <p className="text-sm text-muted-foreground">
                Crie e gerencie os modelos reutilizáveis de certificado.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingTemplate(null);
                setTplDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Novo modelo
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Award className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum modelo criado. Clique em "Novo modelo" para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="overflow-hidden border-border/50 hover:border-border transition-all">
                  <div className="rounded-t-lg overflow-hidden border-b">
                    <CertificateRenderer
                      template={tpl}
                      data={{
                        studentName: "Ana Paula Ferreira",
                        courseName: "Fotografia para Iniciantes",
                        completionDate: "29 de março de 2026",
                        courseHours: 20,
                        platformName: settings.name || "Lumi Membros",
                      }}
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tpl.blocks.length} bloco{tpl.blocks.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingTemplate(tpl);
                            setTplDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setDeleteTemplateId(tpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <CertificateTemplateDialog
            open={tplDialogOpen}
            onOpenChange={setTplDialogOpen}
            template={editingTemplate}
            onSave={handleSaveTemplate}
          />

          <AlertDialog
            open={!!deleteTemplateId}
            onOpenChange={(open) => { if (!open) setDeleteTemplateId(null); }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover modelo?</AlertDialogTitle>
                <AlertDialogDescription>
                  O modelo será removido permanentemente. Cursos que usam este modelo ficarão sem certificado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTemplate}>
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
