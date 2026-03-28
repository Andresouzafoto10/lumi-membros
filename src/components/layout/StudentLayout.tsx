import { Outlet, Link } from "react-router-dom";
import { Settings, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SearchProvider, useSearchContext } from "@/hooks/useSearchContext";

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

export function StudentLayout() {
  return (
    <SearchProvider>
      <div className="min-h-screen bg-background">
        <nav className="h-16 border-b px-6 flex items-center justify-between bg-background">
          <Link to="/cursos" className="text-lg font-bold text-primary">
            Lumi Membros
          </Link>

          <div className="flex items-center gap-3">
            <HeaderSearchInput />
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
    </SearchProvider>
  );
}
