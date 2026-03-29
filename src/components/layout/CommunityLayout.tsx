import { useState, useMemo, useEffect } from "react";
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
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useProfiles } from "@/hooks/useProfiles";
import { useSidebarConfig } from "@/hooks/useSidebarConfig";
import { useCommunityLastSeen } from "@/hooks/useCommunityLastSeen";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommunityLayout() {
  const location = useLocation();
  const { currentUserId } = useCurrentUser();
  const { getCommunitiesForStudent, activeCommunities } = useCommunities();
  const { getTrendingHashtags, getTopPosts, getPostsByCommunity } = usePosts();
  const { findProfile } = useProfiles();
  const { items: sidebarItems } = useSidebarConfig();
  const { getLastSeen, markSeen } = useCommunityLastSeen();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [trendingPeriod, setTrendingPeriod] = useState<"week" | "month">("week");

  const myCommunities = useMemo(
    () => getCommunitiesForStudent(currentUserId),
    [getCommunitiesForStudent, currentUserId]
  );

  const myCommIds = useMemo(() => new Set(myCommunities.map((c) => c.id)), [myCommunities]);

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

  // Unread counts per community
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of myCommunities) {
      const lastSeen = getLastSeen(c.id);
      if (!lastSeen) {
        // Never visited — count all published posts
        const posts = getPostsByCommunity(c.id);
        counts[c.id] = posts.length;
      } else {
        const posts = getPostsByCommunity(c.id);
        counts[c.id] = posts.filter(
          (p) => new Date(p.createdAt) > new Date(lastSeen)
        ).length;
      }
    }
    return counts;
  }, [myCommunities, getLastSeen, getPostsByCommunity]);

  // Mark community as seen when navigating to it
  const currentSlug = location.pathname.match(/^\/comunidade\/([^/]+)$/)?.[1];
  useEffect(() => {
    if (!currentSlug || currentSlug === "feed") return;
    const community = myCommunities.find((c) => c.slug === currentSlug);
    if (community) {
      markSeen(community.id);
    }
  }, [currentSlug, myCommunities, markSeen]);

  const isActive = (path: string) => location.pathname === path;
  const isFeed = isActive("/comunidade/feed") || isActive("/comunidade");

  // Build sidebar list: sidebar config items mapped to communities, in order
  const sidebarList = useMemo(() => {
    return sidebarItems
      .map((item) => {
        const community = activeCommunities.find((c) => c.id === item.communityId);
        if (!community) return null;
        const hasAccess = myCommIds.has(community.id);
        return { ...item, community, hasAccess };
      })
      .filter(Boolean) as Array<{
        id: string;
        communityId: string;
        emoji: string;
        order: number;
        visible: boolean;
        salesPageUrl: string;
        community: (typeof activeCommunities)[number];
        hasAccess: boolean;
      }>;
  }, [sidebarItems, activeCommunities, myCommIds]);

  // Also add communities the student has access to but aren't in sidebar config
  const fullSidebarList = useMemo(() => {
    const configuredIds = new Set(sidebarList.map((i) => i.communityId));
    const extras = myCommunities
      .filter((c) => !configuredIds.has(c.id))
      .map((c) => ({
        id: `auto-${c.id}`,
        communityId: c.id,
        emoji: "💬",
        order: 999,
        visible: true,
        salesPageUrl: "",
        community: c,
        hasAccess: true,
      }));
    return [...sidebarList, ...extras];
  }, [sidebarList, myCommunities]);

  function handleLockedClick(item: typeof fullSidebarList[number]) {
    if (item.salesPageUrl) {
      window.open(item.salesPageUrl, "_blank");
    } else {
      toast.info("Você não tem acesso a esta comunidade. Entre em contato com o suporte.");
    }
  }

  // ── Left sidebar content ──
  const leftSidebar = (
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
      {fullSidebarList.length > 0 && (
        <div className="px-3 pt-4">
          <div className="border-b border-border/30 pb-3 mb-1">
            <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em]">
              Comunidades
            </p>
          </div>
          <div className="space-y-0.5">
            {fullSidebarList.map((item) => {
              const active = isActive(`/comunidade/${item.community.slug}`);
              const unread = item.hasAccess ? (unreadCounts[item.communityId] ?? 0) : 0;

              if (!item.hasAccess) {
                // Show locked but visible communities
                if (!item.visible) return null;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleLockedClick(item)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm w-full text-left text-muted-foreground/50 hover:bg-sidebar-accent/30 transition-all duration-200 cursor-pointer"
                    title="Você não tem acesso a esta comunidade"
                  >
                    <span className="text-base shrink-0 grayscale opacity-50">{item.emoji}</span>
                    <span className="truncate">{item.community.name}</span>
                    <Lock className="h-3 w-3 ml-auto shrink-0 opacity-50" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.id}
                  to={`/comunidade/${item.community.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[2px] pl-[14px]"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 font-normal"
                  )}
                >
                  <span className="text-base shrink-0">{item.emoji}</span>
                  <span className="truncate">{item.community.name}</span>
                  {unread > 0 && !active && (
                    <span className="ml-auto shrink-0 flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold tabular-nums">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ── Right sidebar content ──
  const rightSidebar = (
    <div className="flex flex-col h-full p-4 space-y-5">
      {/* Trending hashtags */}
      {trending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              em Alta
            </p>
            <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">
              <button
                onClick={() => setTrendingPeriod("week")}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all",
                  trendingPeriod === "week"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Semana
              </button>
              <button
                onClick={() => setTrendingPeriod("month")}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all",
                  trendingPeriod === "month"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Mês
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {trending.map(({ tag, count }) => (
              <Link
                key={tag}
                to={`/comunidade/feed?tag=${tag}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-primary/5 transition-colors group/tag"
              >
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary/60" />
                  <span className="text-primary font-medium group-hover/tag:brightness-125">{tag}</span>
                </span>
                <span className="text-[10px] text-muted-foreground/60 bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium tabular-nums">
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
          <div className="border-t border-border/20 pt-4 mb-3">
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Flame className="h-3 w-3" />
              Mais curtidos do mês
            </p>
          </div>
          <div className="space-y-2">
            {topPosts.map((post) => {
              const author = findProfile(post.authorId);
              return (
                <div
                  key={post.id}
                  className="rounded-lg px-3 py-2.5 text-sm hover:bg-muted/30 transition-colors cursor-pointer border border-border/10 hover:border-border/30 group/top"
                >
                  <p className="line-clamp-2 font-medium text-[13px] leading-snug group-hover/top:text-foreground transition-colors">
                    {post.title || post.body.slice(0, 80)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-2">
                    {/* Mini avatar */}
                    <div className="h-5 w-5 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border/20">
                      {author?.avatarUrl ? (
                        <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-[8px] font-bold">
                          {(author?.displayName ?? "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="truncate">{author?.displayName ?? "Anônimo"}</span>
                    <span className="ml-auto flex items-center gap-1 text-red-500/70 shrink-0">
                      <Heart className="h-3 w-3 fill-current" />
                      <span className="tabular-nums font-medium">{post.likesCount}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="dark flex h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      {/* Desktop LEFT sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-border/30 bg-sidebar flex-col overflow-y-auto">
        {leftSidebar}
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
          <div className="absolute left-0 top-0 h-full w-[260px] bg-sidebar animate-slide-in overflow-y-auto">
            {leftSidebar}
          </div>
        </div>
      )}

      {/* Main content — only this area scrolls */}
      <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        <Outlet />
      </main>

      {/* Desktop RIGHT sidebar */}
      <aside className="hidden xl:flex w-[280px] shrink-0 border-l border-border/30 bg-sidebar/50 flex-col overflow-y-auto">
        {rightSidebar}
      </aside>
    </div>
  );
}
