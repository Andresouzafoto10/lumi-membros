import { useState, useMemo } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Rss,
  Hash,
  Heart,
  Menu,
  X,
  MessageSquare,
} from "lucide-react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useProfiles } from "@/hooks/useProfiles";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CommunityLayout() {
  const location = useLocation();
  const { currentUserId } = useCurrentUser();
  const { getCommunitiesForStudent } = useCommunities();
  const { getTrendingHashtags, getTopPosts } = usePosts();
  const { findProfile } = useProfiles();

  const [mobileOpen, setMobileOpen] = useState(false);

  const myCommunities = useMemo(
    () => getCommunitiesForStudent(currentUserId),
    [getCommunitiesForStudent, currentUserId]
  );

  const communityIds = useMemo(
    () => myCommunities.map((c) => c.id),
    [myCommunities]
  );

  const trending = useMemo(
    () => getTrendingHashtags(communityIds, 5),
    [getTrendingHashtags, communityIds]
  );

  const topPosts = useMemo(
    () => getTopPosts(communityIds, 3),
    [getTopPosts, communityIds]
  );

  const isActive = (path: string) => location.pathname === path;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Main nav */}
      <div className="p-3 space-y-1">
        <Link
          to="/comunidade/feed"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive("/comunidade/feed") || isActive("/comunidade")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Rss className="h-4 w-4" />
          Feed
        </Link>

        {/* Communities */}
        {myCommunities.length > 0 && (
          <div className="pt-3">
            <p className="px-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Comunidades
            </p>
            {myCommunities.map((c) => (
              <Link
                key={c.id}
                to={`/comunidade/${c.slug}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(`/comunidade/${c.slug}`)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{c.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Trending + Top posts */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4 mt-2">
        {/* Trending hashtags */}
        {trending.length > 0 && (
          <div>
            <p className="px-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Hash className="h-3 w-3" />
              em Alta
            </p>
            <div className="space-y-0.5">
              {trending.map(({ tag, count }) => (
                <Link
                  key={tag}
                  to={`/comunidade/feed?tag=${tag}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-sidebar-accent/50 transition-colors"
                >
                  <span className="text-primary font-medium">#{tag}</span>
                  <span className="text-xs text-muted-foreground">
                    {count} post{count !== 1 ? "s" : ""}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top posts */}
        {topPosts.length > 0 && (
          <div>
            <p className="px-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Heart className="h-3 w-3" />
              Mais curtidos
            </p>
            <div className="space-y-1">
              {topPosts.map((post) => {
                const author = findProfile(post.authorId);
                return (
                  <div
                    key={post.id}
                    className="rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent/50 transition-colors"
                  >
                    <p className="line-clamp-1 font-medium">
                      {post.title || post.body.slice(0, 50)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{author?.displayName ?? "Anonimo"}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3" />
                        {post.likesCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r bg-sidebar flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-16 left-0 right-0 z-30 flex h-12 items-center justify-between border-b bg-background px-4 lg:hidden">
        <span className="text-sm font-semibold">Comunidade</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu comunidade"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ top: "7rem" }}>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-sidebar animate-slide-in overflow-y-auto">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 pt-12 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
