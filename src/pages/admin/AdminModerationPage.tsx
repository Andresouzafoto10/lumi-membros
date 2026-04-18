import { useState, useMemo } from "react";
import {
  Shield,
  Check,
  Trash2,
  Ban,
  Search,
  X,
  MessageSquare,
  ThumbsUp,
  ExternalLink,
  Reply,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { usePosts } from "@/hooks/usePosts";
import { useComments } from "@/hooks/useComments";
import { useCommunities } from "@/hooks/useCommunities";
import { useCourses } from "@/hooks/useCourses";
import { useProfiles } from "@/hooks/useProfiles";
import { useStudents } from "@/hooks/useStudents";
import { useRestrictions } from "@/hooks/useRestrictions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAllLessonCommentsAdmin } from "@/hooks/useLessonComments";
import type { AdminLessonComment } from "@/hooks/useLessonComments";
import { getProxiedImageUrl } from "@/lib/imageProxy";

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
// Constants
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
// Helpers
// ---------------------------------------------------------------------------
function AvatarSmall({ url, name }: { url?: string | null; name: string }) {
  return (
    <div className="h-7 w-7 rounded-full overflow-hidden bg-muted shrink-0">
      {url ? (
        <img src={url} alt={name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-xs font-bold">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminModerationPage() {
  const { currentUserId } = useCurrentUser();
  const { posts, approvePost, deletePost } = usePosts();
  const { allComments: postComments, createComment: createPostComment, deleteComment: deletePostComment, getCommentsForPost } = useComments();
  const { communities, findCommunity } = useCommunities();
  const { allCourses } = useCourses();
  const { findProfile } = useProfiles();
  const { findStudent } = useStudents();
  const {
    activeRestrictions,
    addRestriction,
    removeRestriction,
  } = useRestrictions();
  const {
    comments: allLessonComments,
    totalCount: lessonCommentCount,
    adminDeleteComment,
    adminAddComment,
  } = useAllLessonCommentsAdmin();

  // Posts tab state
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCommunity, setFilterCommunity] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<"post" | "post-comment" | "lesson-comment">("post");
  const [postReplyingTo, setPostReplyingTo] = useState<string | null>(null);
  const [postReplyText, setPostReplyText] = useState("");
  const [postExpandedComments, setPostExpandedComments] = useState<Set<string>>(new Set());

  // Lesson comments tab state
  const [lcSearch, setLcSearch] = useState("");
  const [lcCourseFilter, setLcCourseFilter] = useState("all");
  const [lcLessonFilter, setLcLessonFilter] = useState("all");
  const [lcVisibleCount, setLcVisibleCount] = useState(50);
  const [lcExpandedIds, setLcExpandedIds] = useState<Set<string>>(new Set());
  const [lcReplyingTo, setLcReplyingTo] = useState<string | null>(null);
  const [lcReplyText, setLcReplyText] = useState("");
  const [lcExpandedReplies, setLcExpandedReplies] = useState<Set<string>>(new Set());

  // Restrict dialog (shared)
  const [restrictOpen, setRestrictOpen] = useState(false);
  const [restrictStudentId, setRestrictStudentId] = useState("");
  const [restrictDuration, setRestrictDuration] = useState(7);
  const [restrictReason, setRestrictReason] = useState("");

  // ---- Filtered posts ----
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

  // ---- Lesson comments: build tree ----
  const lcRootComments = useMemo(() => {
    return allLessonComments.filter((c) => !c.parent_comment_id);
  }, [allLessonComments]);

  const lcReplyMap = useMemo(() => {
    const map = new Map<string, AdminLessonComment[]>();
    for (const c of allLessonComments) {
      if (c.parent_comment_id) {
        const arr = map.get(c.parent_comment_id) ?? [];
        arr.push(c);
        map.set(c.parent_comment_id, arr);
      }
    }
    return map;
  }, [allLessonComments]);

  const lcLessonOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of lcRootComments) {
      if (lcCourseFilter !== "all" && c.course_id !== lcCourseFilter) continue;
      if (c.lesson_id && c.lesson_title && !seen.has(c.lesson_id)) {
        seen.set(c.lesson_id, c.lesson_title);
      }
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [lcRootComments, lcCourseFilter]);

  const filteredLcRoots = useMemo(() => {
    const q = lcSearch.toLowerCase().trim();
    return lcRootComments.filter((c) => {
      if (lcCourseFilter !== "all" && c.course_id !== lcCourseFilter) return false;
      if (lcLessonFilter !== "all" && c.lesson_id !== lcLessonFilter) return false;
      if (q) {
        const matchBody = c.body.toLowerCase().includes(q);
        const authorName = (c.author?.display_name || c.author?.name || "").toLowerCase();
        const matchAuthor = authorName.includes(q);
        // Also check replies
        const replies = lcReplyMap.get(c.id) ?? [];
        const matchReply = replies.some(
          (r) =>
            r.body.toLowerCase().includes(q) ||
            (r.author?.display_name || r.author?.name || "").toLowerCase().includes(q)
        );
        if (!matchBody && !matchAuthor && !matchReply) return false;
      }
      return true;
    });
  }, [lcRootComments, lcCourseFilter, lcLessonFilter, lcSearch, lcReplyMap]);

  // ---- Handlers ----
  function handleDelete() {
    if (!deleteTargetId) return;
    if (deleteTargetType === "post") {
      deletePost(deleteTargetId);
      toast.success("Post excluido.");
    } else if (deleteTargetType === "post-comment") {
      deletePostComment(deleteTargetId);
      toast.success("Comentario excluido.");
    } else {
      adminDeleteComment(deleteTargetId);
      toast.success("Comentario excluido.");
    }
    setDeleteTargetId(null);
  }

  function confirmDelete(id: string, type: "post" | "post-comment" | "lesson-comment") {
    setDeleteTargetId(id);
    setDeleteTargetType(type);
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

  async function handlePostReply(postId: string) {
    if (!postReplyText.trim()) return;
    try {
      await createPostComment({
        postId,
        authorId: currentUserId,
        body: postReplyText.trim(),
      });
      toast.success("Resposta enviada.");
      setPostReplyText("");
      setPostReplyingTo(null);
    } catch {
      toast.error("Erro ao enviar resposta.");
    }
  }

  async function handleLcReply(commentId: string) {
    if (!lcReplyText.trim()) return;
    const parent = allLessonComments.find((c) => c.id === commentId);
    if (!parent) return;
    try {
      await adminAddComment(parent.lesson_id, parent.course_id, lcReplyText.trim(), commentId);
      toast.success("Resposta enviada.");
      setLcReplyText("");
      setLcReplyingTo(null);
      setLcExpandedReplies((prev) => new Set(prev).add(commentId));
    } catch {
      toast.error("Erro ao enviar resposta.");
    }
  }

  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ---- Delete dialog label ----
  const deleteLabel = deleteTargetType === "post" ? "post" : "comentario";

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
          <TabsTrigger value="lesson-comments">
            Comentarios de Aulas ({lessonCommentCount})
          </TabsTrigger>
          <TabsTrigger value="restrictions">
            Restricoes ({activeRestrictions.length})
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* TAB: Posts                                                       */}
        {/* ================================================================ */}
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
                <Button variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchText("")}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCommunity} onValueChange={setFilterCommunity}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Comunidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {communities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post list */}
          {filtered.length === 0 ? (
            <EmptyState icon={Shield} title="Nenhum post encontrado" description="Ajuste os filtros ou aguarde novas publicacoes." />
          ) : (
            <div className="space-y-3">
              {filtered.map((post) => {
                const author = findProfile(post.authorId);
                const community = findCommunity(post.communityId);
                const comments = getCommentsForPost(post.id);
                const rootComments = comments.filter((c) => !c.parentCommentId);
                const showExpanded = postExpandedComments.has(post.id);
                const visibleComments = showExpanded ? rootComments : rootComments.slice(0, 2);
                const hiddenCount = rootComments.length - 2;

                return (
                  <Card key={post.id} className={cn(
                    "border-border/50",
                    post.status === "pending" && "border-l-2 border-l-amber-500",
                    post.status === "rejected" && "border-l-2 border-l-destructive"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
                          {author?.avatarUrl ? (
                            <img src={getProxiedImageUrl(author.avatarUrl)} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-sm font-bold">
                              {(author?.displayName ?? "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{author?.displayName ?? "Anonimo"}</span>
                            <span className="text-xs text-muted-foreground">@{author?.username ?? "unknown"}</span>
                            <Badge variant={POST_STATUS_VARIANTS[post.status] ?? "outline"} className="text-xs">
                              {POST_STATUS_LABELS[post.status] ?? post.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {community?.name ?? post.communityId} · {format(parseISO(post.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                          {post.title && <p className="text-sm font-medium mt-2">{post.title}</p>}
                          <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{post.body}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        {post.status === "pending" && (
                          <Button size="sm" variant="outline" className="active:scale-95 transition-all hover:border-emerald-500/30 hover:text-emerald-500" onClick={() => { approvePost(post.id); toast.success("Post aprovado."); }}>
                            <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />Aprovar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="active:scale-95 transition-all text-muted-foreground hover:text-foreground" onClick={() => { setPostReplyingTo(postReplyingTo === post.id ? null : post.id); setPostReplyText(""); }}>
                          <Reply className="mr-1 h-3.5 w-3.5" />Responder
                        </Button>
                        <a href={`/comunidade/${community?.slug ?? post.communityId}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="active:scale-95 transition-all">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" />Ver na comunidade
                          </Button>
                        </a>
                        <Button size="sm" variant="outline" className="active:scale-95 transition-all hover:border-destructive/30 hover:text-destructive" onClick={() => confirmDelete(post.id, "post")}>
                          <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />Excluir
                        </Button>
                        <Button size="sm" variant="outline" className="active:scale-95 transition-all hover:border-yellow-500/30 hover:text-yellow-500" onClick={() => openRestrict(post.authorId)}>
                          <Ban className="mr-1 h-3.5 w-3.5 text-yellow-500" />Restringir autor
                        </Button>
                      </div>

                      {/* Inline reply */}
                      {postReplyingTo === post.id && (
                        <div className="flex gap-2 mt-3">
                          <Textarea
                            placeholder="Escreva uma resposta..."
                            value={postReplyText}
                            onChange={(e) => setPostReplyText(e.target.value)}
                            rows={2}
                            autoFocus
                            className="text-sm min-h-[80px] resize-none border-border/60 rounded-lg"
                          />
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button size="sm" className="h-8 px-3" disabled={!postReplyText.trim()} onClick={() => handlePostReply(post.id)}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => setPostReplyingTo(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Post comments */}
                      {rootComments.length > 0 && (
                        <div className="mt-3 space-y-2 border-l-2 border-border/30 pl-4 ml-3">
                          {visibleComments.map((comment) => {
                            const cAuthor = findProfile(comment.authorId);
                            const cIsRole = cAuthor?.role && cAuthor.role !== "student";
                            const cReplies = comments.filter((r) => r.parentCommentId === comment.id);
                            return (
                              <div key={comment.id} className="space-y-1.5">
                                <div className="flex items-start gap-2">
                                  <AvatarSmall url={cAuthor?.avatarUrl} name={cAuthor?.displayName ?? "?"} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold">{cAuthor?.displayName ?? "Anonimo"}</span>
                                      {cIsRole && <Badge variant="secondary" className="text-[9px] px-1 py-0">{cAuthor!.role}</Badge>}
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{comment.body}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {comment.likesCount > 0 && (
                                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground mr-1">
                                          <ThumbsUp className="h-2.5 w-2.5" />{comment.likesCount}
                                        </span>
                                      )}
                                      <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => confirmDelete(comment.id, "post-comment")}>
                                        <Trash2 className="h-2.5 w-2.5 mr-0.5 text-destructive" />Excluir
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => openRestrict(comment.authorId)}>
                                        <Ban className="h-2.5 w-2.5 mr-0.5 text-yellow-500" />Restringir
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                {/* Nested replies of this comment */}
                                {cReplies.length > 0 && (
                                  <div className="ml-9 space-y-1.5 border-l border-border/20 pl-3">
                                    {cReplies.map((reply) => {
                                      const rAuthor = findProfile(reply.authorId);
                                      const rIsRole = rAuthor?.role && rAuthor.role !== "student";
                                      return (
                                        <div key={reply.id} className="flex items-start gap-2">
                                          <AvatarSmall url={rAuthor?.avatarUrl} name={rAuthor?.displayName ?? "?"} />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-xs font-semibold">{rAuthor?.displayName ?? "Anonimo"}</span>
                                              {rIsRole && <Badge variant="secondary" className="text-[9px] px-1 py-0">{rAuthor!.role}</Badge>}
                                              <span className="text-[10px] text-muted-foreground">
                                                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: ptBR })}
                                              </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{reply.body}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => confirmDelete(reply.id, "post-comment")}>
                                                <Trash2 className="h-2.5 w-2.5 mr-0.5 text-destructive" />Excluir
                                              </Button>
                                              <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => openRestrict(reply.authorId)}>
                                                <Ban className="h-2.5 w-2.5 mr-0.5 text-yellow-500" />Restringir
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {hiddenCount > 0 && !showExpanded && (
                            <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => toggleSet(setPostExpandedComments, post.id)}>
                              <ChevronDown className="h-3 w-3" /> Ver mais {hiddenCount} {hiddenCount === 1 ? "comentario" : "comentarios"}
                            </button>
                          )}
                          {showExpanded && rootComments.length > 2 && (
                            <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => toggleSet(setPostExpandedComments, post.id)}>
                              <ChevronUp className="h-3 w-3" /> Ocultar comentarios
                            </button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB: Lesson Comments                                             */}
        {/* ================================================================ */}
        <TabsContent value="lesson-comments" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group/search">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
              <Input
                placeholder="Buscar comentario ou autor..."
                value={lcSearch}
                onChange={(e) => setLcSearch(e.target.value)}
                className="pl-8 h-9 w-[220px] border-border/60 transition-all duration-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
              {lcSearch && (
                <Button variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setLcSearch("")}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Select value={lcCourseFilter} onValueChange={(v) => { setLcCourseFilter(v); setLcLessonFilter("all"); setLcVisibleCount(50); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Curso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cursos</SelectItem>
                {allCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lcLessonFilter} onValueChange={(v) => { setLcLessonFilter(v); setLcVisibleCount(50); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Aula" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as aulas</SelectItem>
                {lcLessonOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comment list */}
          {filteredLcRoots.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Nenhum comentario encontrado" description="Ajuste os filtros ou aguarde novos comentarios." />
          ) : (
            <div className="space-y-3">
              {filteredLcRoots.slice(0, lcVisibleCount).map((comment) => {
                const authorName = comment.author?.display_name || comment.author?.name || "Anonimo";
                const isExpanded = lcExpandedIds.has(comment.id);
                const isRole = comment.author?.role && comment.author.role !== "student";
                const replies = lcReplyMap.get(comment.id) ?? [];
                const repliesExpanded = lcExpandedReplies.has(comment.id);
                const visibleReplies = repliesExpanded ? replies : replies.slice(0, 2);
                const hiddenReplyCount = replies.length - 2;

                return (
                  <Card key={comment.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
                          {comment.author?.avatar_url ? (
                            <img src={comment.author.avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-sm font-bold">
                              {authorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{authorName}</span>
                            {isRole && <Badge variant="secondary" className="text-xs">{comment.author!.role}</Badge>}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {comment.course_title ?? "Curso"} › {comment.lesson_title ?? "Aula"}
                          </div>
                          <p className={cn("text-sm text-muted-foreground mt-2", !isExpanded && "line-clamp-3")}>
                            {comment.body}
                          </p>
                          {comment.body.length > 200 && (
                            <button className="text-xs text-primary hover:underline mt-0.5" onClick={() => toggleSet(setLcExpandedIds, comment.id)}>
                              {isExpanded ? "Ver menos" : "Ver mais"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        {comment.likes_count > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                            <ThumbsUp className="h-3 w-3" />{comment.likes_count}
                          </span>
                        )}
                        <Button size="sm" variant="ghost" className="active:scale-95 transition-all text-muted-foreground hover:text-foreground" onClick={() => { setLcReplyingTo(lcReplyingTo === comment.id ? null : comment.id); setLcReplyText(""); }}>
                          <Reply className="mr-1 h-3.5 w-3.5" />Responder
                        </Button>
                        <a href={`/cursos/${comment.course_id}?lesson=${comment.lesson_id}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="active:scale-95 transition-all">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" />Ver na aula
                          </Button>
                        </a>
                        <Button size="sm" variant="outline" className="active:scale-95 transition-all hover:border-destructive/30 hover:text-destructive" onClick={() => confirmDelete(comment.id, "lesson-comment")}>
                          <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />Excluir
                        </Button>
                        <Button size="sm" variant="outline" className="active:scale-95 transition-all hover:border-yellow-500/30 hover:text-yellow-500" onClick={() => openRestrict(comment.author_id)}>
                          <Ban className="mr-1 h-3.5 w-3.5 text-yellow-500" />Restringir autor
                        </Button>
                      </div>

                      {/* Inline reply */}
                      {lcReplyingTo === comment.id && (
                        <div className="flex gap-2 mt-3">
                          <Textarea
                            placeholder="Escreva uma resposta..."
                            value={lcReplyText}
                            onChange={(e) => setLcReplyText(e.target.value)}
                            rows={2}
                            autoFocus
                            className="text-sm min-h-[80px] resize-none border-border/60 rounded-lg"
                          />
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button size="sm" className="h-8 px-3" disabled={!lcReplyText.trim()} onClick={() => handleLcReply(comment.id)}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => setLcReplyingTo(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {replies.length > 0 && (
                        <div className="mt-3 space-y-2 border-l-2 border-border/30 pl-4 ml-3">
                          {visibleReplies.map((reply) => {
                            const rAuthorName = reply.author?.display_name || reply.author?.name || "Anonimo";
                            const rIsRole = reply.author?.role && reply.author.role !== "student";
                            return (
                              <div key={reply.id} className="flex items-start gap-2">
                                <AvatarSmall url={reply.author?.avatar_url} name={rAuthorName} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold">{rAuthorName}</span>
                                    {rIsRole && <Badge variant="secondary" className="text-[9px] px-1 py-0">{reply.author!.role}</Badge>}
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ptBR })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{reply.body}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {reply.likes_count > 0 && (
                                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground mr-1">
                                        <ThumbsUp className="h-2.5 w-2.5" />{reply.likes_count}
                                      </span>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => confirmDelete(reply.id, "lesson-comment")}>
                                      <Trash2 className="h-2.5 w-2.5 mr-0.5 text-destructive" />Excluir
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => openRestrict(reply.author_id)}>
                                      <Ban className="h-2.5 w-2.5 mr-0.5 text-yellow-500" />Restringir
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {hiddenReplyCount > 0 && !repliesExpanded && (
                            <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => toggleSet(setLcExpandedReplies, comment.id)}>
                              <ChevronDown className="h-3 w-3" /> Ver mais {hiddenReplyCount} {hiddenReplyCount === 1 ? "resposta" : "respostas"}
                            </button>
                          )}
                          {repliesExpanded && replies.length > 2 && (
                            <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => toggleSet(setLcExpandedReplies, comment.id)}>
                              <ChevronUp className="h-3 w-3" /> Ocultar respostas
                            </button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Load more */}
              {filteredLcRoots.length > lcVisibleCount && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => setLcVisibleCount((prev) => prev + 50)}>
                    Carregar mais ({filteredLcRoots.length - lcVisibleCount} restantes)
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB: Restrictions                                                */}
        {/* ================================================================ */}
        <TabsContent value="restrictions" className="space-y-4">
          {activeRestrictions.length === 0 ? (
            <EmptyState icon={Shield} title="Nenhuma restricao ativa" description="Nenhum aluno esta restrito no momento." />
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
                            <span className="text-sm font-semibold">{profile?.displayName ?? student?.name ?? r.studentId}</span>
                            {profile && <span className="text-xs text-muted-foreground">@{profile.username}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1"><span className="font-medium">Motivo:</span> {r.reason}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span>Inicio: {format(parseISO(r.startsAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                            <span>Fim: {r.endsAt ? format(parseISO(r.endsAt), "dd/MM/yyyy", { locale: ptBR }) : "Permanente"}</span>
                            {applier && <span>Aplicado por: {applier.displayName}</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { removeRestriction(r.id); toast.success("Restricao removida."); }}>
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

      {/* Unified delete dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteLabel}?</AlertDialogTitle>
            <AlertDialogDescription>O {deleteLabel} sera removido permanentemente.</AlertDialogDescription>
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
            <DialogDescription>O aluno nao podera publicar posts nem comentarios.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Duracao</Label>
              <Select value={String(restrictDuration)} onValueChange={(v) => setRestrictDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea rows={3} placeholder="Descreva o motivo da restricao..." value={restrictReason} onChange={(e) => setRestrictReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestrictOpen(false)}>Cancelar</Button>
            <Button onClick={handleRestrict} disabled={!restrictReason.trim()}>Aplicar restricao</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
