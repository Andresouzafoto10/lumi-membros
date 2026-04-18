import { useState, useMemo, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Hash,
  Heart,
  Menu,
  X,
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
import { isCommunityPublic } from "@/types/student";
import { getProxiedImageUrl } from "@/lib/imageProxy";

import { Button } from "@/components/ui/button";
import { GamificationRanking } from "@/components/community/GamificationRanking";
import { renderCommunityIcon } from "@/lib/communityIcon";
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

  const myCommunities = useMemo(
    () => getCommunitiesForStudent(currentUserId),
    [getCommunitiesForStudent, currentUserId]
  );

  const myCommIds = useMemo(() => new Set(myCommunities.map((c) => c.id)), [myCommunities]);

  const communityIds = useMemo(
    () => myCommunities.map((c) => c.id),
    [myCommunities]
  );

  const topHashtags = useMemo(
    () => getTrendingHashtags(undefined, communityIds),
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
  // Public communities (no classIds) are accessible to all authenticated users
  const sidebarList = useMemo(() => {
    return sidebarItems
      .map((item) => {
        const community = activeCommunities.find((c) => c.id === item.communityId);
        if (!community) return null;
        const hasAccess = myCommIds.has(community.id) || isCommunityPublic(community);
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
    // Sort: accessible communities first, then locked ones
    const combined = [...sidebarList, ...extras];
    return combined.sort((a, b) => {
      if (a.hasAccess === b.hasAccess) return 0;
      return a.hasAccess ? -1 : 1;
    });
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
            "relative flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-transparent before:transition-colors",
            isFeed
              ? "border-border/60 bg-muted/70 text-foreground shadow-sm before:bg-primary"
              : "text-muted-foreground hover:border-border/40 hover:bg-muted/55 hover:text-foreground hover:before:bg-primary/35"
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
                    className="relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm text-muted-foreground/55 transition-all duration-200 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-transparent before:transition-colors hover:border-border/30 hover:bg-muted/45 hover:text-foreground/80 hover:before:bg-border"
                    title="Você não tem acesso a esta comunidade"
                  >
                    <span className="text-base shrink-0 grayscale opacity-50">{renderCommunityIcon(item.community.iconUrl || item.emoji, 18)}</span>
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
                    "relative flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm transition-all duration-200 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-transparent before:transition-colors",
                    active
                      ? "border-border/60 bg-muted/70 text-foreground shadow-sm before:bg-primary"
                      : "font-normal text-muted-foreground hover:border-border/40 hover:bg-muted/55 hover:text-foreground hover:before:bg-primary/35"
                  )}
                >
                  <span className="text-base shrink-0">{renderCommunityIcon(item.community.iconUrl || item.emoji, 18)}</span>
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
      {/* Top posts */}
      {topPosts.length > 0 && (
        <div>
          <div className="mb-3">
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Flame className="h-3 w-3" />
              Mais curtidos do mês
            </p>
          </div>
          <div className="space-y-2.5">
            {topPosts.map((post, index) => {
              const author = findProfile(post.authorId);
              const community = activeCommunities.find((item) => item.id === post.communityId);
              const href = community
                ? `/comunidade/${community.slug}#${post.id}`
                : `/comunidade/feed#${post.id}`;

              return (
                <Link
                  key={post.id}
                  to={href}
                  onClick={() => setMobileOpen(false)}
                  className="group/top flex items-start gap-2.5 rounded-xl border border-border/30 bg-card/35 px-3 py-2.5 text-sm transition-all duration-200 hover:border-primary/30 hover:bg-muted/40"
                >
                  <span className="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[12px] font-semibold leading-5 text-foreground/90 transition-colors group-hover/top:text-foreground">
                      {post.title || post.body.slice(0, 72)}
                    </p>

                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/75">
                      <div className="h-5 w-5 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border/20">
                        {author?.avatarUrl ? (
                          <img src={getProxiedImageUrl(author.avatarUrl)} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-[8px] font-bold">
                            {(author?.displayName ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="truncate">{author?.displayName ?? "Anônimo"}</span>
                    </div>

                    {community && (
                      <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">
                        {community.name}
                      </p>
                    )}
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                    <Heart className="h-3 w-3 fill-current" />
                    <span className="tabular-nums">{post.likesCount}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Top hashtags */}
      {topHashtags.length > 0 && (
        <div>
          <div className="border-t border-border/20 pt-4 mb-3">
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Hashtags mais usadas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {topHashtags.map(({ tag, count }) => (
              <Link
                key={tag}
                to={`/comunidade/feed?tag=${tag}`}
                className="group/tag inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
              >
                <Hash className="h-3.5 w-3.5" />
                <span>#{tag}</span>
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/70 transition-colors group-hover/tag:text-primary">
                  {count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Gamification Ranking */}
      <div>
        <div className="border-t border-border/20 pt-4 mb-3">
          <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            Ranking de pontos
          </p>
        </div>
        <GamificationRanking limit={5} compact />
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      {/* Desktop LEFT sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-border/40 bg-background flex-col overflow-y-auto">
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
          <div className="absolute left-0 top-0 h-full w-[260px] bg-background animate-slide-in overflow-y-auto">
            {leftSidebar}
          </div>
        </div>
      )}

      {/* Main content — only this area scrolls */}
      <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        <Outlet />
      </main>

      {/* Desktop RIGHT sidebar */}
      <aside className="hidden xl:flex w-[260px] shrink-0 border-l border-border/40 bg-background flex-col overflow-y-auto">
        {rightSidebar}
      </aside>
    </div>
  );
}
