import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Trash2,
  Pencil,
  Flag,
  Pin,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { CommunityPost } from "@/types/student";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfiles } from "@/hooks/useProfiles";
import { usePosts } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { useGamification } from "@/hooks/useGamification";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ImageLightbox } from "@/components/community/ImageLightbox";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Markdown-light renderer
// ---------------------------------------------------------------------------
function renderBody(
  body: string,
  profiles: ReturnType<typeof useProfiles>["profiles"]
) {
  const parts: (string | JSX.Element)[] = [];
  const regex =
    /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)|#([\w-]+)|@([\w.]+))/g;

  let lastIndex = 0;
  let key = 0;

  for (const m of body.matchAll(regex)) {
    if (m.index !== undefined && m.index > lastIndex) {
      parts.push(body.slice(lastIndex, m.index));
    }

    if (m[2]) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {m[2]}
        </strong>
      );
    } else if (m[3]) {
      parts.push(
        <em key={key++} className="italic">
          {m[3]}
        </em>
      );
    } else if (m[4] && m[5]) {
      parts.push(
        <a
          key={key++}
          href={m[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {m[4]}
        </a>
      );
    } else if (m[6]) {
      parts.push(
        <Link
          key={key++}
          to={`/comunidade/feed?tag=${m[6]}`}
          className="text-primary hover:underline font-medium"
        >
          #{m[6]}
        </Link>
      );
    } else if (m[7]) {
      const mentioned = profiles.find(
        (p) => p.username === m[7]!.toLowerCase()
      );
      if (mentioned) {
        parts.push(
          <Link
            key={key++}
            to={`/perfil/${mentioned.studentId}`}
            className="text-primary hover:underline font-medium"
          >
            @{m[7]}
          </Link>
        );
      } else {
        parts.push(
          <span key={key++} className="text-primary font-medium">
            @{m[7]}
          </span>
        );
      }
    }

    lastIndex = (m.index ?? 0) + m[0].length;
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Image Grid — smart layout based on count + lightbox
// ---------------------------------------------------------------------------
function ImageGrid({ images }: { images: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (images.length === 0) return null;

  const grid = () => {
    if (images.length === 1) {
      return (
        <div className="rounded-xl overflow-hidden bg-muted mt-3 ring-1 ring-border/20">
          <img
            src={images[0]}
            alt="Post"
            className="w-full max-h-96 object-cover hover:opacity-95 transition-opacity cursor-pointer"
            onClick={() => setLightboxIdx(0)}
          />
        </div>
      );
    }

    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 mt-3 rounded-xl overflow-hidden ring-1 ring-border/20">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Imagem ${i + 1}`}
              className="w-full h-48 object-cover hover:opacity-95 transition-opacity cursor-pointer"
              onClick={() => setLightboxIdx(i)}
            />
          ))}
        </div>
      );
    }

    // 3+ images: 2-column grid, last item shows "+X" overlay if more than 4
    const showCount = Math.min(images.length, 4);
    const remaining = images.length - showCount;

    return (
      <div className="grid grid-cols-2 gap-1 mt-3 rounded-xl overflow-hidden ring-1 ring-border/20">
        {images.slice(0, showCount).map((img, i) => (
          <div
            key={i}
            className={cn(
              "relative overflow-hidden cursor-pointer",
              images.length === 3 && i === 0 && "col-span-2"
            )}
            onClick={() => setLightboxIdx(i)}
          >
            <img
              src={img}
              alt={`Imagem ${i + 1}`}
              className={cn(
                "w-full object-cover hover:opacity-95 transition-opacity",
                images.length === 3 && i === 0 ? "h-48" : "h-36"
              )}
            />
            {i === showCount - 1 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{remaining}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {grid()}
      {lightboxIdx !== null && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={setLightboxIdx}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------
export function PostCard({
  post,
  showCommunity = true,
  isPinned = false,
  onToggleComments,
}: {
  post: CommunityPost;
  showCommunity?: boolean;
  isPinned?: boolean;
  onToggleComments?: (postId: string) => void;
}) {
  const { currentUserId } = useCurrentUser();
  const { profiles, findProfile } = useProfiles();
  const { toggleLike, toggleSave, deletePost } = usePosts();
  const { findCommunity } = useCommunities();
  const { getPrimaryBadge } = useGamification();

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const author = findProfile(post.authorId);
  const community = findCommunity(post.communityId);
  const primaryBadge = getPrimaryBadge(post.authorId);
  const isOwn = post.authorId === currentUserId;
  const liked = post.likedBy.includes(currentUserId);
  const saved = post.savedBy.includes(currentUserId);

  function handleLike() {
    toggleLike(post.id, currentUserId);
    if (!liked) {
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 300);
    }
  }

  function handleSave() {
    toggleSave(post.id, currentUserId);
    if (!saved) toast.success("Post salvo!");
  }

  function handleShare() {
    navigator.clipboard.writeText(
      `${window.location.origin}/comunidade/${community?.slug ?? "feed"}#${post.id}`
    );
    toast.success("Link copiado!");
  }

  function handleDelete() {
    deletePost(post.id);
    toast.success("Post excluído.");
    setDeleteOpen(false);
  }

  // System post — special card
  if (post.type === "system") {
    return (
      <div
        id={post.id}
        data-post-id={post.id}
        className="relative scroll-mt-24 border-b border-border/20 pb-4 lg:scroll-mt-6"
      >
        <div className="px-1 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {renderBody(post.body, profiles)}
              </p>
              <span className="text-xs text-muted-foreground/70">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={post.id}
      data-post-id={post.id}
      className={cn(
        "relative scroll-mt-24 border-b border-border/20 transition-colors duration-200 lg:scroll-mt-6",
        isPinned && "bg-primary/[0.03] border-b-primary/20"
      )}
    >
      <div className="px-1 py-4">
        {/* Pinned badge */}
        {isPinned && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-3 pl-[52px]">
            <Pin className="h-3 w-3" />
            Fixado
          </div>
        )}

        {/* Author row */}
        <div className="flex items-start gap-3">
          <Link to={`/perfil/${post.authorId}`} className="shrink-0">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-muted ring-2 ring-border/30 hover:ring-primary/30 transition-all">
              {author?.avatarUrl ? (
                <img
                  src={author.avatarUrl}
                  alt={author.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-sm">
                  {(author?.displayName ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`/perfil/${post.authorId}`}
                className="text-sm font-bold hover:underline"
              >
                {author?.displayName ?? "Anônimo"}
              </Link>
              <span className="text-xs text-muted-foreground/70">
                @{author?.username ?? "unknown"}
              </span>
              {primaryBadge && (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 h-4 border-primary/30 text-primary/80"
                >
                  {primaryBadge.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-0.5">
              <span>
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              {showCommunity && community && (
                <>
                  <span>·</span>
                  <Link
                    to={`/comunidade/${community.slug}`}
                    className="hover:underline hover:text-muted-foreground"
                  >
                    {community.name}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground/60 hover:text-foreground"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-9 z-50 w-40 rounded-lg border border-border/50 bg-popover p-1 shadow-lg">
                  {isOwn && (
                    <>
                      <button
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => {
                          setMenuOpen(false);
                          toast.info("Edição de post em breve.");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                        onClick={() => {
                          setMenuOpen(false);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    </>
                  )}
                  {!isOwn && (
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => {
                        setMenuOpen(false);
                        toast.info("Post reportado.");
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

        {/* Title */}
        {post.title && (
          <p className="mt-3 font-semibold text-[15px] leading-snug pl-[52px]">
            {post.title}
          </p>
        )}

        {/* Body */}
        <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap pl-[52px]">
          {renderBody(post.body, profiles)}
        </div>

        {/* Images */}
        <div className="pl-[52px]">
          <ImageGrid images={post.images} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3 pl-[40px]">
          {/* Like */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 h-8 rounded-full transition-all active:scale-90",
              liked
                ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            )}
            onClick={handleLike}
          >
            <Heart
              className={cn(
                "h-[18px] w-[18px] transition-all duration-300",
                liked && "fill-current",
                likeAnimating && "scale-[1.3]"
              )}
            />
            {post.likesCount > 0 && (
              <span className="text-xs tabular-nums">{post.likesCount}</span>
            )}
          </Button>

          {/* Comment */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
            onClick={() => onToggleComments?.(post.id)}
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            {post.commentsCount > 0 && (
              <span className="text-xs tabular-nums">{post.commentsCount}</span>
            )}
          </Button>

          {/* Bookmark */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 h-8 rounded-full transition-all active:scale-90",
              saved
                ? "text-primary hover:text-primary/80 hover:bg-primary/10"
                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
            )}
            onClick={handleSave}
          >
            <Bookmark
              className={cn(
                "h-[18px] w-[18px] transition-transform",
                saved && "fill-current scale-110"
              )}
            />
          </Button>

          {/* Share */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-90"
            onClick={handleShare}
          >
            <Share2 className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
