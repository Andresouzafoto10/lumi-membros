import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Save, Eye, Award, Star, ShieldCheck, Plus, Pencil, Trash2, Upload, Link as LinkIcon, Globe, Smartphone, Code, Menu as MenuIcon, ChevronUp, ChevronDown, ExternalLink, EyeOff } from "lucide-react";
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
import { ImageUpload } from "@/components/ui/ImageUpload";

import { useScriptInjections } from "@/hooks/useScriptInjections";
import type { ScriptInjectionInsert, ScriptInjectionRow } from "@/hooks/useScriptInjections";
import { useNavMenuItems } from "@/hooks/useNavMenuItems";
import type { NavMenuItemRow, NavMenuItemInsert } from "@/hooks/useNavMenuItems";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { applyThemeToCss } from "@/lib/applyTheme";
import { applyFavicon, applyPwaManifest } from "@/lib/generatePwaManifest";

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
  const { settings, updateSettings } = usePlatformSettings();

  const [name, setName] = useState(settings.name);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [logoUploadUrl, setLogoUploadUrl] = useState(settings.logoUploadUrl ?? "");
  const [logoMode, setLogoMode] = useState<"url" | "upload">(settings.logoUploadUrl ? "upload" : "url");
  const [defaultTheme, setDefaultTheme] = useState<"dark" | "light">(settings.defaultTheme);
  const [darkColors, setDarkColors] = useState<ThemeColors>({ ...settings.theme.dark });
  const [lightColors, setLightColors] = useState<ThemeColors>({ ...settings.theme.light });
  const [ratingsEnabled, setRatingsEnabled] = useState(settings.ratingsEnabled);

  // Favicon
  const [faviconUrl, setFaviconUrl] = useState(settings.faviconUrl ?? "");
  const [faviconMode, setFaviconMode] = useState<"url" | "upload">(settings.faviconUrl?.startsWith("http") && !settings.faviconUrl?.includes("r2") ? "url" : settings.faviconUrl ? "upload" : "url");

  // Login cover
  const [loginCoverUrl, setLoginCoverUrl] = useState(settings.loginCoverUrl ?? "");

  // PWA
  const [pwaEnabled, setPwaEnabled] = useState(settings.pwaEnabled ?? false);
  const [pwaName, setPwaName] = useState(settings.pwaName ?? "");
  const [pwaShortName, setPwaShortName] = useState(settings.pwaShortName ?? "");
  const [pwaIconUrl, setPwaIconUrl] = useState(settings.pwaIconUrl ?? "");
  const [pwaIconMode, setPwaIconMode] = useState<"url" | "upload">("upload");
  const [pwaThemeColor, setPwaThemeColor] = useState(settings.pwaThemeColor ?? "#00C2CB");
  const [pwaBackgroundColor, setPwaBackgroundColor] = useState(settings.pwaBackgroundColor ?? "#09090b");

  // Scripts
  const {
    scripts,
    createScriptInjection,
    updateScriptInjection,
    deleteScriptInjection,
    toggleScriptInjection,
  } = useScriptInjections();
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptInjectionRow | null>(null);
  const [deleteScriptId, setDeleteScriptId] = useState<string | null>(null);

  // Menu
  const {
    items: studentMenuItems,
    createNavMenuItem: createStudentMenuItem,
    updateNavMenuItem: updateStudentMenuItem,
    deleteNavMenuItem: deleteStudentMenuItem,
    reorderNavMenuItems: reorderStudentMenuItems,
    toggleNavMenuItemVisibility: toggleStudentMenuVisibility,
  } = useNavMenuItems("student");
  const {
    items: adminMenuItems,
    createNavMenuItem: createAdminMenuItem,
    updateNavMenuItem: updateAdminMenuItem,
    deleteNavMenuItem: deleteAdminMenuItem,
    reorderNavMenuItems: reorderAdminMenuItems,
    toggleNavMenuItemVisibility: toggleAdminMenuVisibility,
  } = useNavMenuItems("admin");
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<NavMenuItemRow | null>(null);
  const [menuDialogArea, setMenuDialogArea] = useState<"student" | "admin">("student");
  const [deleteMenuItemId, setDeleteMenuItemId] = useState<string | null>(null);

  // Certificates
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useCertificates();
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // Sync local state + CSS when settings load/change from query
  useEffect(() => {
    setName(settings.name);
    setLogoUrl(settings.logoUrl);
    setLogoUploadUrl(settings.logoUploadUrl ?? "");
    setLogoMode(settings.logoUploadUrl ? "upload" : "url");
    setDefaultTheme(settings.defaultTheme);
    setDarkColors({ ...settings.theme.dark });
    setLightColors({ ...settings.theme.light });
    setRatingsEnabled(settings.ratingsEnabled);
    setFaviconUrl(settings.faviconUrl ?? "");
    setFaviconMode(settings.faviconUrl?.startsWith("http") && !settings.faviconUrl?.includes("r2") ? "url" : settings.faviconUrl ? "upload" : "url");
    setLoginCoverUrl(settings.loginCoverUrl ?? "");
    setPwaEnabled(settings.pwaEnabled ?? false);
    setPwaName(settings.pwaName ?? "");
    setPwaShortName(settings.pwaShortName ?? "");
    setPwaIconUrl(settings.pwaIconUrl ?? "");
    setPwaThemeColor(settings.pwaThemeColor ?? "#00C2CB");
    setPwaBackgroundColor(settings.pwaBackgroundColor ?? "#09090b");
    applyThemeToCss(settings.theme.dark, settings.theme.light);
  }, [settings]);

  // ---------------------------------------------------------------------------
  async function handleSaveAppearance() {
    try {
      await updateSettings({
        name,
        logoUrl,
        logoUploadUrl: logoUploadUrl || null,
        defaultTheme,
        faviconUrl: faviconUrl || null,
        loginCoverUrl: loginCoverUrl || null,
        pwaEnabled,
        pwaName: pwaName || null,
        pwaShortName: pwaShortName || null,
        pwaIconUrl: pwaIconUrl || null,
        pwaThemeColor: pwaThemeColor || null,
        pwaBackgroundColor: pwaBackgroundColor || null,
        theme: { dark: darkColors, light: lightColors },
      });
      applyThemeToCss(darkColors, lightColors);
      applyFavicon(faviconUrl || null);
      applyPwaManifest({
        ...settings,
        pwaEnabled,
        pwaName: pwaName || null,
        pwaShortName: pwaShortName || null,
        pwaIconUrl: pwaIconUrl || null,
        pwaThemeColor: pwaThemeColor || null,
        pwaBackgroundColor: pwaBackgroundColor || null,
      });
      toast.success("Aparência salva e aplicada.");
    } catch (err) {
      console.error("[settings] Falha ao salvar aparência:", err);
      toast.error("Erro ao salvar aparência. Tente novamente.");
    }
  }

  async function handleSaveRatings() {
    try {
      await updateSettings({ ratingsEnabled });
      toast.success(
        ratingsEnabled ? "Avaliações habilitadas." : "Avaliações desabilitadas."
      );
    } catch (err) {
      console.error("[settings] Falha ao salvar avaliações:", err);
      toast.error("Erro ao salvar avaliações.");
    }
  }

  async function handleSaveTemplate(
    data: Omit<CertificateTemplate, "id" | "createdAt" | "updatedAt">
  ) {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, data);
        toast.success("Modelo atualizado.");
      } else {
        await createTemplate(data);
        toast.success("Modelo criado.");
      }
      setEditingTemplate(null);
    } catch {
      toast.error("Erro ao salvar modelo.");
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteTemplateId) return;
    try {
      await deleteTemplate(deleteTemplateId);
      toast.success("Modelo removido.");
    } catch {
      toast.error("Erro ao remover modelo.");
    } finally {
      setDeleteTemplateId(null);
    }
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
          <TabsTrigger value="scripts" className="flex items-center gap-1.5">
            <Code className="h-3.5 w-3.5" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-1.5">
            <MenuIcon className="h-3.5 w-3.5" />
            Menu
          </TabsTrigger>
        </TabsList>

        {/* ========================== APARÊNCIA ========================== */}
        <TabsContent value="aparencia" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Identidade da plataforma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
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

              <Separator />

              {/* Logo — URL or Upload */}
              <div className="space-y-2">
                <Label>Logotipo</Label>
                <div className="flex gap-1.5 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={logoMode === "url" ? "default" : "outline"}
                    onClick={() => setLogoMode("url")}
                    className="h-7 text-xs gap-1.5"
                  >
                    <LinkIcon className="h-3 w-3" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={logoMode === "upload" ? "default" : "outline"}
                    onClick={() => setLogoMode("upload")}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Upload className="h-3 w-3" />
                    Upload
                  </Button>
                </div>
                {logoMode === "url" ? (
                  <div className="space-y-1.5">
                    <Input
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
                ) : (
                  <div className="space-y-1.5">
                    <ImageUpload
                      value={logoUploadUrl}
                      onChange={setLogoUploadUrl}
                      bucket="platform"
                      aspect="banner"
                      imagePreset="banner"
                      placeholder="Envie sua logo (PNG, JPG ou WebP)"
                      maxSizeMB={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      O upload tem prioridade sobre a URL externa.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Favicon */}
              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="flex gap-1.5 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={faviconMode === "url" ? "default" : "outline"}
                    onClick={() => setFaviconMode("url")}
                    className="h-7 text-xs gap-1.5"
                  >
                    <LinkIcon className="h-3 w-3" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={faviconMode === "upload" ? "default" : "outline"}
                    onClick={() => setFaviconMode("upload")}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Upload className="h-3 w-3" />
                    Upload
                  </Button>
                </div>
                {faviconMode === "url" ? (
                  <div className="space-y-1.5">
                    <Input
                      value={faviconUrl}
                      onChange={(e) => setFaviconUrl(e.target.value)}
                      placeholder="https://exemplo.com/favicon.ico"
                    />
                    {faviconUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={faviconUrl}
                          alt="Favicon preview"
                          className="h-8 w-8 object-contain rounded border bg-muted p-0.5"
                        />
                        <span className="text-xs text-muted-foreground">Preview</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <ImageUpload
                    value={faviconUrl}
                    onChange={setFaviconUrl}
                    bucket="platform"
                    aspect="square"
                    imagePreset="avatar"
                    placeholder="Envie o favicon (.ico, .png, .svg)"
                    maxSizeMB={1}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Recomendado: 32x32 ou 64x64 pixels. Formatos: .ico, .png, .svg
                </p>
              </div>

              <Separator />

              {/* Login Cover */}
              <div className="space-y-2">
                <Label>Capa da tela de login</Label>
                <p className="text-xs text-muted-foreground">
                  Imagem exibida ao lado do formulario de login. Recomendado: 1920x1080 ou superior.
                </p>
                <ImageUpload
                  value={loginCoverUrl}
                  onChange={setLoginCoverUrl}
                  bucket="platform"
                  aspect="banner"
                  imagePreset="banner"
                  placeholder="Envie a capa de login (PNG, JPG ou WebP)"
                  maxSizeMB={10}
                />
                {loginCoverUrl && (
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <img
                      src={loginCoverUrl}
                      alt="Preview da capa de login"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}
              </div>

              <Separator />

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

          {/* PWA */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Progressive Web App (PWA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Ativar PWA</p>
                  <p className="text-sm text-muted-foreground">
                    Permite que os alunos instalem a plataforma como app no celular ou desktop.
                  </p>
                </div>
                <Switch checked={pwaEnabled} onCheckedChange={setPwaEnabled} />
              </div>

              {pwaEnabled && (
                <div className="space-y-4 pt-2">
                  <Separator />

                  <div className="space-y-1.5">
                    <Label htmlFor="pwa-name">Nome do app</Label>
                    <Input
                      id="pwa-name"
                      value={pwaName}
                      onChange={(e) => setPwaName(e.target.value)}
                      placeholder={name || "Lumi Membros"}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pwa-short-name">
                      Nome curto
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        {pwaShortName.length}/12
                      </span>
                    </Label>
                    <Input
                      id="pwa-short-name"
                      value={pwaShortName}
                      onChange={(e) => setPwaShortName(e.target.value.slice(0, 12))}
                      placeholder={(name || "Lumi").slice(0, 12)}
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      Exibido abaixo do ícone na homescreen. Max 12 caracteres.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Ícone PWA</Label>
                    <div className="flex gap-1.5 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={pwaIconMode === "url" ? "default" : "outline"}
                        onClick={() => setPwaIconMode("url")}
                        className="h-7 text-xs gap-1.5"
                      >
                        <LinkIcon className="h-3 w-3" />
                        URL
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={pwaIconMode === "upload" ? "default" : "outline"}
                        onClick={() => setPwaIconMode("upload")}
                        className="h-7 text-xs gap-1.5"
                      >
                        <Upload className="h-3 w-3" />
                        Upload
                      </Button>
                    </div>
                    {pwaIconMode === "url" ? (
                      <div className="space-y-1.5">
                        <Input
                          value={pwaIconUrl}
                          onChange={(e) => setPwaIconUrl(e.target.value)}
                          placeholder="https://..."
                        />
                        {pwaIconUrl && (
                          <img
                            src={pwaIconUrl}
                            alt="PWA icon preview"
                            className="h-16 w-16 object-contain rounded-lg border bg-muted p-1"
                          />
                        )}
                      </div>
                    ) : (
                      <ImageUpload
                        value={pwaIconUrl}
                        onChange={setPwaIconUrl}
                        bucket="platform"
                        aspect="square"
                        imagePreset="avatar"
                        placeholder="Envie o ícone do PWA"
                        maxSizeMB={2}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      512x512px recomendado. PNG com fundo transparente ou colorido.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ColorField
                      label="Cor do tema"
                      value={pwaThemeColor}
                      onChange={setPwaThemeColor}
                    />
                    <ColorField
                      label="Cor de fundo"
                      value={pwaBackgroundColor}
                      onChange={setPwaBackgroundColor}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cor do tema: barra do sistema no celular. Cor de fundo: splash screen ao abrir.
                  </p>
                </div>
              )}
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

        {/* ========================== SCRIPTS ========================== */}
        <TabsContent value="scripts" className="space-y-6">
          <ScriptsTabContent
            scripts={scripts}
            onToggle={toggleScriptInjection}
            onEdit={(s) => { setEditingScript(s); setScriptDialogOpen(true); }}
            onDelete={setDeleteScriptId}
            onAdd={() => { setEditingScript(null); setScriptDialogOpen(true); }}
          />

          <ScriptDialog
            open={scriptDialogOpen}
            onOpenChange={setScriptDialogOpen}
            script={editingScript}
            onSave={async (data) => {
              if (editingScript) {
                await updateScriptInjection(editingScript.id, data);
                toast.success("Script atualizado.");
              } else {
                await createScriptInjection(data as ScriptInjectionInsert);
                toast.success("Script criado.");
              }
              setEditingScript(null);
              setScriptDialogOpen(false);
            }}
          />

          <AlertDialog
            open={!!deleteScriptId}
            onOpenChange={(open) => { if (!open) setDeleteScriptId(null); }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover script?</AlertDialogTitle>
                <AlertDialogDescription>
                  O script será removido permanentemente e não será mais injetado nas páginas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  if (deleteScriptId) {
                    await deleteScriptInjection(deleteScriptId);
                    toast.success("Script removido.");
                    setDeleteScriptId(null);
                  }
                }}>
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* ========================== MENU ========================== */}
        <TabsContent value="menu" className="space-y-6">
          <MenuTabContent
            studentItems={studentMenuItems}
            adminItems={adminMenuItems}
            onAddStudent={() => { setEditingMenuItem(null); setMenuDialogArea("student"); setMenuDialogOpen(true); }}
            onAddAdmin={() => { setEditingMenuItem(null); setMenuDialogArea("admin"); setMenuDialogOpen(true); }}
            onEditStudent={(item) => { setEditingMenuItem(item); setMenuDialogArea("student"); setMenuDialogOpen(true); }}
            onEditAdmin={(item) => { setEditingMenuItem(item); setMenuDialogArea("admin"); setMenuDialogOpen(true); }}
            onDeleteStudent={(id) => setDeleteMenuItemId(id)}
            onDeleteAdmin={(id) => setDeleteMenuItemId(id)}
            onToggleStudent={toggleStudentMenuVisibility}
            onToggleAdmin={toggleAdminMenuVisibility}
            onReorderStudent={reorderStudentMenuItems}
            onReorderAdmin={reorderAdminMenuItems}
          />

          <MenuItemDialog
            open={menuDialogOpen}
            onOpenChange={setMenuDialogOpen}
            item={editingMenuItem}
            area={menuDialogArea}
            onSave={async (data) => {
              const create = menuDialogArea === "student" ? createStudentMenuItem : createAdminMenuItem;
              const update = menuDialogArea === "student" ? updateStudentMenuItem : updateAdminMenuItem;
              if (editingMenuItem) {
                await update(editingMenuItem.id, data);
                toast.success("Item de menu atualizado.");
              } else {
                await create(data as NavMenuItemInsert);
                toast.success("Item de menu criado.");
              }
              setEditingMenuItem(null);
              setMenuDialogOpen(false);
            }}
          />

          <AlertDialog
            open={!!deleteMenuItemId}
            onOpenChange={(open) => { if (!open) setDeleteMenuItemId(null); }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover item de menu?</AlertDialogTitle>
                <AlertDialogDescription>
                  O item será removido permanentemente do menu de navegação.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  if (deleteMenuItemId) {
                    const inStudent = studentMenuItems.find((i) => i.id === deleteMenuItemId);
                    if (inStudent) await deleteStudentMenuItem(deleteMenuItemId);
                    else await deleteAdminMenuItem(deleteMenuItemId);
                    toast.success("Item removido.");
                    setDeleteMenuItemId(null);
                  }
                }}>
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

// ---------------------------------------------------------------------------
// Scripts Tab Components
// ---------------------------------------------------------------------------
const POSITION_LABELS: Record<string, { label: string; color: string }> = {
  head: { label: "HEAD", color: "bg-blue-500/15 text-blue-500" },
  body_start: { label: "BODY INÍCIO", color: "bg-amber-500/15 text-amber-500" },
  body_end: { label: "BODY FIM", color: "bg-purple-500/15 text-purple-500" },
};

const SCOPE_LABELS: Record<string, string> = {
  all: "Todas as páginas",
  admin_only: "Só Admin",
  student_only: "Só Alunos",
  specific_pages: "Páginas específicas",
};

function ScriptsTabContent({
  scripts,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: {
  scripts: ScriptInjectionRow[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (s: ScriptInjectionRow) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Injeção de Scripts</h2>
          <p className="text-sm text-muted-foreground">
            Adicione pixels de rastreamento, meta tags, scripts externos e outros códigos.
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Adicionar Script
        </Button>
      </div>

      {scripts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Code className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum script cadastrado. Clique em "Adicionar Script" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => {
            const pos = POSITION_LABELS[script.position] ?? POSITION_LABELS.head;
            return (
              <Card key={script.id} className="border-border/50 hover:border-border transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm">{script.name}</p>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${pos.color}`}>
                          {pos.label}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {SCOPE_LABELS[script.apply_to] ?? script.apply_to}
                        </Badge>
                      </div>
                      {script.description && (
                        <p className="text-xs text-muted-foreground truncate">{script.description}</p>
                      )}
                      {script.apply_to === "specific_pages" && script.specific_pages?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Páginas: {script.specific_pages.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={script.enabled}
                        onCheckedChange={(v) => onToggle(script.id, v)}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(script)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(script.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function ScriptDialog({
  open,
  onOpenChange,
  script,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  script: ScriptInjectionRow | null;
  onSave: (data: ScriptInjectionInsert) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState<string>("head");
  const [applyTo, setApplyTo] = useState<string>("all");
  const [specificPages, setSpecificPages] = useState("");
  const [content, setContent] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(script?.name ?? "");
      setDescription(script?.description ?? "");
      setPosition(script?.position ?? "head");
      setApplyTo(script?.apply_to ?? "all");
      setSpecificPages(script?.specific_pages?.join(", ") ?? "");
      setContent(script?.content ?? "");
      setEnabled(script?.enabled ?? true);
    }
  }, [open, script]);

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim() || !position) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        position,
        apply_to: applyTo,
        specific_pages: applyTo === "specific_pages"
          ? specificPages.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        content,
        enabled,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{script ? "Editar Script" : "Adicionar Script"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Google Analytics" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do script"
              className="h-16 resize-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Posição *</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="head">{"<head>"}</SelectItem>
                  <SelectItem value="body_start">{"<body>"} início</SelectItem>
                  <SelectItem value="body_end">{"<body>"} fim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Aplicar em *</Label>
              <Select value={applyTo} onValueChange={setApplyTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as páginas</SelectItem>
                  <SelectItem value="admin_only">Apenas área admin</SelectItem>
                  <SelectItem value="student_only">Apenas área aluno</SelectItem>
                  <SelectItem value="specific_pages">Páginas específicas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {applyTo === "specific_pages" && (
            <div className="space-y-1.5">
              <Label>Páginas (separadas por vírgula)</Label>
              <Input
                value={specificPages}
                onChange={(e) => setSpecificPages(e.target.value)}
                placeholder="/cursos, /ranking, /comunidade"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Conteúdo *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"<!-- Cole aqui tags <script>, <meta>, pixels de rastreamento, etc. -->\n<script>\n  // Ex: Google Analytics, Facebook Pixel\n</script>"}
              className="min-h-[200px] font-mono text-xs resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Cole aqui tags {"<script>"}, {"<meta>"}, pixels de rastreamento, etc.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label className="text-sm">Ativar imediatamente</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim() || !content.trim()}>
            {saving ? "Salvando..." : script ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Menu Tab Components
// ---------------------------------------------------------------------------
function MenuTabContent({
  studentItems,
  adminItems,
  onAddStudent,
  onAddAdmin,
  onEditStudent,
  onEditAdmin,
  onDeleteStudent,
  onDeleteAdmin,
  onToggleStudent,
  onToggleAdmin,
  onReorderStudent,
  onReorderAdmin,
}: {
  studentItems: NavMenuItemRow[];
  adminItems: NavMenuItemRow[];
  onAddStudent: () => void;
  onAddAdmin: () => void;
  onEditStudent: (item: NavMenuItemRow) => void;
  onEditAdmin: (item: NavMenuItemRow) => void;
  onDeleteStudent: (id: string) => void;
  onDeleteAdmin: (id: string) => void;
  onToggleStudent: (id: string, visible: boolean) => void;
  onToggleAdmin: (id: string, visible: boolean) => void;
  onReorderStudent: (items: { id: string; sort_order: number }[]) => void;
  onReorderAdmin: (items: { id: string; sort_order: number }[]) => void;
}) {
  const [menuTab, setMenuTab] = useState<"student" | "admin">("student");

  return (
    <>
      <div>
        <h2 className="text-base font-semibold">Navegação</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os itens de menu exibidos para alunos e administradores.
        </p>
      </div>

      <Tabs value={menuTab} onValueChange={(v) => setMenuTab(v as "student" | "admin")}>
        <TabsList>
          <TabsTrigger value="student">Menu do Aluno</TabsTrigger>
          <TabsTrigger value="admin">Menu Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={onAddStudent}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar item de menu
            </Button>
          </div>
          <MenuItemList
            items={studentItems}
            onEdit={onEditStudent}
            onDelete={onDeleteStudent}
            onToggle={onToggleStudent}
            onReorder={onReorderStudent}
          />
        </TabsContent>

        <TabsContent value="admin" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={onAddAdmin}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar item de menu
            </Button>
          </div>
          <MenuItemList
            items={adminItems}
            onEdit={onEditAdmin}
            onDelete={onDeleteAdmin}
            onToggle={onToggleAdmin}
            onReorder={onReorderAdmin}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function MenuItemList({
  items,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
}: {
  items: NavMenuItemRow[];
  onEdit: (item: NavMenuItemRow) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, visible: boolean) => void;
  onReorder: (items: { id: string; sort_order: number }[]) => void;
}) {
  const moveItem = (index: number, direction: -1 | 1) => {
    const newItems = [...items];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    onReorder(newItems.map((item, i) => ({ id: item.id, sort_order: i + 1 })));
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MenuIcon className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum item de menu. Clique em "Adicionar item de menu" para criar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <Card key={item.id} className="border-border/50 hover:border-border transition-all">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{item.label}</p>
                  {item.icon && (
                    <span className="text-xs text-muted-foreground">({item.icon})</span>
                  )}
                  {item.is_external ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <ExternalLink className="h-2.5 w-2.5" />
                      EXTERNO
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">INTERNO</Badge>
                  )}
                  {item.is_default && (
                    <Badge className="text-[10px] bg-primary/15 text-primary hover:bg-primary/20">DEFAULT</Badge>
                  )}
                  {!item.visible && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                      <EyeOff className="h-2.5 w-2.5" />
                      Oculto
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.url}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={item.visible}
                  onCheckedChange={(v) => onToggle(item.id, v)}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={item.is_default}
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MenuItemDialog({
  open,
  onOpenChange,
  item,
  area,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: NavMenuItemRow | null;
  area: "student" | "admin";
  onSave: (data: NavMenuItemInsert) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState<string>("_self");
  const [icon, setIcon] = useState("");
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(item?.label ?? "");
      setUrl(item?.url ?? "");
      setTarget(item?.target ?? "_self");
      setIcon(item?.icon ?? "");
      setVisible(item?.visible ?? true);
    }
  }, [open, item]);

  const handleSubmit = async () => {
    if (!label.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const isExternal = url.trim().startsWith("http");
      await onSave({
        label: label.trim(),
        url: url.trim(),
        target,
        icon: icon.trim() || null,
        visible,
        area,
        is_external: isExternal,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? "Editar Item de Menu" : "Adicionar Item de Menu"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Label *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Dashboard" />
          </div>
          <div className="space-y-1.5">
            <Label>URL *</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/cursos ou https://exemplo.com"
            />
            <p className="text-xs text-muted-foreground">
              Rota interna (/cursos) ou URL externa (https://...)
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Abrir em</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Mesma aba</SelectItem>
                  <SelectItem value="_blank">Nova aba</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ícone (Lucide)</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Ex: Star, BookOpen"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={visible} onCheckedChange={setVisible} />
            <Label className="text-sm">Visível</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !label.trim() || !url.trim()}>
            {saving ? "Salvando..." : item ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
