import { useState, useCallback } from "react";
import {
  Mail,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  Clock,
  Download,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  useEmailAutomations,
  useEmailLogs,
  useSchedulerTrigger,
} from "@/hooks/useEmailAutomations";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  onboarding: { label: "Onboarding", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  engagement: { label: "Engajamento", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  community: { label: "Comunidade", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  content: { label: "Conteudo", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  gamification: { label: "Gamificacao", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  sent: { label: "Enviado", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  failed: { label: "Falhou", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  skipped: { label: "Ignorado", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

// ---------------------------------------------------------------------------
// Tab 1: Automations
// ---------------------------------------------------------------------------

function AutomationsTab() {
  const { automations, automationsLoading, toggleAutomation } = useEmailAutomations();

  // Group by category
  const grouped = automations.reduce<Record<string, typeof automations>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  if (automationsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-card/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => {
        const config = CATEGORY_CONFIG[category] ?? { label: category, color: "bg-zinc-500/10 text-zinc-400" };
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={cn("text-xs", config.color)}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{items.length} automacao{items.length > 1 ? "es" : ""}</span>
            </div>
            <div className="space-y-2">
              {items.map((automation) => (
                <Card key={automation.id} className="border-border/50">
                  <CardContent className="flex items-center justify-between py-4 px-5">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-foreground truncate">{automation.name}</p>
                        {automation.delay_hours > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50 text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {automation.delay_hours}h delay
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{automation.description}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1 truncate">
                        Assunto: {automation.subject_template}
                      </p>
                    </div>
                    <Switch
                      checked={automation.is_active}
                      onCheckedChange={(checked) => {
                        toggleAutomation.mutate(
                          { id: automation.id, isActive: checked },
                          {
                            onSuccess: () => {
                              toast.success(
                                checked ? "Automacao ativada" : "Automacao desativada"
                              );
                            },
                            onError: () => {
                              toast.error("Erro ao atualizar automacao");
                            },
                          }
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: History
// ---------------------------------------------------------------------------

function HistoryTab() {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const filters = {
    type: filterType && filterType !== "all" ? filterType : undefined,
    status: filterStatus && filterStatus !== "all" ? filterStatus : undefined,
  };

  const { data, isLoading } = useEmailLogs(page, filters);

  const exportCsv = useCallback(() => {
    if (!data?.logs.length) return;
    const headers = ["Data", "Destinatario", "Email", "Tipo", "Assunto", "Status"];
    const rows = data.logs.map((log) => [
      log.sent_at ? format(new Date(log.sent_at), "dd/MM/yyyy HH:mm") : "",
      log.recipient_name ?? "",
      log.recipient_email ?? "",
      log.type,
      log.subject ?? "",
      log.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="welcome">Boas-vindas</SelectItem>
            <SelectItem value="comment">Comentario</SelectItem>
            <SelectItem value="like">Curtida</SelectItem>
            <SelectItem value="follow">Seguiu</SelectItem>
            <SelectItem value="mention_community">Mencao</SelectItem>
            <SelectItem value="new_course">Novo curso</SelectItem>
            <SelectItem value="new_lesson">Nova aula</SelectItem>
            <SelectItem value="certificate_earned">Certificado</SelectItem>
            <SelectItem value="mission_complete">Missao</SelectItem>
            <SelectItem value="post_reply">Resposta</SelectItem>
            <SelectItem value="digest">Digest</SelectItem>
            <SelectItem value="resend_access">Reenvio acesso</SelectItem>
            <SelectItem value="access_reminder_7d">Lembrete 7d</SelectItem>
            <SelectItem value="community_inactive_30d">Inatividade 30d</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Todos status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="skipped">Ignorado</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto">
          <Download className="w-4 h-4 mr-1.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Destinatario</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assunto</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 bg-muted/30 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : !data?.logs.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => {
                  const statusCfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.skipped;
                  return (
                    <tr key={log.id} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {log.sent_at ? format(new Date(log.sent_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm truncate max-w-[180px]">{log.recipient_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{log.recipient_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] border-border/50">
                          {log.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">
                        {log.subject ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-[10px]", statusCfg.color)}>
                          {statusCfg.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {data.total} registro{data.total !== 1 ? "s" : ""} — pagina {page} de {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Resend Access
// ---------------------------------------------------------------------------

function ResendAccessTab() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; email: string; display_name: string; updated_at: string }>>([]);
  const [selected, setSelected] = useState<typeof results[0] | null>(null);
  const [sending, setSending] = useState(false);
  const { resendAccessEmail } = useEmailNotifications();

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, name, display_name, email, updated_at")
      .or(`name.ilike.%${search}%,email.ilike.%${search}%,display_name.ilike.%${search}%`)
      .eq("role", "student")
      .limit(10);

    setResults((data ?? []) as typeof results);
    setSelected(null);
  }, [search]);

  const handleResend = useCallback(async () => {
    if (!selected) return;
    setSending(true);
    try {
      await resendAccessEmail(selected.id);
      toast.success("Email de acesso reenviado com sucesso!");
    } catch {
      toast.error("Erro ao reenviar email de acesso");
    } finally {
      setSending(false);
    }
  }, [selected, resendAccessEmail]);

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno por nome ou email..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} variant="outline" size="default">
          Buscar
        </Button>
      </div>

      {results.length > 0 && !selected && (
        <Card className="border-border/50">
          <CardContent className="p-0">
            {results.map((r) => (
              <button
                key={r.id}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0 text-left"
                onClick={() => setSelected(r)}
              >
                <div>
                  <p className="text-sm font-medium">{(r.display_name || r.name)}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </div>
                <Send className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {selected && (
        <Card className="border-border/50">
          <CardContent className="py-5">
            <div className="mb-4">
              <p className="font-medium">{selected.display_name || selected.name}</p>
              <p className="text-sm text-muted-foreground">{selected.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ultimo acesso: {selected.updated_at ? format(new Date(selected.updated_at), "dd/MM/yyyy HH:mm") : "N/A"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleResend} disabled={sending}>
                <Send className="w-4 h-4 mr-1.5" />
                {sending ? "Enviando..." : "Reenviar email de acesso"}
              </Button>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4: Settings
// ---------------------------------------------------------------------------

function SettingsTab() {
  const { settings, updateSettings } = usePlatformSettings();
  const schedulerTrigger = useSchedulerTrigger();
  const [schedulerResult, setSchedulerResult] = useState<string | null>(null);

  const handleToggleGlobal = useCallback(
    async (enabled: boolean) => {
      try {
        await updateSettings({ emailNotificationsEnabled: enabled });
        toast.success(enabled ? "Notificacoes por email ativadas" : "Notificacoes por email desativadas");
      } catch {
        toast.error("Erro ao atualizar configuracao");
      }
    },
    [updateSettings]
  );

  const handleTriggerScheduler = useCallback(async () => {
    try {
      const result = await schedulerTrigger.mutateAsync();
      setSchedulerResult(
        `Processados: ${result.processed} | Enviados: ${result.sent} | Ignorados: ${result.skipped}`
      );
      toast.success("Scheduler executado com sucesso");
    } catch {
      toast.error("Erro ao executar scheduler");
      setSchedulerResult("Erro ao executar");
    }
  }, [schedulerTrigger]);

  return (
    <div className="space-y-6 max-w-xl">
      {/* Sender */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Remetente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-mono">enviar@membrosmaster.com.br</p>
              <p className="text-xs text-muted-foreground">Configurado via Resend</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global toggle */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Notificacoes globais por email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Ativar emails automaticos</p>
              <p className="text-xs text-muted-foreground">
                Se desativado, NENHUM email automatico sera enviado
              </p>
            </div>
            <Switch
              checked={settings?.emailNotificationsEnabled !== false}
              onCheckedChange={handleToggleGlobal}
            />
          </div>
        </CardContent>
      </Card>

      {/* Manual scheduler trigger */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Disparar scheduler manualmente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Executa o scheduler de emails (lembrete de inatividade 7d, inatividade comunidade 30d).
            Util para testar ou forcar envio.
          </p>
          <Button
            variant="outline"
            onClick={handleTriggerScheduler}
            disabled={schedulerTrigger.isPending}
          >
            <Play className="w-4 h-4 mr-1.5" />
            {schedulerTrigger.isPending ? "Executando..." : "Disparar agora"}
          </Button>
          {schedulerResult && (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
              {schedulerResult}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminEmailsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Breadcrumb
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Emails" },
        ]}
      />

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Email Marketing & Automacoes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie emails automaticos, historico de envios e configuracoes
          </p>
        </div>
      </div>

      <Tabs defaultValue="automations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="automations">Automacoes</TabsTrigger>
          <TabsTrigger value="history">Historico</TabsTrigger>
          <TabsTrigger value="resend">Reenviar Acesso</TabsTrigger>
          <TabsTrigger value="settings">Configuracoes</TabsTrigger>
        </TabsList>

        <TabsContent value="automations">
          <AutomationsTab />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>

        <TabsContent value="resend">
          <ResendAccessTab />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
