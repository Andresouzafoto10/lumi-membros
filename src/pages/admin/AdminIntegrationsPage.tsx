import { useState, useMemo, useCallback } from "react";
import { Plug2, Copy, Check, Plus, Trash2, Pencil, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useWebhookIntegrations, PLATFORM_SLUGS } from "@/hooks/useWebhookIntegrations";
import type { WebhookPlatform, PlatformSlug } from "@/hooks/useWebhookIntegrations";
import { useClasses } from "@/hooks/useClasses";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const WEBHOOK_BASE = `${SUPABASE_URL}/functions/v1/webhook-intake`;

const PLATFORM_LOGOS: Record<string, string> = {
  ticto: "🟢",
  hotmart: "🔥",
  eduzz: "🟣",
  monetizze: "🟡",
};

const PLATFORM_LABELS: Record<string, string> = {
  ticto: "Ticto",
  hotmart: "Hotmart",
  eduzz: "Eduzz",
  monetizze: "Monetizze",
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  success: { label: "Sucesso", variant: "default" },
  error: { label: "Erro", variant: "destructive" },
  duplicate: { label: "Duplicado", variant: "secondary" },
  pending: { label: "Pendente", variant: "outline" },
};

function webhookUrlFor(p: WebhookPlatform): string {
  return `${WEBHOOK_BASE}?token=${p.webhookToken}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminIntegrationsPage() {
  const {
    platforms,
    mappings,
    logs,
    loading,
    updatePlatform,
    createPlatform,
    deletePlatform,
    addMapping,
    updateMapping,
    deleteMapping,
  } = useWebhookIntegrations();
  const { classes } = useClasses();
  const [tab, setTab] = useState("plataformas");

  // Platform config (edit) dialog
  const [configPlatform, setConfigPlatform] = useState<WebhookPlatform | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  // New integration dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newSlug, setNewSlug] = useState<PlatformSlug | "">("");
  const [newLabel, setNewLabel] = useState("");

  // Delete platform confirm
  const [deletePlatformId, setDeletePlatformId] = useState<string | null>(null);

  // Mapping dialog (add or edit)
  const [mappingDialog, setMappingDialog] = useState<{ platformId: string; editingId?: string } | null>(null);
  const [mappingProductId, setMappingProductId] = useState("");
  const [mappingClassIds, setMappingClassIds] = useState<string[]>([]);

  // Delete mapping confirm
  const [deleteMappingId, setDeleteMappingId] = useState<string | null>(null);

  // Copy URL feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyUrl = useCallback((platform: WebhookPlatform) => {
    navigator.clipboard.writeText(webhookUrlFor(platform));
    setCopiedId(platform.id);
    toast.success("URL copiada!");
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // --- Handlers ---

  const handleSaveConfig = async () => {
    if (!configPlatform) return;
    try {
      await updatePlatform(configPlatform.id, {
        label: labelInput.trim() || null,
        name: labelInput.trim() || configPlatform.name,
        secret_key: secretInput || null,
      });
      toast.success("Configuração salva");
      setConfigPlatform(null);
    } catch {
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleCreate = async () => {
    if (!newSlug || !newLabel.trim()) return;
    try {
      await createPlatform({ slug: newSlug as PlatformSlug, label: newLabel.trim() });
      toast.success("Integração criada");
      setCreateOpen(false);
      setNewSlug("");
      setNewLabel("");
    } catch {
      toast.error("Erro ao criar integração");
    }
  };

  const handleTogglePlatform = async (platform: WebhookPlatform) => {
    try {
      await updatePlatform(platform.id, { active: !platform.active });
      toast.success(platform.active ? "Integração desativada" : "Integração ativada");
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleDeletePlatform = async () => {
    if (!deletePlatformId) return;
    try {
      await deletePlatform(deletePlatformId);
      toast.success("Integração removida");
    } catch {
      toast.error("Erro ao remover integração");
    }
    setDeletePlatformId(null);
  };

  const handleSaveMapping = async () => {
    if (!mappingDialog || !mappingProductId.trim() || mappingClassIds.length === 0) return;
    try {
      if (mappingDialog.editingId) {
        await updateMapping(mappingDialog.editingId, {
          external_product_id: mappingProductId.trim(),
          class_ids: mappingClassIds,
        });
        toast.success("Mapeamento atualizado");
      } else {
        await addMapping(mappingDialog.platformId, mappingProductId.trim(), mappingClassIds);
        toast.success("Mapeamento criado");
      }
      setMappingDialog(null);
      setMappingProductId("");
      setMappingClassIds([]);
    } catch {
      toast.error("Erro ao salvar mapeamento");
    }
  };

  const handleDeleteMapping = async () => {
    if (!deleteMappingId) return;
    try {
      await deleteMapping(deleteMappingId);
      toast.success("Mapeamento removido");
    } catch {
      toast.error("Erro ao remover");
    }
    setDeleteMappingId(null);
  };

  // --- Derived ---
  const classMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of classes) m[c.id] = c.name;
    return m;
  }, [classes]);

  const platformMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of platforms) m[p.id] = p.label ?? p.name;
    return m;
  }, [platforms]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <Breadcrumb
        items={[
          { label: "Configurações", to: "/admin/configuracoes" },
          { label: "Integrações" },
        ]}
      />

      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Plug2 className="h-5 w-5 text-primary" />
          Integrações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte plataformas de vendas para matrícula automática via webhook. Você pode registrar múltiplas contas da mesma plataforma.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="plataformas">Integrações</TabsTrigger>
          <TabsTrigger value="mapeamentos">Mapeamentos</TabsTrigger>
          <TabsTrigger value="historico">
            Histórico
            {logs.filter((l) => l.status === "error").length > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
                {logs.filter((l) => l.status === "error").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---- INTEGRAÇÕES ---- */}
        <TabsContent value="plataformas" className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setNewSlug("");
                setNewLabel("");
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Nova integração
            </Button>
          </div>

          {platforms.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Plug2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma integração cadastrada. Clique em "Nova integração" para conectar uma plataforma.
                </p>
              </CardContent>
            </Card>
          )}

          {platforms.map((p) => (
            <Card key={p.id} className="border-border/50 hover:border-border transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{PLATFORM_LOGOS[p.slug] ?? "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{p.label ?? p.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{PLATFORM_LABELS[p.slug] ?? p.slug}</Badge>
                      <Badge variant={p.active ? "default" : "outline"} className="text-[10px]">
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded truncate max-w-[400px]">
                        {webhookUrlFor(p)}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => copyUrl(p)}
                      >
                        {copiedId === p.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    {p.lastEventAt && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Último evento: {format(new Date(p.lastEventAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={p.active} onCheckedChange={() => handleTogglePlatform(p)} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConfigPlatform(p);
                        setLabelInput(p.label ?? p.name);
                        setSecretInput(p.secretKey ?? "");
                        setShowSecret(false);
                      }}
                    >
                      Configurar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={() => setDeletePlatformId(p.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ---- MAPEAMENTOS ---- */}
        <TabsContent value="mapeamentos" className="space-y-6">
          {platforms.filter((p) => p.active).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Plug2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ative pelo menos uma integração para configurar mapeamentos.
                </p>
              </CardContent>
            </Card>
          )}

          {platforms.filter((p) => p.active).map((p) => {
            const pMappings = mappings.filter((m) => m.platformId === p.id);
            return (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{PLATFORM_LOGOS[p.slug] ?? "📦"}</span>
                      {p.label ?? p.name}
                      <Badge variant="outline" className="text-[10px]">{pMappings.length} mapeamento(s)</Badge>
                    </CardTitle>
                    <Button size="sm" onClick={() => { setMappingDialog({ platformId: p.id }); setMappingProductId(""); setMappingClassIds([]); }}>
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {pMappings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum mapeamento. Clique em "Adicionar" para vincular um produto a uma ou mais turmas.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pMappings.map((m) => {
                        const classNames = m.classIds.map((cid) => classMap[cid] ?? "Turma removida");
                        return (
                          <div key={m.id} className="flex items-start gap-3 px-3 py-2 rounded-md bg-muted/50">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 flex-wrap">
                                <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border shrink-0">{m.externalProductId}</span>
                                <span className="text-muted-foreground shrink-0">→</span>
                                <div className="flex flex-wrap gap-1">
                                  {classNames.length === 0 ? (
                                    <span className="text-xs text-muted-foreground italic">Sem turmas</span>
                                  ) : (
                                    classNames.map((n, i) => (
                                      <Badge key={`${m.id}-c-${i}`} variant="secondary" className="text-[11px]">
                                        {n}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              onClick={() => {
                                setMappingDialog({ platformId: p.id, editingId: m.id });
                                setMappingProductId(m.externalProductId);
                                setMappingClassIds(m.classIds);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setDeleteMappingId(m.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ---- HISTÓRICO ---- */}
        <TabsContent value="historico" className="space-y-3">
          {logs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ExternalLink className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum evento de webhook recebido ainda.
                </p>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => {
              const sb = STATUS_BADGE[log.status] ?? STATUS_BADGE.pending;
              return (
                <Card key={log.id} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant={sb.variant} className="text-[10px] shrink-0">{sb.label}</Badge>
                      {log.eventType && (
                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                          {log.eventType}
                        </Badge>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <span className="font-medium">{log.studentEmail ?? "—"}</span>
                          {log.studentName && <span className="text-muted-foreground">({log.studentName})</span>}
                          {log.classId && (
                            <>
                              <span className="text-muted-foreground">→</span>
                              <span>{classMap[log.classId] ?? "—"}</span>
                            </>
                          )}
                        </div>
                        {log.errorMessage && (
                          <p className="text-xs text-destructive mt-0.5 truncate">{log.errorMessage}</p>
                        )}
                        {log.transactionId && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                            tx: {log.transactionId}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-muted-foreground">
                          {log.platformId ? platformMap[log.platformId] ?? "—" : "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* ---- CREATE INTEGRATION DIALOG ---- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Integração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={newSlug} onValueChange={(v) => setNewSlug(v as PlatformSlug)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_SLUGS.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="mr-2">{PLATFORM_LOGOS[s]}</span>
                      {PLATFORM_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rótulo</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Hotmart Principal"
              />
              <p className="text-xs text-muted-foreground">
                Nome amigável para distinguir esta integração das outras.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newSlug || !newLabel.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- CONFIG (EDIT) DIALOG ---- */}
      <Dialog open={!!configPlatform} onOpenChange={() => setConfigPlatform(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar {configPlatform?.label ?? configPlatform?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Rótulo</Label>
              <Input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Ex: Hotmart Principal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL do Webhook</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={configPlatform ? webhookUrlFor(configPlatform) : ""}
                  className="font-mono text-xs"
                />
                <Button size="icon" variant="outline" className="shrink-0" onClick={() => configPlatform && copyUrl(configPlatform)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole esta URL no painel da {PLATFORM_LABELS[configPlatform?.slug ?? ""] ?? "plataforma"} como webhook de notificação de compra.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Chave Secreta (HMAC)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder="Cole a chave secreta da plataforma"
                  className="font-mono text-xs"
                />
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Encontre esta chave no painel da plataforma em Configurações → Webhooks → Token/Secret.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigPlatform(null)}>Cancelar</Button>
            <Button onClick={handleSaveConfig}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- MAPPING DIALOG (add/edit) ---- */}
      <Dialog open={!!mappingDialog} onOpenChange={() => setMappingDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mappingDialog?.editingId ? "Editar Mapeamento" : "Adicionar Mapeamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>ID do Produto (na plataforma)</Label>
              <Input
                value={mappingProductId}
                onChange={(e) => setMappingProductId(e.target.value)}
                placeholder="Ex: 7891 ou prod_abc123"
              />
              <p className="text-xs text-muted-foreground">
                Identificador do produto/oferta que vem no payload do webhook.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Turmas liberadas na compra</Label>
              <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-1">
                {classes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhuma turma cadastrada. Crie uma turma primeiro.
                  </p>
                )}
                {classes.map((c) => {
                  const checked = mappingClassIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setMappingClassIds((prev) =>
                            v === true
                              ? [...prev, c.id]
                              : prev.filter((x) => x !== c.id)
                          );
                        }}
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione uma ou mais turmas. O aluno será matriculado em todas ao receber o webhook de compra aprovada.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialog(null)}>Cancelar</Button>
            <Button
              onClick={handleSaveMapping}
              disabled={!mappingProductId.trim() || mappingClassIds.length === 0}
            >
              {mappingDialog?.editingId ? "Salvar" : "Criar Mapeamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- DELETE MAPPING CONFIRM ---- */}
      <AlertDialog open={!!deleteMappingId} onOpenChange={() => setDeleteMappingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover mapeamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Novos webhooks para este produto não criarão matrículas automaticamente. Matrículas existentes não são afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMapping}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- DELETE PLATFORM CONFIRM ---- */}
      <AlertDialog open={!!deletePlatformId} onOpenChange={() => setDeletePlatformId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover integração?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os mapeamentos associados serão removidos. A URL do webhook deixará de funcionar.
              Matrículas já efetivadas não são afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlatform}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
