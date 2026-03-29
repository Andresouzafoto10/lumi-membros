import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Reply,
  Trash2,
  Flag,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import type { PostComment } from "@/types/student";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfiles } from "@/hooks/useProfiles";
import { useComments } from "@/hooks/useComments";
import { useRestrictions } from "@/hooks/useRestrictions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Single comment
// ---------------------------------------------------------------------------
function CommentItem({
  comment,
  isReply = false,
  onReply,
}: {
  comment: PostComment;
  isReply?: boolean;
  onReply?: (commentId: string) => void;
}) {
  const { currentUserId } = useCurrentUser();
  const { findProfile } = useProfiles();
  const { toggleLikeComment, deleteComment } = useComments();

  const [menuOpen, setMenuOpen] = useState(false);

  const author = findProfile(comment.authorId);
  const isOwn = comment.authorId === currentUserId;
  const liked = comment.likedBy.includes(currentUserId);

  function handleDelete() {
    deleteComment(comment.id);
    toast.success("Comentario excluido.");
    setMenuOpen(false);
  }

  return (
    <div className={cn("flex gap-2.5", isReply && "ml-10 pl-3 border-l-2 border-muted")}>
      <Link to={`/perfil/${comment.authorId}`} className="shrink-0">
        <div className="h-7 w-7 rounded-full overflow-hidden bg-muted ring-1 ring-border/30">
          {author?.avatarUrl ? (
            <img
              src={author.avatarUrl}
              alt={author.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-xs font-bold">
              {(author?.displayName ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="rounded-xl bg-muted/40 border border-border/30 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/perfil/${comment.authorId}`}
              className="text-xs font-semibold hover:underline"
            >
              {author?.displayName ?? "Anonimo"}
            </Link>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
          <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.body}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-0.5 -ml-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 px-1.5 text-xs gap-1 transition-all active:scale-90", liked ? "text-red-500" : "hover:text-red-500")}
            onClick={() => toggleLikeComment(comment.id, currentUserId)}
          >
            <Heart className={cn("h-3 w-3", liked && "fill-current")} />
            {comment.likesCount > 0 && comment.likesCount}
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
                  {isOwn ? (
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  ) : (
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => {
                        setMenuOpen(false);
                        toast.info("Comentario reportado.");
                      }}
                    >
                      <Flag className="h-3.5 w-3.5" />
                      Reportar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostComments
// ---------------------------------------------------------------------------
export function PostComments({ postId }: { postId: string }) {
  const { currentUserId } = useCurrentUser();
  const { getRootComments, getReplies, addComment } = useComments();
  const { isRestricted } = useRestrictions();

  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const rootComments = getRootComments(postId);
  const restricted = isRestricted(currentUserId);

  function handleSubmitComment() {
    if (!newComment.trim()) return;
    if (restricted) {
      toast.error("Voce esta restrito de comentar.");
      return;
    }
    addComment({
      postId,
      authorId: currentUserId,
      body: newComment.trim(),
    });
    setNewComment("");
  }

  function handleSubmitReply(parentId: string) {
    if (!replyText.trim()) return;
    if (restricted) {
      toast.error("Voce esta restrito de comentar.");
      return;
    }
    addComment({
      postId,
      authorId: currentUserId,
      body: replyText.trim(),
      parentCommentId: parentId,
    });
    setReplyText("");
    setReplyTo(null);
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Comment input */}
      <div className="flex gap-2">
        <Input
          placeholder={restricted ? "Voce esta restrito de comentar" : "Escreva um comentario..."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmitComment();
            }
          }}
          disabled={restricted}
          className="text-sm h-9 border-border/60 transition-all duration-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        />
        <Button
          size="sm"
          className="h-9 px-3 active:scale-95 transition-all"
          disabled={!newComment.trim() || restricted}
          onClick={handleSubmitComment}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Comments list */}
      {rootComments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum comentario ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {rootComments.map((comment) => {
            const replies = getReplies(comment.id);
            return (
              <div key={comment.id} className="space-y-2">
                <CommentItem
                  comment={comment}
                  onReply={(id) => {
                    setReplyTo(replyTo === id ? null : id);
                    setReplyText("");
                  }}
                />

                {/* Replies */}
                {replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} isReply />
                ))}

                {/* Reply input */}
                {replyTo === comment.id && (
                  <div className="flex gap-2 ml-10">
                    <Input
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
                      className="text-sm h-8"
                    />
                    <Button
                      size="sm"
                      className="h-8 px-2.5"
                      disabled={!replyText.trim()}
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
