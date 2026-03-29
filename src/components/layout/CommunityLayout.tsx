import { useState, useMemo } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Hash,
  Heart,
  Menu,
  X,
  MessageCircle,
  TrendingUp,
  Flame,
} from "lucide-react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useProfiles } from "@/hooks/useProfiles";

import { Button } from "@/components/ui/button";
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
  const isFeed = isActive("/comunidade/feed") || isActive("/comunidade");
  const isInSpecificCommunity = !isFeed && location.pathname.startsWith("/comunidade/");

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Feed nav */}
      <div className="p-3 pb-0">
        <Link
          to="/comunidade/feed"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            isFeed
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Feed
        </Link>
      </div>

      {/* Communities */}
      {myCommunities.length > 0 && (
        <div className="px-3 pt-4">
          <div className="border-b border-border/30 pb-3 mb-1">
            <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em]">
              Comunidades
            </p>
          </div>
          <div className="space-y-0.5">
            {myCommunities.map((c) => {
              const active = isActive(`/comunidade/${c.slug}`);
              return (
                <Link
                  key={c.id}
                  to={`/comunidade/${c.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[2px] pl-[14px]"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 font-normal"
                  )}
                >
                  <MessageCircle className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                  <span className="truncate">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Trending + Top posts */}
      <div className="flex-1 px-3 pb-4 space-y-3 mt-3">
        {/* Trending hashtags */}
        {trending.length > 0 && (
          <div>
            <div className="border-b border-border/30 pb-3 mb-2">
              <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                em Alta
              </p>
            </div>
            <div className="space-y-0.5">
              {trending.map(({ tag, count }) => (
                <Link
                  key={tag}
                  to={`/comunidade/feed?tag=${tag}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm hover:bg-primary/5 transition-colors group/tag"
                >
                  <span className="text-primary font-medium group-hover/tag:brightness-125">#{tag}</span>
                  <span className="text-[10px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-full font-medium tabular-nums">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top posts */}
        {topPosts.length > 0 && (
          <div>
            <div className="border-b border-border/30 pb-3 mb-2">
              <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] flex items-center gap-1.5">
                <Flame className="h-3 w-3" />
                Mais curtidos
              </p>
            </div>
            <div className="space-y-1">
              {topPosts.map((post) => {
                const author = findProfile(post.authorId);
                return (
                  <div
                    key={post.id}
                    className="rounded-lg px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors cursor-pointer group/top"
                  >
                    <p className="line-clamp-1 font-medium text-[13px] group-hover/top:text-foreground transition-colors">
                      {post.title || post.body.slice(0, 50)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mt-1.5">
                      {/* Mini avatar */}
                      <div className="h-4 w-4 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border/30">
                        {author?.avatarUrl ? (
                          <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-[8px] font-bold">
                            {(author?.displayName ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="truncate">{author?.displayName ?? "Anonimo"}</span>
                      <span className="ml-auto flex items-center gap-0.5 text-red-500/70 shrink-0">
                        <Heart className="h-3 w-3 fill-current" />
                        <span className="tabular-nums">{post.likesCount}</span>
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border/50 bg-sidebar flex-col overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-16 left-0 right-0 z-30 flex h-12 items-center justify-between border-b bg-background/95 backdrop-blur-sm px-4 lg:hidden">
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-sidebar animate-slide-in overflow-y-auto">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main content — only this area scrolls */}
      <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
