import { useState } from "react";
import {
  Link2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useInviteLinks } from "@/hooks/useInviteLinks";
import { useClasses } from "@/hooks/useClasses";
import { useAuth } from "@/contexts/AuthContext";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/courses/EmptyState";
import type { InviteLink } from "@/types/student";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

function getInviteUrl(slug: string) {
  return `${APP_URL}/convite/${slug}`;
}

function getStatus(link: InviteLink): "active" | "inactive" | "expired" {
  if (!link.is_active) return "inactive";
  if (link.expires_at && isPast(parseISO(link.expires_at))) return "expired";
  return "active";
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "secondary" },
  expired: { label: "Expirado", variant: "outline" },
};

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

function InviteLinkDialog({
  open,
  onClose,
  link,
  onSave,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  link: InviteLink | null;
  onSave: (data: {
    name: string;
    class_id: string | null;
    max_uses: number | null;
    expires_at: string | null;
  }) => Promise<any>;
  classes: { id: string; name: string }[];
}) {
  const [name, setName] = useState(link?.name ?? "");
  const [classId, setClassId] = useState(link?.class_id ?? "none");
  const [maxUses, setMaxUses] = useState(
    link?.max_uses != null ? String(link.max_uses) : ""
  );
  const [expiresAt, setExpiresAt] = useState(
    link?.expires_at ? link.expires_at.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const isEdit = !!link;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = await onSave({
        name: name.trim(),
        class_id: classId === "none" ? null : classId,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      if (!isEdit && result?.slug) {
        setCreatedSlug(result.slug);
      } else {
        onClose();
      }
      toast.success(isEdit ? "Link atualizado!" : "Link criado!");
    } catch {
      toast.error("Erro ao salvar link.");
    } finally {
      setSaving(false);
    }
  }

  function handleCopyCreatedUrl() {
    if (!createdSlug) return;
    navigator.clipboard.writeText(getInviteUrl(createdSlug));
    toast.success("Link copiado!");
  }

  if (createdSlug) {
    return (
      <Dialog open={open} onOpenChange={() => { setCreatedSlug(null); onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link criado com sucesso!</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">URL do convite</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={getInviteUrl(createdSlug)}
                className="text-sm bg-muted/30"
              />
              <Button size="icon" variant="outline" onClick={handleCopyCreatedUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => { setCreatedSlug(null); onClose(); }}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar link" : "Novo link de convite"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Nome do link</Label>
            <Input
              id="invite-name"
              placeholder="Ex: Black Friday 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-class">Turma vinculada</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="invite-class">
                <SelectValue placeholder="Nenhuma turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma turma</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-max-uses">Limite de usos</Label>
            <Input
              id="invite-max-uses"
              type="number"
              min={1}
              placeholder="Ilimitado"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-expires">Data de expiração</Label>
            <Input
              id="invite-expires"
              type="date"
              placeholder="Sem expiração"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Salvando…" : "Criar"}</>
              ) : isEdit ? (
                "Salvar"
              ) : (
                "Criar link"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function InviteLinksPage() {
  const { inviteLinks, isLoading, createInviteLink, updateInviteLink, deleteInviteLink, toggleInviteLinkActive } =
    useInviteLinks();
  const { classes } = useClasses();
  const { user } = useAuth();

  const activeClasses = classes.filter((c) => c.status === "active");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<InviteLink | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InviteLink | null>(null);

  function handleNew() {
    setEditingLink(null);
    setDialogOpen(true);
  }

  function handleEdit(link: InviteLink) {
    setEditingLink(link);
    setDialogOpen(true);
  }

  async function handleSave(data: {
    name: string;
    class_id: string | null;
    max_uses: number | null;
    expires_at: string | null;
  }) {
    if (editingLink) {
      await updateInviteLink(editingLink.id, data);
      return null;
    }
    return await createInviteLink({ ...data, created_by: user?.id ?? null });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteInviteLink(deleteTarget.id, deleteTarget.use_count);
      toast.success(
        deleteTarget.use_count > 0
          ? "Link desativado (já foi utilizado)."
          : "Link excluído."
      );
    } catch {
      toast.error("Erro ao excluir link.");
    }
    setDeleteTarget(null);
  }

  async function handleToggle(link: InviteLink) {
    try {
      await toggleInviteLinkActive(link.id, !link.is_active);
      toast.success(link.is_active ? "Link desativado." : "Link ativado.");
    } catch {
      toast.error("Erro ao alterar status.");
    }
  }

  function handleCopy(slug: string) {
    navigator.clipboard.writeText(getInviteUrl(slug));
    toast.success("Link copiado!");
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Convites" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Links de Convite</h1>
            <p className="text-sm text-muted-foreground">
              {inviteLinks.length} link{inviteLinks.length !== 1 ? "s" : ""} cadastrado{inviteLinks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Link
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted/30 animate-pulse rounded" />
          ))}
        </div>
      ) : inviteLinks.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="Nenhum link de convite"
          description="Crie links para compartilhar e inscrever alunos automaticamente."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Turma vinculada</TableHead>
                <TableHead>URL do link</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inviteLinks.map((link) => {
                const status = getStatus(link);
                const config = STATUS_CONFIG[status];
                const usagePercent =
                  link.max_uses ? (link.use_count / link.max_uses) * 100 : null;

                return (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.name}</TableCell>
                    <TableCell>
                      {link.class_name ? (
                        link.class_name
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem turma</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {getInviteUrl(link.slug)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleCopy(link.slug)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="text-sm">
                          {link.use_count}
                          {link.max_uses != null ? `/${link.max_uses}` : ""}
                        </span>
                        {usagePercent != null && (
                          <Progress value={usagePercent} className="h-1.5 w-16" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {link.expires_at ? (
                        <span className="text-sm">
                          {format(parseISO(link.expires_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Sem validade
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEdit(link)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleToggle(link)}
                          title={link.is_active ? "Desativar" : "Ativar"}
                        >
                          {link.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(link)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <InviteLinkDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          link={editingLink}
          onSave={handleSave}
          classes={activeClasses}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && deleteTarget.use_count > 0
                ? "Desativar link?"
                : "Excluir link?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.use_count > 0
                ? `Este link já foi utilizado ${deleteTarget.use_count} vez(es). Ele será desativado, mas o histórico será mantido.`
                : "Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deleteTarget && deleteTarget.use_count > 0
                ? "Desativar"
                : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
