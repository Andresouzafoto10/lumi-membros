import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
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
  FileText,
  Check,
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
import { useGamificationConfig } from "@/hooks/useGamificationConfig";
import { getMemberBadges } from "@/lib/roleBadges";
import { LevelBadge } from "@/components/gamification/LevelBadge";

import { Button } from "@/components/ui/button";
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
import { CreatePostDialog } from "@/components/community/CreatePostDialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Markdown preprocessor: convert @mentions and #hashtags to markdown links
// ---------------------------------------------------------------------------
function preprocessBody(
  body: string,
  profiles: { username: string; studentId: string }[]
): string {
  let processed = body;

  // Convert @mentions to markdown links
  processed = processed.replace(
    /(^|\s)@([\w.]+)/gm,
    (_match, prefix: string, username: string) => {
      const profile = profiles.find(
        (p) => p.username === username.toLowerCase()
      );
      if (profile) {
        return `${prefix}[@${username}](/perfil/${profile.studentId})`;
      }
      return `${prefix}@${username}`;
    }
  );

  // Convert #hashtags to links (#word with no space after # = hashtag, not heading)
  processed = processed.replace(
    /(^|\s)#([\w-]+)/gm,
    "$1[#$2](/comunidade/feed?tag=$2)"
  );

  // Single newlines → markdown hard breaks (two trailing spaces)
  processed = processed.replace(/([^\n])\n(?!\n)/g, "$1  \n");

  return processed;
}

