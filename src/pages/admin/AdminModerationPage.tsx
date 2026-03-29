import { useState, useMemo } from "react";
import {
  Shield,
  Check,
  Trash2,
  Ban,
  Eye,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { usePosts } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { useProfiles } from "@/hooks/useProfiles";
import { useStudents } from "@/hooks/useStudents";
import { useRestrictions } from "@/hooks/useRestrictions";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  DialogFooter,
  DialogDescription,
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
import { EmptyState } from "@/components/courses/EmptyState";

// ---------------------------------------------------------------------------
// Duration options
// ---------------------------------------------------------------------------
const DURATION_OPTIONS = [
  { label: "1 dia", value: 1 },
  { label: "3 dias", value: 3 },
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "Permanente", value: 0 },
];

const POST_STATUS_LABELS: Record<string, string> = {
  published: "Publicado",
  pending: "Pendente",
  rejected: "Rejeitado",
};

const POST_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  published: "default",
  pending: "outline",
  rejected: "destructive",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminModerationPage() {
  const { currentUserId } = useCurrentUser();
  const { posts, approvePost, rejectPost, deletePost } = usePosts();
  const { communities, findCommunity } = useCommunities();
  const { findProfile } = useProfiles();
  const { findStudent } = useStudents();
  const {
    activeRestrictions,
    restrictions,
    addRestriction,
    removeRestriction,
  } = useRestrictions();

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCommunity, setFilterCommunity] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Restrict dialog
  const [restrictOpen, setRestrictOpen] = useState(false);
  const [restrictStudentId, setRestrictStudentId] = useState("");
  const [restrictDuration, setRestrictDuration] = useState(7);
  const [restrictReason, setRestrictReason] = useState("");

  // Filtered posts
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return posts
      .filter((p) => {
        if (filterStatus !== "all" && p.status !== filterStatus) return false;
        if (filterCommunity !== "all" && p.communityId !== filterCommunity) return false;
        if (q) {
          const author = findProfile(p.authorId);
          const matchBody = p.body.toLowerCase().includes(q);
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchAuthor = author?.displayName.toLowerCase().includes(q) || author?.username.toLowerCase().includes(q);
          if (!matchBody && !matchTitle && !matchAuthor) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [posts, filterStatus, filterCommunity, searchText, findProfile]);

  function handleDelete() {
    if (!deleteTargetId) return;
    deletePost(deleteTargetId);
    toast.success("Post excluido.");
    setDeleteTargetId(null);
  }

  function openRestrict(studentId: string) {
    setRestrictStudentId(studentId);
    setRestrictDuration(7);
    setRestrictReason("");
    setRestrictOpen(true);
  }

  function handleRestrict() {
    if (!restrictReason.trim()) {
      toast.error("Informe o motivo.");
      return;
    }
    addRestriction({
      studentId: restrictStudentId,
      reason: restrictReason.trim(),
      appliedBy: currentUserId,
      durationDays: restrictDuration === 0 ? null : restrictDuration,
    });
    toast.success("Restricao aplicada.");
    setRestrictOpen(false);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Admin", to: "/admin" }, { label: "Moderacao" }]}
      />

      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Moderacao</h1>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">
            Posts ({filtered.length})
          </TabsTrigger>
          <TabsTrigger value="restrictions">
            Restricoes ({activeRestrictions.length})
          </TabsTrigger>
        </TabsList>

        {/* ---- Tab: Posts ---- */}
        <TabsContent value="posts" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group/search">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
              <Input
                placeholder="Buscar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8 h-9 w-[200px] border-border/60 transition-all duration-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
              {searchText && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchText("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCommunity} onValueChange={setFilterCommunity}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Comunidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {communities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post list */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="Nenhum post encontrado"
              description="Ajuste os filtros ou aguarde novas publicacoes."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((post) => {
                const author = findProfile(post.authorId);
                const community = findCommunity(post.communityId);
                return (
                  <Card key={post.id} className={cn(
                    "border-border/50",
                    post.status === "pending" && "border-l-2 border-l-amber-500",
                    post.status === "rejected" && "border-l-2 border-l-destructive"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
                          {author?.avatarUrl ? (
                            <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-sm font-bold">
                              {(author?.displayName ?? "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">
                              {author?.displayName ?? "Anonimo"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              @{author?.username ?? "unknown"}
                            </span>
                            <Badge variant={POST_STATUS_VARIANTS[post.status] ?? "outline"} className="text-xs">
                              {POST_STATUS_LABELS[post.status] ?? post.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {community?.name ?? post.communityId} ·{" "}
                            {format(parseISO(post.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>

                          {post.title && (
                            <p className="text-sm font-medium mt-2">{post.title}</p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
                            {post.body}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        {post.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="active:scale-95 transition-all hover:border-emerald-500/30 hover:text-emerald-500"
                            onClick={() => {
                              approvePost(post.id);
                              toast.success("Post aprovado.");
                            }}
                          >
                            <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                            Aprovar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="active:scale-95 transition-all hover:border-destructive/30 hover:text-destructive"
                          onClick={() => setDeleteTargetId(post.id)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />
                          Excluir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="active:scale-95 transition-all hover:border-yellow-500/30 hover:text-yellow-500"
                          onClick={() => openRestrict(post.authorId)}
                        >
                          <Ban className="mr-1 h-3.5 w-3.5 text-yellow-500" />
                          Restringir autor
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ---- Tab: Restrictions ---- */}
        <TabsContent value="restrictions" className="space-y-4">
          {activeRestrictions.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="Nenhuma restricao ativa"
              description="Nenhum aluno esta restrito no momento."
            />
          ) : (
            <div className="space-y-3">
              {activeRestrictions.map((r) => {
                const student = findStudent(r.studentId);
                const profile = findProfile(r.studentId);
                const applier = findProfile(r.appliedBy);
                return (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {profile?.displayName ?? student?.name ?? r.studentId}
                            </span>
                            {profile && (
                              <span className="text-xs text-muted-foreground">
                                @{profile.username}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">Motivo:</span> {r.reason}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span>
                              Inicio: {format(parseISO(r.startsAt), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <span>
                              Fim: {r.endsAt ? format(parseISO(r.endsAt), "dd/MM/yyyy", { locale: ptBR }) : "Permanente"}
                            </span>
                            {applier && (
                              <span>Aplicado por: {applier.displayName}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            removeRestriction(r.id);
                            toast.success("Restricao removida.");
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              O post sera removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restrict dialog */}
      <Dialog open={restrictOpen} onOpenChange={setRestrictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restringir aluno</DialogTitle>
            <DialogDescription>
              O aluno nao podera publicar posts nem comentarios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Duracao</Label>
              <Select
                value={String(restrictDuration)}
                onValueChange={(v) => setRestrictDuration(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea
                rows={3}
                placeholder="Descreva o motivo da restricao..."
                value={restrictReason}
                onChange={(e) => setRestrictReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestrictOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRestrict} disabled={!restrictReason.trim()}>
              Aplicar restricao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
