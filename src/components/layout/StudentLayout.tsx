import { Outlet, Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function StudentLayout() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="h-16 border-b px-6 flex items-center justify-between bg-background">
        <Link to="/cursos" className="text-lg font-bold text-primary">
          Lumi Membros
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/admin/cursos">
            <Button variant="ghost" className="gap-2">
              <Settings className="h-4 w-4" />
              Admin
            </Button>
          </Link>
        </div>
      </nav>

      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
