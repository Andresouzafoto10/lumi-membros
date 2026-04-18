import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Outlet, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  Home,
  MessageSquare,
  PlayCircle,
  Settings,
  Search,
  X,
  Award,
  Trophy,
  User,
  LogOut,
  Video,
  Route,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { MobileSearchOverlay } from "@/components/layout/MobileSearchOverlay";
import { SearchResultItem } from "@/components/layout/SearchResultItem";
import { SearchProvider } from "@/hooks/useSearchContext";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/layout/Footer";
import { onDailyLogin, onStreak7Days, onStreak30Days } from "@/lib/gamificationEngine";
import { recordLoginStreak } from "@/lib/streakTracker";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useActiveScriptInjections } from "@/hooks/useScriptInjections";
import { useNavMenuItems } from "@/hooks/useNavMenuItems";
import { injectScripts } from "@/lib/injectScripts";
import { getProxiedImageUrl } from "@/lib/imageProxy";

/** Tracks daily login + streak (fires once per day per user) */
function DailyLoginTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toDateString();
    const key = `lumi-daily-login:${user.id}`;
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);

    // Award daily login points
    onDailyLogin(user.id).catch(() => {});

    // Check streak
    const { awardStreak7, awardStreak30 } = recordLoginStreak(user.id);
    if (awardStreak7) onStreak7Days(user.id).catch(() => {});
    if (awardStreak30) onStreak30Days(user.id).catch(() => {});
  }, [user?.id]);

  return null;
}

function DesktopGlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { courses, lessons, posts, loading, total } = useGlobalSearch(query);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const showDropdown = open && query.trim().length >= 2;
  const showNoResults = showDropdown && !loading && total === 0;

  const handleNavigate = (href: string) => {
    navigate(href);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        placeholder="Buscar cursos, aulas, posts..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="pl-8 pr-8 h-9 w-[200px] lg:w-[280px] text-sm"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          aria-label="Limpar busca"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {showDropdown && (
        <div className="absolute right-0 top-full z-[200] mt-2 max-h-[70vh] w-[340px] overflow-y-auto rounded-lg border border-border/70 bg-popover p-2 shadow-xl animate-fade-in lg:w-[400px]">
          {loading && (
            <div className="space-y-3 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted animate-pulse-soft" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted animate-pulse-soft" />
                    <div className="h-2 w-1/2 rounded bg-muted animate-pulse-soft" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {showNoResults && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado para "{query.trim()}"
            </p>
          )}

          {!loading && total > 0 && (
            <>
              {courses.length > 0 && (
                <section className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cursos
                  </p>
                  {courses.slice(0, 3).map((c) => (
                    <SearchResultItem
                      key={c.id}
                      icon={BookOpen}
                      title={c.title}
                      subtitle={c.sessionTitle ? `Sessao: ${c.sessionTitle}` : undefined}
                      badge="Curso"
                      badgeColor="bg-primary/15 text-primary"
                      query={query}
                      onClick={() => handleNavigate(`/cursos/${c.id}`)}
                    />
                  ))}
                </section>
              )}

              {lessons.length > 0 && (
                <section className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Aulas
                  </p>
                  {lessons.slice(0, 3).map((l) => (
                    <SearchResultItem
                      key={l.id}
                      icon={PlayCircle}
                      title={l.title}
                      subtitle={`em: ${l.courseTitle}`}
                      badge="Aula"
                      badgeColor="bg-amber-500/15 text-amber-500"
                      query={query}
                      onClick={() => handleNavigate(`/cursos/${l.courseId}/aulas/${l.id}`)}
                    />
                  ))}
                </section>
              )}

              {posts.length > 0 && (
                <section>
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Comunidade
                  </p>
                  {posts.slice(0, 2).map((p) => (
                    <SearchResultItem
                      key={p.id}
                      icon={MessageSquare}
                      title={p.title}
                      subtitle={`por @${p.authorName}`}
                      badge="Post"
                      badgeColor="bg-violet-500/15 text-violet-500"
                      query={query}
                      onClick={() =>
                        handleNavigate(`/comunidade/${p.communitySlug}?post=${p.id}`)
                      }
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MobileSearchButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Buscar"
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-90 sm:hidden"
    >
      <Search className="h-4 w-4" />
    </button>
  );
}

function HeaderNavLink({
  to,
  label,
  end = false,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "relative text-sm font-semibold tracking-[-0.01em] transition-colors duration-200",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <span className="relative inline-flex items-center py-2">
          {label}
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 -bottom-[11px] h-0.5 rounded-full bg-primary transition-opacity duration-200",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
        </span>
      )}
    </NavLink>
  );
}

function ProfileHeaderButton() {
  const { currentUserId } = useCurrentUser();
  const { findProfile } = useProfiles();
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const profile = findProfile(currentUserId);
  const fallbackLetter =
    profile?.displayName?.charAt(0).toUpperCase() ??
    profile?.username?.charAt(0).toUpperCase() ??
    "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const avatarEl = (
    <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background px-1.5 py-1 shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-primary/15 md:h-9 md:w-9">
        {profile?.avatarUrl ? (
          <img
            src={getProxiedImageUrl(profile.avatarUrl)}
            alt={profile.displayName}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-bold text-primary">
            {fallbackLetter}
          </span>
        )}
      </div>
      <ChevronDown className="mr-1 hidden h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground sm:block" />
    </div>
  );

  return (
    <>
      {/* Desktop dropdown */}
      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Menu do perfil"
              className="group cursor-pointer outline-none"
            >
              {avatarEl}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            collisionPadding={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-56 z-[200]"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name ?? profile?.displayName ?? "Usuário"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email ?? ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => navigate("/meu-perfil")}
            >
              <User className="h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => navigate("/admin")}
                >
                  <Settings className="h-4 w-4" />
                  Painel Admin
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile bottom sheet */}
      <div className="md:hidden">
        <button
          aria-label="Menu do perfil"
          className="group cursor-pointer outline-none"
          onClick={() => setSheetOpen(true)}
        >
          {avatarEl}
        </button>
        {sheetOpen && createPortal(
          <>
            <div
              className="fixed inset-0 z-[190] bg-black/50 backdrop-blur-sm"
              onClick={() => setSheetOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-[200] rounded-t-2xl border-t bg-popover shadow-lg animate-slide-up">
              <div className="mx-auto my-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
              <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-primary/15">
                    {profile?.avatarUrl ? (
                      <img
                        src={getProxiedImageUrl(profile.avatarUrl)}
                        alt={profile.displayName}
                        className="h-full w-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-bold text-primary">
                        {fallbackLetter}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {user?.name ?? profile?.displayName ?? "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email ?? ""}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent active:scale-[0.98]"
                    onClick={() => {
                      setSheetOpen(false);
                      navigate("/meu-perfil");
                    }}
                  >
                    <User className="h-5 w-5 text-muted-foreground" />
                    Meu Perfil
                  </button>
                  {isAdmin && (
                    <button
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent active:scale-[0.98]"
                      onClick={() => {
                        setSheetOpen(false);
                        navigate("/admin");
                      }}
                    >
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      Painel Admin
                    </button>
                  )}
                  <div className="my-2 h-px bg-border" />
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.98]"
                    onClick={() => {
                      setSheetOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="h-5 w-5" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    </>
  );
}

const FALLBACK_ICON_MAP: Record<string, LucideIcon> = {
  Home,
  MessageSquare,
  Trophy,
  Award,
  Video,
  Route,
};

const FALLBACK_NAV = [
  { to: "/cursos", label: "Inicio", icon: Home, end: true },
  { to: "/trilhas", label: "Trilhas", icon: Route, end: false },
  { to: "/aulas-ao-vivo", label: "Ao Vivo", icon: Video, end: true },
  { to: "/comunidade/feed", label: "Comunidade", icon: MessageSquare, end: false },
  { to: "/ranking", label: "Ranking", icon: Trophy, end: true },
  { to: "/meus-certificados", label: "Certificados", icon: Award, end: true },
];

function getLucideIcon(name: string | null): LucideIcon {
  if (!name) return Home;
  if (name in FALLBACK_ICON_MAP) return FALLBACK_ICON_MAP[name];
  const icon = (LucideIcons as Record<string, unknown>)[name];
  if (typeof icon === "function") return icon as LucideIcon;
  return Home;
}

function MobileBottomNav() {
  const { items: menuItems } = useNavMenuItems("student");

  const items = useMemo(() => {
    if (menuItems.length === 0) return FALLBACK_NAV;
    return menuItems
      .filter((i) => i.visible && !i.is_external)
      .map((i) => ({
        to: i.url ?? "/cursos",
        label: i.label,
        icon: getLucideIcon(i.icon),
        end: i.url === "/cursos" || i.url === "/ranking" || i.url === "/meus-certificados",
      }));
  }, [menuItems]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 md:hidden">
      <div className="mx-auto flex w-full items-center gap-1.5 rounded-[22px] border border-border/70 bg-background p-1.5 shadow-[0_-6px_18px_rgba(15,23,42,0.04)]">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "relative flex min-h-[50px] flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-2 py-1.5 text-[0.68rem] font-semibold tracking-[-0.01em] transition-all duration-200 active:scale-95",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-1.5 h-1 w-1 rounded-full bg-primary" />
                )}
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function StudentScriptInjector() {
  const { scripts } = useActiveScriptInjections("student");
  const location = useLocation();

  useEffect(() => {
    if (scripts.length > 0) {
      injectScripts(scripts, "student");
    }
  }, [scripts, location.pathname]);

  return null;
}

type DesktopNavItem = {
  to: string;
  label: string;
  isExternal: boolean;
  target: string;
};

function DesktopNav() {
  const { items: menuItems } = useNavMenuItems("student");

  const navItems = useMemo((): DesktopNavItem[] => {
    if (menuItems.length === 0) {
      return FALLBACK_NAV.map((i) => ({
        to: i.to,
        label: i.label,
        isExternal: false,
        target: "_self",
      }));
    }
    return menuItems
      .filter((i) => i.visible)
      .map((i) => ({
        to: i.url ?? "/cursos",
        label: i.label,
        isExternal: i.is_external,
        target: i.target,
      }));
  }, [menuItems]);

  return (
    <div className="hidden items-center gap-6 md:flex">
      {navItems.map((item) =>
        item.isExternal ? (
          <a
            key={item.to}
            href={item.to}
            target={item.target}
            rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
            className="text-sm font-semibold tracking-[-0.01em] text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            {item.label}
          </a>
        ) : (
          <HeaderNavLink key={item.to} to={item.to} label={item.label} />
        ),
      )}
    </div>
  );
}

export function StudentLayout() {
  const { settings } = usePlatformSettings();
  const logoSrc = getProxiedImageUrl(settings.logoUploadUrl || settings.logoUrl || null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <SearchProvider>
      <DailyLoginTracker />
      <StudentScriptInjector />
      <div className="flex min-h-screen flex-col bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/70 bg-background/95 px-4 backdrop-blur-sm md:h-16 md:px-6">
          <div className="flex h-full items-center justify-between gap-4 md:gap-6">
            <div className="flex min-w-0 items-center gap-6 lg:gap-10">
              <Link
                to="/cursos"
                className="shrink-0 flex items-center gap-2 transition-opacity hover:opacity-90"
              >
                {logoSrc ? (
                  <img src={logoSrc} alt={settings.name} width={120} height={32} className="h-8 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  <span className="text-lg font-bold tracking-[-0.02em] text-primary">
                    {settings.name || "Master Membros"}
                  </span>
                )}
              </Link>

              <DesktopNav />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              <DesktopGlobalSearch />
              <MobileSearchButton onOpen={() => setMobileSearchOpen(true)} />
              <NotificationBell />
              <ProfileHeaderButton />
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </nav>

        <MobileSearchOverlay
          open={mobileSearchOpen}
          onClose={() => setMobileSearchOpen(false)}
        />

        <main className="flex w-full flex-1 flex-col pb-20 pt-14 md:pb-0 md:pt-16">
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </main>

        <MobileBottomNav />
      </div>
    </SearchProvider>
  );
}