// Markdown components: internal links use React Router <Link>
const mdComponents = {
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => {
    if (href?.startsWith("/")) {
      return (
        <Link to={href} className="text-primary hover:underline font-medium">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {children}
      </a>
    );
  },
};

// Prose class string for post body rendering
const PROSE_CLASSES = [
  "prose prose-sm dark:prose-invert max-w-none",
  "prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1",
  "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
  "prose-p:text-foreground/90 prose-p:my-1 prose-p:leading-relaxed",
  "prose-strong:text-foreground",
  "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-3 prose-pre:my-2",
  "prose-blockquote:border-l-2 prose-blockquote:border-primary/50 prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-2",
  "prose-ul:list-disc prose-ul:pl-5 prose-ul:my-1",
  "prose-ol:list-decimal prose-ol:pl-5 prose-ol:my-1",
  "prose-li:my-0.5 prose-li:text-foreground/90",
  "prose-hr:border-border/40 prose-hr:my-3",
].join(" ");

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
// Helpers
// ---------------------------------------------------------------------------
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Poll display with voting
// ---------------------------------------------------------------------------
function PostPollDisplay({
  poll,
  postId,
  currentUserId,
  onVote,
}: {
  poll: NonNullable<import("@/types/student").CommunityPost["poll"]>;
  postId: string;
  currentUserId: string;
  onVote: (postId: string, optionId: string, userId: string) => void;
}) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votedBy.length, 0);
  const hasVoted = poll.options.some((o) => o.votedBy.includes(currentUserId));
  const expired = new Date(poll.endsAt) < new Date();

  return (
    <div className="mt-3 pl-[52px]">
      <p className="font-semibold text-sm mb-2.5">{poll.question}</p>
      <div className="space-y-2">
        {poll.options.map((option) => {
          const votes = option.votedBy.length;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isMyVote = option.votedBy.includes(currentUserId);

          if (hasVoted || expired) {
            return (
              <div
                key={option.id}
                className="relative rounded-lg overflow-hidden border border-border/30"
              >
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-lg transition-all duration-500",
                    isMyVote ? "bg-primary/20" : "bg-muted/50"
                  )}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative px-3 py-2 flex items-center justify-between text-sm">
                  <span className={cn("flex items-center gap-1.5", isMyVote && "font-medium")}>
                    {option.text}
                    {isMyVote && <Check className="h-3.5 w-3.5 text-primary" />}
                  </span>
                  <span className="font-medium text-muted-foreground text-xs">{pct}%</span>
                </div>
              </div>
            );
          }

          return (
            <button
              key={option.id}
              className="w-full rounded-lg border border-border/40 px-3 py-2 text-sm text-left hover:border-primary/40 hover:bg-primary/5 transition-colors active:scale-[0.99]"
              onClick={() => onVote(postId, option.id, currentUserId)}
            >
              {option.text}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground/60 mt-2">
        {totalVotes} {totalVotes === 1 ? "voto" : "votos"}
        {expired && " · Encerrada"}
      </p>
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
  const { toggleLike, toggleSave, deletePost, votePoll } = usePosts();
  const { findCommunity } = useCommunities();
  const { getPlayerData, getPlayerMissions } = useGamification();
  const { getLevelForPoints } = useGamificationConfig();

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const author = findProfile(post.authorId);
  const community = findCommunity(post.communityId);
  const playerData = getPlayerData(post.authorId);
  const completedMissions = getPlayerMissions(post.authorId);
  const memberBadges = getMemberBadges(
    author?.role,
    undefined,
    playerData.points,
    completedMissions.length
  );
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
              <div className="text-sm leading-relaxed [&_p]:inline">
                <ReactMarkdown components={mdComponents}>
                  {preprocessBody(post.body, profiles)}
                </ReactMarkdown>
              </div>
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
            <div className="h-9 w-9 rounded-full overflow-hidden bg-muted ring-2 ring-border/30 hover:ring-primary/30 transition-all sm:h-10 sm:w-10">
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
              {memberBadges.slice(0, 2).map((badge) => (
                <span
                  key={badge.label}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full text-[10px] px-2 py-0.5 border font-medium",
                    badge.colorClass
                  )}
                >
                  {badge.emoji} {badge.label}
                </span>
              ))}
              {memberBadges.length > 2 && (
                <span className="text-[10px] text-muted-foreground/60 font-medium">
                  +{memberBadges.length - 2}
                </span>
              )}
              {playerData.points > 0 && (() => {
                const lvl = getLevelForPoints(playerData.points);
                return (
                  <LevelBadge
                    iconName={lvl.iconName}
                    iconColor={lvl.iconColor}
                    levelName={lvl.name}
                  />
                );
              })()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-0.5">
              <span>
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              {post.updatedAt !== post.createdAt && (
                <span className="text-muted-foreground/50">(editado)</span>
              )}
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
                          setEditOpen(true);
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
        <div className={cn("mt-2 pl-[52px]", PROSE_CLASSES)}>
          <ReactMarkdown components={mdComponents}>
            {preprocessBody(post.body, profiles)}
          </ReactMarkdown>
        </div>

        {/* Images */}
        <div className="pl-[52px]">
          <ImageGrid images={post.images} />
        </div>

        {/* Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="mt-3 pl-[52px] space-y-1.5">
            {post.attachments.map((att, i) => (
              <a
                key={i}
                href={att.dataUrl}
                download={att.name}
                className="flex items-center gap-2 rounded-lg border border-border/30 px-3 py-2 hover:bg-accent/50 transition-colors group/att"
              >
                <FileText className="h-4 w-4 text-muted-foreground group-hover/att:text-primary shrink-0" />
                <span className="text-sm truncate">{att.name}</span>
                <span className="text-xs text-muted-foreground/60 shrink-0 ml-auto">
                  {formatFileSize(att.size)}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Poll */}
        {post.poll && (
          <PostPollDisplay
            poll={post.poll}
            postId={post.id}
            currentUserId={currentUserId}
            onVote={votePoll}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3 pl-[40px]">
          {/* Like */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 h-9 rounded-full transition-all active:scale-90",
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
            className="gap-1.5 h-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
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
              "gap-1.5 h-9 rounded-full transition-all active:scale-90",
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
            className="gap-1.5 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-90"
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

      {/* Edit dialog */}
      {isOwn && (
        <CreatePostDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          editPost={{
            id: post.id,
            title: post.title,
            body: post.body,
            images: post.images,
            attachments: post.attachments ?? [],
            poll: post.poll ?? null,
            communityId: post.communityId,
          }}
        />
      )}
    </div>
  );
}
