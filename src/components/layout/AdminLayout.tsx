import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { GraduationCap, ExternalLink, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/admin/cursos", label: "Cursos", icon: GraduationCap },
];

export function AdminLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navContent = (
    <>
      <div>
        <Link
          to="/admin/cursos"
          className="block px-6 py-5 text-lg font-bold text-primary"
          onClick={() => setMobileMenuOpen(false)}
        >
          Lumi Admin
        </Link>

        <nav className="mt-2 flex flex-col gap-1 px-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="px-3 pb-4">
        <Link
          to="/cursos"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Area do Aluno
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
        <Link to="/admin/cursos" className="text-lg font-bold text-primary">
          Lumi Admin
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
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 flex flex-col justify-between bg-sidebar animate-slide-in">
            {navContent}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="ml-0 lg:ml-64 p-6">
        <Outlet />
      </main>
    </div>
  );
}
