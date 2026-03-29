import { Outlet, Link, NavLink } from "react-router-dom";
import {
  ChevronDown,
  Home,
  MessageSquare,
  Settings,
  Search,
  X,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { SearchProvider, useSearchContext } from "@/hooks/useSearchContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfiles } from "@/hooks/useProfiles";
import { cn } from "@/lib/utils";

function HeaderSearchInput() {
  const { searchQuery, setSearchQuery } = useSearchContext();
  return (
    <div className="relative hidden sm:block">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        placeholder="Buscar cursos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-8 pr-8 h-9 w-[200px] lg:w-[280px] text-sm"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={() => setSearchQuery("")}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
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
  const profile = findProfile(currentUserId);
  const fallbackLetter =
    profile?.displayName?.charAt(0).toUpperCase() ??
    profile?.username?.charAt(0).toUpperCase() ??
    "U";

  return (
    <Link to="/meu-perfil" aria-label="Meu perfil" className="group">
      <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background px-1.5 py-1 shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-primary/15">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-bold text-primary">
              {fallbackLetter}
            </span>
          )}
        </div>
        <ChevronDown className="mr-1 hidden h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground sm:block" />
      </div>
    </Link>
  );
}

function MobileBottomNav() {
  const items = [
    { to: "/cursos", label: "Inicio", icon: Home, end: true },
    { to: "/comunidade", label: "Comunidade", icon: MessageSquare, end: false },
    { to: "/meus-certificados", label: "Certificados", icon: Award, end: true },
  ];

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
                "flex min-h-[50px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] px-2 py-1.5 text-[0.68rem] font-semibold tracking-[-0.01em] transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function StudentLayout() {
  return (
    <SearchProvider>
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/70 bg-background/95 px-6 backdrop-blur-sm">
          <div className="flex h-full items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-6 lg:gap-10">
              <Link
                to="/cursos"
                className="shrink-0 text-lg font-bold tracking-[-0.02em] text-primary transition-opacity hover:opacity-90"
              >
                Lumi Membros
              </Link>

              <div className="hidden items-center gap-6 md:flex">
                <HeaderNavLink to="/cursos" label="Inicio" />
                <HeaderNavLink to="/comunidade" label="Comunidade" />
                <HeaderNavLink to="/meus-certificados" label="Certificados" />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <HeaderSearchInput />
              <NotificationBell />
              <ProfileHeaderButton />
              <ThemeToggle />
              <Link to="/admin/cursos">
                <Button variant="ghost" className="gap-2 hidden sm:flex">
                  <Settings className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <main className="w-full pb-20 pt-16 md:pb-0">
          <Outlet />
        </main>

        <MobileBottomNav />
      </div>
    </SearchProvider>
  );
}
