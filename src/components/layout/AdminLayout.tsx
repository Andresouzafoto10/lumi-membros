import { useState, useMemo, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UsersRound,
  Settings,
  ExternalLink,
  Menu,
  X,
  MessageSquare,
  Shield,
  Trophy,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { getPermissionsForRole } from "@/lib/permissions";
import type { AdminPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/layout/Footer";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useActiveScriptInjections } from "@/hooks/useScriptInjections";
import { useNavMenuItems } from "@/hooks/useNavMenuItems";
import { injectScripts } from "@/lib/injectScripts";

const navLinks: {
  to: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
  permission?: AdminPermission;
}[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/cursos", label: "Cursos", icon: GraduationCap, exact: false, permission: "courses" },
  { to: "/admin/turmas", label: "Turmas", icon: UsersRound, exact: false, permission: "classes" },
  { to: "/admin/alunos", label: "Alunos", icon: Users, exact: false, permission: "students" },
  { to: "/admin/comunidade", label: "Comunidade", icon: MessageSquare, exact: false, permission: "community" },
  { to: "/admin/comentarios", label: "Moderação", icon: Shield, exact: false, permission: "moderation" },
  { to: "/admin/emails", label: "Emails", icon: Mail, exact: false, permission: "settings" },
  { to: "/admin/gamificacao", label: "Gamificação", icon: Trophy, exact: false, permission: "settings" },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, exact: false, permission: "settings" },
];

export function AdminLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const logoSrc = settings.logoUploadUrl || settings.logoUrl || null;

  // Script injection
  const { scripts } = useActiveScriptInjections("admin");
  useEffect(() => {
    if (scripts.length > 0) {
      injectScripts(scripts, "admin");
    }
  }, [scripts, location.pathname]);

  // External admin nav items
  const { items: adminExtraItems } = useNavMenuItems("admin");
  const externalAdminLinks = useMemo(
    () => adminExtraItems.filter((i) => i.is_external && i.visible),
    [adminExtraItems],
  );

  const permissions = useMemo(
    () => getPermissionsForRole(user?.role ?? "student"),
    [user?.role]
  );

  const visibleLinks = useMemo(
    () =>
      navLinks.filter(
        (link) => !link.permission || permissions[link.permission]
      ),
    [permissions]
  );

  const isActive = (path: string, exact: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const navContent = (
    <>
      <div>
        <Link
          to="/admin"
          className="flex items-center gap-2 px-6 py-5"
          onClick={() => setMobileMenuOpen(false)}
        >
          {logoSrc ? (
            <img src={logoSrc} alt={settings.name} className="h-7 object-contain" />
          ) : (
            <span className="text-lg font-bold text-primary">
              {settings.name ? `${settings.name} Admin` : "Lumi Admin"}
            </span>
          )}
        </Link>

        <nav className="mt-2 flex flex-col gap-1 px-3">
          {visibleLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive(link.to, link.exact)
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}

          {externalAdminLinks.length > 0 && (
            <>
              <div className="my-2 border-t border-border/30" />
              {externalAdminLinks.map((item) => (
                <a
                  key={item.id}
                  href={item.url ?? "#"}
                  target={item.target}
                  rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  {item.label}
                </a>
              ))}
            </>
          )}
        </nav>
      </div>

      <div className="px-3 pb-4 space-y-1">
        <Link
          to="/cursos"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary/80 bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Área do Aluno
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col justify-between border-r bg-sidebar lg:flex">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          {logoSrc ? (
            <img src={logoSrc} alt={settings.name} className="h-7 object-contain" />
          ) : (
            <span className="text-lg font-bold text-primary">
              {settings.name ? `${settings.name} Admin` : "Lumi Admin"}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile overlay menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 flex flex-col justify-between bg-sidebar animate-slide-in">
            {navContent}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="ml-0 flex min-h-screen flex-col lg:ml-64">
        <div className="flex-1 p-6">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  );
}
