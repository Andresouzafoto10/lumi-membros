import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { MessageSquare, PenSquare } from "lucide-react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useRestrictions } from "@/hooks/useRestrictions";
import type { CommunityPost } from "@/types/student";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/courses/EmptyState";
import { PostCard } from "@/components/community/PostCard";
import { PostComments } from "@/components/community/PostComments";
import { CreatePostDialog } from "@/components/community/CreatePostDialog";

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { currentUserId } = useCurrentUser();
  const { findBySlug, getCommunitiesForStudent } = useCommunities();
  const { getPostsByCommunity, findPost } = usePosts();
  const { isRestricted } = useRestrictions();

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const community = findBySlug(slug);
  const restricted = isRestricted(currentUserId);

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

  function toggleComments(postId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  if (!community) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <EmptyState
          icon={MessageSquare}
          title="Comunidade nao encontrada"
          description="A comunidade que voce procura nao existe."
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
          description="Voce nao tem acesso a esta comunidade."
        />
      </div>
    );
  }

  const canPost = community.settings.allowStudentPosts;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Community header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
            {community.iconUrl ? (
              <img
                src={community.iconUrl}
                alt={community.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">{community.name}</h1>
            <p className="text-sm text-muted-foreground">
              {community.description}
            </p>
            {community.settings.requireApproval && (
              <Badge variant="outline" className="mt-1 text-xs">
                Posts requerem aprovacao
              </Badge>
            )}
          </div>
        </div>
        {canPost && (
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={restricted}
          >
            <PenSquare className="mr-1.5 h-3.5 w-3.5" />
            Publicar
          </Button>
        )}
      </div>

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
          title="Nenhuma publicacao"
          description="Seja o primeiro a publicar nesta comunidade!"
        />
      ) : (
        <div className="space-y-3">
          {regularPosts.map((post) => (
            <div key={post.id}>
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
