import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Plus, PenSquare } from "lucide-react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useProfiles } from "@/hooks/useProfiles";
import { useRestrictions } from "@/hooks/useRestrictions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


import { EmptyState } from "@/components/courses/EmptyState";
import { PostCard } from "@/components/community/PostCard";
import { PostComments } from "@/components/community/PostComments";
import { CreatePostDialog } from "@/components/community/CreatePostDialog";
import { cn } from "@/lib/utils";

export default function CommunityFeedPage() {
  const location = useLocation();
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
  }, [location.hash, feedPosts.length]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
          onClick={() => setCreateOpen(true)}
          disabled={restricted}
          className="gap-2 rounded-full shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20 active:scale-[0.97] transition-all shrink-0"
        >
          <PenSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nova publicação</span>
        </Button>
      </div>

      {/* Filter chips */}
      {!tagFilter && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {(["recent", "popular", "following"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                filter === v
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {v === "recent" ? "Recente" : v === "popular" ? "Popular" : "Seguindo"}
            </button>
          ))}
        </div>
      )}

      {/* Create post input bar */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3 transition-all duration-200",
          "hover:border-border/60 hover:shadow-sm cursor-pointer"
        )}
        onClick={() => !restricted && setCreateOpen(true)}
      >
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0 ring-2 ring-border/30">
          {myProfile?.avatarUrl ? (
            <img src={myProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-sm">
              {(myProfile?.displayName ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Placeholder input */}
        <div className="flex-1 rounded-full bg-muted/50 border border-border/30 px-4 py-2 text-sm text-muted-foreground">
          {restricted ? "Você está restrito de publicar" : "No que você está pensando?"}
        </div>

        {/* Plus button */}
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

      {/* Posts */}
      {feedPosts.length === 0 ? (
        <EmptyState
          icon={PenSquare}
          title={tagFilter ? "Nenhum post com essa tag" : "Feed vazio"}
          description={
            tagFilter
              ? "Não há publicações com essa hashtag."
              : "As comunidades que você participa ainda não têm publicações."
          }
        />
      ) : (
        <div className="space-y-4">
          {feedPosts.map((post, idx) => (
            <div key={post.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
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
