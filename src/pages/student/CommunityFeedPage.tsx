import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Rss, PenSquare } from "lucide-react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useProfiles } from "@/hooks/useProfiles";
import { useRestrictions } from "@/hooks/useRestrictions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/courses/EmptyState";
import { PostCard } from "@/components/community/PostCard";
import { PostComments } from "@/components/community/PostComments";
import { CreatePostDialog } from "@/components/community/CreatePostDialog";

export default function CommunityFeedPage() {
  const { currentUserId } = useCurrentUser();
  const { getCommunitiesForStudent } = useCommunities();
  const { getFeedPosts, getPostsByHashtag } = usePosts();
  const { findProfile } = useProfiles();
  const { isRestricted } = useRestrictions();

  const [searchParams] = useSearchParams();
  const tagFilter = searchParams.get("tag");

  const [filter, setFilter] = useState<"recent" | "popular" | "following">("recent");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const myCommunities = useMemo(
    () => getCommunitiesForStudent(currentUserId),
    [getCommunitiesForStudent, currentUserId]
  );

  const communityIds = useMemo(
    () => myCommunities.map((c) => c.id),
    [myCommunities]
  );

  const myProfile = findProfile(currentUserId);
  const followingIds = myProfile?.following ?? [];
  const restricted = isRestricted(currentUserId);

  const feedPosts = useMemo(() => {
    if (tagFilter) {
      return getPostsByHashtag(tagFilter, communityIds);
    }
    return getFeedPosts(communityIds, filter, followingIds);
  }, [tagFilter, getPostsByHashtag, getFeedPosts, communityIds, filter, followingIds]);

  function toggleComments(postId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">
            {tagFilter ? `#${tagFilter}` : "Feed"}
          </h1>
          {tagFilter && (
            <Badge variant="secondary" className="text-xs">
              {feedPosts.length} post{feedPosts.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          disabled={restricted}
        >
          <PenSquare className="mr-1.5 h-3.5 w-3.5" />
          Publicar
        </Button>
      </div>

      {/* Filter */}
      {!tagFilter && (
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as "recent" | "popular" | "following")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recente</SelectItem>
            <SelectItem value="popular">Mais curtido</SelectItem>
            <SelectItem value="following">Seguindo</SelectItem>
          </SelectContent>
        </Select>
      )}

      {feedPosts.length === 0 ? (
        <EmptyState
          icon={Rss}
          title={tagFilter ? "Nenhum post com essa tag" : "Feed vazio"}
          description={
            tagFilter
              ? "Nao ha publicacoes com essa hashtag."
              : "As comunidades que voce participa ainda nao tem publicacoes."
          }
        />
      ) : (
        <div className="space-y-3">
          {feedPosts.map((post) => (
            <div key={post.id}>
              <PostCard
                post={post}
                showCommunity
                onToggleComments={toggleComments}
              />
              {expandedComments.has(post.id) && (
                <PostComments postId={post.id} />
              )}
            </div>
          ))}
        </div>
      )}

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
