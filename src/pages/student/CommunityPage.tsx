import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { MessageSquare, PenSquare, Plus, Users } from "lucide-react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useProfiles } from "@/hooks/useProfiles";
import { useRestrictions } from "@/hooks/useRestrictions";
import { useStudents } from "@/hooks/useStudents";
import { renderCommunityIcon, detectIconType } from "@/lib/communityIcon";
import type { CommunityPost } from "@/types/student";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/courses/EmptyState";
import { PostCard } from "@/components/community/PostCard";
import { PostComments } from "@/components/community/PostComments";
import { CreatePostDialog } from "@/components/community/CreatePostDialog";
import { cn } from "@/lib/utils";

export default function CommunityPage() {
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { currentUserId } = useCurrentUser();
  const { findBySlug, getCommunitiesForStudent } = useCommunities();
  const { getPostsByCommunity, findPost } = usePosts();
  const { findProfile } = useProfiles();
  const { isRestricted } = useRestrictions();
  const { enrollments } = useStudents();

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const community = findBySlug(slug);
  const restricted = isRestricted(currentUserId);
  const myProfile = findProfile(currentUserId);

  const myCommunities = useMemo(
    () => getCommunitiesForStudent(currentUserId),
    [getCommunitiesForStudent, currentUserId]
  );
  const hasAccess = myCommunities.some((c) => c.slug === slug);

  const communityPosts = useMemo(
    () => (community ? getPostsByCommunity(community.id) : []),
    [community, getPostsByCommunity]
  );

  const pinnedPost: CommunityPost | null = community?.pinnedPostId
    ? findPost(community.pinnedPostId)
    : null;

  const regularPosts = useMemo(
    () =>
      pinnedPost
        ? communityPosts.filter((p) => p.id !== pinnedPost.id)
        : communityPosts,
    [communityPosts, pinnedPost]
  );

  // Count members: students enrolled in any class linked to this community
  const memberCount = useMemo(() => {
    if (!community) return 0;
    const studentIds = new Set<string>();
    enrollments.forEach((e) => {
      if (community.classIds.includes(e.classId)) {
        studentIds.add(e.studentId);
      }
    });
    return studentIds.size;
  }, [community, enrollments]);

  function toggleComments(postId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  useEffect(() => {
    if (!location.hash) return;

    const anchorId = decodeURIComponent(location.hash.slice(1));

    const scrollToPost = () => {
      const element = document.getElementById(anchorId);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const frameId = window.requestAnimationFrame(scrollToPost);
    const timeoutId = window.setTimeout(scrollToPost, 180);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [location.hash, regularPosts.length, pinnedPost?.id]);

  if (!community) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <EmptyState
          icon={MessageSquare}
          title="Comunidade não encontrada"
          description="A comunidade que você procura não existe."
        />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <EmptyState
          icon={MessageSquare}
          title="Acesso restrito"
          description="Você não tem acesso a esta comunidade."
        />
      </div>
    );
  }

  const canPost = community.settings.allowStudentPosts;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Cover image */}
      {community.coverUrl && (
        <div className="w-full h-[120px] sm:h-[200px] rounded-xl overflow-hidden">
          <img
            src={community.coverUrl}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Community header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-lg overflow-hidden shrink-0 ring-1 ring-border/30 flex items-center justify-center",
            detectIconType(community.iconUrl) === "image" ? "bg-muted" : "bg-primary/15 text-primary"
          )}>
            {renderCommunityIcon(community.iconUrl, 20)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{community.name}</h1>
              <Badge variant="secondary" className="text-[10px] gap-1 font-normal">
                <Users className="h-3 w-3" />
                {memberCount} {memberCount === 1 ? "membro" : "membros"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {community.description}
            </p>
          </div>
        </div>

        {canPost && (
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={restricted}
            className="gap-2 rounded-full shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20 active:scale-[0.97] transition-all shrink-0"
          >
            <PenSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nova publicação</span>
          </Button>
        )}
      </div>

      {/* Approval badge */}
      {community.settings.requireApproval && (
        <Badge variant="outline" className="text-xs">
          Posts requerem aprovação
        </Badge>
      )}

      {/* Create post input bar */}
      {canPost && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3 transition-all duration-200",
            "hover:border-border/60 hover:shadow-sm cursor-pointer"
          )}
          onClick={() => !restricted && setCreateOpen(true)}
        >
          <div className="h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0 ring-2 ring-border/30">
            {myProfile?.avatarUrl ? (
              <img src={myProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-sm">
                {(myProfile?.displayName ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 rounded-full bg-muted/50 border border-border/30 px-4 py-2 text-sm text-muted-foreground">
            {restricted ? "Você está restrito de publicar" : "No que você está pensando?"}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
            disabled={restricted}
            onClick={(e) => {
              e.stopPropagation();
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Pinned post */}
      {pinnedPost && (
        <div>
          <PostCard
            post={pinnedPost}
            showCommunity={false}
            isPinned
            onToggleComments={toggleComments}
          />
          {expandedComments.has(pinnedPost.id) && (
            <PostComments postId={pinnedPost.id} />
          )}
        </div>
      )}

      {/* Posts */}
      {regularPosts.length === 0 && !pinnedPost ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma publicação"
          description="Seja o primeiro a publicar nesta comunidade!"
        />
      ) : (
        <div className="space-y-4">
          {regularPosts.map((post, idx) => (
            <div key={post.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <PostCard
                post={post}
                showCommunity={false}
                onToggleComments={toggleComments}
              />
              {expandedComments.has(post.id) && (
                <PostComments postId={post.id} />
              )}
            </div>
          ))}
        </div>
      )}

      <CreatePostDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultCommunityId={community.id}
      />
    </div>
  );
}
