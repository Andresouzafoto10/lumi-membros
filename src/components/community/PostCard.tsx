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
  ChevronLeft,
  ChevronRight,
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
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Markdown-light renderer
// ---------------------------------------------------------------------------
function renderBody(
  body: string,
  profiles: ReturnType<typeof useProfiles>["profiles"]
) {
  // Process inline markdown: **bold**, *italic*, [text](url)
  // Also make #hashtags and @mentions clickable
  const parts: (string | JSX.Element)[] = [];
  const regex =
    /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)|#([\w-]+)|@([\w.]+))/g;

  let lastIndex = 0;
  let key = 0;

  for (const m of body.matchAll(regex)) {
    // Text before match
    if (m.index !== undefined && m.index > lastIndex) {
      parts.push(body.slice(lastIndex, m.index));
    }

    if (m[2]) {
      // **bold**
      parts.push(
        <strong key={key++} className="font-semibold">
          {m[2]}
        </strong>
      );
    } else if (m[3]) {
      // *italic*
      parts.push(
        <em key={key++} className="italic">
          {m[3]}
        </em>
      );
    } else if (m[4] && m[5]) {
      // [text](url)
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
      // #hashtag
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
      // @mention
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
// Image Carousel
// ---------------------------------------------------------------------------
function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="rounded-lg overflow-hidden bg-muted mt-3">
        <img
          src={images[0]}
          alt="Post"
          className="w-full max-h-96 object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative mt-3">
      <div className="rounded-lg overflow-hidden bg-muted">
        <img
          src={images[current]}
          alt={`Imagem ${current + 1}`}
          className="w-full max-h-96 object-cover"
        />
      </div>
      {current > 0 && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
          onClick={() => setCurrent(current - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {current < images.length - 1 && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
          onClick={() => setCurrent(current + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === current
                ? "w-4 bg-white"
                : "w-1.5 bg-white/50 hover:bg-white/80"
            )}
          />
        ))}
      </div>
    </div>
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

  const author = findProfile(post.authorId);
  const community = findCommunity(post.communityId);
  const primaryBadge = getPrimaryBadge(post.authorId);
  const isOwn = post.authorId === currentUserId;
  const liked = post.likedBy.includes(currentUserId);
  const saved = post.savedBy.includes(currentUserId);

  function handleLike() {
    toggleLike(post.id, currentUserId);
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
    toast.success("Post excluido.");
    setDeleteOpen(false);
  }

  // System post — special card
  if (post.type === "system") {
    return (
      <Card className="relative border-dashed bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {renderBody(post.body, profiles)}
              </p>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("relative", isPinned && "border-primary/30 bg-primary/5")}>
      <CardContent className="p-4">
        {/* Pinned badge */}
        {isPinned && (
          <div className="flex items-center gap-1 text-xs text-primary font-medium mb-2">
            <Pin className="h-3 w-3" />
            Fixado
          </div>
        )}

        {/* Author row */}
        <div className="flex items-start gap-3">
          <Link to={`/perfil/${post.authorId}`} className="shrink-0">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
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
                className="text-sm font-semibold hover:underline"
              >
                {author?.displayName ?? "Anonimo"}
              </Link>
              <span className="text-xs text-muted-foreground">
                @{author?.username ?? "unknown"}
              </span>
              {primaryBadge && (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 h-4"
                >
                  {primaryBadge.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                    className="hover:underline"
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
              className="h-8 w-8"
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
                <div className="absolute right-0 top-9 z-50 w-40 rounded-md border bg-popover p-1 shadow-md">
                  {isOwn && (
                    <>
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => {
                          setMenuOpen(false);
                          toast.info("Edicao de post em breve.");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
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
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
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
          <p className="mt-3 font-semibold leading-snug">{post.title}</p>
        )}

        {/* Body */}
        <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {renderBody(post.body, profiles)}
        </div>

        {/* Images */}
        <ImageCarousel images={post.images} />

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3 -ml-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-1.5 h-8", liked && "text-red-500")}
            onClick={handleLike}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            {post.likesCount > 0 && (
              <span className="text-xs">{post.likesCount}</span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => onToggleComments?.(post.id)}
          >
            <MessageCircle className="h-4 w-4" />
            {post.commentsCount > 0 && (
              <span className="text-xs">{post.commentsCount}</span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-1.5 h-8", saved && "text-primary")}
            onClick={handleSave}
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir publicacao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita.
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
    </Card>
  );
}
