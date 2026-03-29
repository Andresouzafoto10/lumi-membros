import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseSession } from "@/types/course";

interface CourseSearchProps {
  sessions: CourseSession[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSessionId: string;
  onSessionChange: (sessionId: string) => void;
}

export function CourseSearch({
  sessions,
  searchQuery,
  onSearchChange,
  selectedSessionId,
  onSessionChange,
}: CourseSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 group/search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
        <Input
          placeholder="Buscar cursos..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 transition-all duration-200 border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:shadow-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:text-destructive"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <Select value={selectedSessionId} onValueChange={onSessionChange}>
        <SelectTrigger className="w-full sm:w-[200px] border-border/60">
          <SelectValue placeholder="Todas as sessoes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as sessoes</SelectItem>
          {sessions
            .filter((s) => s.isActive)
            .map((session) => (
              <SelectItem key={session.id} value={session.id}>
                {session.title}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
