import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Reply,
  Trash2,
  MoreHorizontal,
  Send,
  Flame,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import { useLessonComments } from "@/hooks/useLessonComments";
import { useGamification } from "@/hooks/useGamification";
import { getMemberBadges } from "@/lib/roleBadges";
import type { LessonComment } from "@/types/course";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Single comment item
// ---------------------------------------------------------------------------
function CommentItem({
  comment,
  isReply = false,
  isMostLiked = false,
  onReply,
  onDelete,
  onToggleLike,
  currentUserId: userId,
  isAdmin,
}: {
  comment: LessonComment;
  isReply?: boolean;
  isMostLiked?: boolean;
  onReply?: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const { getPlayerData, getPlayerMissions } = useGamification();
  const [menuOpen, setMenuOpen] = useState(false);

  const author = comment.author;
  const playerData = getPlayerData(comment.author_id);
  const completedMissions = getPlayerMissions(comment.author_id);
  const badges = getMemberBadges(
    author?.role as any,
    undefined,
    playerData.points,
    completedMissions.length
  );
  const isOwn = comment.author_id === userId;
  const canDelete = isOwn || isAdmin;
  const liked = comment.liked_by.includes(userId);

  function handleDelete() {
    onDelete(comment.id);
    toast.success("Comentario excluido.");
    setMenuOpen(false);
  }

  return (
    <div
      className={cn(
        "flex gap-2.5",
        isReply && "ml-10 pl-3 border-l-2 border-muted"
      )}
    >
      <Link to={`/perfil/${comment.author_id}`} className="shrink-0">
        <div className="h-7 w-7 rounded-full overflow-hidden bg-muted ring-1 ring-border/30">
          {author?.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={author.display_name || author.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-xs font-bold">
              {(author?.display_name || author?.name || "?")
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "rounded-xl bg-muted/40 border px-3 py-2",
            isMostLiked
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border/30"
          )}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/perfil/${comment.author_id}`}
              className="text-xs font-semibold hover:underline"
            >
              {author?.display_name || author?.name || "Anonimo"}
            </Link>
            {badges.slice(0, 2).map((badge) => (
              <span
                key={badge.label}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full text-[9px] px-1.5 py-0 border font-medium leading-4",
                  badge.colorClass
                )}
              >
                {badge.emoji} {badge.label}
              </span>
            ))}
            {isMostLiked && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-500">
                <Flame className="h-3 w-3" />
                Mais curtido
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
          <div className="text-sm mt-0.5 prose prose-sm max-w-none dark:prose-invert prose-p:my-0.5 prose-p:leading-relaxed">
            <ReactMarkdown>{comment.body}</ReactMarkdown>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-0.5 -ml-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-1.5 text-xs gap-1 transition-all active:scale-90",
              liked ? "text-red-500" : "hover:text-red-500"
            )}
            onClick={() => onToggleLike(comment.id)}
          >
            <Heart className={cn("h-3 w-3", liked && "fill-current")} />
            {comment.likes_count > 0 && comment.likes_count}
          </Button>

          {!isReply && onReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs gap-1"
              onClick={() => onReply(comment.id)}
            >
              <Reply className="h-3 w-3" />
              Responder
            </Button>
          )}

          {canDelete && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute left-0 top-7 z-50 w-36 rounded-md border bg-popover p-1 shadow-md">
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LessonComments
// ---------------------------------------------------------------------------
export function LessonComments({
  lessonId,
  courseId,
  commentsEnabled,
}: {
  lessonId: string;
  courseId: string;
  commentsEnabled: boolean;
}) {
  const {
    comments,
    commentCount,
    loading,
    addComment,
    deleteComment,
    toggleLike,
    isAdmin,
    currentUserId,
  } = useLessonComments(lessonId);

  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );

  if (!commentsEnabled) return null;

  // Find the most liked root comment
  const mostLikedComment =
    comments.length > 0
      ? comments.reduce((best, c) =>
          c.likes_count > best.likes_count ? c : best
        )
      : null;
  const hasMostLiked = mostLikedComment && mostLikedComment.likes_count > 0;

  // Sort: most liked first, then chronological
  const sortedComments = [...comments].sort((a, b) => {
    if (hasMostLiked) {
      if (a.id === mostLikedComment.id) return -1;
      if (b.id === mostLikedComment.id) return 1;
    }
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });

  async function handleSubmitComment() {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(newComment, undefined, courseId);
      setNewComment("");
    } catch {
      toast.error("Erro ao publicar comentario.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReply(parentId: string) {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(replyText, parentId, courseId);
      setReplyText("");
      setReplyTo(null);
      // Auto-expand replies for the parent
      setExpandedReplies((prev) => new Set(prev).add(parentId));
    } catch {
      toast.error("Erro ao publicar resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  return (
    <div className="space-y-4 max-w-[860px]">
      {/* Header */}
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Comentarios
        {commentCount > 0 && (
          <span className="text-muted-foreground font-normal">
            ({commentCount})
          </span>
        )}
      </h3>

      {/* New comment input */}
      <div className="flex gap-2.5">
        <Textarea
          placeholder="Escreva um comentario..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmitComment();
            }
          }}
          rows={1}
          className="text-sm min-h-[38px] resize-none border-border/60 transition-all duration-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        />
        <Button
          size="sm"
          className="h-[38px] px-3 active:scale-95 transition-all shrink-0"
          disabled={!newComment.trim() || submitting}
          onClick={handleSubmitComment}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : sortedComments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Nenhum comentario ainda. Seja o primeiro a comentar!
        </p>
      ) : (
        <div className="space-y-3">
          {sortedComments.map((comment) => {
            const replies = comment.replies ?? [];
            const isTop = !!(hasMostLiked && comment.id === mostLikedComment.id);
            const repliesExpanded = expandedReplies.has(comment.id);

            return (
              <div key={comment.id} className="space-y-2">
                <CommentItem
                  comment={comment}
                  isMostLiked={isTop}
                  onReply={(id) => {
                    setReplyTo(replyTo === id ? null : id);
                    setReplyText("");
                  }}
                  onDelete={deleteComment}
                  onToggleLike={toggleLike}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />

                {/* Replies toggle */}
                {replies.length > 0 && (
                  <button
                    className="ml-10 flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => toggleReplies(comment.id)}
                  >
                    {repliesExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {repliesExpanded
                      ? "Ocultar respostas"
                      : `Ver ${replies.length} ${replies.length === 1 ? "resposta" : "respostas"}`}
                  </button>
                )}

                {/* Expanded replies */}
                {repliesExpanded &&
                  replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      isReply
                      onDelete={deleteComment}
                      onToggleLike={toggleLike}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                    />
                  ))}

                {/* Reply input */}
                {replyTo === comment.id && (
                  <div className="flex gap-2 ml-10">
                    <Textarea
                      placeholder="Sua resposta..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitReply(comment.id);
                        }
                      }}
                      autoFocus
                      rows={1}
                      className="text-sm min-h-[34px] resize-none"
                    />
                    <Button
                      size="sm"
                      className="h-[34px] px-2.5 shrink-0"
                      disabled={!replyText.trim() || submitting}
                      onClick={() => handleSubmitReply(comment.id)}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
