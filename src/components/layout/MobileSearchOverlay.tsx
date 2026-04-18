import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, X, BookOpen, PlayCircle, MessageSquare } from "lucide-react";

import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { SearchResultItem } from "./SearchResultItem";
import { Input } from "@/components/ui/input";

interface MobileSearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSearchOverlay({ open, onClose }: MobileSearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { courses, lessons, posts, loading, total } = useGlobalSearch(query);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  if (!open) return null;

  const handleNavigate = (href: string) => {
    navigate(href);
    onClose();
  };

  const showEmptyHint = query.trim().length < 2;
  const showNoResults = !loading && !showEmptyHint && total === 0;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col bg-background md:hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cursos, aulas ou posts..."
            className="h-10 pl-9 pr-3 text-sm"
          />
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar busca"
          className="rounded-full p-2 transition-colors hover:bg-muted active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-6">
        {showEmptyHint && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Pesquise cursos, aulas ou posts
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Digite ao menos 2 caracteres
            </p>
          </div>
        )}

        {loading && !showEmptyHint && (
          <div className="space-y-4 p-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-muted animate-pulse-soft" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-muted animate-pulse-soft" />
                  <div className="h-2 w-1/2 rounded bg-muted animate-pulse-soft" />
                </div>
              </div>
            ))}
          </div>
        )}

        {showNoResults && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              Nenhum resultado para "{query.trim()}"
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tente outros termos.
            </p>
          </div>
        )}

        {!loading && !showEmptyHint && total > 0 && (
          <div className="p-2">
            {courses.length > 0 && (
              <section className="mb-3">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Cursos ({courses.length})
                </p>
                {courses.map((c) => (
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
              <section className="mb-3">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Aulas ({lessons.length})
                </p>
                {lessons.map((l) => (
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
                  Comunidade ({posts.length})
                </p>
                {posts.map((p) => (
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
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
